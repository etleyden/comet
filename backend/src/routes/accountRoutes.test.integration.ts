import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { setupTestDb, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import { UserService } from '../services/userService';

// Redirect ALL data-source imports (routes, middleware, services) to the test DB
vi.mock('../data-source', async () => {
  const testDb = await import('@test/utils/testDb');
  return { getDB: () => testDb.getTestDB() };
});

describe('Account Routes (Integration)', () => {
  const app = createTestApp();
  let sessionToken: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    // Seed a user + session so authenticated requests work
    const userService = new UserService();
    const user = await userService.createUser('Test User', 'test@example.com', 'password123');
    const session = await userService.createSession(user);
    sessionToken = session.token;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── POST /api/accounts ────────────────────────────────────────────

  describe('POST /api/accounts', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({ name: 'Checking', account: '12345678', routing: '021000021' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid account data', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: '' }) // Missing required fields
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should create an account successfully', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Primary Checking', institution: 'Test Bank', account: '12345678', routing: '021000021' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Primary Checking',
        account: '12345678',
        routing: '021000021',
      });
      expect(response.body.data.id).toBeDefined();
    });
  });

  // ── GET /api/accounts ─────────────────────────────────────────────

  describe('GET /api/accounts', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return accounts for the authenticated user', async () => {
      // Create two accounts via the API
      await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Checking', institution: 'Test Bank', account: '11111111', routing: '021000021' });

      await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Savings', institution: 'Test Credit Union', account: '22222222', routing: '021000089' });

      const response = await request(app)
        .get('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map((a: any) => a.name)).toEqual(
        expect.arrayContaining(['Checking', 'Savings'])
      );
    });

    it('should not return accounts belonging to another user', async () => {
      // Create account under first user
      await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'User1 Account', institution: 'Test Bank', account: '11111111', routing: '021000021' });

      // Create a second user + session
      const userService = new UserService();
      const user2 = await userService.createUser('User Two', 'user2@example.com', 'password123');
      const session2 = await userService.createSession(user2);

      const response = await request(app)
        .get('/api/accounts')
        .set('Cookie', `session=${session2.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });
});
