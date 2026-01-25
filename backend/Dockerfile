# Backend Dockerfile
FROM node:22

# Set working directory
WORKDIR /app

# Set environment to development
ENV NODE_ENV=development

# Expose the backend port
EXPOSE 86 9229

# Install dependencies and start dev server
CMD ["sh", "-c", "cd /workspace && npm install --workspaces && npm run dev:backend"]