import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { testUser, testAccount } from '@test/fixtures';

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
});
