import { getDB } from '../data-source';
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
            createdAt: record.createdAt,
            transactionCount,
            accountName,
        };
    }

    /**
     * Updates the column mapping on an existing upload record.
     */
    async updateUploadRecord(input: UpdateUploadRecordInput): Promise<GetUploadRecordResponse> {
        const { id, user, mapping } = input;
        const db = getDB();

        const record = await this.findOwnedRecord(id, user.id);
        record.mapping = mapping;
        const saved = await db.save(UploadRecord, record);

        const { transactionCount, accountName } = await this.getRecordMetadata(saved.id);

        return {
            id: saved.id,
            userId: user.id,
            mapping: saved.mapping,
            createdAt: saved.createdAt,
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
}
