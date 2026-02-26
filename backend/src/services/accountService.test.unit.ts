import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { AccountService } from './accountService';
import { UserService } from './userService';
import { setupTestDb, getTestDB, resetTestDb, teardownTestDb } from '@test/utils/testDb';
import User from '../entities/User';
import AccountEntity from '../entities/Account';
import TransactionEntity from '../entities/Transaction';
import UploadRecord from '../entities/UploadRecord';

// Redirect data-source imports to the testcontainer-backed database
vi.mock('../data-source', async () => {
    const testDb = await import('@test/utils/testDb');
    return { getDB: () => testDb.getTestDB() };
});

describe('AccountService', () => {
    let accountService: AccountService;
    let userService: UserService;
    let testUser: User;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        accountService = new AccountService();
        userService = new UserService();
        testUser = await userService.createUser('Test User', 'test@example.com', 'password123');
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    // ── createAccount ──────────────────────────────────────────────────

    describe('createAccount', () => {
        it('should create an account and return it', async () => {
            const result = await accountService.createAccount(
                { name: 'Checking', account: '12345678', routing: '021000021' },
                testUser
            );

            expect(result.id).toBeDefined();
            expect(result.name).toBe('Checking');
            expect(result.account).toBe('12345678');
            expect(result.routing).toBe('021000021');
        });

        it('should create an account with institution', async () => {
            const result = await accountService.createAccount(
                { name: 'Savings', institution: 'Test Bank', account: '87654321', routing: '021000089' },
                testUser
            );

            expect(result.institution).toBe('Test Bank');
        });

        it('should associate the account with the user', async () => {
            const created = await accountService.createAccount(
                { name: 'Checking', account: '12345678', routing: '021000021' },
                testUser
            );

            const accounts = await accountService.getAccounts(testUser);
            expect(accounts).toHaveLength(1);
            expect(accounts[0].id).toBe(created.id);
        });
    });

    // ── getAccounts ────────────────────────────────────────────────────

    describe('getAccounts', () => {
        it('should return an empty array when user has no accounts', async () => {
            const accounts = await accountService.getAccounts(testUser);
            expect(accounts).toEqual([]);
        });

        it('should return all accounts for the user', async () => {
            await accountService.createAccount(
                { name: 'Checking', account: '11111111', routing: '021000021' },
                testUser
            );
            await accountService.createAccount(
                { name: 'Savings', account: '22222222', routing: '021000089' },
                testUser
            );

            const accounts = await accountService.getAccounts(testUser);
            expect(accounts).toHaveLength(2);
            expect(accounts.map((a) => a.name)).toEqual(expect.arrayContaining(['Checking', 'Savings']));
        });

        it('should not return accounts belonging to another user', async () => {
            const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');

            await accountService.createAccount(
                { name: 'My Account', account: '11111111', routing: '021000021' },
                testUser
            );
            await accountService.createAccount(
                { name: 'Other Account', account: '22222222', routing: '021000089' },
                otherUser
            );

            const myAccounts = await accountService.getAccounts(testUser);
            expect(myAccounts).toHaveLength(1);
            expect(myAccounts[0].name).toBe('My Account');
        });
    });

    // ── getAccountById ─────────────────────────────────────────────────

    describe('getAccountById', () => {
        it('should return the account when owned by the user', async () => {
            const created = await accountService.createAccount(
                { name: 'Checking', account: '12345678', routing: '021000021' },
                testUser
            );

            const account = await accountService.getAccountById(created.id, testUser);
            expect(account).not.toBeNull();
            expect(account!.id).toBe(created.id);
            expect(account!.name).toBe('Checking');
        });

        it('should return null for a non-existent account', async () => {
            const account = await accountService.getAccountById(
                '550e8400-e29b-41d4-a716-446655440000',
                testUser
            );
            expect(account).toBeNull();
        });

        it('should return null for an account owned by another user', async () => {
            const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');
            const created = await accountService.createAccount(
                { name: 'Secret Account', account: '99999999', routing: '021000021' },
                otherUser
            );

            const account = await accountService.getAccountById(created.id, testUser);
            expect(account).toBeNull();
        });
    });

    // ── updateAccount ──────────────────────────────────────────────────

    describe('updateAccount', () => {
        it('should update the account name', async () => {
            const created = await accountService.createAccount(
                { name: 'Old Name', account: '12345678', routing: '021000021' },
                testUser
            );

            const updated = await accountService.updateAccount(created.id, { name: 'New Name' }, testUser);
            expect(updated.name).toBe('New Name');
            expect(updated.account).toBe('12345678'); // unchanged
        });

        it('should update the institution', async () => {
            const created = await accountService.createAccount(
                { name: 'Checking', institution: 'Old Bank', account: '12345678', routing: '021000021' },
                testUser
            );

            const updated = await accountService.updateAccount(
                created.id,
                { institution: 'New Bank' },
                testUser
            );
            expect(updated.institution).toBe('New Bank');
        });

        it('should update multiple fields at once', async () => {
            const created = await accountService.createAccount(
                { name: 'Checking', account: '12345678', routing: '021000021' },
                testUser
            );

            const updated = await accountService.updateAccount(
                created.id,
                { name: 'Updated', account: '99999999', routing: '000000000' },
                testUser
            );
            expect(updated.name).toBe('Updated');
            expect(updated.account).toBe('99999999');
            expect(updated.routing).toBe('000000000');
        });

        it('should throw when account not found', async () => {
            await expect(
                accountService.updateAccount(
                    '550e8400-e29b-41d4-a716-446655440000',
                    { name: 'New' },
                    testUser
                )
            ).rejects.toThrow('Account not found');
        });

        it('should throw when account belongs to another user', async () => {
            const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');
            const created = await accountService.createAccount(
                { name: 'Other Account', account: '12345678', routing: '021000021' },
                otherUser
            );

            await expect(
                accountService.updateAccount(created.id, { name: 'Hijacked' }, testUser)
            ).rejects.toThrow('Account not found');
        });
    });

    // ── deleteAccount ──────────────────────────────────────────────────

    describe('deleteAccount', () => {
        it('should delete the account', async () => {
            const created = await accountService.createAccount(
                { name: 'To Delete', account: '12345678', routing: '021000021' },
                testUser
            );

            await accountService.deleteAccount(created.id, testUser);

            const accounts = await accountService.getAccounts(testUser);
            expect(accounts).toHaveLength(0);
        });

        it('should throw when account not found', async () => {
            await expect(
                accountService.deleteAccount('550e8400-e29b-41d4-a716-446655440000', testUser)
            ).rejects.toThrow('Account not found');
        });

        it('should throw when account belongs to another user', async () => {
            const otherUser = await userService.createUser('Other', 'other@example.com', 'password123');
            const created = await accountService.createAccount(
                { name: 'Protected', account: '12345678', routing: '021000021' },
                otherUser
            );

            await expect(
                accountService.deleteAccount(created.id, testUser)
            ).rejects.toThrow('Account not found');
        });

        it('should not affect other accounts', async () => {
            const account1 = await accountService.createAccount(
                { name: 'Keep', account: '11111111', routing: '021000021' },
                testUser
            );
            const account2 = await accountService.createAccount(
                { name: 'Delete', account: '22222222', routing: '021000089' },
                testUser
            );

            await accountService.deleteAccount(account2.id, testUser);

            const remaining = await accountService.getAccounts(testUser);
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe(account1.id);
        });

        it('should throw when the account has existing transactions', async () => {
            const db = getTestDB();

            const created = await accountService.createAccount(
                { name: 'Has Transactions', account: '12345678', routing: '021000021' },
                testUser
            );

            // Seed a minimal UploadRecord so the Transaction FK is satisfied
            const upload = await db.save(UploadRecord, {
                user: testUser,
                mapping: {},
                availableColumns: [],
            });

            // Fetch the AccountEntity to satisfy the ManyToOne relation
            const accountEntity = await db.findOneByOrFail(AccountEntity, { id: created.id });

            await db.save(TransactionEntity, {
                account: accountEntity,
                upload,
                amount: 42.0,
                date: new Date('2024-01-01'),
                status: 'completed' as const,
                raw: {},
            });

            await expect(
                accountService.deleteAccount(created.id, testUser)
            ).rejects.toThrow('Cannot delete account with existing transactions');

            // Account should still exist
            const accounts = await accountService.getAccounts(testUser);
            expect(accounts).toHaveLength(1);
        });

        it('should succeed when the account has no transactions', async () => {
            const created = await accountService.createAccount(
                { name: 'No Transactions', account: '12345678', routing: '021000021' },
                testUser
            );

            // Should not throw
            await expect(
                accountService.deleteAccount(created.id, testUser)
            ).resolves.toBeUndefined();
        });
    });
});
