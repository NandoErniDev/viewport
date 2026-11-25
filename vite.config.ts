import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server is bound to all interfaces so the hosted preview panel can reach it.
// Extra hostnames (the per-chat preview host) are passed through the environment
// rather than hard-coded, so no VM-specific hostname ends up in the repository.
const allowedHosts = (process.env.VITE_DEV_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

/**
 * The dev server falls back to index.html for `/demo/`, which would render the app
 * inside its own previews. Production serves the static file directly; this keeps
 * local development identical.
 */
function demoDirectoryPlugin() {
  return {
    name: 'viewport-demo-directory',
    configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/demo' || req.url === '/demo/') req.url = '/demo/index.html'
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), demoDirectoryPlugin()],
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
