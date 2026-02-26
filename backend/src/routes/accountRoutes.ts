import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type { Account, DeleteAccountResponse } from 'shared';
import { AccountService } from '../services/accountService';

const CreateAccountSchema = z.object({
    name: z.string().min(1, 'Account name is required'),
    institution: z.string().optional(),
    account: z.string().min(1, 'Account number is required'),
    routing: z.string().min(1, 'Routing number is required'),
});

const UpdateAccountSchema = z.object({
    name: z.string().min(1).optional(),
    institution: z.string().optional(),
    account: z.string().min(1).optional(),
    routing: z.string().min(1).optional(),
});

const accountService = new AccountService();

export function accountRoutes(app: Express) {
    // POST /api/accounts - Create account
    app.post(
        '/api/accounts',
        requireAuth(),
        createEndpoint<z.infer<typeof CreateAccountSchema>, Account, AuthenticatedRequest>({
            schema: CreateAccountSchema,
            handler: async (input, req): Promise<Account> => {
                return accountService.createAccount(input, req.user);
            },
        })
    );

    // GET /api/accounts - Get all accounts for current user
    app.get(
        '/api/accounts',
        requireAuth(),
        createEndpoint<unknown, Account[], AuthenticatedRequest>({
            inputSource: 'query',
            handler: async (_input, req): Promise<Account[]> => {
                return accountService.getAccounts(req.user);
            },
        })
    );

    // GET /api/accounts/:id - Get a single account by ID
    app.get(
        '/api/accounts/:id',
        requireAuth(),
        createEndpoint<unknown, Account, AuthenticatedRequest>({
            inputSource: 'query',
            handler: async (_input, req): Promise<Account> => {
                const account = await accountService.getAccountById(req.params.id, req.user);
                if (!account) {
                    throw new Error('Account not found');
                }
                return account;
            },
        })
    );

    // PUT /api/accounts/:id - Update an account
    app.put(
        '/api/accounts/:id',
        requireAuth(),
        createEndpoint<z.infer<typeof UpdateAccountSchema>, Account, AuthenticatedRequest>({
            schema: UpdateAccountSchema,
            handler: async (input, req): Promise<Account> => {
                return accountService.updateAccount(req.params.id, input, req.user);
            },
        })
    );

    // DELETE /api/accounts/:id - Delete an account
    app.delete(
        '/api/accounts/:id',
        requireAuth(),
        createEndpoint<unknown, DeleteAccountResponse, AuthenticatedRequest>({
            handler: async (_input, req): Promise<DeleteAccountResponse> => {
                await accountService.deleteAccount(req.params.id, req.user);
                return { deleted: true };
            },
        })
    );
}
