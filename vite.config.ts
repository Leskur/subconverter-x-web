import react from '@vitejs/plugin-react'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'))

export default defineConfig(() => {
  return {
    base: '/',
    server: {
      port: 15501,
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  }
})
