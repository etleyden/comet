import express from 'express';
import cookieParser from 'cookie-parser';
import { registerRoutes } from '../../routes';
import { errorHandler } from '../../middleware/errorHandler';

/**
 * Creates a fully configured Express app for integration testing.
 * Sets up all middleware and routes exactly like the production app,
 * without HTTPS or database initialization.
 */
export function createTestApp() {
    const app = express();

    app.use(express.json());
    app.use(cookieParser());

    registerRoutes(app);
    app.use(errorHandler);

    return app;
}
