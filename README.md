# Comet

A personal finance application for tracking your personal finances. Core objective is to provide extensive analytics for data-focused users.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + MUI
- **Backend**: Express.js + TypeScript + TypeORM
- **Database**: PostgreSQL 17
- **Development**: Docker Compose for containerized development

## Features

- User authentication with session management
- Link multiple bank accounts to a user profile
- Upload CSV transaction files and map columns interactively
- Store transactions with amounts, dates, status, categories, and raw source data
- User-defined transaction categories

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Docker and Docker Compose
- Git
- **mkcert** - For locally-trusted development certificates
  - Windows: `choco install mkcert` or [download from releases](https://github.com/FiloSottile/mkcert/releases)
  - macOS: `brew install mkcert`
  - Linux: See [mkcert installation guide](https://github.com/FiloSottile/mkcert#installation)
  - After installing: Run `mkcert -install` to set up the local CA

## Quick Start

### 1. Clone the Repository

```bash
git clone git@github.com:etleyden/comet.git
cd comet
```

### 2. Install Dependencies

```bash
npm install --workspaces
```

### 3. Run Setup Script

```bash
npm run setup
```

This will:

- Copy `.env.example` to `.env` (if it doesn't exist)
- Generate locally-trusted SSL certificates using mkcert
- Create certificate files in the `certs/` directory

**Important**: Make sure you've installed mkcert and run `mkcert -install` before running setup.

After running setup, edit `.env` with your preferred values if needed. The defaults work out of the box:

```env
NODE_ENV=development
API_PORT=86
DB_PORT=5432
DB_HOST=localhost
DB_USERNAME=myuser
DB_PASSWORD=password
DB_NAME=app_db
```

**Note**: Your browser will show a security warning for self-signed certificates. This is expected - click "Advanced" and "Proceed to localhost" to continue.

### 4. Start the Application

```bash
docker-compose up
```

This will:

- Start PostgreSQL database on port 5431 (mapped from container port 5432)
- Start the backend API on port 86
- Start the frontend dev server on port 3000 (mapped from container port 5173)

### 5. Access the Application

- **Frontend**: https://localhost:3000
- **Backend API**: https://localhost:86
- **Database**: localhost:5431

**Important**: Before using the frontend, visit `https://localhost:86/health` in your browser and accept the certificate. Browsers require explicit trust per port — skipping this step will cause CORS errors when the frontend tries to reach the API.

## Development

### Running Locally (Without Docker)

1. Make sure PostgreSQL is running locally
2. Update `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   ```
3. Run the backend:
   ```bash
   npm run dev:backend
   ```
4. In another terminal, run the frontend:
   ```bash
   npm run dev:frontend
   ```

### Project Structure

```
comet/
├── backend/              # Express.js API
│   └── src/
│       ├── entities/     # TypeORM entities (User, Account, Transaction, Category, UploadRecord, Session)
│       ├── routes/       # API route handlers
│       ├── middleware/   # Auth and error-handling middleware
│       ├── services/     # Business logic
│       ├── utils/        # Shared utilities
│       └── index.ts      # Entry point
├── frontend/             # React frontend
│   ├── api/              # API client and service wrappers
│   └── src/
│       ├── components/   # UI components (auth, upload, transaction table)
│       ├── context/      # AuthContext
│       ├── pages/        # Page components (Landing, Login, Home, Upload)
│       └── App.tsx
├── shared/               # Shared TypeScript types
├── docker-compose.yml
└── .env.example
```

## Available Scripts

### Root Level

- `npm install` - Install all dependencies
- `npm run setup` - Generate certs and create `.env`
- `npm run dev` - Run frontend and backend locally
- `npm run dev:backend` - Run only the backend
- `npm run dev:frontend` - Run only the frontend
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run format` - Format all source files with Prettier
- `npm run clean` - Prune Docker system (destructive)

### Backend (`backend/`)

- `npm run dev` - Start with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Start production build
- `npm run test:unit` - Unit tests
- `npm run test:integration` - Integration tests

### Frontend (`frontend/`)

- `npm run dev` - Start Vite dev server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run test:unit` - Unit tests
- `npm run test:integration` - Integration tests

## Troubleshooting

### Docker Issues

```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes database data)
docker-compose down -v

# Rebuild containers
docker-compose up --build
```

### Port Conflicts

If ports 86, 3000, or 5431 are in use, change the host-side port mappings in `docker-compose.yml`.

### Database Connection Issues

1. Ensure containers are running: `docker ps`
2. Check database logs: `docker logs db`
3. Verify `.env` values match `docker-compose.yml`