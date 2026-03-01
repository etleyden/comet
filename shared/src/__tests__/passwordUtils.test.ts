import { describe, it, expect } from 'vitest';
import { validatePassword, PASSWORD_RULES } from '../passwordUtils';

describe('PASSWORD_RULES', () => {
  it('should define a rule for each requirement', () => {
    const ids = PASSWORD_RULES.map((r) => r.id);
    expect(ids).toContain('minLength');
    expect(ids).toContain('hasLetter');
    expect(ids).toContain('hasNumber');
    expect(ids).toContain('hasSpecial');
  });
});

describe('validatePassword', () => {
  it('accepts a password that meets all requirements', () => {
    const { valid, errors } = validatePassword('Secure1!');
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rejects a password that is too short', () => {
    const { valid, errors } = validatePassword('Ab1!');
    expect(valid).toBe(false);
    expect(errors.some((e) => /8 characters/i.test(e))).toBe(true);
  });

  it('rejects a password without a letter', () => {
    const { valid, errors } = validatePassword('12345678!');
    expect(valid).toBe(false);
    expect(errors.some((e) => /letter/i.test(e))).toBe(true);
  });

  it('rejects a password without a number', () => {
    const { valid, errors } = validatePassword('Password!');
    expect(valid).toBe(false);
    expect(errors.some((e) => /number/i.test(e))).toBe(true);
  });

  it('rejects a password without a special character', () => {
    const { valid, errors } = validatePassword('Password1');
    expect(valid).toBe(false);
    expect(errors.some((e) => /special/i.test(e))).toBe(true);
  });

  it('reports multiple errors when multiple rules fail', () => {
    const { valid, errors } = validatePassword('abc');
    expect(valid).toBe(false);
    // too short, no number, no special
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it('accepts passwords with various special characters', () => {
    for (const special of ['!', '@', '#', '$', '%', '^', '&', '*', '_', '-', '+', '=']) {
      const { valid } = validatePassword(`Pass1${special}abc`);
      expect(valid).toBe(true);
    }
  });
});
