import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import https from 'node:https';

// Routes /sn-proxy/<hostname>/api/... → https://<hostname>/api/...
// This avoids CORS restrictions on direct browser-to-SN calls during dev.
function snProxyPlugin(): Plugin {
  return {
    name: 'sn-proxy',
    configureServer(server) {
      server.middlewares.use('/sn-proxy', (req, res) => {
        const url = req.url ?? '/';
        const secondSlash = url.indexOf('/', 1);
        if (secondSlash === -1) { res.statusCode = 400; res.end('Bad proxy URL'); return; }

        const hostname = url.slice(1, secondSlash);
        const targetPath = url.slice(secondSlash);

        const proxyReq = https.request(
          { hostname, port: 443, path: targetPath, method: req.method,
            headers: { ...req.headers, host: hostname } },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );
        proxyReq.on('error', (e) => { res.statusCode = 502; res.end(e.message); });

        if (req.method === 'GET' || req.method === 'HEAD') proxyReq.end();
        else req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), snProxyPlugin()],
});
