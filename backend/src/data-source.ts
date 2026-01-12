import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { entities } from "./entities";

// Load environment variables from .env file at root or use environment variables
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '../.env' });

// Configure the TypeORM DataSource
export const AppDataSource = new DataSource({
    type: "postgres", // Change to your database type (e.g., mysql, sqlite, etc.)
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true, // Set to false in production
    logging: true,
    entities: entities,
    migrations: ["src/migrations/**/*.ts"],
    subscribers: ["src/subscribers/**/*.ts"],
});

export const getDB = () => 
    AppDataSource.manager;