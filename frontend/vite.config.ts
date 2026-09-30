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
    proxy: {
      '/api': {
        target: 'https://d5dopqqib47kpsh6929m.jki8ffxa.apigw.yandexcloud.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ''),
        configure: (proxy) => {
          // Same-origin local requests are forwarded by Vite, not sent cross-origin by the browser.
          proxy.on('proxyReq', (request) => request.removeHeader('origin'));
        },
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
}));
