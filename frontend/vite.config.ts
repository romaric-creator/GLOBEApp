import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Tauri expects static files; disable HMR overlay in desktop mode
  clearScreen: isTauri ? false : true,
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  server: {
    port: 3000,
    strictPort: true,
    proxy: isTauri ? undefined : {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: isTauri
      ? (process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari16')
      : 'es2020',
    minify: isTauri ? 'oxc' : true,
    sourcemap: !isTauri,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx'],
    },
  },
})
