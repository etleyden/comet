import { Request, Response, NextFunction } from 'express';
import { EndpointConfig } from '../types/api';

export function createEndpoint<TInput, TOutput>(
  config: EndpointConfig<TInput, TOutput>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input if schema provided
      let input: TInput;
      if (config.schema) {
        const dataSource = config.method === 'get' ? req.query : req.body;
        input = config.schema.parse(dataSource);
      } else {
        input = (config.method === 'get' ? req.query : req.body) as TInput;
      }

      // Execute handler
      const result = await config.handler(input, req, res);

      // Send response
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}