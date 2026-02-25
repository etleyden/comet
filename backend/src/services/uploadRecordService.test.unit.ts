import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { UploadRecordService } from './uploadRecordService';
import {
    setupTestDb,
    getTestDB,
    getTestDataSource,
    resetTestDb,
    teardownTestDb,
} from '@test/utils/testDb';
import { UserService } from './userService';
import UserEntity from '../entities/User';
import AccountEntity from '../entities/Account';
import Transaction from '../entities/Transaction';
import UploadRecord from '../entities/UploadRecord';

// Redirect data-source imports to the testcontainer-backed database.
vi.mock('../data-source', async () => {
    const testDb = await import('@test/utils/testDb');
    return {
        getDB: () => testDb.getTestDB(),
        AppDataSource: new Proxy({} as any, {
            get(_target, prop) {
                return (testDb.getTestDataSource() as any)[prop];
            },
        }),
    };
});

describe('UploadRecordService', () => {
    let uploadRecordService: UploadRecordService;
    let userService: UserService;
    let testUser: UserEntity;
    let otherUser: UserEntity;
    let testAccount: AccountEntity;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        uploadRecordService = new UploadRecordService();
        userService = new UserService();

        // Users
        testUser = await userService.createUser('Test User', 'test@example.com', 'password123');
        otherUser = await userService.createUser('Other User', 'other@example.com', 'password123');

        // Account linked to testUser
        const db = getTestDB();
        const account = new AccountEntity();
        account.name = 'Primary Checking';
        account.institution = 'Test Bank';
        account.account = '1234567890';
        account.routing = '021000021';
        testAccount = await db.save(AccountEntity, account);

        await db
            .createQueryBuilder()
            .relation(AccountEntity, 'users')
            .of(testAccount)
            .add(testUser.id);
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Seeds an upload record with the given mapping and a single transaction
     * linked to testAccount. Returns the UploadRecord entity.
     */
    async function seedUploadRecord(
        user: UserEntity,
        mapping: Record<string, string> = { amount: 'Amount', date: 'Date' },
        txCount = 2,
    ): Promise<UploadRecord> {
        const db = getTestDB();

        const upload = new UploadRecord();
        upload.user = user;
        upload.mapping = mapping;
        const saved = await db.save(UploadRecord, upload);

        for (let i = 0; i < txCount; i++) {
            const tx = new Transaction();
            tx.upload = saved;
            tx.account = testAccount;
            tx.amount = 10 + i;
            tx.date = new Date('2025-06-01');
            tx.description = `Transaction ${i}`;
            tx.status = 'completed';
            tx.raw = { Amount: String(10 + i), Date: '2025-06-01' };
            await db.save(Transaction, tx);
        }

        return saved;
    }

    // ── getUploadRecord ──────────────────────────────────────────────

    describe('getUploadRecord', () => {
        it('should return the upload record with metadata', async () => {
            const record = await seedUploadRecord(testUser, { amount: 'Amt', date: 'Dt' }, 3);

            const result = await uploadRecordService.getUploadRecord({
                id: record.id,
                user: testUser,
            });

            expect(result.id).toBe(record.id);
            expect(result.userId).toBe(testUser.id);
            expect(result.mapping).toEqual({ amount: 'Amt', date: 'Dt' });
            expect(result.transactionCount).toBe(3);
            expect(result.accountName).toBe('Primary Checking');
            expect(result.createdAt).toBeDefined();
        });

        it('should throw 404 when the record does not exist', async () => {
            await expect(
                uploadRecordService.getUploadRecord({
                    id: '00000000-0000-0000-0000-000000000000',
                    user: testUser,
                }),
            ).rejects.toThrow('Upload record not found');
        });

        it('should throw 404 when the record belongs to a different user', async () => {
            const record = await seedUploadRecord(testUser);

            await expect(
                uploadRecordService.getUploadRecord({
                    id: record.id,
                    user: otherUser,
                }),
            ).rejects.toThrow('Upload record not found');
        });

        it('should set the 404 status on the thrown error', async () => {
            try {
                await uploadRecordService.getUploadRecord({
                    id: '00000000-0000-0000-0000-000000000000',
                    user: testUser,
                });
                expect.fail('should have thrown');
            } catch (err: any) {
                expect(err.status).toBe(404);
            }
        });
    });

    // ── updateUploadRecord ───────────────────────────────────────────

    describe('updateUploadRecord', () => {
        it('should update the mapping and return the updated record', async () => {
            const record = await seedUploadRecord(testUser, { amount: 'Amt' });

            const newMapping = { amount: 'Total', date: 'TransDate', description: 'Memo' };
            const result = await uploadRecordService.updateUploadRecord({
                id: record.id,
                user: testUser,
                mapping: newMapping,
            });

            expect(result.mapping).toEqual(newMapping);
            expect(result.id).toBe(record.id);
            expect(result.transactionCount).toBe(2);
        });

        it('should persist the mapping change to the database', async () => {
            const record = await seedUploadRecord(testUser, { amount: 'Amt' });

            const newMapping = { amount: 'NewAmount', date: 'NewDate' };
            await uploadRecordService.updateUploadRecord({
                id: record.id,
                user: testUser,
                mapping: newMapping,
            });

            const db = getTestDB();
            const persisted = await db.findOneBy(UploadRecord, { id: record.id });
            expect(persisted!.mapping).toEqual(newMapping);
        });

        it('should throw 404 when the record belongs to a different user', async () => {
            const record = await seedUploadRecord(testUser);

            await expect(
                uploadRecordService.updateUploadRecord({
                    id: record.id,
                    user: otherUser,
                    mapping: { amount: 'X' },
                }),
            ).rejects.toThrow('Upload record not found');
        });
    });

    // ── deleteUploadRecord ───────────────────────────────────────────

    describe('deleteUploadRecord', () => {
        it('should delete the upload record and its transactions', async () => {
            const record = await seedUploadRecord(testUser, { amount: 'Amt' }, 3);

            const result = await uploadRecordService.deleteUploadRecord({
                id: record.id,
                user: testUser,
            });

            expect(result.deletedTransactionCount).toBe(3);

            const db = getTestDB();
            const remaining = await db.findOneBy(UploadRecord, { id: record.id });
            expect(remaining).toBeNull();

            const txns = await db.find(Transaction);
            expect(txns).toHaveLength(0);
        });

        it('should only delete transactions linked to the specified upload', async () => {
            const record1 = await seedUploadRecord(testUser, { amount: 'A' }, 2);
            const record2 = await seedUploadRecord(testUser, { amount: 'B' }, 3);

            await uploadRecordService.deleteUploadRecord({
                id: record1.id,
                user: testUser,
            });

            const db = getTestDB();
            const remainingUploads = await db.find(UploadRecord);
            expect(remainingUploads).toHaveLength(1);
            expect(remainingUploads[0].id).toBe(record2.id);

            const remainingTxns = await db.find(Transaction);
            expect(remainingTxns).toHaveLength(3);
        });

        it('should throw 404 when the record belongs to a different user', async () => {
            const record = await seedUploadRecord(testUser);

            await expect(
                uploadRecordService.deleteUploadRecord({
                    id: record.id,
                    user: otherUser,
                }),
            ).rejects.toThrow('Upload record not found');

            // Verify nothing was deleted
            const db = getTestDB();
            const still = await db.findOneBy(UploadRecord, { id: record.id });
            expect(still).not.toBeNull();
        });

        it('should return 0 deleted transactions when the upload had none', async () => {
            const record = await seedUploadRecord(testUser, { amount: 'Amt' }, 0);

            const result = await uploadRecordService.deleteUploadRecord({
                id: record.id,
                user: testUser,
            });

            expect(result.deletedTransactionCount).toBe(0);
        });
    });
});
