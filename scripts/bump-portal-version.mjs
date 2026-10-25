import * as fs from 'node:fs';

const swPath = 'C:\\Users\\valen\\Eos-System\\sw.js';
const htmlPath = 'C:\\Users\\valen\\Eos-System\\index.html';

// 1. Update sw.js CACHE_NAME
let sw = fs.readFileSync(swPath, 'utf-8');
sw = sw.replace(
  /const CACHE_NAME = "eos-system-control-plane-v4-nanosecond-hft";/,
  'const CACHE_NAME = "eos-system-control-plane-v5-dual-track-attestation";'
);
fs.writeFileSync(swPath, sw, 'utf-8');
console.log('[OK] sw.js bumped to v5');

// 2. Update index.html script tags
let html = fs.readFileSync(htmlPath, 'utf-8');
html = html.replace(
  '<link rel="preload" href="/css/eos.css" as="style" />',
  '<link rel="preload" href="/css/eos.css?v=2.5.0" as="style" />'
);
html = html.replace(
  '<link rel="preload" href="/js/eos.js" as="script" />',
  '<link rel="preload" href="/js/eos.js?v=2.5.0" as="script" />'
);
html = html.replace(
  '<link rel="stylesheet" href="/css/eos.css" />',
  '<link rel="stylesheet" href="/css/eos.css?v=2.5.0" />'
);
html = html.replace(
  '<script src="/js/eos.js" defer></script>',
  '<script src="/js/eos.js?v=2.5.0" defer></script>'
);

// Update version badge
html = html.replace(
  'Engineering Operating System · v2.4',
  'Engineering Operating System · v2.5'
);
html = html.replace(
  'eos-system@2.4.0 verify:strict',
  'eos-system@2.5.0 verify:strict'
);

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('[OK] index.html updated to v2.5.0 with cache-busting query strings');
