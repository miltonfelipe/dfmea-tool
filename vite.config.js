import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend: cd backend && .venv/bin/uvicorn app.main:app --reload
    proxy: { '/api': 'http://localhost:8000' },
  },
})
