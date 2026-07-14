import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target: env.VITE_API_ORIGIN ?? 'http://localhost:4000', changeOrigin: true },
        '/socket.io': {
          target: env.VITE_API_ORIGIN ?? 'http://localhost:4000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            realtime: ['socket.io-client'],
            ui: ['framer-motion', 'react-icons', 'emoji-picker-react'],
          },
        },
      },
    },
  };
});
