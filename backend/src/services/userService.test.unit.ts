import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { UserService } from './userService';
import { setupTestDb, getTestDB, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import User from '../entities/User';
import PasswordResetToken from '../entities/PasswordResetToken';

// Redirect data-source imports to the testcontainer-backed database
vi.mock('../data-source');

// Mock the Resend email client so tests don't require an API key
vi.mock('resend');
import { mockResendSend } from '../../__mocks__/resend';

describe('UserService', () => {
  let userService: UserService;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    mockResendSend.mockClear();
    userService = new UserService();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── Pure helper methods (no DB) ────────────────────────────────────

  describe('hashPassword / verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const hash = await userService.hashPassword('password123');
      expect(hash).not.toBe('password123');
      expect(hash.length).toBeGreaterThan(0);

      const isValid = await userService.verifyPassword('password123', hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await userService.hashPassword('password123');
      const isValid = await userService.verifyPassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });
  });

  // ── Token validation ───────────────────────────────────────────────

  describe('validateSessionToken', () => {
    it('should return null for a token without a dot separator', async () => {
      const result = await userService.validateSessionToken('invalidtoken');
      expect(result).toBeNull();
    });

    it('should return null for a token with too many parts', async () => {
      const result = await userService.validateSessionToken('a.b.c');
      expect(result).toBeNull();
    });

    it('should return null when session is not found', async () => {
      const result = await userService.validateSessionToken('nonexistent.secret');
      expect(result).toBeNull();
    });

    it('should return the session for a valid token', async () => {
      const user = await userService.createUser('Test', 'test@example.com', 'password123');
      const session = await userService.createSession(user);

      const result = await userService.validateSessionToken(session.token);
      expect(result).not.toBeNull();
      expect(result!.user.id).toBe(user.id);
    });
  });

  // ── User creation ─────────────────────────────────────────────────

  describe('createUser', () => {
    it('should throw if user with email already exists', async () => {
      await userService.createUser('First', 'duplicate@example.com', 'password123');

      await expect(
        userService.createUser('Second', 'duplicate@example.com', 'password456')
      ).rejects.toThrow('User with this email already exists');
    });

    it('should save a new user and return it', async () => {
      const result = await userService.createUser('Test User', 'test@example.com', 'password123');

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');

      // Verify actually persisted
      const db = getTestDB();
      const saved = await db.findOneBy(User, { id: result.id });
      expect(saved).not.toBeNull();
      expect(saved!.email).toBe('test@example.com');
    });
  });

  // ── Authentication ─────────────────────────────────────────────────

  describe('authenticateUser', () => {
    it('should throw for a non-existent email', async () => {
      await expect(
        userService.authenticateUser('nobody@example.com', 'password123')
      ).rejects.toThrow('Invalid login credentials');
    });

    it('should throw for an incorrect password', async () => {
      await userService.createUser('Test', 'test@example.com', 'password123');

      await expect(
        userService.authenticateUser('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid login credentials');
    });

    it('should return the user for correct credentials', async () => {
      await userService.createUser('Test', 'test@example.com', 'password123');

      const result = await userService.authenticateUser('test@example.com', 'password123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test');
    });
  });

  // ── Session management ─────────────────────────────────────────────

  describe('createSession', () => {
    it('should throw if user has no id', async () => {
      await expect(userService.createSession({})).rejects.toThrow('Invalid user');
    });

    it('should throw if user is not found in the database', async () => {
      await expect(
        userService.createSession({ id: '550e8400-e29b-41d4-a716-446655440099' })
      ).rejects.toThrow('Invalid user');
    });

    it('should create a session for a valid user', async () => {
      const user = await userService.createUser('Test', 'test@example.com', 'password123');
      const session = await userService.createSession(user);

      expect(session.token).toBeDefined();
      expect(session.token).toContain('.');
      expect(session.id).toBeDefined();
    });
  });

  describe('invalidateSessionByToken', () => {
    it('should delete the session so it can no longer be validated', async () => {
      const user = await userService.createUser('Test', 'test@example.com', 'password123');
      const session = await userService.createSession(user);

      // Session is valid before invalidation
      expect(await userService.validateSessionToken(session.token)).not.toBeNull();

      await userService.invalidateSessionByToken(session.token);

      // Session is gone after invalidation
      expect(await userService.validateSessionToken(session.token)).toBeNull();
    });

    it('should do nothing if token format is invalid', async () => {
      // Should not throw
      await userService.invalidateSessionByToken('invalidtoken');
    });
  });

  // ── Listing ────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('should return all users', async () => {
      await userService.createUser('Alice', 'alice@example.com', 'password123');
      await userService.createUser('Bob', 'bob@example.com', 'password123');

      const users = await userService.listUsers();
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.email)).toEqual(
        expect.arrayContaining(['alice@example.com', 'bob@example.com'])
      );
    });
  });

  // ── Password reset tokens ─────────────────────────────────────────

  describe('requestResetPassword', () => {
    it('should create a reset token and send an email for an existing user', async () => {
      const user = await userService.createUser('Test', 'test@example.com', 'password123');

      await userService.requestResetPassword('test@example.com');

      // Token should be saved in DB
      const db = getTestDB();
      const tokens = await db.find(PasswordResetToken, { where: { user: { id: user.id } } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].used).toBe(false);
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Email should have been sent
      expect(mockResendSend).toHaveBeenCalledOnce();
      const emailArgs = mockResendSend.mock.calls[0][0];
      expect(emailArgs.to).toBe('test@example.com');
      expect(emailArgs.html).toContain('/reset-password/token?token=');
    });

    it('should not throw and should not create a token for a non-existent email', async () => {
      await expect(userService.requestResetPassword('nobody@example.com')).resolves.toBeUndefined();

      const db = getTestDB();
      const tokens = await db.find(PasswordResetToken);
      expect(tokens).toHaveLength(0);
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it('should invalidate existing tokens when a new one is requested', async () => {
      const user = await userService.createUser('Test', 'test@example.com', 'password123');

      await userService.requestResetPassword('test@example.com');
      await userService.requestResetPassword('test@example.com');

      const db = getTestDB();
      const tokens = await db.find(PasswordResetToken, { where: { user: { id: user.id } } });
      expect(tokens).toHaveLength(2);
      // First token should be marked as used (invalidated)
      const usedTokens = tokens.filter((t) => t.used);
      const activeTokens = tokens.filter((t) => !t.used);
      expect(usedTokens).toHaveLength(1);
      expect(activeTokens).toHaveLength(1);
    });
  });

  describe('validateResetToken', () => {
    /** Helper to create a user + valid token and return both. */
    async function createUserWithToken() {
      const user = await userService.createUser('Test', 'test@example.com', 'password123');

      await userService.requestResetPassword('test@example.com');

      // Extract token from the email HTML
      const html: string = mockResendSend.mock.calls[0][0].html;
      const match = html.match(/token=([^"&]+)/);
      const token = decodeURIComponent(match![1]);
      return { user, token };
    }

    it('should return the user for a valid, unused, non-expired token', async () => {
      const { user, token } = await createUserWithToken();

      const result = await userService.validateResetToken(token);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(user.id);
    });

    it('should return null for a token without a dot separator', async () => {
      const result = await userService.validateResetToken('invalidtoken');
      expect(result).toBeNull();
    });

    it('should return null for a non-existent token id', async () => {
      const result = await userService.validateResetToken('nonexistent.secret');
      expect(result).toBeNull();
    });

    it('should return null for a used token', async () => {
      const { token } = await createUserWithToken();

      // Mark token as used
      const db = getTestDB();
      const tokenId = token.split('.')[0];
      await db
        .createQueryBuilder()
        .update(PasswordResetToken)
        .set({ used: true })
        .where('id = :id', { id: tokenId })
        .execute();

      const result = await userService.validateResetToken(token);
      expect(result).toBeNull();
    });

    it('should return null for an expired token', async () => {
      const { token } = await createUserWithToken();

      // Set expiry to the past
      const db = getTestDB();
      const tokenId = token.split('.')[0];
      await db
        .createQueryBuilder()
        .update(PasswordResetToken)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where('id = :id', { id: tokenId })
        .execute();

      const result = await userService.validateResetToken(token);
      expect(result).toBeNull();
    });

    it('should return null when the secret portion is wrong', async () => {
      const { token } = await createUserWithToken();
      const tokenId = token.split('.')[0];

      const result = await userService.validateResetToken(`${tokenId}.wrongsecret`);
      expect(result).toBeNull();
    });
  });

  describe('resetPasswordWithToken', () => {
    /** Helper to create a user + valid token and return both. */
    async function createUserWithToken() {
      const user = await userService.createUser('Test', 'test@example.com', 'password123');

      await userService.requestResetPassword('test@example.com');

      const html: string = mockResendSend.mock.calls[0][0].html;
      const match = html.match(/token=([^"&]+)/);
      const token = decodeURIComponent(match![1]);
      return { user, token };
    }

    it('should reset the password, mark token as used, and return the user', async () => {
      const { user, token } = await createUserWithToken();

      const result = await userService.resetPasswordWithToken(token, 'NewSecurePassword1!');
      expect(result.id).toBe(user.id);
      expect(result.requiresPasswordReset).toBe(false);

      // Verify password was actually changed
      const authenticated = await userService.authenticateUser('test@example.com', 'NewSecurePassword1!');
      expect(authenticated.id).toBe(user.id);

      // Verify token is now marked as used
      const db = getTestDB();
      const tokenId = token.split('.')[0];
      const savedToken = await db.findOneBy(PasswordResetToken, { id: tokenId });
      expect(savedToken!.used).toBe(true);
    });

    it('should throw for an invalid token format', async () => {
      await expect(
        userService.resetPasswordWithToken('invalidtoken', 'NewPassword1!')
      ).rejects.toThrow('Invalid reset token');
    });

    it('should throw for a non-existent token', async () => {
      await expect(
        userService.resetPasswordWithToken('nonexistent.secret', 'NewPassword1!')
      ).rejects.toThrow('Invalid reset token');
    });

    it('should throw for an already-used token', async () => {
      const { token } = await createUserWithToken();

      // Use the token once
      await userService.resetPasswordWithToken(token, 'NewPassword1!');

      // Try to use it again
      await expect(
        userService.resetPasswordWithToken(token, 'AnotherPassword2!')
      ).rejects.toThrow('Reset token has already been used');
    });

    it('should throw for an expired token', async () => {
      const { token } = await createUserWithToken();

      // Expire the token
      const db = getTestDB();
      const tokenId = token.split('.')[0];
      await db
        .createQueryBuilder()
        .update(PasswordResetToken)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where('id = :id', { id: tokenId })
        .execute();

      await expect(
        userService.resetPasswordWithToken(token, 'NewPassword1!')
      ).rejects.toThrow('Reset token has expired');
    });

    it('should throw when the secret is wrong', async () => {
      const { token } = await createUserWithToken();
      const tokenId = token.split('.')[0];

      await expect(
        userService.resetPasswordWithToken(`${tokenId}.wrongsecret`, 'NewPassword1!')
      ).rejects.toThrow('Invalid reset token');
    });

    it('should clear requiresPasswordReset flag', async () => {
      const { user, token } = await createUserWithToken();

      // Set requiresPasswordReset to true
      const db = getTestDB();
      await db.save(User, { ...user, requiresPasswordReset: true });

      const result = await userService.resetPasswordWithToken(token, 'NewPassword1!');
      expect(result.requiresPasswordReset).toBe(false);

      // Verify in DB
      const updated = await db.findOneBy(User, { id: user.id });
      expect(updated!.requiresPasswordReset).toBe(false);
    });
  });
});
