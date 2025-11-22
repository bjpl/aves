import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// CONCEPT: Dual-mode configuration for local development and GitHub Pages
// WHY: GitHub Pages requires specific base path and build output location
// PATTERN: Environment-based configuration switching

export default defineConfig(({ mode }) => {
  // Check deployment target
  const isProduction = mode === 'production';
  const isGitHubPages = mode === 'gh-pages';
  const isVercel = mode === 'vercel';

  // GitHub Pages needs special handling
  const useGitHubPagesConfig = isGitHubPages || (isProduction && !isVercel);

  return {
    plugins: [react()],

    // GitHub Pages serves from /repository-name/ subdirectory
    // Vercel serves from root
    base: useGitHubPagesConfig ? '/aves/' : '/',

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },

    build: {
      // GitHub Pages can serve from /docs folder, Vercel needs dist
      outDir: useGitHubPagesConfig ? '../docs' : 'dist',
      emptyOutDir: true,

      // Performance optimizations
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction
        }
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          // Advanced code splitting for optimal caching
          manualChunks: (id) => {
            // React core libraries
            if (id.includes('node_modules/react') ||
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react-router')) {
              return 'react-vendor';
            }

            // UI components and styling
            if (id.includes('node_modules/@headlessui') ||
                id.includes('node_modules/lucide-react') ||
                id.includes('node_modules/clsx')) {
              return 'ui-vendor';
            }

            // Data fetching and state management
            if (id.includes('node_modules/@tanstack/react-query') ||
                id.includes('node_modules/zustand') ||
                id.includes('node_modules/axios')) {
              return 'data-vendor';
            }

            // Annotation libraries
            if (id.includes('node_modules/@annotorious')) {
              return 'annotation-vendor';
            }

            // Testing libraries (shouldn't be in production, but just in case)
            if (id.includes('node_modules/vitest') ||
                id.includes('node_modules/@testing-library')) {
              return 'test-vendor';
            }

            // Default: group by node_modules package
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },

          // Optimized asset naming for caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Organize assets by type
            const info = assetInfo.name || '';
            if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(info)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(info)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            if (/\.css$/.test(info)) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          }
        }
      }
    },

    server: {
      port: 5180,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});