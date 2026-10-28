import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // The browser calls relative `/api/...` URLs; Vite forwards them to the
    // AdonisJS backend so no API URL or CORS setup is needed in dev.
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
})
