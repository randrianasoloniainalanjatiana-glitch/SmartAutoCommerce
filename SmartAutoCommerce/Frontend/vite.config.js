import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),basicSsl()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/amazon': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/amazon/, ''),
      },
    },
  },
})
