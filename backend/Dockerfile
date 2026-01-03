# Backend Dockerfile
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment to development to install devDependencies
ENV NODE_ENV=development

# Install dependencies (including devDependencies)
RUN npm ci || npm install

# Copy the rest of the application code
COPY . .

# Expose the backend port
EXPOSE 86

# Default command for development
CMD ["npx", "nodemon", "--watch", "src/**/*.ts", "--exec", "npx", "ts-node", "src/index.ts"]