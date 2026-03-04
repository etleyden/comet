import type {
    ApiResponse,
    Account,
    CreateAccountRequest,
    UpdateAccountRequest,
    DeleteAccountResponse,
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

    /**
     * GET /api/accounts/:id
     * Gets a single account by ID.
     */
    getAccount(id: string): Promise<ApiResponse<Account>> {
        return ApiClient.get<ApiResponse<Account>>(`/api/accounts/${id}`);
    },

    /**
     * PUT /api/accounts/:id
     * Updates an account.
     */
    updateAccount(id: string, data: UpdateAccountRequest): Promise<ApiResponse<Account>> {
        return ApiClient.put<ApiResponse<Account>>(`/api/accounts/${id}`, data);
    },

    /**
     * DELETE /api/accounts/:id
     * Deletes an account.
     */
    deleteAccount(id: string): Promise<ApiResponse<DeleteAccountResponse>> {
        return ApiClient.delete<ApiResponse<DeleteAccountResponse>>(`/api/accounts/${id}`);
    },
};
