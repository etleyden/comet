import type {
    ApiResponse,
    Account,
    CreateAccountRequest,
} from 'shared';
import ApiClient from '../apiClient';

/**
 * Accounts API service — typed wrappers for account endpoints.
 */
export const accountsApi = {
    /**
     * POST /api/accounts
     * Creates a new account for the current user.
     */
    createAccount(data: CreateAccountRequest): Promise<ApiResponse<Account>> {
        return ApiClient.post<ApiResponse<Account>>('/api/accounts', data);
    },

    /**
     * GET /api/accounts
     * Gets all accounts for the current user.
     */
    getAccounts(): Promise<ApiResponse<Account[]>> {
        return ApiClient.get<ApiResponse<Account[]>>('/api/accounts');
    },
};
