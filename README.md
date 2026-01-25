# Ethan's Web Template

This repository serves as a jumping point for building a web application. The tech stack is already configured for you - just follow the setup steps below and start developing your application.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + TypeScript + TypeORM
- **Database**: PostgreSQL 17
- **Development**: Docker Compose for containerized development

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
git clone <your-repo-url>
cd web-template
```

### 2. Install Dependencies

```bash
npm install --workspaces
```

This will install dependencies for both frontend and backend workspaces.

### 3. Run Setup Script

Run the automated setup script to generate SSL certificates and create your `.env` file:

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

**Note**: The certificates are locally-trusted via mkcert, so you won't see browser security warnings! 🎉

## Development

### Running Locally (Without Docker)

If you prefer to run the services locally:

1. Make sure PostgreSQL is running locally
2. Update `.env` to point to your local database:
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
web-template/
├── backend/              # Express.js backend
│   ├── src/
│   │   ├── entities/    # TypeORM entities
│   │   ├── routes/      # API routes
│   │   ├── middleware/  # Express middleware
│   │   ├── utils/       # Utility functions
│   │   └── index.ts     # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/            # React frontend
│   ├── src/
│   │   ├── assets/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## Available Scripts

### Root Level

- `npm install` - Install all dependencies (frontend + backend)
- `npm run verify` - Verify setup is complete and ready
- `npm run dev` - Run both frontend and backend locally
- `npm run dev:backend` - Run only backend locally
- `npm run dev:frontend` - Run only frontend locally
- `npm run clean` - Clean Docker system (use with caution)

### Backend (`backend/` directory)

- `npm run dev` - Start backend in development mode with hot reload
- `npm run build` - Build backend for production
- `npm start` - Start production build

### Frontend (`frontend/` directory)

- `npm run dev` - Start frontend dev server
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Troubleshooting

### Docker Issues

If you encounter issues with Docker:

```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: This will delete your database data)
docker-compose down -v

# Rebuild containers
docker-compose up --build
```

### Port Conflicts

If ports 86, 3000, or 5431 are already in use, you can change them in `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "YOUR_PORT:86"  # Change YOUR_PORT
  frontend:
    ports:
      - "YOUR_PORT:5173"  # Change YOUR_PORT
  postgres:
    ports:
      - "YOUR_PORT:5432"  # Change YOUR_PORT
```

### Database Connection Issues

If the backend can't connect to the database:

1. Ensure Docker containers are running: `docker ps`
2. Check database logs: `docker logs db`
3. Verify environment variables in `.env` match `docker-compose.yml`

## Using This Template

This repository is configured as a GitHub template. To create your own project:

1. Click "Use this template" on GitHub
2. Create your new repository
3. Clone and follow the setup steps above

[Learn more about template repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository)

## Contributing

Feel free to open issues or submit pull requests if you find bugs or have suggestions for improvements!

## License

MIT
