import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MapLibre starts its worker as an ES module (see IncidentMap.tsx).
  worker: { format: 'es' },
  // In development, the API server (npm run dev:server) answers /api.
  server: {
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: false } },
  },
});
