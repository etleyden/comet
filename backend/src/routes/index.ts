import { Express } from 'express';
import { userRoutes } from './userRoutes';
import { accountRoutes } from './accountRoutes';
import { transactionRoutes } from './transactionRoutes';
import { uploadRecordRoutes } from './uploadRecordRoutes';

export function registerRoutes(app: Express) {
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  userRoutes(app);
  accountRoutes(app);
  transactionRoutes(app);
  uploadRecordRoutes(app);
}
