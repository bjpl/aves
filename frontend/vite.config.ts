import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// CONCEPT: Dual-mode configuration for local development and GitHub Pages
// WHY: GitHub Pages requires specific base path and build output location
// PATTERN: Environment-based configuration switching

export default defineConfig(({ mode }) => {
  const isGitHubPages = mode === 'gh-pages';

  return {
    plugins: [react()],

    // GitHub Pages serves from /repository-name/ subdirectory
    base: isGitHubPages ? '/aves/' : '/',

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },

    build: {
      // GitHub Pages can serve from /docs folder
      outDir: isGitHubPages ? '../docs' : 'dist',
      emptyOutDir: true,

      rollupOptions: {
        output: {
          // Code splitting for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          }
        }
      }
    },

    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});