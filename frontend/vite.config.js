import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Раскладываем зависимости по долгоживущим чанкам: при обновлении кода
// приложения браузер не перекачивает React/axios заново.
// Раньше 'react-dom/client' не попадал в react-vendor (точное совпадение имени),
// и ~190 КБ React DOM уезжали в главный чанк, инвалидируясь при каждом деплое.
function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined;
  if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) {
    return 'react-vendor';
  }
  if (/node_modules\/(react-hot-toast|goober)\//.test(id)) return 'ui-vendor';
  if (/node_modules\/(axios|date-fns|zustand)\//.test(id)) return 'utils-vendor';
  // Иконки (@heroicons) не группируем: каждая попадает в чанк страницы, где используется.
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: { manualChunks },
    },
    chunkSizeWarningLimit: 600,
  },
});
