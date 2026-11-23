import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Content Security Policy for the web build (SECURITY.md §2). Only added to
 * production builds: the dev server needs inline scripts for hot reload.
 * The desktop app gets its CSP from src-tauri/tauri.conf.json instead.
 */
const WEB_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  // https: images only load when the user clicks "Load images" (see core render policy).
  "img-src 'self' blob: data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'mdedit-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: WEB_CSP },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// Settings recommended by Tauri: fixed port, don't clear the terminal.
export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
})
