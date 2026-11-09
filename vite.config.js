import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import reviewServer from './server/review.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), reviewServer()],
})
