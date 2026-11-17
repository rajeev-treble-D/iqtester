import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser talks to Vite only; API calls are forwarded
    // to the Express server, so there is no cross-origin traffic to configure.
    proxy: {
      '/api': { target: process.env.DEV_API_URL ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: { target: 'es2022', sourcemap: false },
});
