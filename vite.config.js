import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAI } from './server/ai-proxy.js'

// /api/messages chạy ngay trong `npm run dev` và `npm run preview`
const aiProxy = {
  name: 'ai-proxy',
  configureServer: (s) => { s.middlewares.use('/api/messages', handleAI) },
  configurePreviewServer: (s) => { s.middlewares.use('/api/messages', handleAI) },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), aiProxy],
})
