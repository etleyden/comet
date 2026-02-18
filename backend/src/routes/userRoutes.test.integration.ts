import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { testRegisterData, testLoginCredentials, testUser, TEST_PASSWORD } from '@test/fixtures';

// Mock the data-source module
vi.mock('../data-source', () => ({
  getDB: vi.fn(),
}));

import { getDB } from '../data-source';

const mockedGetDB = vi.mocked(getDB);

describe('User Routes (Integration)', () => {
  const app = createTestApp();
  let mockDB: Record<string, any>;

  beforeEach(() => {
    mockDB = {
      save: vi.fn(),
      findOneBy: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      delete: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    mockedGetDB.mockReturnValue(mockDB as any);
    vi.clearAllMocks();
    mockedGetDB.mockReturnValue(mockDB as any);
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return auth data', async () => {
      const savedUser = { id: testUser.id, name: testRegisterData.name, email: testRegisterData.email, passwordHash: 'hashed' };

      // First findOneBy: check existing user → null. Second findOneBy: validate user for session → user.
      mockDB.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(savedUser);
      mockDB.save.mockImplementation((_Entity: any, data: any) => {
        if (data.passwordHash) {
          return Promise.resolve(savedUser);
        }
        return Promise.resolve({ id: data.id, secretHash: data.secretHash, createdAt: new Date(), user: savedUser });
      });

      const response = await request(app)
        .post('/auth/register')
        .send(testRegisterData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.email).toBe(testRegisterData.email);
      expect(response.body.data.name).toBe(testRegisterData.name);
    });

    it('should return 400 for invalid registration data', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 500 when user already exists', async () => {
      mockDB.findOneBy.mockResolvedValue(testUser); // Existing user

      const response = await request(app)
        .post('/auth/register')
        .send(testRegisterData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return success even without a session cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });

    it('should clear session and return success with a session cookie', async () => {
      mockDB.delete.mockResolvedValue({ affected: 1 });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', 'session=sessionid.secret')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});
