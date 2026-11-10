import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// The landing page (/) and the operator console (/console/): plain TypeScript, no framework.
// Built after the game (vite.config.ts), into the same dist/ that GitHub Pages publishes.
export default defineConfig({
  root: 'site',
  base: './',
  publicDir: 'public',
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: '../dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'site/index.html'),
        console: resolve(__dirname, 'site/console/index.html'),
      },
    },
  },
});
