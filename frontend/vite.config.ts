import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0', // Allow access from Docker host
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-cert.pem')),
    },
    watch: {
      usePolling: true, // Enable polling for file changes
    },
  },
});
