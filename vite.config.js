import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws',
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor';
          }
          if (id.includes('react-router-dom')) {
            return 'router';
          }
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          if (id.includes('lucide-react')) {
            return 'icons';
          }
        },
      },
    },
  },
})
