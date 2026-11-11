import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, proxy API + WebSocket traffic to the Express server so the
// HTTP-only auth cookie is same-origin (no CORS/cookie headaches).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor code into its own long-cacheable chunk
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'], socket: ['socket.io-client'] },
      },
    },
  },
});
