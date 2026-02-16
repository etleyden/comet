// ─── Core Entity Types ───────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
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
  createdAt: Date;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  accountId: string;
  categoryId?: string;
}

export interface Account {
  id: string;
  account: string;
  routing: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt?: string;
}

// ─── API Response Wrapper ────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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

// ─── Posts API Types ─────────────────────────────────────────────────

export interface CreatePostRequest {
  title: string;
  content: string;
}

// ─── Health API Types ────────────────────────────────────────────────

export interface HealthStatus {
  status: string;
}
