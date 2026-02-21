import { getDB } from '../data-source';
import { AppDataSource } from '../data-source';
import Transaction from '../entities/Transaction';
import UploadRecord from '../entities/UploadRecord';
import Account from '../entities/Account';
import User from '../entities/User';
import type {
    UploadTransactionsResponse,
    TransactionWithAccount,
    GetTransactionsResponse,
    UploadTransactionsRequest,
} from 'shared';

export interface UploadTransactionsInput extends UploadTransactionsRequest {
    user: User;
}

export interface GetTransactionsInput {
    user: User;
    page?: number;
    limit?: number;
}

export class TransactionService {
    /**
     * Fetches paginated transactions for the given user, ordered by date descending.
     */
    async getTransactions(input: GetTransactionsInput): Promise<GetTransactionsResponse> {
        const { user, page = 1, limit = 100 } = input;
        const db = getDB();

        const [rows, total] = await db
            .createQueryBuilder(Transaction, 'tx')
            .innerJoinAndSelect('tx.account', 'account')
            .innerJoin('account.users', 'u')
            .where('u.id = :userId', { userId: user.id })
            .orderBy('tx.date', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        const transactions: TransactionWithAccount[] = rows.map((tx) => ({
            id: tx.id,
            amount: Number(tx.amount),
            date: tx.date instanceof Date ? tx.date.toISOString() : String(tx.date),
            notes: tx.notes,
            status: tx.status,
            accountId: tx.account.id,
            accountName: tx.account.name,
            categoryId: tx.category?.id,
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

                if (mapping.description) {
                    tx.notes = String(raw[mapping.description] ?? '');
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
