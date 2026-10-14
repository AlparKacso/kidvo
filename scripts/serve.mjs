// Tiny static server for local development: npm run dev  ->  http://localhost:8080
// No dependencies on purpose.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN } from './lib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

// The Host header is copied into each page's content policy, so it must look like a host and nothing more.
// Only this machine's names are accepted, unless HOST opens the server to the network on purpose
// (HOST=0.0.0.0 npm run dev, to try a game on a phone).
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
const ANY_HOST = /^([a-z0-9-]+\.)*[a-z0-9-]+(:\d{1,5})?$|^\[[0-9a-f:.]+\](:\d{1,5})?$/i;

export function serve(port = 8080, host = process.env.HOST || '127.0.0.1') {
  const hostOk = ['127.0.0.1', '::1', 'localhost'].includes(host) ? LOCAL_HOST : ANY_HOST;
  const server = createServer(async (req, res) => {
    if (!hostOk.test(req.headers.host || '')) {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end('bad host');
      return;
    }
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(ROOT, path));
      if (!file.startsWith(ROOT) || /\/(\.git|node_modules)\//.test(file)) throw new Error('forbidden');
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      let body = await readFile(file);
      // App pages allow the live site's address next to 'self' (Safari needs it, see APP_CSP).
      // Locally that address is this server, so swap it in or Safari blocks every game script.
      if (extname(file) === '.html') {
        body = body.toString('utf8').replace(/(<meta http-equiv="Content-Security-Policy" content=")([^"]*)/,
          (m, head, policy) => head + policy.replaceAll(SITE_ORIGIN, `http://${req.headers.host}`));
      }
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  return new Promise(resolve => server.listen(port, host, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  await serve(port);
  console.log(`kidvo is running at http://localhost:${port}`);
}
