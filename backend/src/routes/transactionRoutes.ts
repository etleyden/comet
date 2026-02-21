import { Express } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type { UploadTransactionsResponse, GetTransactionsResponse } from 'shared';
import { TransactionService } from '../services/transactionService';

// Accepts a single comma-separated string or an array of strings and returns string[]
const csvOrArray = (schema: z.ZodString = z.string()) =>
    z.preprocess(
        (v) =>
            Array.isArray(v)
                ? v
                : typeof v === 'string'
                    ? v.split(',').filter(Boolean)
                    : [],
        z.array(schema)
    );

const GetTransactionsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(25),
    filter: z.object({
        // Date range — YYYY-MM-DD only
        dateFrom: z.string().date().optional(),
        dateTo: z.string().date().optional(),
        // Account filter
        accountIds: csvOrArray(z.string().uuid()).optional(),
        // Vendor / description search terms
        vendors: csvOrArray().optional(),
        // Category filter — pass null in the array to include uncategorized transactions
        categoryIds: z.preprocess(
            (v) => Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').filter(Boolean) : [],
            z.array(z.string().uuid().nullable())
        ).optional(),
        // Amount range
        amountMin: z.coerce.number().optional(),
        amountMax: z.coerce.number().optional(),
    }).optional(),
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

    // POST /api/transactions/search - Get paginated/filtered transactions for current user (requires authentication)
    app.post(
        '/api/transactions',
        requireAuth(),
        createEndpoint<z.infer<typeof GetTransactionsSchema>, GetTransactionsResponse, AuthenticatedRequest>({
            inputSource: 'both',
            schema: GetTransactionsSchema,
            handler: async (input, req): Promise<GetTransactionsResponse> => {
                return transactionService.getTransactions({
                    user: req.user,
                    page: input.page,
                    limit: input.limit,
                    filter: input.filter,
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
