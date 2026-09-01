import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/workspace';
const OUT = path.join(ROOT, 'docs/reports/eos/master/raw');
const skip = new Set(['.git', 'node_modules', '.missions']);

function walk(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    const rel = path.relative(ROOT, p);
    if (rel === 'docs/reports' || rel.startsWith('docs/reports/')) continue;
    if (e.isDirectory()) walk(p, acc);
    else if (e.isFile()) acc.push(rel);
  }
  return acc;
}

function classify(rel) {
  if (rel.startsWith('src/')) return 'src';
  if (rel.startsWith('tests/')) return 'tests';
  if (rel.startsWith('scripts/')) return 'scripts';
  if (rel.startsWith('docs/')) return 'docs';
  if (rel.startsWith('bin/')) return 'bin';
  if (rel.startsWith('EOS-Lab/')) return 'eos-lab';
  if (rel.startsWith('EOS-MISSION-CONTROL/')) return 'mission-control';
  if (rel.startsWith('Fundacion/')) return 'fundacion';
  if (rel.startsWith('Luxe-Registry/')) return 'luxe-registry';
  if (rel.startsWith('Multimodal-Creative-Suite/')) return 'multimodal';
  if (rel.startsWith('.agents/')) return 'agents-dot';
  if (rel.startsWith('.cursor/')) return 'cursor';
  return 'root-other';
}

const files = walk(ROOT);
const byClass = {};
const byExt = {};
let bytes = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  const st = fs.statSync(abs);
  bytes += st.size;
  const c = classify(rel);
  byClass[c] = byClass[c] || { files: 0, bytes: 0 };
  byClass[c].files += 1;
  byClass[c].bytes += st.size;
  const ext = path.extname(rel).toLowerCase() || '(noext)';
  byExt[ext] = byExt[ext] || { files: 0, bytes: 0 };
  byExt[ext].files += 1;
  byExt[ext].bytes += st.size;
}

const out = {
  collected_at: new Date().toISOString(),
  method: 'walk workspace excluding .git node_modules .missions docs/reports',
  classification: 'MEASURED',
  file_count: files.length,
  total_bytes: bytes,
  by_class: byClass,
  by_ext: byExt,
};
fs.writeFileSync(path.join(OUT, 'product_baseline_inventory.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ file_count: files.length, total_bytes: bytes, by_class: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, v.files])) }, null, 2));
