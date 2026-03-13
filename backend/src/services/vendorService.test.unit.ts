import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { VendorService } from './vendorService';
import { UserService } from './userService';
import { setupTestDb, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import { seedAccount, seedUploadRecord, seedTransaction, seedVendor } from '@test/utils/seeds';
import User from '../entities/User';

vi.mock('../data-source', async () => {
  const testDb = await import('@test/utils/testDb');
  return { getDB: () => testDb.getTestDB() };
});

describe('VendorService', () => {
  let vendorService: VendorService;
  let userService: UserService;
  let testUser: User;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    vendorService = new VendorService();
    userService = new UserService();
    testUser = await userService.createUser('Test User', 'test@example.com', 'password123');
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  // ── createVendor ────────────────────────────────────────────────

  describe('createVendor', () => {
    it('should create a vendor and return it', async () => {
      const result = await vendorService.createVendor({ name: 'Walmart' }, testUser);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Walmart');
    });

    it('should create a vendor with url and logoUrl', async () => {
      const result = await vendorService.createVendor(
        { name: 'Amazon', url: 'https://amazon.com', logoUrl: 'https://amazon.com/logo.png' },
        testUser
      );

      expect(result.url).toBe('https://amazon.com');
      expect(result.logoUrl).toBe('https://amazon.com/logo.png');
    });
  });

  // ── getVendorById ───────────────────────────────────────────────

  describe('getVendorById', () => {
    it('should return null for non-existent vendor', async () => {
      const result = await vendorService.getVendorById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });

    it('should return the vendor by ID', async () => {
      const created = await vendorService.createVendor({ name: 'Target' }, testUser);
      const result = await vendorService.getVendorById(created.id);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Target');
    });
  });

  // ── updateVendor ────────────────────────────────────────────────

  describe('updateVendor', () => {
    it('should throw for non-existent vendor', async () => {
      await expect(
        vendorService.updateVendor('00000000-0000-0000-0000-000000000000', { name: 'X' }, testUser)
      ).rejects.toThrow('Vendor not found');
    });

    it('should update vendor fields', async () => {
      const created = await vendorService.createVendor({ name: 'Old Name' }, testUser);
      const updated = await vendorService.updateVendor(
        created.id,
        { name: 'New Name', url: 'https://new.com' },
        testUser
      );

      expect(updated.name).toBe('New Name');
      expect(updated.url).toBe('https://new.com');
    });
  });

  // ── searchVendors ───────────────────────────────────────────────

  describe('searchVendors', () => {
    it('should return empty array when no vendors exist', async () => {
      const results = await vendorService.searchVendors();
      expect(results).toEqual([]);
    });

    it('should return vendors with transaction counts', async () => {
      const vendor = await seedVendor('Walmart', testUser);
      const account = await seedAccount('Checking', testUser);
      const upload = await seedUploadRecord(testUser);

      await seedTransaction({ account, upload, amount: 50, date: '2025-01-01', vendor });
      await seedTransaction({ account, upload, amount: 30, date: '2025-01-02', vendor });

      const results = await vendorService.searchVendors();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Walmart');
      expect(results[0].transactionCount).toBe(2);
    });

    it('should filter vendors by name query', async () => {
      await seedVendor('Walmart', testUser);
      await seedVendor('Amazon', testUser);
      await seedVendor('Whole Foods', testUser);

      const results = await vendorService.searchVendors('wal');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Walmart');
    });

    it('should not include merged vendors', async () => {
      const primary = await seedVendor('Walmart', testUser);
      const duplicate = await seedVendor('Wal-Mart', testUser);

      // Mark duplicate as merged
      const { getTestDB } = await import('@test/utils/testDb');
      const db = getTestDB();
      const VendorEntity = (await import('../entities/Vendor')).default;
      await db
        .createQueryBuilder()
        .update(VendorEntity)
        .set({ mergedInto: primary })
        .where('id = :id', { id: duplicate.id })
        .execute();

      const results = await vendorService.searchVendors();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Walmart');
    });

    it('should respect the limit parameter', async () => {
      await seedVendor('Vendor A', testUser);
      await seedVendor('Vendor B', testUser);
      await seedVendor('Vendor C', testUser);

      const results = await vendorService.searchVendors(undefined, 2);

      expect(results).toHaveLength(2);
    });
  });

  // ── assignVendorToTransaction ───────────────────────────────────

  describe('assignVendorToTransaction', () => {
    it('should throw for non-existent transaction', async () => {
      const vendor = await seedVendor('Walmart', testUser);

      await expect(
        vendorService.assignVendorToTransaction(
          '00000000-0000-0000-0000-000000000000',
          vendor.id,
          testUser
        )
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw for non-existent vendor', async () => {
      const account = await seedAccount('Checking', testUser);
      const upload = await seedUploadRecord(testUser);
      const tx = await seedTransaction({ account, upload, amount: 50, date: '2025-01-01' });

      await expect(
        vendorService.assignVendorToTransaction(
          tx.id,
          '00000000-0000-0000-0000-000000000000',
          testUser
        )
      ).rejects.toThrow('Vendor not found');
    });

    it('should assign a vendor to a transaction', async () => {
      const vendor = await seedVendor('Walmart', testUser);
      const account = await seedAccount('Checking', testUser);
      const upload = await seedUploadRecord(testUser);
      const tx = await seedTransaction({ account, upload, amount: 50, date: '2025-01-01' });

      await vendorService.assignVendorToTransaction(tx.id, vendor.id, testUser);

      // Verify assignment
      const { getTestDB } = await import('@test/utils/testDb');
      const db = getTestDB();
      const Transaction = (await import('../entities/Transaction')).default;
      const updated = await db.findOne(Transaction, {
        where: { id: tx.id },
        relations: ['vendor'],
      });

      expect(updated?.vendor?.id).toBe(vendor.id);
    });

    it('should unassign a vendor when vendorId is null', async () => {
      const vendor = await seedVendor('Walmart', testUser);
      const account = await seedAccount('Checking', testUser);
      const upload = await seedUploadRecord(testUser);
      const tx = await seedTransaction({ account, upload, amount: 50, date: '2025-01-01', vendor });

      await vendorService.assignVendorToTransaction(tx.id, null, testUser);

      const { getTestDB } = await import('@test/utils/testDb');
      const db = getTestDB();
      const Transaction = (await import('../entities/Transaction')).default;
      const updated = await db.findOne(Transaction, {
        where: { id: tx.id },
        relations: ['vendor'],
      });

      expect(updated?.vendor).toBeNull();
    });

    it("should reject assigning vendor to another user's transaction", async () => {
      const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');
      const vendor = await seedVendor('Walmart', testUser);
      const account = await seedAccount('Checking', otherUser);
      const upload = await seedUploadRecord(otherUser);
      const tx = await seedTransaction({ account, upload, amount: 50, date: '2025-01-01' });

      await expect(
        vendorService.assignVendorToTransaction(tx.id, vendor.id, testUser)
      ).rejects.toThrow('Transaction not found');
    });
  });
});
