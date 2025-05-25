import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true, // Automatically open the app in the browser
  },
  resolve: {
    alias: {
      '@': '/src', // Simplify imports by using @ as an alias for /src
    },
  },
  optimizeDeps: {
    include: ['@emotion/react', '@emotion/styled'],
  },
});
