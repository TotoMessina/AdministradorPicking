import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'kiosco-pwa',
    configureServer(server) {
      if (server.config.env.VITE_ENABLE_DEV_PWA !== 'true') return;
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/sw.js') return next();
        const source = readFileSync(new URL('./pwa/sw.js', import.meta.url), 'utf8')
          .replace('__CACHE_VERSION__', 'development')
          .replace('__PRECACHE_ASSETS__', '[]')
          .replace('__DEVELOPMENT__', 'true');
        response.setHeader('Content-Type', 'application/javascript');
        response.setHeader('Cache-Control', 'no-store');
        response.end(source);
      });
    },
    generateBundle(_, bundle) {
      // Include content in the revision so every deployment has an isolated cache.
      const hash = createHash('sha256');
      for (const output of Object.values(bundle)) {
        hash.update(output.type === 'chunk' ? output.code : output.source);
      }
      const publicAssets = ['offline.html', 'manifest.json', 'favicon.svg',
        'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
      for (const asset of publicAssets) hash.update(readFileSync(new URL(`./public/${asset}`, import.meta.url)));
      const assets = [...new Set(['index.html', ...publicAssets, ...Object.keys(bundle).filter(name => /\.(js|css|woff2?|svg|png)$/.test(name))])];
      const template = readFileSync(new URL('./pwa/sw.js', import.meta.url), 'utf8');
      hash.update(template);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 16))
          .replace('__PRECACHE_ASSETS__', JSON.stringify(assets))
          .replace('__DEVELOPMENT__', 'false'),
      });
    },
  }],
  server: {
    port: 3001,
    host: true
  }
});
