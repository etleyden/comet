import { getDB } from '../data-source';
import TransactionEntity from '../entities/Transaction';
import AccountEntity from '../entities/Account';
import User from '../entities/User';
import type { Account, CreateAccountRequest, UpdateAccountRequest } from 'shared';

export class AccountService {
    /**
     * Maps an AccountEntity to the shared Account type.
     */
    private toAccount(entity: AccountEntity): Account {
        return {
            id: entity.id,
            name: entity.name,
            institution: entity.institution,
            account: entity.account!,
            routing: entity.routing!,
        };
    }

    /**
     * Creates a new account and associates it with the given user.
     */
    async createAccount(input: CreateAccountRequest, user: User): Promise<Account> {
        const db = getDB();

        const account = new AccountEntity();
        account.name = input.name;
        account.institution = input.institution;
        account.account = input.account;
        account.routing = input.routing;

        const savedAccount = await db.save(AccountEntity, account);

        // Associate the account with the user
        await db
            .createQueryBuilder()
            .relation(AccountEntity, 'users')
            .of(savedAccount)
            .add(user.id);

        return this.toAccount(savedAccount);
    }

    /**
     * Returns all accounts associated with the given user.
     */
    async getAccounts(user: User): Promise<Account[]> {
        const db = getDB();

        const accounts = await db
            .createQueryBuilder(AccountEntity, 'account')
            .innerJoin('account.users', 'user')
            .where('user.id = :userId', { userId: user.id })
            .getMany();

        return accounts.map((a) => this.toAccount(a));
    }

    /**
     * Returns a single account by ID, only if it belongs to the given user.
     * Returns null if not found or not owned by the user.
     */
    async getAccountById(accountId: string, user: User): Promise<Account | null> {
        const db = getDB();

        const account = await db
            .createQueryBuilder(AccountEntity, 'account')
            .innerJoin('account.users', 'user')
            .where('account.id = :accountId', { accountId })
            .andWhere('user.id = :userId', { userId: user.id })
            .getOne();

        return account ? this.toAccount(account) : null;
    }

    /**
     * Updates an account. Only fields present in the input are changed.
     * Throws if the account is not found or not owned by the user.
     */
    async updateAccount(accountId: string, input: UpdateAccountRequest, user: User): Promise<Account> {
        const db = getDB();

        // Verify ownership
        const existing = await db
            .createQueryBuilder(AccountEntity, 'account')
            .innerJoin('account.users', 'user')
            .where('account.id = :accountId', { accountId })
            .andWhere('user.id = :userId', { userId: user.id })
            .getOne();

        if (!existing) {
            throw new Error('Account not found');
        }

        // Apply partial updates
        if (input.name !== undefined) existing.name = input.name;
        if (input.institution !== undefined) existing.institution = input.institution;
        if (input.account !== undefined) existing.account = input.account;
        if (input.routing !== undefined) existing.routing = input.routing;

        const saved = await db.save(AccountEntity, existing);
        return this.toAccount(saved);
    }

    /**
     * Deletes an account. Throws if not found or not owned by the user.
     */
    async deleteAccount(accountId: string, user: User): Promise<void> {
        const db = getDB();

        // Verify ownership
        const existing = await db
            .createQueryBuilder(AccountEntity, 'account')
            .innerJoin('account.users', 'user')
            .where('account.id = :accountId', { accountId })
            .andWhere('user.id = :userId', { userId: user.id })
            .getOne();

        if (!existing) {
            throw new Error('Account not found');
        }

        const hasTransactions = await db
            .createQueryBuilder(TransactionEntity, 'transaction')
            .where('transaction.accountId = :accountId', { accountId })
            .getCount();

        if (hasTransactions > 0) {
            throw new Error('Cannot delete account with existing transactions');
        }

        // Remove the user-account association first, then delete the account
        await db
            .createQueryBuilder()
            .relation(AccountEntity, 'users')
            .of(existing)
            .remove(user.id);

        await db.remove(AccountEntity, existing);
    }
}
