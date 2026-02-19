import type {
    ApiResponse,
    UploadTransactionsRequest,
    UploadTransactionsResponse,
} from 'shared';
import ApiClient from '../apiClient';

/**
 * Transactions API service — typed wrappers for transaction endpoints.
 */
export const transactionsApi = {
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
