import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createDeepSeekMiddleware } from './server/deepseekTranslate.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), ''),
  }

  return {
    plugins: [
      react(),
      {
        name: 'deepseek-translate-api',
        configureServer(server) {
          server.middlewares.use('/api/translate', createDeepSeekMiddleware(env))
        },
      },
    ],
  }
})
