import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { testUser, testAccount } from '@test/fixtures';
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { setupTestDb, resetTestDb, teardownTestDb, getTestDB } from '@test/utils/testDb';
import { seedAccount, seedCategory, seedUploadRecord, seedTransaction, type SeedTransactionOptions } from '@test/utils/seeds';
import { UserService } from '../services/userService';
import Account from '../entities/Account';
import Category from '../entities/Category';
import UploadRecord from '../entities/UploadRecord';
import type { TransactionWithAccount } from 'shared';

// Mock the data-source module
vi.mock('../data-source', () => ({
    getDB: vi.fn(),
    AppDataSource: {
        transaction: vi.fn(),
    },
}));

import { getDB } from '../data-source';
import { AppDataSource } from '../data-source';

const mockedGetDB = vi.mocked(getDB);
const mockedTransaction = vi.mocked(AppDataSource.transaction);

// Session secret hash = SHA-256("secret") in base64
const TEST_SESSION_SECRET_HASH = 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';

function mockAuthenticatedUser(mockDB: Record<string, any>) {
    mockDB.findOne.mockResolvedValue({
        id: 'test-session-id',
        secretHash: TEST_SESSION_SECRET_HASH,
        createdAt: new Date(),
        user: testUser,
    });
}

const validUploadPayload = {
    accountId: testAccount.id,
    mapping: { amount: 'Amount', date: 'Date' },
    transactions: [
        { Amount: '100', Date: '2025-06-01' },
    ],
};

describe('Transaction Routes (Integration)', () => {
    const app = createTestApp();
    let mockDB: Record<string, any>;
    let mockQB: Record<string, any>;

    beforeEach(() => {
        mockQB = {
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            andWhere: vi.fn().mockReturnThis(),
            innerJoin: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            relation: vi.fn().mockReturnThis(),
            of: vi.fn().mockReturnThis(),
            add: vi.fn().mockResolvedValue(undefined),
            getOne: vi.fn(),
            getMany: vi.fn(),
            execute: vi.fn(),
            insert: vi.fn().mockReturnThis(),
            into: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
        };

        mockDB = {
            save: vi.fn(),
            findOneBy: vi.fn(),
            findOne: vi.fn(),
            find: vi.fn(),
            delete: vi.fn(),
            createQueryBuilder: vi.fn().mockReturnValue(mockQB),
        };

        mockedGetDB.mockReturnValue(mockDB as any);

        // Default: transaction callback just runs with a mock manager
        const mockTxManager = {
            save: vi.fn().mockResolvedValue({ id: 'upload-uuid-1' }),
            createQueryBuilder: vi.fn().mockReturnValue(mockQB),
        };
        mockedTransaction.mockImplementation(async (cb: any) => cb(mockTxManager));

        vi.clearAllMocks();
        mockedGetDB.mockReturnValue(mockDB as any);
        mockedTransaction.mockImplementation(async (cb: any) => cb(mockTxManager));
    });

    describe('POST /api/transactions/upload', () => {
        it('should return 401 when not authenticated', async () => {
            const response = await request(app)
                .post('/api/transactions/upload')
                .send(validUploadPayload)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 when accountId is not a valid UUID', async () => {
            mockAuthenticatedUser(mockDB);

            const response = await request(app)
                .post('/api/transactions/upload')
                .set('Cookie', 'session=test-session-id.secret')
                .send({
                    ...validUploadPayload,
                    accountId: 'not-a-uuid',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation error');
        });

        it('should return 400 when transactions array is empty', async () => {
            mockAuthenticatedUser(mockDB);

            const response = await request(app)
                .post('/api/transactions/upload')
                .set('Cookie', 'session=test-session-id.secret')
                .send({
                    ...validUploadPayload,
                    transactions: [],
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation error');
        });

        it('should return 400 when required fields are missing', async () => {
            mockAuthenticatedUser(mockDB);

            const response = await request(app)
                .post('/api/transactions/upload')
                .set('Cookie', 'session=test-session-id.secret')
                .send({ mapping: {} })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return success when given valid data and authenticated user', async () => {
            mockAuthenticatedUser(mockDB);

            // Account ownership check passes
            mockQB.getOne.mockResolvedValue({ id: testAccount.id, name: testAccount.name });
            mockQB.execute.mockResolvedValue({ identifiers: [{}] });

            const response = await request(app)
                .post('/api/transactions/upload')
                .set('Cookie', 'session=test-session-id.secret')
                .send(validUploadPayload)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('uploadRecordId');
            expect(response.body.data).toHaveProperty('transactionCount');
        });
    });

    describe('POST /api/transactions', () => {
        const app = createTestApp();
        let sessionToken: string;
        let userEntity: any;
        let account1: Account;
        let account2: Account;
        let category1: Category;
        let category2: Category;
        let uploadRecord: UploadRecord;

        beforeAll(async () => {
            await setupTestDb();
            mockedGetDB.mockImplementation(() => getTestDB());
        });

        beforeEach(async () => {
            // Override the outer beforeEach which points getDB at the mock DB
            mockedGetDB.mockImplementation(() => getTestDB());

            await resetTestDb();

            const userService = new UserService();
            userEntity = await userService.createUser('Test User', 'test@example.com', 'password123');
            const session = await userService.createSession(userEntity);
            sessionToken = session.token;

            account1 = await seedAccount('Checking', userEntity);
            account2 = await seedAccount('Savings', userEntity);
            category1 = await seedCategory('Groceries');
            category2 = await seedCategory('Transport');
            uploadRecord = await seedUploadRecord(userEntity);
        });

        afterAll(async () => {
            await teardownTestDb();
        });

        // ── Auth ──────────────────────────────────────────────────────────────────

        it('returns 401 when not authenticated', async () => {
            const res = await request(app)
                .post('/api/transactions/')
                .send({})
                .expect(401);

            expect(res.body.success).toBe(false);
        });

        // ── Basic fetch ───────────────────────────────────────────────────────────

        it('returns all transactions for the authenticated user when no filter is given', async () => {
            await seedTransaction({ account: account1, upload: uploadRecord, amount: 50, date: '2025-01-10' });
            await seedTransaction({ account: account2, upload: uploadRecord, amount: 75, date: '2025-01-11' });

            const res = await request(app)
                .post('/api/transactions/')
                .set('Cookie', `session=${sessionToken}`)
                .send({})
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.total).toBe(2);
            expect(res.body.data.transactions).toHaveLength(2);
        });

        it('returns transactions ordered by date descending', async () => {
            await seedTransaction({ account: account1, upload: uploadRecord, amount: 10, date: '2025-01-01' });
            await seedTransaction({ account: account1, upload: uploadRecord, amount: 20, date: '2025-03-15' });
            await seedTransaction({ account: account1, upload: uploadRecord, amount: 30, date: '2025-02-10' });

            const res = await request(app)
                .post('/api/transactions/')
                .set('Cookie', `session=${sessionToken}`)
                .send({})
                .expect(200);

            const dates = res.body.data.transactions.map((t: TransactionWithAccount) => t.date);
            expect(dates).toEqual([...dates].sort((a, b) => (a > b ? -1 : 1)));
        });

        it('does not return transactions belonging to another user', async () => {
            await seedTransaction({ account: account1, upload: uploadRecord, amount: 100, date: '2025-01-01' });

            const userService = new UserService();
            const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');
            const otherSession = await userService.createSession(otherUser);

            const res = await request(app)
                .post('/api/transactions/')
                .set('Cookie', `session=${otherSession.token}`)
                .send({})
                .expect(200);

            expect(res.body.data.transactions).toHaveLength(0);
            expect(res.body.data.total).toBe(0);
        });

        // ── Date format validation ───────────────────────────────────────────────

        describe('filter date format', () => {
            beforeEach(async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 10, date: '2025-01-01' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 20, date: '2025-03-15' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 30, date: '2025-06-30' });
            });

            it('accepts YYYY-MM-DD', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { dateFrom: '2025-03-01' } })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(res.body.data.total).toBe(2);
            });

            it('rejects an invalid date string with 400', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { dateFrom: 'not-a-date' } })
                    .expect(400);

                expect(res.body.success).toBe(false);
            });
        });

        // ── Date range filter ─────────────────────────────────────────────────────

        describe('filter.dateFrom / filter.dateTo', () => {
            beforeEach(async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 10, date: '2025-01-01' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 20, date: '2025-03-15' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 30, date: '2025-06-30' });
            });

            it('filters to transactions on or after dateFrom', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { dateFrom: '2025-03-01' } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
                res.body.data.transactions.forEach((t: TransactionWithAccount) => {
                    expect(new Date(t.date) >= new Date('2025-03-01')).toBe(true);
                });
            });

            it('filters to transactions on or before dateTo', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { dateTo: '2025-03-31' } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
            });

            it('filters to transactions within a date range', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { dateFrom: '2025-02-01', dateTo: '2025-05-01' } })
                    .expect(200);

                expect(res.body.data.total).toBe(1);
                expect(res.body.data.transactions[0].amount).toBe(20);
            });

            it('returns empty when no transactions fall within range', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { dateFrom: '2026-01-01' } })
                    .expect(200);

                expect(res.body.data.total).toBe(0);
            });
        });

        // ── Account filter ────────────────────────────────────────────────────────

        describe('filter.accountIds', () => {
            beforeEach(async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 100, date: '2025-01-01' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 200, date: '2025-01-02' });
                await seedTransaction({ account: account2, upload: uploadRecord, amount: 300, date: '2025-01-03' });
            });

            it('returns only transactions for the specified account', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { accountIds: [account1.id] } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
                res.body.data.transactions.forEach((t: TransactionWithAccount) => {
                    expect(t.accountId).toBe(account1.id);
                });
            });

            it('returns transactions across multiple specified accounts', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { accountIds: [account1.id, account2.id] } })
                    .expect(200);

                expect(res.body.data.total).toBe(3);
            });

            it('returns empty when accountId does not belong to user', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { accountIds: ['00000000-0000-0000-0000-000000000000'] } })
                    .expect(200);

                expect(res.body.data.total).toBe(0);
            });
        });

        // ── Vendor filter ─────────────────────────────────────────────────────────

        describe('filter.vendors', () => {
            beforeEach(async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 10, date: '2025-01-01', notes: 'Whole Foods Market' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 20, date: '2025-01-02', notes: 'Amazon Prime' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 30, date: '2025-01-03', notes: 'Uber Eats' });
            });

            it('returns transactions whose notes match a vendor term (case-insensitive)', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { vendors: ['whole foods'] } })
                    .expect(200);

                expect(res.body.data.total).toBe(1);
                expect(res.body.data.transactions[0].notes).toBe('Whole Foods Market');
            });

            it('returns partial match on vendor term', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { vendors: ['amazon'] } })
                    .expect(200);

                expect(res.body.data.total).toBe(1);
            });

            it('returns union of results when multiple vendor terms are given', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { vendors: ['whole foods', 'uber'] } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
            });

            it('returns empty when no notes match the vendor term', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { vendors: ['starbucks'] } })
                    .expect(200);

                expect(res.body.data.total).toBe(0);
            });
        });

        // ── Category filter ───────────────────────────────────────────────────────

        describe('filter.categoryIds', () => {
            beforeEach(async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 50, date: '2025-01-01', category: category1 });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 60, date: '2025-01-02', category: category2 });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 70, date: '2025-01-03' }); // no category
            });

            it('returns only transactions matching a category', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { categoryIds: [category1.id] } })
                    .expect(200);

                expect(res.body.data.total).toBe(1);
                expect(res.body.data.transactions[0].categoryId).toBe(category1.id);
            });

            it('returns transactions across multiple categories', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { categoryIds: [category1.id, category2.id] } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
            });

            it('does not return uncategorised transactions when filtering by category', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { categoryIds: [category1.id] } })
                    .expect(200);

                expect(res.body.data.transactions.every((t: TransactionWithAccount) => t.categoryId !== undefined)).toBe(true);
            });
        });

        // ── Uncategorized via null in categoryIds ────────────────────────────────

        describe('filter.categoryIds with null for uncategorized', () => {
            beforeEach(async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 50, date: '2025-01-01', category: category1 });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 60, date: '2025-01-02', category: category2 });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 70, date: '2025-01-03' }); // no category
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 80, date: '2025-01-04' }); // no category
            });

            it('returns only uncategorized transactions when categoryIds is [null]', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { categoryIds: [null] } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
                res.body.data.transactions.forEach((t: TransactionWithAccount) => {
                    expect(t.categoryId).toBeUndefined();
                });
            });

            it('returns all transactions when no categoryIds filter is given', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({})
                    .expect(200);

                expect(res.body.data.total).toBe(4);
            });

            it('returns uncategorized and matching-category transactions when null and a category id are both provided (OR)', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { categoryIds: [null, category1.id] } })
                    .expect(200);

                // 2 uncategorized + 1 matching category1 = 3
                expect(res.body.data.total).toBe(3);
                const returnedCategoryIds = res.body.data.transactions.map((t: TransactionWithAccount) => t.categoryId);
                expect(returnedCategoryIds).toContain(category1.id);
                expect(returnedCategoryIds.filter((id: string | undefined) => id === undefined)).toHaveLength(2);
            });
        });

        // ── Amount range filter ───────────────────────────────────────────────────

        describe('filter.amountMin / filter.amountMax', () => {
            beforeEach(async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 10, date: '2025-01-01' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 50, date: '2025-01-02' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 200, date: '2025-01-03' });
            });

            it('filters to transactions at or above amountMin', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { amountMin: 50 } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
                res.body.data.transactions.forEach((t: TransactionWithAccount) => {
                    expect(t.amount).toBeGreaterThanOrEqual(50);
                });
            });

            it('filters to transactions at or below amountMax', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { amountMax: 50 } })
                    .expect(200);

                expect(res.body.data.total).toBe(2);
                res.body.data.transactions.forEach((t: TransactionWithAccount) => {
                    expect(t.amount).toBeLessThanOrEqual(50);
                });
            });

            it('filters to transactions within an amount range', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { amountMin: 20, amountMax: 100 } })
                    .expect(200);

                expect(res.body.data.total).toBe(1);
                expect(res.body.data.transactions[0].amount).toBe(50);
            });

            it('returns empty when no transactions fall within amount range', async () => {
                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { amountMin: 1000 } })
                    .expect(200);

                expect(res.body.data.total).toBe(0);
            });
        });

        // ── Pagination ────────────────────────────────────────────────────────────

        describe('pagination', () => {
            beforeEach(async () => {
                // Seed 5 transactions
                for (let i = 1; i <= 5; i++) {
                    await seedTransaction({
                        account: account1,
                        upload: uploadRecord,
                        amount: i * 10,
                        date: `2025-01-0${i}`,
                    });
                }
            });

            it('respects the limit query parameter', async () => {
                const res = await request(app)
                    .post('/api/transactions/?limit=2')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({})
                    .expect(200);

                expect(res.body.data.transactions).toHaveLength(2);
                expect(res.body.data.total).toBe(5);
            });

            it('returns the correct page of results', async () => {
                const page1 = await request(app)
                    .post('/api/transactions/?page=1&limit=2')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({})
                    .expect(200);

                const page2 = await request(app)
                    .post('/api/transactions/?page=2&limit=2')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({})
                    .expect(200);

                const ids1 = page1.body.data.transactions.map((t: TransactionWithAccount) => t.id);
                const ids2 = page2.body.data.transactions.map((t: TransactionWithAccount) => t.id);
                expect(ids1).toHaveLength(2);
                expect(ids2).toHaveLength(2);
                expect(ids1).not.toEqual(ids2);
                // No overlap between pages
                expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0);
            });

            it('returns an empty page when page exceeds total results', async () => {
                const res = await request(app)
                    .post('/api/transactions/?page=99&limit=25')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({})
                    .expect(200);

                expect(res.body.data.transactions).toHaveLength(0);
                expect(res.body.data.total).toBe(5);
            });
        });

        // ── Combined filters ──────────────────────────────────────────────────────

        describe('combined filters', () => {
            it('applies date range and account filter together', async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 100, date: '2025-01-15' });
                await seedTransaction({ account: account2, upload: uploadRecord, amount: 200, date: '2025-01-15' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 300, date: '2025-06-01' });

                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({
                        filter: {
                            accountIds: [account1.id],
                            dateFrom: '2025-01-01',
                            dateTo: '2025-03-01',
                        }
                    })
                    .expect(200);

                expect(res.body.data.total).toBe(1);
                expect(res.body.data.transactions[0].amount).toBe(100);
            });

            it('applies vendor and amount filter together', async () => {
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 15, date: '2025-01-01', notes: 'Starbucks Coffee' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 150, date: '2025-01-02', notes: 'Starbucks Reserve' });
                await seedTransaction({ account: account1, upload: uploadRecord, amount: 80, date: '2025-01-03', notes: 'Whole Foods' });

                const res = await request(app)
                    .post('/api/transactions/')
                    .set('Cookie', `session=${sessionToken}`)
                    .send({ filter: { vendors: ['starbucks'], amountMin: 100 } })
                    .expect(200);

                expect(res.body.data.total).toBe(1);
                expect(res.body.data.transactions[0].amount).toBe(150);
            });
        });
    });
});