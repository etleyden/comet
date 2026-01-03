# Frontend Dockerfile
FROM node:22

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Remove node_modules and package-lock.json to avoid caching issues
RUN rm -rf node_modules package-lock.json

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend application
RUN npm run build

EXPOSE 5173
# Default command for development
CMD ["npm", "run", "dev"]