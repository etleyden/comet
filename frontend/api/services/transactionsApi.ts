import type {
    ApiResponse,
    TransactionFilters,
    GetTransactionsRequest,
    UploadTransactionsRequest,
    UploadTransactionsResponse,
    GetTransactionsResponse,
} from 'shared';
import ApiClient from '../apiClient';

/**
 * Transactions API service — typed wrappers for transaction endpoints.
 */
export const transactionsApi = {
    /**
     * GET /api/transactions
     * Fetches paginated and optionally filtered transactions for the current user.
     */
    getTransactions(request?: Pick<GetTransactionsRequest, 'page' | 'limit'> & { filter?: TransactionFilters }): Promise<ApiResponse<GetTransactionsResponse>> {
        const params: Record<string, string | number> = {};

        if (request?.page !== undefined) params.page = request.page;
        if (request?.limit !== undefined) params.limit = request.limit;

        return ApiClient.post<ApiResponse<GetTransactionsResponse>>(
            '/api/transactions',
            { filter: request?.filter },
            { params: Object.keys(params).length > 0 ? params : undefined },
        );
    },

    /**
     * POST /api/transactions/upload
     * Uploads parsed CSV transactions with column mappings to an account.
     */
    uploadTransactions(
        data: UploadTransactionsRequest
    ): Promise<ApiResponse<UploadTransactionsResponse>> {
        return ApiClient.post<ApiResponse<UploadTransactionsResponse>>(
            '/api/transactions/upload',
            data
        );
    },
};
