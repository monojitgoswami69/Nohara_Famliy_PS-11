import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      strictPort: false,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/collab-ws': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/collab-ws/, ''),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: [
        '@monaco-editor/react',
        'monaco-editor',
        'react',
        'react-dom',
      ],
      exclude: [],
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Monaco Editor - separate chunk for lazy loading
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'monaco';
            }

            // React core - critical, loaded first
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }

            // UI Icons - separate chunk
            if (id.includes('developer-icons') || id.includes('lucide-react')) {
              return 'icons';
            }
          },
          // Optimize chunk naming for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Enable minification and tree-shaking
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Remove console.logs in production
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
        },
        format: {
          comments: false, // Remove comments
        },
      },
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize asset handling
      assetsInlineLimit: 4096, // Inline assets < 4kb as base64
    },
  };
});
