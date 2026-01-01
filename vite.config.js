import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        timeout: 300000,
        proxyTimeout: 300000
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/stats': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/info': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/metadata': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/docs': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/redoc': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/openapi.json': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/images': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
});
