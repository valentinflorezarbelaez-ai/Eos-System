#!/usr/bin/env node
/**
 * EOS Sovereign Control Hub Dashboard Server (scripts/serve-dashboard.mjs)
 * Clean Zero-Dependency Local Static Server (Node stdlib only)
 * Serves public/index.html at http://localhost:3300/
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controlPlaneRoot = path.resolve(__dirname, '..');
const publicDir = path.join(controlPlaneRoot, 'public');
const htmlPath = path.join(publicDir, 'index.html');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3300;

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/' || url === '/index.html') {
    if (!fs.existsSync(htmlPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('EOS Dashboard asset not found: public/index.html');
      return;
    }
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(html);
    return;
  }

  // Health check endpoint
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', timestamp: new Date().toISOString() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('================================================================');
  console.log('    EOS SYSTEM 2.1 — SOVEREIGN CONTROL HUB & SACRED LAB         ');
  console.log('    Aesthetics: AGEAC 432 Hz · Jev Arbiter · PERT RAG           ');
  console.log('================================================================');
  console.log(`>>> Dashboard live at: http://localhost:${PORT}/`);
  console.log('>>> Zero dependencies · Standard HTTP module · 60 FPS Canvas');
  console.log('Press Ctrl+C to terminate server.\n');
});
