import { getDB } from '../data-source';
import VendorEntity from '../entities/Vendor';
import Transaction from '../entities/Transaction';
import User from '../entities/User';
import type { Vendor, CreateVendorRequest, UpdateVendorRequest } from 'shared';
import { HttpError } from 'shared';

export class VendorService {
  private toVendor(entity: VendorEntity): Vendor {
    return {
      id: entity.id,
      name: entity.name,
      url: entity.url,
      logoUrl: entity.logoUrl,
    };
  }

  /**
   * Searches vendors by name (case-insensitive substring match).
   * Returns vendors with their associated transaction count.
   */
  async searchVendors(query?: string, limit = 20): Promise<Vendor[]> {
    const db = getDB();

    let qb = db
      .createQueryBuilder(VendorEntity, 'vendor')
      .leftJoin(Transaction, 'tx', 'tx.vendorId = vendor.id')
      .select('vendor.id', 'id')
      .addSelect('vendor.name', 'name')
      .addSelect('vendor.url', 'url')
      .addSelect('vendor.logoUrl', 'logoUrl')
      .addSelect('COUNT(tx.id)', 'transactionCount')
      .where('vendor.mergedIntoId IS NULL')
      .groupBy('vendor.id')
      .orderBy('COUNT(tx.id)', 'DESC')
      .limit(limit);

    if (query && query.trim()) {
      qb = qb.andWhere('vendor.name ILIKE :query', { query: `%${query.trim()}%` });
    }

    const rows = await qb.getRawMany();

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url ?? undefined,
      logoUrl: row.logoUrl ?? undefined,
      transactionCount: parseInt(row.transactionCount, 10),
    }));
  }

  /**
   * Creates a new vendor entity.
   */
  async createVendor(input: CreateVendorRequest, user: User): Promise<Vendor> {
    const db = getDB();

    const vendor = new VendorEntity();
    vendor.name = input.name;
    vendor.url = input.url;
    vendor.logoUrl = input.logoUrl;
    vendor.updatedBy = user;

    const saved = await db.save(VendorEntity, vendor);
    return this.toVendor(saved);
  }

  /**
   * Gets a single vendor by ID.
   */
  async getVendorById(id: string): Promise<Vendor | null> {
    const db = getDB();

    const vendor = await db.findOne(VendorEntity, { where: { id } });
    return vendor ? this.toVendor(vendor) : null;
  }

  /**
   * Updates a vendor entity.
   */
  async updateVendor(id: string, input: UpdateVendorRequest, user: User): Promise<Vendor> {
    const db = getDB();

    const vendor = await db.findOne(VendorEntity, { where: { id } });
    if (!vendor) {
      throw new HttpError('Vendor not found', 404);
    }

    if (input.name !== undefined) vendor.name = input.name;
    if (input.url !== undefined) vendor.url = input.url;
    if (input.logoUrl !== undefined) vendor.logoUrl = input.logoUrl;
    vendor.updatedBy = user;

    const saved = await db.save(VendorEntity, vendor);
    return this.toVendor(saved);
  }

  /**
   * Assigns a vendor to a transaction. Pass null to unassign.
   * Verifies the transaction belongs to the user.
   */
  async assignVendorToTransaction(
    transactionId: string,
    vendorId: string | null,
    user: User
  ): Promise<void> {
    const db = getDB();

    // Verify transaction belongs to user
    const tx = await db
      .createQueryBuilder(Transaction, 'tx')
      .innerJoin('tx.account', 'account')
      .innerJoin('account.users', 'u')
      .where('tx.id = :transactionId', { transactionId })
      .andWhere('u.id = :userId', { userId: user.id })
      .getOne();

    if (!tx) {
      throw new HttpError('Transaction not found', 404);
    }

    if (vendorId) {
      const vendor = await db.findOne(VendorEntity, { where: { id: vendorId } });
      if (!vendor) {
        throw new HttpError('Vendor not found', 404);
      }
      await db
        .createQueryBuilder()
        .update(Transaction)
        .set({ vendor })
        .where('id = :id', { id: tx.id })
        .execute();
    } else {
      await db
        .createQueryBuilder()
        .update(Transaction)
        .set({ vendor: null })
        .where('id = :id', { id: tx.id })
        .execute();
    }
  }
}
