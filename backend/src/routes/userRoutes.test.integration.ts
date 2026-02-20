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

describe('User Routes (Integration)', () => {
  const app = createTestApp();

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── Registration ──────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('should register a new user and return auth data', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ name: 'New User', email: 'newuser@example.com', password: 'securepassword123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.name).toBe('New User');

      // Session cookie should be set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.startsWith('session='))).toBe(true);
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
      // Seed a user directly
      const userService = new UserService();
      await userService.createUser('Existing', 'existing@example.com', 'password123');

      const response = await request(app)
        .post('/auth/register')
        .send({ name: 'Duplicate', email: 'existing@example.com', password: 'password123' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  // ── Login ─────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and set session cookie', async () => {
      const userService = new UserService();
      await userService.createUser('Test User', 'test@example.com', 'password123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should return 500 for invalid credentials', async () => {
      const userService = new UserService();
      await userService.createUser('Test User', 'test@example.com', 'password123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should return success even without a session cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });

    it('should clear session and return success with a session cookie', async () => {
      // Create user + session
      const userService = new UserService();
      const user = await userService.createUser('Test', 'test@example.com', 'password123');
      const session = await userService.createSession(user);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `session=${session.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);

      // Verify session was actually invalidated
      const validatedSession = await userService.validateSessionToken(session.token);
      expect(validatedSession).toBeNull();
    });
  });

  // ── Current User ──────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return the current user when authenticated', async () => {
      const userService = new UserService();
      const user = await userService.createUser('Test User', 'test@example.com', 'password123');
      const session = await userService.createSession(user);

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', `session=${session.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: user.id,
        name: 'Test User',
        email: 'test@example.com',
      });
    });
  });

  // ── Health ────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});
