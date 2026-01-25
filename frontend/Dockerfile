# Frontend Dockerfile
FROM node:22

# Set working directory
WORKDIR /app

# Install dependencies will happen via volume mounts
# The entrypoint script will handle npm install

EXPOSE 5173

# Install dependencies and start dev server
CMD ["sh", "-c", "cd /workspace && npm install --workspaces && npm run dev:frontend"]