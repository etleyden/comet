/**
 * Password validation requirements:
 * - At least 8 characters
 * - At least 1 letter (a–z or A–Z)
 * - At least 1 number
 * - At least 1 special character
 */

export interface PasswordValidationResult {
  valid: boolean;
  /** Human-readable error messages for each failing rule. Empty when valid. */
  errors: string[];
}

export interface PasswordRule {
  /** Short identifier for the rule. */
  id: string;
  /** Human-readable description shown in UI. */
  description: string;
  /** Returns true when the rule passes. */
  test: (password: string) => boolean;
}

/** All password rules, in display order. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'minLength',
    description: 'At least 8 characters',
    test: (p) => p.length >= 8,
  },
  {
    id: 'hasLetter',
    description: 'At least 1 letter',
    test: (p) => /[a-zA-Z]/.test(p),
  },
  {
    id: 'hasNumber',
    description: 'At least 1 number',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'hasSpecial',
    description: 'At least 1 special character',
    test: (p) => /[^a-zA-Z0-9]/.test(p),
  },
];

/**
 * Validates a plain-text password against all {@link PASSWORD_RULES}.
 *
 * @returns A {@link PasswordValidationResult} with `valid` and any `errors`.
 *
 * @example
 * const { valid, errors } = validatePassword('Hunter2!');
 * if (!valid) console.error(errors.join(', '));
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors = PASSWORD_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.description,
  );
  return { valid: errors.length === 0, errors };
}
