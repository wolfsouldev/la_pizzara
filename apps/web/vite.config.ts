import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    // Vite consumes the canonical TypeScript directly for ESM/tree-shaking and
    // HMR; NestJS consumes the same package's compiled CommonJS output.
    '@uni/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
  } },
  server: { port: 5173, strictPort: true, proxy: { '/api/v1/realtime': { target: 'http://127.0.0.1:3000', ws: true }, '/api': { target: 'http://127.0.0.1:3000' } } },
});
