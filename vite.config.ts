import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(() => {
  const BACKEND_PORT = process.env.VITE_BACKEND_PORT || '3001';

  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    publicDir: 'public',
    optimizeDeps: {
      entries: ["src/main.tsx"],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@game': path.resolve(__dirname, './src/game'),
        '@core': path.resolve(__dirname, './src/core'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@scene': path.resolve(__dirname, './src/scene-creator'),
        '@nodelab': path.resolve(__dirname, './src/nodejs-lab'),
        '@workspace/api-client-react': path.resolve(__dirname, './src/nodejs-lab/lib/api-client-react/index.ts'),
        '@state': path.resolve(__dirname, './src/state'),
        '@nodelab/components': path.resolve(__dirname, './src/nodejs-lab/components'),
        '@nodelab/hooks': path.resolve(__dirname, './src/nodejs-lab/hooks'),
        '@nodelab/lib': path.resolve(__dirname, './src/nodejs-lab/lib'),
        '@nodelab/pages': path.resolve(__dirname, './src/nodejs-lab/pages'),
      },
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
        },
        '/socket.io': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
          ws: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
        },
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            three: ["three"],
          },
        },
      },
    },
  };
});