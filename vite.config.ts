import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 局域网共享：监听所有网卡，让别人能通过本机局域网 IP 访问
  server: {
    host: '0.0.0.0',
    port: 5173,
    // 外网穿透访问时 Host 头是隧道域名，不放行的话 Vite 会直接返回 403
    allowedHosts: ['.trycloudflare.com'],
  },
  // 对外演示用预览服务：同样放行隧道域名
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
})
