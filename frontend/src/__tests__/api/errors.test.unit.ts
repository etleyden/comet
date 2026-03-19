import { describe, it, expect } from 'vitest';
import { ApiError, parseApiError } from '../../../api/errors';

/* ------------------------------------------------------------------ */
/*  ApiError                                                           */
/* ------------------------------------------------------------------ */

describe('ApiError', () => {
  it('stores message, status, and details', () => {
    const err = new ApiError('Not found', 404, { field: 'id' });
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ field: 'id' });
    expect(err.name).toBe('ApiError');
  });

  it('is an instance of Error', () => {
    const err = new ApiError('fail', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('defaults details to undefined', () => {
    const err = new ApiError('bad', 400);
    expect(err.details).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  parseApiError                                                      */
/* ------------------------------------------------------------------ */

describe('parseApiError', () => {
  describe('default template ("Error: ${message}")', () => {
    it('formats message from ApiError', () => {
      const err = new ApiError('Vendor name already exists', 409);
      expect(parseApiError(err)).toBe('Error: Vendor name already exists');
    });

    it('formats message from plain Error', () => {
      expect(parseApiError(new Error('Login failed'))).toBe('Error: Login failed');
    });

    it('uses fallback for empty Error message', () => {
      expect(parseApiError(new Error(''))).toBe('Error: Something went wrong');
      expect(parseApiError(new Error('   '))).toBe('Error: Something went wrong');
    });

    it('formats message from string errors', () => {
      expect(parseApiError('Network timeout')).toBe('Error: Network timeout');
    });

    it('uses fallback for empty string', () => {
      expect(parseApiError('')).toBe('Error: Something went wrong');
      expect(parseApiError('   ')).toBe('Error: Something went wrong');
    });

    it('uses fallback for unknown types', () => {
      expect(parseApiError(null)).toBe('Error: Something went wrong');
      expect(parseApiError(undefined)).toBe('Error: Something went wrong');
      expect(parseApiError(42)).toBe('Error: Something went wrong');
      expect(parseApiError({})).toBe('Error: Something went wrong');
    });
  });

  describe('custom template', () => {
    it('interpolates ${message} placeholder', () => {
      const err = new ApiError('Account not found', 404);
      expect(parseApiError(err, 'Failed to save: ${message}')).toBe(
        'Failed to save: Account not found'
      );
    });

    it('treats template with no placeholder as a static override', () => {
      expect(parseApiError(new ApiError('anything', 500), 'Operation failed')).toBe(
        'Operation failed'
      );
    });

    it('applies template to string errors', () => {
      expect(parseApiError('timeout', 'Could not connect: ${message}')).toBe(
        'Could not connect: timeout'
      );
    });
  });
});
