import { vi } from 'vitest';

export const mockResendSend = vi.fn().mockResolvedValue({ id: 'mock-email-id' });

export class Resend {
  emails = { send: mockResendSend };
}
