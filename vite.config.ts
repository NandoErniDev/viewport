import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server is bound to all interfaces so the hosted preview panel can reach it.
// Extra hostnames (the per-chat preview host) are passed through the environment
// rather than hard-coded, so no VM-specific hostname ends up in the repository.
const allowedHosts = (process.env.VITE_DEV_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3003,
    strictPort: false,
    allowedHosts,
  },
  preview: { host: '0.0.0.0', port: 3003 },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
})
