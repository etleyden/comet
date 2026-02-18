import type { User, Account, CreateAccountRequest, LoginRequest, RegisterRequest } from 'shared';

// ─── User Fixtures ────────────────────────────────────────────────────

export const testUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test User',
  email: 'test@example.com',
};

export const testUser2: User = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Another User',
  email: 'another@example.com',
};

export const testLoginCredentials: LoginRequest = {
  email: 'test@example.com',
  password: 'password123',
};

export const testRegisterData: RegisterRequest = {
  name: 'New User',
  email: 'newuser@example.com',
  password: 'securepassword123',
};

export const TEST_PASSWORD = 'password123';

// ─── Account Fixtures ────────────────────────────────────────────────

export const testAccount: Account = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  name: 'Primary Checking',
  institution: 'Test Bank',
  account: '1234567890',
  routing: '021000021',
};

export const testAccount2: Account = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'Savings Account',
  institution: 'Test Credit Union',
  account: '9876543210',
  routing: '021000089',
};

export const testCreateAccountData: CreateAccountRequest = {
  name: 'New Account',
  institution: 'New Bank',
  account: '1111222233',
  routing: '021000021',
};
