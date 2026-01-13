import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export type ApiHandler<TInput = any, TOutput = any> = (
  input: TInput,
  req: Request,
  res: Response
) => Promise<TOutput> | TOutput;

export interface EndpointConfig<TInput = any, TOutput = any> {
  schema?: z.ZodSchema<TInput>;
  handler: ApiHandler<TInput, TOutput>;
  description?: string;
  // Optionally specify where to read input from (defaults to body)
  inputSource?: 'body' | 'query';
}