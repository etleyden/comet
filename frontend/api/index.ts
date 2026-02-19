// Re-export all API service modules
export { authApi } from './services/authApi';
export { postsApi } from './services/postsApi';
export { healthApi } from './services/healthApi';
export { accountsApi } from './services/accountsApi';
export { transactionsApi } from './services/transactionsApi';

// Re-export the low-level client for escape-hatch usage
export { default as ApiClient } from './apiClient';
