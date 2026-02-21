import { Request, Response } from 'express';
import { z } from 'zod';
import User from '../entities/User';

/**
 * Request type for routes behind requireAuth() where user is guaranteed.
 * Eliminates the need for non-null assertions (req.user!) in authenticated handlers.
 */
export interface AuthenticatedRequest extends Request {
  user: User;
  authSession: { id: string; userId: string };
}

export type ApiHandler<TInput = unknown, TOutput = unknown, TReq extends Request = Request> = (
  input: TInput,
  req: TReq,
  res: Response
) => Promise<TOutput> | TOutput;

export interface EndpointConfig<TInput = unknown, TOutput = unknown, TReq extends Request = Request> {
  schema?: z.ZodType<TInput, z.ZodTypeDef, unknown>;
  handler: ApiHandler<TInput, TOutput, TReq>;
  description?: string;
  /** Where to read input from (defaults to body) */
  inputSource?: 'body' | 'query';
}
