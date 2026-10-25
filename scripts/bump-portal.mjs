import * as fs from 'node:fs';

const portalRoot = 'C:\\Users\\valen\\Eos-System';
const htmlPath = `${portalRoot}\\index.html`;
const swPath = `${portalRoot}\\sw.js`;

let html = fs.readFileSync(htmlPath, 'utf-8');
html = html.replace(/eos\.css\?v=[0-9.]+/g, 'eos.css?v=2.7.1');
html = html.replace(/eos\.js\?v=[0-9.]+/g, 'eos.js?v=2.7.1');
fs.writeFileSync(htmlPath, html, 'utf-8');

let sw = fs.readFileSync(swPath, 'utf-8');
sw = sw.replace(/const CACHE_NAME = ['"][^'"]+['"];/, "const CACHE_NAME = 'eos-system-control-plane-v7-1-interactive-lab';");
fs.writeFileSync(swPath, sw, 'utf-8');

console.log('[PASS] Bumped portal to v2.7.1 with cache buster.');
