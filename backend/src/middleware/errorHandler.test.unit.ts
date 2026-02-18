import { describe, it, expect } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorHandler } from './errorHandler';
import { vi } from 'vitest';

function createMocks() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('errorHandler', () => {
  it('should return 400 with validation details for ZodError', () => {
    const { req, res, next } = createMocks();

    const zodError = new ZodError([
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'String must contain at least 1 character(s)',
        path: ['name'],
      },
    ]);

    errorHandler(zodError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Validation error',
        details: expect.any(Array),
      })
    );
  });

  it('should return the error status and message for generic errors', () => {
    const { req, res, next } = createMocks();

    const error = { status: 404, message: 'Not found' };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Not found',
    });
  });

  it('should default to 500 status when error has no status', () => {
    const { req, res, next } = createMocks();

    const error = new Error('Something went wrong');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Something went wrong',
    });
  });

  it('should default to "Internal server error" when error has no message', () => {
    const { req, res, next } = createMocks();

    errorHandler({}, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Internal server error',
    });
  });
});
