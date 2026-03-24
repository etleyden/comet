// ─── Re-usable extensible types ──────────────────────────────

export const Role = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface Pagination {
  page: number;
  limit: number;
}
// ─── Core Entity Types ───────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  requiresPasswordReset: boolean;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
}

export interface UploadRecord {
  id: string;
  userId: string;
  mapping: Record<string, string>;
  availableColumns: string[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  vendorLabel?: string;
  vendorId?: string;
  categoryLabel?: string;
  description?: string;
  status: 'pending' | 'completed' | 'cancelled';
  accountId: string;
  categoryId?: string;
}

export interface Account {
  id: string;
  name: string;
  institution?: string;
  account?: string;
  routing?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Vendor {
  id: string;
  name: string;
  url?: string;
  logoUrl?: string;
  transactionCount?: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt?: string;
}

// ─── API Response Wrapper ────────────────────────────────────────────

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

// ─── Auth API Types ──────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthUser extends User {
  token: string;
}

export interface LogoutResponse {
  success: boolean;
}

export interface ResetPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordWithTokenRequest {
  token: string;
  newPassword: string;
}

export interface ValidateResetTokenRequest {
  token: string;
}

// ─── Posts API Types ─────────────────────────────────────────────────

export interface CreatePostRequest {
  title: string;
  content: string;
}

// ─── Accounts API Types ──────────────────────────────────────────────

export interface CreateAccountRequest {
  name: string;
  institution?: string;
  account?: string;
  routing?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  institution?: string;
  account?: string;
  routing?: string;
}

export interface DeleteAccountResponse {
  deleted: boolean;
}

// ─── Transactions API Types ──────────────────────────────────────────

export interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  accountIds?: string[];
  vendors?: string[];
  /** Pass null as an element to include transactions with no category assigned, e.g. [null, 'uuid-xyz'] */
  categoryIds?: (string | null)[];
  amountMin?: number;
  amountMax?: number;
}

export interface GetTransactionsRequest extends Pagination {
  filter?: TransactionFilters;
}

export interface UploadTransactionsRequest {
  accountId: string;
  mapping: Record<string, string>;
  transactions: Record<string, any>[];
}

/**
 * Canonical list of application-level attribute names used in CSV-to-transaction
 * column mappings. These keys appear in `UploadTransactionsRequest.mapping` and
 * are persisted in `UploadRecord.mapping`.
 *
 * Keep this list in sync with the mapping logic in
 * `TransactionService.uploadTransactions` on the backend.
 */
export const MAPPING_ATTRIBUTES = [
  'date',
  'vendor',
  'description',
  'category',
  'amount',
  'status',
] as const;

/** A single mapping attribute name. */
export type MappingAttribute = (typeof MAPPING_ATTRIBUTES)[number];

export interface UploadTransactionsResponse {
  uploadRecordId: string;
  transactionCount: number;
}

export interface TransactionWithAccount extends Transaction {
  accountName: string;
  categoryName?: string;
  vendorName?: string;
  vendorLogoUrl?: string;
  uploadRecordId?: string;
  uploadCreatedAt?: string;
}

export interface GetTransactionsResponse {
  transactions: TransactionWithAccount[];
  total: number;
}

// ─── Health API Types ────────────────────────────────────────────────

export interface HealthStatus {
  status: string;
}

// ─── Upload Record API Types ─────────────────────────────────────────

export interface GetUploadRecordResponse extends UploadRecord {
  transactionCount: number;
  accountName: string;
}

export interface UpdateUploadRecordRequest {
  mapping: Record<string, string>;
}

export interface DeleteUploadRecordResponse {
  deletedTransactionCount: number;
}

// ─── Vendor API Types ─────────────────────────────────────────────

export interface CreateVendorRequest {
  name: string;
  url?: string;
  logoUrl?: string;
}

export interface UpdateVendorRequest {
  name?: string;
  url?: string;
  logoUrl?: string;
}

export interface SearchVendorsRequest {
  query?: string;
  limit?: number;
}

export interface AssignVendorRequest {
  vendorId: string | null;
}

// ─── HTTP Error Types ─────────────────────────────────────────────

/**
 * Typed error used on both the backend (thrown by services/routes to signal
 * an HTTP error response) and the frontend (thrown by the API client when
 * a non-ok response is received).  The `details` field carries optional
 * structured context such as Zod validation issues.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;

    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** @deprecated Use {@link ApiError} instead. */
export const HttpError = ApiError;
export type HttpError = ApiError;
