import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type { Account, CreateAccountRequest } from 'shared';
import { getDB } from '../data-source';
import AccountEntity from '../entities/Account';

const CreateAccountSchema = z.object({
    name: z.string().min(1, 'Account name is required'),
    institution: z.string().optional(),
    account: z.string().min(1, 'Account number is required'),
    routing: z.string().min(1, 'Routing number is required'),
});

export function accountRoutes(app: Express) {
    // POST /api/accounts - Create account (requires authentication)
    app.post(
        '/api/accounts',
        requireAuth(),
        createEndpoint<z.infer<typeof CreateAccountSchema>, Account, AuthenticatedRequest>({
            schema: CreateAccountSchema,
            handler: async (input, req): Promise<Account> => {
                const db = getDB();

                // Create the account entity
                const account = new AccountEntity();
                account.name = input.name;
                account.institution = input.institution;
                account.account = input.account;
                account.routing = input.routing;

                // Save the account
                const savedAccount = await db.save(AccountEntity, account);

                // Associate the account with the current user
                await db
                    .createQueryBuilder()
                    .relation(AccountEntity, 'users')
                    .of(savedAccount)
                    .add(req.user.id);

                // Return the account data
                return {
                    id: savedAccount.id,
                    name: savedAccount.name,
                    institution: savedAccount.institution,
                    account: savedAccount.account!,
                    routing: savedAccount.routing!,
                };
            },
        })
    );

    // GET /api/accounts - Get all accounts for current user (requires authentication)
    app.get(
        '/api/accounts',
        requireAuth(),
        createEndpoint<unknown, Account[], AuthenticatedRequest>({
            inputSource: 'query',
            handler: async (input, req): Promise<Account[]> => {
                const db = getDB();

                // Get accounts associated with the current user
                const accounts = await db
                    .createQueryBuilder(AccountEntity, 'account')
                    .innerJoin('account.users', 'user')
                    .where('user.id = :userId', { userId: req.user.id })
                    .getMany();

                return accounts.map(account => ({
                    id: account.id,
                    name: account.name,
                    institution: account.institution,
                    account: account.account!,
                    routing: account.routing!,
                }));
            },
        })
    );
}
