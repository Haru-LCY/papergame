import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore The API handler is intentionally a small Node ESM module shared with the standalone server.
import { createPaperApiMiddleware } from './server/paper-api.mjs'

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/papergame/' : '/',
  define: { __STATIC_DEPLOY__: JSON.stringify(mode === 'pages') },
  plugins: [
    react(),
    {
      name: 'paper2-api',
      configureServer(server: any) {
        server.middlewares.use(createPaperApiMiddleware())
      },
    },
  ],
}))
