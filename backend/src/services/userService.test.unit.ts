import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { UserService } from './userService';
import { setupTestDb, getTestDB, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import User from '../entities/User';

// Redirect data-source imports to the testcontainer-backed database
vi.mock('../data-source', async () => {
  const testDb = await import('@test/utils/testDb');
  return { getDB: () => testDb.getTestDB() };
});

describe('UserService', () => {
  let userService: UserService;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
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
});
