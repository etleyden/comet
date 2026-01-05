# Frontend Dockerfile
FROM node:22

# Set working directory
WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend application
RUN npm run build

EXPOSE 5173
# Default command for development
CMD ["npm", "run", "dev"]