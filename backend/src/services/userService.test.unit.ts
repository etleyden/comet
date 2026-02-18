import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './userService';
import { createMockEntityManager } from '@test/mocks';
import { testUser, TEST_PASSWORD } from '@test/fixtures';

// Mock the data-source module so UserService doesn't need a real DB
vi.mock('../data-source', () => ({
  getDB: vi.fn(),
}));

import { getDB } from '../data-source';

const mockedGetDB = vi.mocked(getDB);

describe('UserService', () => {
  let userService: UserService;
  let mockDB: ReturnType<typeof createMockEntityManager>;

  beforeEach(() => {
    userService = new UserService();
    mockDB = createMockEntityManager();
    mockedGetDB.mockReturnValue(mockDB as any);
    vi.clearAllMocks();
  });

  describe('hashPassword / verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const hash = await userService.hashPassword(TEST_PASSWORD);
      expect(hash).not.toBe(TEST_PASSWORD);
      expect(hash.length).toBeGreaterThan(0);

      const isValid = await userService.verifyPassword(TEST_PASSWORD, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await userService.hashPassword(TEST_PASSWORD);
      const isValid = await userService.verifyPassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });
  });

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
      mockDB.findOne.mockResolvedValue(null);
      const result = await userService.validateSessionToken('sessionid.secret');
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should throw if user with email already exists', async () => {
      mockDB.findOneBy.mockResolvedValue(testUser);

      await expect(
        userService.createUser('Test', testUser.email, TEST_PASSWORD)
      ).rejects.toThrow('User with this email already exists');
    });

    it('should save a new user when email is not taken', async () => {
      mockDB.findOneBy.mockResolvedValue(null);
      mockDB.save.mockResolvedValue({ ...testUser, passwordHash: 'hashed' });

      const result = await userService.createUser(testUser.name, testUser.email, TEST_PASSWORD);

      expect(mockDB.save).toHaveBeenCalledTimes(1);
      expect(result.email).toBe(testUser.email);
      expect(result.name).toBe(testUser.name);
    });
  });

  describe('authenticateUser', () => {
    it('should throw for a non-existent email', async () => {
      const mockQB = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      mockDB.createQueryBuilder.mockReturnValue(mockQB as any);

      await expect(
        userService.authenticateUser('nonexistent@example.com', TEST_PASSWORD)
      ).rejects.toThrow('Invalid login credentials');
    });

    it('should throw for an incorrect password', async () => {
      const hash = await userService.hashPassword(TEST_PASSWORD);
      const mockQB = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ ...testUser, passwordHash: hash }),
      };
      mockDB.createQueryBuilder.mockReturnValue(mockQB as any);

      await expect(
        userService.authenticateUser(testUser.email, 'wrongpassword')
      ).rejects.toThrow('Invalid login credentials');
    });

    it('should return the user for correct credentials', async () => {
      const hash = await userService.hashPassword(TEST_PASSWORD);
      const userWithHash = { ...testUser, passwordHash: hash };
      const mockQB = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(userWithHash),
      };
      mockDB.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await userService.authenticateUser(testUser.email, TEST_PASSWORD);
      expect(result.email).toBe(testUser.email);
    });
  });

  describe('createSession', () => {
    it('should throw if user has no id', async () => {
      await expect(userService.createSession({})).rejects.toThrow('Invalid user');
    });

    it('should throw if user is not found in the database', async () => {
      mockDB.findOneBy.mockResolvedValue(null);
      await expect(userService.createSession({ id: 'nonexistent' })).rejects.toThrow('Invalid user');
    });
  });

  describe('invalidateSessionByToken', () => {
    it('should extract session ID and delete it', async () => {
      mockDB.delete.mockResolvedValue({ affected: 1 });

      await userService.invalidateSessionByToken('sessionid.secret');

      expect(mockDB.delete).toHaveBeenCalledWith(expect.anything(), { id: 'sessionid' });
    });

    it('should do nothing if token format is invalid', async () => {
      await userService.invalidateSessionByToken('invalidtoken');
      expect(mockDB.delete).not.toHaveBeenCalled();
    });
  });
});
