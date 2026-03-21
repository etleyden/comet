import 'reflect-metadata';
import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { AppDataSource } from './data-source';
import { validateEnv } from './utils/validateEnv';

// Only load .env file in development — in production, env vars come from the
// deployment platform (Docker environment: / Coolify settings).
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: '../.env' });
}

validateEnv(['DB_USERNAME', 'DB_PASSWORD', 'DB_NAME', 'RESEND_API_KEY']);

const app = express();
const PORT = process.env.API_PORT || 86;
const USE_HTTPS = process.env.USE_HTTPS !== 'false'; // Default to true

// Middleware
app.use(
  cors({
    origin: [
      'https://localhost:3000',
      'http://localhost:3000',
      'https://localhost:5173',
      process.env.FRONTEND_URL || 'https://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(cookieParser());

// Register all routes
registerRoutes(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize the database connection before starting the server
AppDataSource.initialize()
  .then(async () => {
    console.log('Database connected successfully!');

    // If application tables are missing (fresh or partially-initialized DB), sync the schema
    // in non-production environments. In production, rely on migrations instead.
    // The "user" table is a good indicator of whether the application tables exist.
    const appTables = await AppDataSource.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user'`
    );
    if (process.env.NODE_ENV !== 'production' && appTables.length === 0) {
      console.log(
        'Application tables not found — running schema synchronization (non-production)…'
      );
      await AppDataSource.synchronize();
      console.log('Schema synchronized.');
    } else if (process.env.NODE_ENV === 'production' && appTables.length === 0) {
      console.warn(
        'Application tables not found in production. Ensure migrations have been executed and `migrationsRun` is correctly configured.'
      );
    }

    // Seed initial admin user from env vars (if configured)
    const { UserService } = await import('./services/userService');
    await new UserService().seedAdminUser();

    if (USE_HTTPS) {
      // Load SSL certificates
      const certPath = path.join(__dirname, '../../certs');
      const httpsOptions = {
        key: fs.readFileSync(path.join(certPath, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(certPath, 'localhost-cert.pem')),
      };

      // Start HTTPS server
      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`Server running on https://localhost:${PORT}`);
      });
    } else {
      // Start HTTP server
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  })
  .catch(error => {
    console.error('Error during Data Source initialization', error);
    process.exit(1);
  });
