import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => ({
  base: mode === 'github-pages' ? '/DnD/' : '/',
  plugins: [react(), {
    name: 'isolated-script-cache',
    config(config) {
      // SSR checks must not replace the dependency cache of the running game.
      if (config.appType === 'custom' && config.server?.middlewareMode) {
        return {
          cacheDir: 'node_modules/.vite-checks',
          optimizeDeps: {noDiscovery: true, include: []},
        };
      }
    },
  }],
  // DiceBox ships ESM, including lazy renderer imports. Serve those files directly
  // so a dependency re-optimization cannot invalidate an unopened dice dialog.
  optimizeDeps: {exclude: ['@3d-dice/dice-box']},
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
}));
