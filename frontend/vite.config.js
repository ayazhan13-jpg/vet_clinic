import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['wholesome-ambition-production-bdac.up.railway.app'],
    host: '0.0.0.0',
    port: 8080
  }
})
