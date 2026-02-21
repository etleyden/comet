import { Request, Response, NextFunction } from 'express';
import { EndpointConfig } from '../types/api';

export function createEndpoint<TInput, TOutput, TReq extends Request = Request>(
  config: EndpointConfig<TInput, TOutput, TReq>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input if schema provided
      let input: TInput;
      const dataSource =
        config.inputSource === 'query'
          ? req.query
          : config.inputSource === 'both'
            ? { ...req.query, ...req.body }
            : req.body;

      if (config.schema) {
        input = config.schema.parse(dataSource);
      } else {
        input = dataSource as TInput;
      }

      // Execute handler — cast is safe because middleware (e.g. requireAuth)
      // has already validated and attached the required properties to req
      const result = await config.handler(input, req as TReq, res);

      // Send response
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
