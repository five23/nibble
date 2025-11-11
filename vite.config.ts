import { defineConfig } from 'vite'

export default defineConfig({
  base: '/nibble/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 3000,
  },
})
