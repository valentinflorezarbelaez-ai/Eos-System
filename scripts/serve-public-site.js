import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(rootDir, 'site');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png'
};

function readOrNull(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

function resolveSiteFile(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  let decoded;
  try {
    decoded = decodeURIComponent(requested.split('?')[0]);
  } catch {
    return null;
  }
  const candidate = path.resolve(siteDir, `.${decoded}`);
  const relative = path.relative(siteDir, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}

export function createSiteServer() {
  return http.createServer((req, res) => {
    if (!req.url || req.method !== 'GET') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('method not allowed');
      return;
    }
    const filePath = resolveSiteFile(req.url);
    if (!filePath) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('forbidden');
      return;
    }
    const body = readOrNull(filePath);
    if (!body) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    const type = TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    res.end(body);
  });
}

function listen(port) {
  const server = createSiteServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`EOS site http://127.0.0.1:${port}/`);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || process.env.PORT || 4173);
  listen(port);
}
