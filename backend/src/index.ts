import 'reflect-metadata';
import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { registerRoutes } from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { AppDataSource } from "./data-source";

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 86;
const USE_HTTPS = process.env.USE_HTTPS !== 'false'; // Default to true

// Middleware
app.use(cors({
  origin: [
    'https://localhost:3000',
    'http://localhost:3000',
    'https://localhost:5173',
    process.env.FRONTEND_URL || 'https://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());

// Register all routes
registerRoutes(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize the database connection before starting the server
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully!");

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
  .catch((error) => {
    console.error("Error during Data Source initialization", error);
    process.exit(1);
  });

