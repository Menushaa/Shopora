import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Where the ASP.NET API is running. Swagger for this address is  https://localhost:44359/swagger
// Change this one line if your API uses a different address.
const API_TARGET = 'https://localhost:44390';

// The browser talks to http://localhost:5173/api/... and Vite forwards it to the API.
// This keeps the login cookie same-origin (no CORS or SameSite problems during development).
// `secure: false` lets Vite accept the API's local development HTTPS certificate.
const proxy = {
  '/api': { target: API_TARGET, changeOrigin: true, secure: false },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
});
