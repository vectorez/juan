import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5000,
    host: true,
    allowedHosts: 'all',
    proxy: {
      '/api': 'http://localhost:3001',
      '/analyze': 'http://localhost:8000',
    },
  },
})
