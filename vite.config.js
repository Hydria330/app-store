import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 本地代理转发Apple美区RSS接口，仅本地开发环境生效，无需后端服务
      '/rss-proxy': {
        target: 'https://itunes.apple.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss-proxy/, '')
      }
    }
  }
})

