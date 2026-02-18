import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { testCreateAccountData, testAccount, testAccount2, testUser } from '@test/fixtures';

// Mock the data-source module
vi.mock('../data-source', () => ({
  getDB: vi.fn(),
}));

import { getDB } from '../data-source';

const mockedGetDB = vi.mocked(getDB);

// Helper: mock a valid session so requireAuth() passes.
// Cookie value: "session=test-session-id.secret" → session ID = "test-session-id", secret = "secret"
// The secretHash stored in the DB must be SHA-256("secret") encoded as base64.
const TEST_SESSION_SECRET_HASH = 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';

function mockAuthenticatedUser(mockDB: Record<string, any>) {
  mockDB.findOne.mockResolvedValue({
    id: 'test-session-id',
    secretHash: TEST_SESSION_SECRET_HASH,
    createdAt: new Date(),
    user: testUser,
  });
}

describe('Account Routes (Integration)', () => {
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
    vi.clearAllMocks();
    mockedGetDB.mockReturnValue(mockDB as any);
  });

  describe('POST /api/accounts', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send(testCreateAccountData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid account data', async () => {
      mockAuthenticatedUser(mockDB);

      const response = await request(app)
        .post('/api/accounts')
        .set('Cookie', 'session=test-session-id.secret')
        .send({ name: '' }) // Missing required fields
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/accounts', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
