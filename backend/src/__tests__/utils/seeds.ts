import { getTestDB } from './testDb';
import Transaction from '../../entities/Transaction';
import Account from '../../entities/Account';
import Category from '../../entities/Category';
import UploadRecord from '../../entities/UploadRecord';
import User from '../../entities/User';

export async function seedAccount(name: string, user: User): Promise<Account> {
    const db = getTestDB();
    const account = db.create(Account, {
        name,
        institution: 'Test Bank',
        account: Math.random().toString().slice(2, 12),
        routing: '021000021',
        users: [user],
    });
    return db.save(Account, account);
}

export async function seedCategory(name: string): Promise<Category> {
    const db = getTestDB();
    const cat = db.create(Category, { name });
    return db.save(Category, cat);
}

export async function seedUploadRecord(user: User): Promise<UploadRecord> {
    const db = getTestDB();
    const rec = db.create(UploadRecord, { user, mapping: {} });
    return db.save(UploadRecord, rec);
}

export interface SeedTransactionOptions {
    account: Account;
    upload: UploadRecord;
    amount: number;
    /** ISO date string, e.g. '2025-01-15' */
    date: string;
    vendorLabel?: string;
    categoryLabel?: string;
    description?: string;
    category?: Category;
    status?: Transaction['status'];
}

export async function seedTransaction(opts: SeedTransactionOptions): Promise<Transaction> {
    const db = getTestDB();
    const tx = db.create(Transaction, {
        account: opts.account,
        upload: opts.upload,
        amount: opts.amount,
        date: new Date(opts.date),
        vendorLabel: opts.vendorLabel,
        categoryLabel: opts.categoryLabel,
        description: opts.description ?? '',
        status: opts.status ?? 'completed',
        category: opts.category,
        raw: {},
    });
    return db.save(Transaction, tx);
}
