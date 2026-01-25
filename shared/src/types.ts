// User types
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

// Session types
export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
}

// Transaction types
export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: Date;
  accountId: string;
}

// Account types
export interface Account {
  id: string;
  name: string;
  balance: number;
}

// API Response types
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };
