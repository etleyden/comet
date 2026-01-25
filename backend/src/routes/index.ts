import { Express } from 'express';
import { userRoutes } from './userRoutes';
import { postRoutes } from './postRoutes';

export function registerRoutes(app: Express) {
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  userRoutes(app);
  postRoutes(app);
}
