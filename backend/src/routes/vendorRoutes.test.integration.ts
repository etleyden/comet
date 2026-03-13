import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { setupTestDb, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import { seedAccount, seedUploadRecord, seedTransaction, seedVendor } from '@test/utils/seeds';
import { UserService } from '../services/userService';
import User from '../entities/User';

vi.mock('../data-source', async () => {
  const testDb = await import('@test/utils/testDb');
  return { getDB: () => testDb.getTestDB() };
});

describe('Vendor Routes (Integration)', () => {
  const app = createTestApp();
  let sessionToken: string;
  let testUser: User;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    const userService = new UserService();
    testUser = await userService.createUser('Test User', 'test@example.com', 'password123');
    const session = await userService.createSession(testUser);
    sessionToken = session.token;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── POST /api/vendors ─────────────────────────────────────────

  describe('POST /api/vendors', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app)
        .post('/api/vendors')
        .send({ name: 'Walmart' })
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should create a vendor successfully', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Walmart', url: 'https://walmart.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Walmart',
        url: 'https://walmart.com',
      });
      expect(response.body.data.id).toBeDefined();
    });
  });

  // ── GET /api/vendors/search ──────────────────────────────────

  describe('GET /api/vendors/search', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app)
        .get('/api/vendors/search')
        .expect(401);
    });

    it('should return all vendors when no query is provided', async () => {
      await seedVendor('Walmart', testUser);
      await seedVendor('Amazon', testUser);

      const response = await request(app)
        .get('/api/vendors/search')
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter vendors by query', async () => {
      await seedVendor('Walmart', testUser);
      await seedVendor('Amazon', testUser);

      const response = await request(app)
        .get('/api/vendors/search?query=wal')
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Walmart');
    });

    it('should include transaction counts', async () => {
      const vendor = await seedVendor('Walmart', testUser);
      const account = await seedAccount('Checking', testUser);
      const upload = await seedUploadRecord(testUser);

      await seedTransaction({ account, upload, amount: 50, date: '2025-01-01', vendor });
      await seedTransaction({ account, upload, amount: 30, date: '2025-01-02', vendor });

      const response = await request(app)
        .get('/api/vendors/search')
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body.data[0].transactionCount).toBe(2);
    });
  });

  // ── GET /api/vendors/:id ──────────────────────────────────────

  describe('GET /api/vendors/:id', () => {
    it('should return 404 for non-existent vendor', async () => {
      const response = await request(app)
        .get('/api/vendors/00000000-0000-0000-0000-000000000000')
        .set('Cookie', `session=${sessionToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return a vendor by id', async () => {
      const createRes = await request(app)
        .post('/api/vendors')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Target' })
        .expect(200);

      const response = await request(app)
        .get(`/api/vendors/${createRes.body.data.id}`)
        .set('Cookie', `session=${sessionToken}`)
        .expect(200);

      expect(response.body.data.name).toBe('Target');
    });
  });

  // ── PUT /api/vendors/:id ──────────────────────────────────────

  describe('PUT /api/vendors/:id', () => {
    it('should update a vendor', async () => {
      const createRes = await request(app)
        .post('/api/vendors')
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'Old Name' })
        .expect(200);

      const response = await request(app)
        .put(`/api/vendors/${createRes.body.data.id}`)
        .set('Cookie', `session=${sessionToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.data.name).toBe('New Name');
    });
  });

  // ── PATCH /api/transactions/:id/vendor ─────────────────────────

  describe('PATCH /api/transactions/:id/vendor', () => {
    it('should return 401 when not authenticated', async () => {
      await request(app)
        .patch('/api/transactions/some-id/vendor')
        .send({ vendorId: null })
        .expect(401);
    });

    it('should assign a vendor to a transaction', async () => {
      const vendor = await seedVendor('Walmart', testUser);
      const account = await seedAccount('Checking', testUser);
      const upload = await seedUploadRecord(testUser);
      const tx = await seedTransaction({ account, upload, amount: 50, date: '2025-01-01' });

      const response = await request(app)
        .patch(`/api/transactions/${tx.id}/vendor`)
        .set('Cookie', `session=${sessionToken}`)
        .send({ vendorId: vendor.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(true);
    });

    it('should unassign a vendor from a transaction', async () => {
      const vendor = await seedVendor('Walmart', testUser);
      const account = await seedAccount('Checking', testUser);
      const upload = await seedUploadRecord(testUser);
      const tx = await seedTransaction({ account, upload, amount: 50, date: '2025-01-01', vendor });

      const response = await request(app)
        .patch(`/api/transactions/${tx.id}/vendor`)
        .set('Cookie', `session=${sessionToken}`)
        .send({ vendorId: null })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent transaction', async () => {
      const vendor = await seedVendor('Walmart', testUser);

      const response = await request(app)
        .patch('/api/transactions/00000000-0000-0000-0000-000000000000/vendor')
        .set('Cookie', `session=${sessionToken}`)
        .send({ vendorId: vendor.id })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
