import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/neet-pad/',
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
})
