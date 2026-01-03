import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { AppDataSource } from "./data-source";

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 86;

// Middleware
app.use(cors());
app.use(express.json());

// Register all routes
registerRoutes(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize the database connection before starting the server
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully!");

    // Start the server only after the database is connected
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error during Data Source initialization", error);
    process.exit(1);
  });

