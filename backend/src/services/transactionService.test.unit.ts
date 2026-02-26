import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { TransactionService } from './transactionService';
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
// AppDataSource must use a lazy proxy because the mock factory runs before
// beforeAll has a chance to initialise the DataSource.
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

describe('TransactionService', () => {
    let transactionService: TransactionService;
    let userService: UserService;
    let testUser: UserEntity;
    let testAccount: AccountEntity;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        transactionService = new TransactionService();
        userService = new UserService();

        // Seed a user and account linked to that user
        testUser = await userService.createUser('Test User', 'test@example.com', 'password123');

        const db = getTestDB();
        const account = new AccountEntity();
        account.name = 'Primary Checking';
        account.institution = 'Test Bank';
        account.account = '1234567890';
        account.routing = '021000021';
        testAccount = await db.save(AccountEntity, account);

        // Link the account to the user
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

    function makeInput(overrides: Record<string, any> = {}) {
        return {
            accountId: testAccount.id,
            mapping: { amount: 'Amount', date: 'Date', description: 'Desc' },
            transactions: [
                { Amount: '100.50', Date: '2025-06-01', Desc: 'Groceries' },
                { Amount: '42', Date: '2025-06-02', Desc: 'Coffee' },
            ],
            user: testUser,
            ...overrides,
        };
    }

    // ── Account ownership ────────────────────────────────────────────

    describe('account ownership validation', () => {
        it('should throw when the account does not exist', async () => {
            const input = makeInput({ accountId: '00000000-0000-0000-0000-000000000000' });

            await expect(transactionService.uploadTransactions(input)).rejects.toThrow(
                'Account not found or does not belong to the current user',
            );
        });

        it('should throw when the account belongs to a different user', async () => {
            const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');
            const input = makeInput({ user: otherUser });

            await expect(transactionService.uploadTransactions(input)).rejects.toThrow(
                'Account not found or does not belong to the current user',
            );
        });
    });

    // ── Successful upload ────────────────────────────────────────────

    describe('successful upload', () => {
        it('should return the upload record ID and correct transaction count', async () => {
            const input = makeInput();
            const result = await transactionService.uploadTransactions(input);

            expect(result.uploadRecordId).toBeDefined();
            expect(result.transactionCount).toBe(2);
        });

        it('should persist an UploadRecord with the mapping', async () => {
            const mapping = { amount: 'Amt', date: 'Dt', description: 'Desc' };
            const input = makeInput({
                mapping,
                transactions: [{ Amt: '10', Dt: '2025-01-01', Desc: 'test' }],
            });
            const result = await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const upload = await db.findOneBy(UploadRecord, { id: result.uploadRecordId });
            expect(upload).not.toBeNull();
            expect(upload!.mapping).toEqual(mapping);
        });

        it('should store availableColumns derived from the uploaded rows', async () => {
            const input = makeInput({
                mapping: { amount: 'Amount', date: 'Date' },
                transactions: [
                    { Amount: '10', Date: '2025-01-01', Extra: 'bonus' },
                    { Amount: '20', Date: '2025-01-02', Desc: 'test' },
                ],
            });
            const result = await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const upload = await db.findOneBy(UploadRecord, { id: result.uploadRecordId });
            expect(upload).not.toBeNull();
            // Should contain all unique column names across all rows
            expect(upload!.availableColumns).toEqual(
                expect.arrayContaining(['Amount', 'Date', 'Extra', 'Desc']),
            );
            expect(upload!.availableColumns).toHaveLength(4);
        });

        it('should persist Transaction entities linked to the account', async () => {
            const input = makeInput();
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const txns = await db.find(Transaction, { relations: ['account'] });
            expect(txns).toHaveLength(2);
            expect(txns[0].account.id).toBe(testAccount.id);
        });
    });

    // ── Mapping column validation ────────────────────────────────────

    describe('mapping column validation', () => {
        it('should reject a mapping referencing columns not present in the CSV data', async () => {
            const input = makeInput({
                mapping: { amount: 'TotalValue', date: 'Date' },
                transactions: [{ Amount: '10', Date: '2025-01-01' }],
            });

            await expect(transactionService.uploadTransactions(input)).rejects.toThrow(
                'Mapping contains columns not found in CSV: TotalValue',
            );
        });

        it('should set 400 status on mapping validation error', async () => {
            const input = makeInput({
                mapping: { amount: 'FakeCol' },
                transactions: [{ Amount: '10', Date: '2025-01-01' }],
            });

            try {
                await transactionService.uploadTransactions(input);
                expect.fail('should have thrown');
            } catch (err: any) {
                expect(err.status).toBe(400);
            }
        });

        it('should not persist anything when mapping validation fails', async () => {
            const input = makeInput({
                mapping: { amount: 'BadColumn' },
                transactions: [{ Amount: '10', Date: '2025-01-01' }],
            });

            await expect(transactionService.uploadTransactions(input)).rejects.toThrow();

            const db = getTestDB();
            const uploads = await db.find(UploadRecord);
            const txns = await db.find(Transaction);
            expect(uploads).toHaveLength(0);
            expect(txns).toHaveLength(0);
        });
    });

    // ── Mapping & data transformation ────────────────────────────────

    describe('field mapping', () => {
        it('should parse amount from a string', async () => {
            const input = makeInput({
                transactions: [{ Amount: '123.45', Date: '2025-01-01', Desc: 'test' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(Number(tx.amount)).toBeCloseTo(123.45);
        });

        it('should accept a numeric amount value', async () => {
            const input = makeInput({
                transactions: [{ Amount: 99.99, Date: '2025-01-01', Desc: 'test' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(Number(tx.amount)).toBeCloseTo(99.99);
        });

        it('should default amount to 0 when mapping has no amount key', async () => {
            const input = makeInput({
                mapping: { date: 'Date', description: 'Desc' },
                transactions: [{ Date: '2025-01-01', Desc: 'n/a' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(Number(tx.amount)).toBe(0);
        });

        it('should map the date field correctly', async () => {
            const input = makeInput({
                transactions: [{ Amount: '10', Date: '2025-07-15', Desc: 'test' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(new Date(tx.date).toISOString()).toContain('2025-07-15');
        });

        it('should map the description field', async () => {
            const input = makeInput({
                mapping: { amount: 'Amount', date: 'Date', description: 'Desc' },
                transactions: [{ Amount: '10', Date: '2025-01-01', Desc: 'Lunch special' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(tx.description).toBe('Lunch special');
        });
    });

    // ── Status mapping ───────────────────────────────────────────────

    describe('status mapping', () => {
        it('should default status to "completed" when mapping has no status key', async () => {
            const input = makeInput({
                mapping: { amount: 'Amount', date: 'Date', description: 'Desc' },
                transactions: [{ Amount: '10', Date: '2025-01-01', Desc: 'test' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(tx.status).toBe('completed');
        });

        it('should accept a valid status value ("pending")', async () => {
            const input = makeInput({
                mapping: { amount: 'Amount', date: 'Date', status: 'Status', description: 'Desc' },
                transactions: [{ Amount: '10', Date: '2025-01-01', Status: 'pending', Desc: 'test' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(tx.status).toBe('pending');
        });

        it('should fall back to "completed" for an unrecognised status', async () => {
            const input = makeInput({
                mapping: { amount: 'Amount', date: 'Date', status: 'Status', description: 'Desc' },
                transactions: [{ Amount: '10', Date: '2025-01-01', Status: 'unknown', Desc: 'test' }],
            });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(tx.status).toBe('completed');
        });
    });

    // ── Raw row storage ──────────────────────────────────────────────

    describe('raw row storage', () => {
        it('should preserve the full raw row in the jsonb column', async () => {
            const rawRow = { Amount: '50', Date: '2025-03-01', Desc: 'note', Extra: 'bonus', Num: 42 };
            const input = makeInput({ transactions: [rawRow] });
            await transactionService.uploadTransactions(input);

            const db = getTestDB();
            const [tx] = await db.find(Transaction);
            expect(tx.raw).toEqual(rawRow);
        });
    });

    // ── Atomicity ────────────────────────────────────────────────────

    describe('transaction atomicity', () => {
        it('should not leave partial data when the bulk insert fails', async () => {
            // Supply a bad date that Postgres will reject to force the insert to fail
            const input = makeInput({
                mapping: { amount: 'Amount', date: 'Date' },
                transactions: [{ Amount: '10', Date: 'not-a-date' }],
            });

            await expect(transactionService.uploadTransactions(input)).rejects.toThrow();

            // Neither the upload record nor any transactions should have been persisted
            const db = getTestDB();
            const uploads = await db.find(UploadRecord);
            const txns = await db.find(Transaction);
            expect(uploads).toHaveLength(0);
            expect(txns).toHaveLength(0);
        });
    });
});
