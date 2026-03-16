// Re-export all API service modules
export { authApi } from './services/authApi';
export { healthApi } from './services/healthApi';
export { accountsApi } from './services/accountsApi';
export { transactionsApi } from './services/transactionsApi';
export { uploadRecordsApi } from './services/uploadRecordsApi';
export { vendorsApi } from './services/vendorsApi';

// Re-export error handling utilities
export { ApiError, parseApiError } from './errors';

// Re-export the low-level client for escape-hatch usage
export { default as ApiClient } from './apiClient';
