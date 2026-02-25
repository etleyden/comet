import { getDB } from '../data-source';
import { AppDataSource } from '../data-source';
import { toISOString } from '../utils/dateUtils';
import Transaction from '../entities/Transaction';
import UploadRecord from '../entities/UploadRecord';
import Account from '../entities/Account';
import User from '../entities/User';
import type {
    UploadTransactionsResponse,
    TransactionWithAccount,
    GetTransactionsResponse,
    TransactionFilters,
    UploadTransactionsRequest,
} from 'shared';

export interface UploadTransactionsInput extends UploadTransactionsRequest {
    user: User;
}

export interface GetTransactionsInput {
    user: User;
    page?: number;
    limit?: number;
    filter?: TransactionFilters;
}

export class TransactionService {
    /**
     * Fetches paginated transactions for the given user, ordered by date descending.
     * Supports optional filtering by date range, accounts, vendors (description), categories,
     * and amount range.
     */
    async getTransactions(input: GetTransactionsInput): Promise<GetTransactionsResponse> {
        const { user, page = 1, limit = 100, filter = {} } = input;
        const { dateFrom, dateTo, accountIds, vendors, categoryIds, amountMin, amountMax } = filter;
        const nonNullCategoryIds = categoryIds?.filter((id): id is string => id !== null) ?? [];
        const includesUncategorized = categoryIds?.includes(null) ?? false;
        const db = getDB();

        let qb = db
            .createQueryBuilder(Transaction, 'tx')
            .innerJoinAndSelect('tx.account', 'account')
            .leftJoinAndSelect('tx.category', 'category')
            .leftJoinAndSelect('tx.upload', 'upload')
            .innerJoin('account.users', 'u')
            .where('u.id = :userId', { userId: user.id });

        if (dateFrom) {
            qb = qb.andWhere('tx.date >= :dateFrom', { dateFrom });
        }
        if (dateTo) {
            qb = qb.andWhere('tx.date <= :dateTo', { dateTo });
        }
        if (accountIds && accountIds.length > 0) {
            qb = qb.andWhere('account.id IN (:...accountIds)', { accountIds });
        }
        if (vendors && vendors.length > 0) {
            // Each vendor term is matched as a case-insensitive substring of the vendor field
            const vendorConditions = vendors.map((_, i) => `tx.vendorLabel ILIKE :vendor${i}`);
            const vendorParams = Object.fromEntries(vendors.map((v, i) => [`vendor${i}`, `%${v}%`]));
            qb = qb.andWhere(`(${vendorConditions.join(' OR ')})`, vendorParams);
        }
        if (nonNullCategoryIds.length > 0 || includesUncategorized) {
            const conditions: string[] = [];
            const params: Record<string, any> = {};
            if (nonNullCategoryIds.length > 0) {
                conditions.push('category.id IN (:...categoryIds)');
                params.categoryIds = nonNullCategoryIds;
            }
            if (includesUncategorized) {
                conditions.push('category.id IS NULL');
            }
            qb = qb.andWhere(`(${conditions.join(' OR ')})`, params);
        }
        if (amountMin !== undefined) {
            qb = qb.andWhere('tx.amount >= :amountMin', { amountMin });
        }
        if (amountMax !== undefined) {
            qb = qb.andWhere('tx.amount <= :amountMax', { amountMax });
        }

        const [rows, total] = await qb
            .orderBy('tx.date', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        const transactions: TransactionWithAccount[] = rows.map((tx) => ({
            id: tx.id,
            amount: Number(tx.amount),
            date: toISOString(tx.date),
            vendorLabel: tx.vendorLabel,
            categoryLabel: tx.categoryLabel,
            description: tx.description,
            status: tx.status,
            accountId: tx.account.id,
            accountName: tx.account.name,
            categoryId: tx.category?.id,
            categoryName: tx.category?.name,
            uploadRecordId: tx.upload?.id,
            uploadCreatedAt: toISOString(tx.upload?.createdAt),
        }));

        return {
            transactions,
            total,
        };
    }

    /**
     * Processes an upload of raw transaction rows.
     *
     * 1. Validates that the account belongs to the user.
     * 2. Creates an UploadRecord to persist the column mapping.
     * 3. Maps each raw row to a Transaction entity and bulk-inserts them.
     *
     * Steps 2 and 3 run inside a DB transaction so they either all
     * succeed or all roll back.
     */
    async uploadTransactions(input: UploadTransactionsInput): Promise<UploadTransactionsResponse> {
        const { accountId, mapping, transactions, user } = input;
        const db = getDB();

        // Verify account belongs to user (outside the write-transaction — read-only)
        const account = await db
            .createQueryBuilder(Account, 'account')
            .innerJoin('account.users', 'user')
            .where('account.id = :accountId', { accountId })
            .andWhere('user.id = :userId', { userId: user.id })
            .getOne();

        if (!account) {
            throw new Error('Account not found or does not belong to the current user');
        }

        // Run the write operations in a transaction
        return AppDataSource.transaction(async (txManager) => {
            // Create the upload record
            const uploadRecord = new UploadRecord();
            uploadRecord.user = user;
            uploadRecord.mapping = mapping;
            const savedUpload = await txManager.save(UploadRecord, uploadRecord);

            // Build transaction entities from the raw rows using the mapping
            const transactionEntities = transactions.map((raw) => {
                const tx = new Transaction();
                tx.upload = savedUpload;
                tx.account = account;

                // Apply mapping: mapping keys are app attributes, values are CSV column names
                if (mapping.amount) {
                    const rawAmount = raw[mapping.amount];
                    tx.amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount));
                } else {
                    tx.amount = 0;
                }

                if (mapping.date) {
                    tx.date = new Date(raw[mapping.date]);
                } else {
                    tx.date = new Date();
                }

                if (mapping.vendor) {
                    tx.vendorLabel = String(raw[mapping.vendor] ?? '');
                }

                if (mapping.category) {
                    tx.categoryLabel = String(raw[mapping.category] ?? '');
                }

                if (mapping.description) {
                    tx.description = String(raw[mapping.description] ?? '');
                }

                if (mapping.status) {
                    const status = String(raw[mapping.status] ?? 'completed').toLowerCase();
                    tx.status = ['pending', 'completed', 'cancelled'].includes(status)
                        ? (status as Transaction['status'])
                        : 'completed';
                } else {
                    tx.status = 'completed';
                }

                // Store the full raw row for future reference
                tx.raw = raw;

                return tx;
            });

            // Bulk insert transactions
            await txManager
                .createQueryBuilder()
                .insert()
                .into(Transaction)
                .values(transactionEntities)
                .execute();

            return {
                uploadRecordId: savedUpload.id,
                transactionCount: transactionEntities.length,
            };
        });
    }
}
