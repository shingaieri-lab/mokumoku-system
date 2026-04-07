import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    // ローカル開発時: /api リクエストを Express サーバー（:3000）に転送する
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
