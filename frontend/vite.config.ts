import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
// Compute __dirname in ESM context
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,   // force Vite to use 5173
    open: true,   // auto-open in your browser
  },
  assetsInclude: ['**/*.ttf'], // allow Vite to import fonts like base64
})
