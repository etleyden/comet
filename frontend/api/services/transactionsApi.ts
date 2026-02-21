import type {
    ApiResponse,
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
     * Fetches all transactions for the current user.
     */
    getTransactions(): Promise<ApiResponse<GetTransactionsResponse>> {
        return ApiClient.get<ApiResponse<GetTransactionsResponse>>('/api/transactions');
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
