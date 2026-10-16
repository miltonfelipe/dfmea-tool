import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend: ./dev.sh starts both; API_PORT matches the backend's port.
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 8000}` },
  },
})
