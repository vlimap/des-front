import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const normalizeBasePath = (value) => {
  const trimmed = String(value || '/').trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const basePath = normalizeBasePath(env.VITE_APP_BASE_PATH || '/');

  return {
    root: path.resolve(__dirname, '.'),
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        react: path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    base: basePath,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui-vendor';
            }
            if (
              id.includes('@radix-ui') ||
              id.includes('lucide-react') ||
              id.includes('class-variance-authority') ||
              id.includes('tailwind-merge') ||
              id.includes('cmdk') ||
              id.includes('sonner') ||
              id.includes('vaul')
            ) {
              return 'ui-vendor';
            }
            if (id.includes('recharts') || id.includes('/d3-')) {
              return 'charts-vendor';
            }
            if (id.includes('/qrcode/')) {
              return 'qrcode-vendor';
            }
            return undefined;
          },
        },
      },
    },
  };
});
