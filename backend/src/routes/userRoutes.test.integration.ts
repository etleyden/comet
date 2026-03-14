import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';
import { setupTestDb, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import { UserService } from '../services/userService';

// Redirect ALL data-source imports (routes, middleware, services) to the test DB
vi.mock('../data-source');

// Mock the Resend email client so tests don't require an API key
vi.mock('resend');
import { mockResendSend } from '../../__mocks__/resend';

describe('User Routes (Integration)', () => {
  const app = createTestApp();

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    mockResendSend.mockClear();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── Registration ──────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return auth data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ name: 'New User', email: 'newuser@example.com', password: 'securepassword123!' })
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
        .post('/api/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    it('should return 500 when user already exists', async () => {
      // Seed a user directly
      const userService = new UserService();
      await userService.createUser('Existing', 'existing@example.com', 'password123!');

      const response = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Duplicate', email: 'existing@example.com', password: 'password123!' })
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

  describe('GET /api/auth/me', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return the current user when authenticated', async () => {
      const userService = new UserService();
      const user = await userService.createUser('Test User', 'test@example.com', 'password123');
      const session = await userService.createSession(user);

      const response = await request(app)
        .get('/api/auth/me')
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

  // ── Password Reset via Token ──────────────────────────────────────

  describe('POST /api/auth/reset-password/request', () => {
    it('should return success for an existing user', async () => {
      const userService = new UserService();
      await userService.createUser('Test', 'test@example.com', 'password123');

      const response = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return success even for a non-existent email (no info leak)', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/request')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/reset-password/validate', () => {
    it('should return valid: false for an invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/validate')
        .send({ token: 'nonexistent.secret' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
    });

    it('should return valid: true for a valid token', async () => {
      // Create user and generate token via the service directly
      const userService = new UserService();
      const user = await userService.createUser('Test', 'test@example.com', 'password123');

      await userService.requestResetPassword('test@example.com');

      const html: string = mockResendSend.mock.calls[0][0].html;
      const match = html.match(/token=([^"&]+)/);
      const token = decodeURIComponent(match![1]);

      const response = await request(app)
        .post('/api/auth/reset-password/validate')
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/validate')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/reset-password/confirm', () => {
    /** Helper to create a user and get a reset token. */
    async function createUserAndToken() {
      const userService = new UserService();
      const user = await userService.createUser('Test', 'test@example.com', 'password123');

      await userService.requestResetPassword('test@example.com');

      const html: string = mockResendSend.mock.calls[0][0].html;
      const match = html.match(/token=([^"&]+)/);
      const token = decodeURIComponent(match![1]);
      return { user, token, userService };
    }

    it('should reset the password and return AuthUser with session cookie', async () => {
      const { user, token } = await createUserAndToken();

      const response = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token, newPassword: 'NewSecurePassword1!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data).toHaveProperty('token');

      // Session cookie should be set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('session='))).toBe(true);

      // Verify new password works
      const userService = new UserService();
      const authed = await userService.authenticateUser('test@example.com', 'NewSecurePassword1!');
      expect(authed.id).toBe(user.id);
    });

    it('should return 400 for an invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token: 'nonexistent.secret', newPassword: 'NewPassword1!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for an already-used token', async () => {
      const { token } = await createUserAndToken();

      // Use the token once
      await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token, newPassword: 'NewPassword1!' })
        .expect(200);

      // Second attempt should fail
      const response = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token, newPassword: 'AnotherPassword2!' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already been used');
    });

    it('should return 400 when newPassword does not meet requirements', async () => {
      const { token } = await createUserAndToken();

      const response = await request(app)
        .post('/api/auth/reset-password/confirm')
        .send({ token, newPassword: 'short' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
