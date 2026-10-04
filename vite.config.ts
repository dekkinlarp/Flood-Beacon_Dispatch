import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MapLibre starts its worker as an ES module (see IncidentMap.tsx).
  worker: { format: 'es' },
});
