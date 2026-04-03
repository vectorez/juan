import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/docs': 'http://localhost:3001',
      '/analyze': 'http://localhost:8000',
    },
  },
})
