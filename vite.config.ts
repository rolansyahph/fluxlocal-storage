// 
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    // Konfigurasi Server Development (npm run dev)
    server: {
      port: 80, // Mengubah ke port standar agar tidak perlu ngetik :5173
      host: '0.0.0.0', // Mengizinkan akses dari perangkat lain di jaringan MikroTik
      allowedHosts: ['fluxlocal-storage.id'], // Mengizinkan akses via DNS kustom
      proxy: {
        // Mengarahkan request /api ke Express Server (sesuaikan port 5000 jika beda)
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        }
      }
    },

    // Konfigurasi Preview (npm run preview)
    preview: {
      port: 80,
      host: '0.0.0.0',
      allowedHosts: ['fluxlocal-storage.id']
    },

    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});