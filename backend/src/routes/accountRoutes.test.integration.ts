import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { setupTestDb, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import { seedAccount, seedUploadRecord, seedTransaction } from '@test/utils/seeds';
import { UserService } from '../services/userService';

// Redirect ALL data-source imports (routes, middleware, services) to the test DB
vi.mock('../data-source');
vi.mock('resend');

describe('Account Routes (Integration)', () => {
  const app = createTestApp();
  let sessionToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    // Seed a user + session so authenticated requests work
    const userService = new UserService();
    const user = await userService.createUser('Test User', 'test@example.com', 'password123');
    userId = user.id;
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

  // ── GET /api/accounts/:id ─────────────────────────────────────────

  describe('GET /api/accounts/:id', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/accounts/some-id')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when account does not exist', async () => {
      const response = await request(app)
        .get('/api/accounts/00000000-0000-0000-0000-000000000000')
        .set('Cookie', `session=${sessionToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 when account belongs to another user', async () => {
      // Create the account under a second user
      const userService = new UserService();
      const otherUser = await userService.createUser('Other User', 'other@example.com', 'password123');
      const account = await seedAccount('Other Account', otherUser);

      const response = await request(app)
        .get(`/api/accounts/${account.id}`)
        .set('Cookie', `session=${sessionToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return the account when it belongs to the authenticated user', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'My Checking', institution: 'Test Bank', account: '99999999', routing: '021000021' })
        .expect(200);

      const accountId = createRes.body.data.id;

      const response = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: accountId,
        name: 'My Checking',
        institution: 'Test Bank',
      });
    });
  });

  // ── PUT /api/accounts/:id ─────────────────────────────────────────

  describe('PUT /api/accounts/:id', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/accounts/some-id')
        .send({ name: 'Updated' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid update data', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Original', account: '11000011', routing: '021000021' })
        .expect(200);

      const accountId = createRes.body.data.id;

      const response = await request(app)
        .put(`/api/accounts/${accountId}`)
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: '' }) // fails min(1)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 500 when account does not exist or belongs to another user', async () => {
      const userService = new UserService();
      const otherUser = await userService.createUser('Other User', 'other@example.com', 'password123');
      const account = await seedAccount('Other Account', otherUser);

      const response = await request(app)
        .put(`/api/accounts/${account.id}`)
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Hijacked' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should update the account when it belongs to the authenticated user', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Old Name', institution: 'Old Bank', account: '55555555', routing: '021000021' })
        .expect(200);

      const accountId = createRes.body.data.id;

      const response = await request(app)
        .put(`/api/accounts/${accountId}`)
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'New Name', institution: 'New Bank' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: accountId,
        name: 'New Name',
        institution: 'New Bank',
      });
    });
  });

  // ── DELETE /api/accounts/:id ──────────────────────────────────────

  describe('DELETE /api/accounts/:id', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/accounts/some-id')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 500 when account does not exist or belongs to another user', async () => {
      const userService = new UserService();
      const otherUser = await userService.createUser('Other User', 'other@example.com', 'password123');
      const account = await seedAccount('Other Account', otherUser);

      const response = await request(app)
        .delete(`/api/accounts/${account.id}`)
        .set('Cookie', `session=${sessionToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should return 500 when account has existing transactions', async () => {
      // Create account via the API so it's owned by the authenticated user
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Account With Transactions', account: '66666666', routing: '021000021' })
        .expect(200);

      const accountId = createRes.body.data.id;

      // Seed a transaction for this account directly in the DB
      const { getTestDB } = await import('@test/utils/testDb');
      const db = getTestDB();
      const AccountEntity = (await import('../entities/Account')).default;
      const UserEntity = (await import('../entities/User')).default;

      const accountEntity = await db.findOne(AccountEntity, { where: { id: accountId } });
      const userEntity = await db.findOne(UserEntity, { where: { id: userId } });

      const upload = await seedUploadRecord(userEntity!);
      await seedTransaction({ account: accountEntity!, upload, amount: 42.0, date: '2025-01-15' });

      const response = await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set('Cookie', `session=${sessionToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should delete the account when it belongs to the authenticated user and has no transactions', async () => {
      const createRes = await request(app)
        .post('/api/accounts')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'To Delete', institution: 'Test Bank', account: '77777777', routing: '021000021' })
        .expect(200);

      const accountId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/accounts/${accountId}`)
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data).toMatchObject({ deleted: true });

      // Confirm it's gone
      const getRes = await request(app)
        .get(`/api/accounts/${accountId}`)
        .set('Cookie', `session=${sessionToken}`)
        .expect(404);

      expect(getRes.body.success).toBe(false);
    });
  });
});
