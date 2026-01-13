import { Request, Response, NextFunction } from 'express';
import { EndpointConfig } from '../types/api';

export function createEndpoint<TInput, TOutput>(
  config: EndpointConfig<TInput, TOutput>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input if schema provided
      let input: TInput;
      const dataSource = config.inputSource === 'query' ? req.query : req.body;
      
      if (config.schema) {
        input = config.schema.parse(dataSource);
      } else {
        input = dataSource as TInput;
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