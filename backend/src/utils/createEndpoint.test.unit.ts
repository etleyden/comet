import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createEndpoint } from './createEndpoint';

describe('createEndpoint', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should call handler and return success response', async () => {
    const handler = vi.fn().mockResolvedValue({ message: 'hello' });
    const middleware = createEndpoint({ handler });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: { message: 'hello' },
    });
  });

  it('should validate body input with schema and pass validated data to handler', async () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number(),
    });
    const handler = vi.fn().mockResolvedValue({ ok: true });

    mockReq.body = { name: 'Test', age: 25 };

    const middleware = createEndpoint({ schema, handler });
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(
      { name: 'Test', age: 25 },
      mockReq,
      mockRes
    );
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: { ok: true },
    });
  });

  it('should call next with ZodError when validation fails', async () => {
    const schema = z.object({
      name: z.string().min(1),
    });
    const handler = vi.fn();

    mockReq.body = { name: '' }; // Too short

    const middleware = createEndpoint({ schema, handler });
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(expect.any(z.ZodError));
  });

  it('should read input from query when inputSource is "query"', async () => {
    const handler = vi.fn().mockResolvedValue({ items: [] });
    mockReq.query = { page: '1', limit: '10' };

    const middleware = createEndpoint({ inputSource: 'query', handler });
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(handler).toHaveBeenCalledWith(
      { page: '1', limit: '10' },
      mockReq,
      mockRes
    );
  });

  it('should call next with error when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));

    const middleware = createEndpoint({ handler });
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
