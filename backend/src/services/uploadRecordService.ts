import { getDB } from '../data-source';
import { toISOString } from '../utils/dateUtils';
import UploadRecord from '../entities/UploadRecord';
import Transaction from '../entities/Transaction';
import User from '../entities/User';
import type {
    GetUploadRecordResponse,
    DeleteUploadRecordResponse,
    UpdateUploadRecordRequest,
} from 'shared';

export interface GetUploadRecordInput {
    id: string;
    user: User;
}

export interface UpdateUploadRecordInput extends UpdateUploadRecordRequest {
    id: string;
    user: User;
}

export interface DeleteUploadRecordInput {
    id: string;
    user: User;
}

export class UploadRecordService {
    /**
     * Fetches a single upload record owned by the given user.
     * Returns the record with its transaction count and linked account name.
     */
    async getUploadRecord(input: GetUploadRecordInput): Promise<GetUploadRecordResponse> {
        const { id, user } = input;
        const record = await this.findOwnedRecord(id, user.id);

        const { transactionCount, accountName } = await this.getRecordMetadata(record.id);

        return {
            id: record.id,
            userId: user.id,
            mapping: record.mapping,
            createdAt: toISOString(record.createdAt),
            transactionCount,
            accountName,
        };
    }

    /**
     * Updates the column mapping on an existing upload record.
     * Also re-derives the vendorLabel and categoryLabel fields on all linked
     * transactions from the new mapping and each transaction's stored raw row.
     */
    async updateUploadRecord(input: UpdateUploadRecordInput): Promise<GetUploadRecordResponse> {
        const { id, user, mapping } = input;
        const db = getDB();

        const record = await this.findOwnedRecord(id, user.id);
        record.mapping = mapping;
        const saved = await db.save(UploadRecord, record);

        // Re-derive vendorLabel and categoryLabel from the updated mapping
        await this.remapTransactionFields(saved.id, mapping);

        const { transactionCount, accountName } = await this.getRecordMetadata(saved.id);

        return {
            id: saved.id,
            userId: user.id,
            mapping: saved.mapping,
            createdAt: toISOString(saved.createdAt),
            transactionCount,
            accountName,
        };
    }

    /**
     * Deletes an upload record and all of its linked transactions.
     * Transactions are removed first to satisfy FK constraints.
     */
    async deleteUploadRecord(input: DeleteUploadRecordInput): Promise<DeleteUploadRecordResponse> {
        const { id, user } = input;
        const db = getDB();

        const record = await this.findOwnedRecord(id, user.id);

        // Delete transactions first (FK constraint)
        const deleteResult = await db
            .createQueryBuilder()
            .delete()
            .from(Transaction)
            .where('uploadId = :uploadId', { uploadId: record.id })
            .execute();

        // Delete the upload record
        await db.remove(UploadRecord, record);

        return {
            deletedTransactionCount: deleteResult.affected ?? 0,
        };
    }

    // ── Private helpers ──────────────────────────────────────────────

    /**
     * Loads an upload record and verifies the caller owns it.
     * Throws a 404-status error if not found or not owned.
     */
    private async findOwnedRecord(recordId: string, userId: string): Promise<UploadRecord> {
        const db = getDB();

        const record = await db
            .createQueryBuilder(UploadRecord, 'ur')
            .innerJoin('ur.user', 'user')
            .where('ur.id = :id', { id: recordId })
            .andWhere('user.id = :userId', { userId })
            .getOne();

        if (!record) {
            const err: any = new Error('Upload record not found');
            err.status = 404;
            throw err;
        }

        return record;
    }

    /**
     * Returns the transaction count and account name for a given upload record.
     */
    private async getRecordMetadata(uploadId: string): Promise<{ transactionCount: number; accountName: string }> {
        const db = getDB();

        const transactionCount = await db
            .createQueryBuilder(Transaction, 'tx')
            .where('tx.uploadId = :uploadId', { uploadId })
            .getCount();

        const sampleTx = await db
            .createQueryBuilder(Transaction, 'tx')
            .innerJoinAndSelect('tx.account', 'account')
            .where('tx.uploadId = :uploadId', { uploadId })
            .getOne();

        return {
            transactionCount,
            accountName: sampleTx?.account?.name ?? 'Unknown',
        };
    }

    /**
     * Re-derives the vendorLabel and categoryLabel fields on all transactions
     * linked to the given upload record, using each transaction's stored
     * raw row and the new mapping.
     */
    private async remapTransactionFields(uploadId: string, mapping: Record<string, string>): Promise<void> {
        const db = getDB();

        const transactions = await db
            .createQueryBuilder(Transaction, 'tx')
            .where('tx.uploadId = :uploadId', { uploadId })
            .getMany();

        for (const tx of transactions) {
            tx.vendorLabel = mapping.vendor ? String(tx.raw[mapping.vendor] ?? '') : undefined;
            tx.categoryLabel = mapping.category ? String(tx.raw[mapping.category] ?? '') : undefined;
            tx.description = mapping.description ? String(tx.raw[mapping.description] ?? '') : undefined;
        }

        if (transactions.length > 0) {
            await db.save(Transaction, transactions);
        }
    }
}
