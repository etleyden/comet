import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type { UploadTransactionsResponse, GetTransactionsResponse } from 'shared';
import { TransactionService } from '../services/transactionService';

const GetTransactionsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
});

const UploadTransactionsSchema = z.object({
    accountId: z.string().uuid('A valid account ID is required'),
    mapping: z.record(z.string(), z.string()),
    transactions: z
        .array(z.record(z.string(), z.any()))
        .min(1, 'At least one transaction is required'),
});

export function transactionRoutes(app: Express) {
    const transactionService = new TransactionService();

    // GET /api/transactions - Get paginated transactions for current user (requires authentication)
    app.get(
        '/api/transactions',
        requireAuth(),
        createEndpoint<z.infer<typeof GetTransactionsSchema>, GetTransactionsResponse, AuthenticatedRequest>({
            inputSource: 'query',
            schema: GetTransactionsSchema,
            handler: async (input, req): Promise<GetTransactionsResponse> => {
                return transactionService.getTransactions({
                    user: req.user,
                    page: input.page,
                    limit: input.limit,
                });
            },
        })
    );

    // POST /api/transactions/upload - Upload transactions (requires authentication)
    app.post(
        '/api/transactions/upload',
        requireAuth(),
        createEndpoint<
            z.infer<typeof UploadTransactionsSchema>,
            UploadTransactionsResponse,
            AuthenticatedRequest
        >({
            schema: UploadTransactionsSchema,
            handler: async (input, req): Promise<UploadTransactionsResponse> => {
                return transactionService.uploadTransactions({
                    accountId: input.accountId,
                    mapping: input.mapping,
                    transactions: input.transactions,
                    user: req.user,
                });
            },
        })
    );
}
