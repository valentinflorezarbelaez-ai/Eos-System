/**
 * READ-ONLY inventory collector for EOS Master System Report.
 * Writes only under docs/reports/eos/master/raw/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const ROOT = '/workspace';
const OUT = path.join(ROOT, 'docs/reports/eos/master/raw');
const started = new Date().toISOString();

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walk(dir, acc = [], skip = new Set(['.git', 'node_modules', '.missions'])) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc, skip);
    else if (e.isFile()) acc.push(p);
  }
  return acc;
}

function extOf(p) {
  const b = path.basename(p);
  if (b.startsWith('.') && !b.includes('.', 1)) return b;
  const ext = path.extname(p).toLowerCase();
  return ext || '(noext)';
}

function classifyPath(rel) {
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
const rows = files.map((abs) => {
  const rel = path.relative(ROOT, abs);
  const st = fs.statSync(abs);
  return {
    path: rel,
    abs,
    bytes: st.size,
    ext: extOf(abs),
    class: classifyPath(rel),
    mtime: st.mtime.toISOString(),
  };
});

const byClass = {};
const byExt = {};
for (const r of rows) {
  byClass[r.class] = byClass[r.class] || { files: 0, bytes: 0 };
  byClass[r.class].files += 1;
  byClass[r.class].bytes += r.bytes;
  byExt[r.ext] = byExt[r.ext] || { files: 0, bytes: 0 };
  byExt[r.ext].files += 1;
  byExt[r.ext].bytes += r.bytes;
}

const inventory = {
  collected_at: started,
  root: ROOT,
  file_count: rows.length,
  total_bytes: rows.reduce((s, r) => s + r.bytes, 0),
  by_class: byClass,
  by_ext: byExt,
  skip: ['.git', 'node_modules', '.missions'],
};

fs.writeFileSync(path.join(OUT, 'inventory_summary.json'), JSON.stringify(inventory, null, 2));
fs.writeFileSync(
  path.join(OUT, 'inventory_files.csv'),
  ['path,class,ext,bytes,mtime', ...rows.map((r) => `${JSON.stringify(r.path)},${r.class},${r.ext},${r.bytes},${r.mtime}`)].join('\n')
);

// Test file inventory
const testFiles = rows.filter((r) => r.class === 'tests' && r.path.endsWith('.test.js'));
const labTestFiles = rows.filter((r) => r.class === 'eos-lab' && r.path.endsWith('.test.ts'));
const allTestLike = rows.filter((r) => /\.test\.(js|ts|mjs|cjs)$/.test(r.path));

function countTestCalls(abs) {
  const txt = fs.readFileSync(abs, 'utf8');
  const testFn = [...txt.matchAll(/\btest\s*\(/g)].length;
  const itFn = [...txt.matchAll(/\bit\s*\(/g)].length;
  const describeFn = [...txt.matchAll(/\bdescribe\s*\(/g)].length;
  const writes = {
    writeFileSync: [...txt.matchAll(/writeFileSync/g)].length,
    writeFile: [...txt.matchAll(/\bwriteFile\b/g)].length,
    mkdirSync: [...txt.matchAll(/mkdirSync/g)].length,
    unlinkSync: [...txt.matchAll(/unlinkSync/g)].length,
    rmSync: [...txt.matchAll(/rmSync/g)].length,
    spawn: [...txt.matchAll(/\bspawn\b/g)].length,
    execSync: [...txt.matchAll(/execSync/g)].length,
  };
  return { testFn, itFn, describeFn, writes, bytes: txt.length, sha256: sha256(txt) };
}

const testAnalysis = allTestLike.map((r) => ({ path: r.path, ...countTestCalls(r.abs) }));
const testCallTotal = testAnalysis.reduce((s, t) => s + t.testFn + t.itFn, 0);
const testsWithWrites = testAnalysis.filter((t) =>
  t.writes.writeFileSync + t.writes.writeFile + t.writes.unlinkSync + t.writes.rmSync > 0
);

fs.writeFileSync(
  path.join(OUT, 'test_static_inventory.json'),
  JSON.stringify(
    {
      collected_at: started,
      method: 'static regex count of test( and it( plus write-API mentions; count ≠ coverage ≠ executed',
      test_like_files: allTestLike.length,
      tests_dir_test_js: testFiles.length,
      eos_lab_test_ts: labTestFiles.length,
      static_test_or_it_calls: testCallTotal,
      files_mentioning_write_apis: testsWithWrites.length,
      files: testAnalysis,
    },
    null,
    2
  )
);

// Import graph for src + scripts + bin
const jsFiles = rows.filter((r) => ['.js', '.mjs', '.cjs', '.ts'].includes(r.ext) && !r.path.includes('node_modules'));
const importEdges = [];
const importRe = /(?:from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\))/g;
for (const r of jsFiles) {
  const txt = fs.readFileSync(r.abs, 'utf8');
  let m;
  const seen = new Set();
  while ((m = importRe.exec(txt))) {
    const spec = m[1] || m[2] || m[3];
    if (!spec || seen.has(spec)) continue;
    seen.add(spec);
    importEdges.push({ from: r.path, spec, kind: spec.startsWith('.') || spec.startsWith('/') ? 'relative' : 'package' });
  }
}

const packageSpecs = {};
for (const e of importEdges) {
  if (e.kind === 'package') {
    const name = e.spec.startsWith('@') ? e.spec.split('/').slice(0, 2).join('/') : e.spec.split('/')[0];
    packageSpecs[name] = (packageSpecs[name] || 0) + 1;
  }
}

fs.writeFileSync(
  path.join(OUT, 'import_graph.json'),
  JSON.stringify(
    {
      collected_at: started,
      method: 'regex import/from/require/dynamic-import on first-party js/ts/mjs/cjs',
      js_ts_files_scanned: jsFiles.length,
      edges: importEdges.length,
      unique_package_specs: packageSpecs,
    },
    null,
    2
  )
);
fs.writeFileSync(path.join(OUT, 'import_edges.json'), JSON.stringify(importEdges, null, 2));

// Keyword presence (architecture/governance)
const keywords = [
  'MissionRuntime',
  'AuthorityTruthSource',
  'HitlGatekeeper',
  'IntegrationGatekeeper',
  'SDD_STATES',
  'commitTransition',
  'PRODUCTION_READY',
  'GAP-002',
  'PRJ-FUNDACION',
  'bypass',
  'LEVEL_2',
  'mcp',
  'eos.mission',
  '726',
  '615/615',
  '287/287',
  '472/472',
  '308/308',
  '20/20',
];

const keywordHits = {};
for (const k of keywords) keywordHits[k] = { files: [], count: 0 };
for (const r of rows) {
  if (r.bytes > 2_000_000) continue;
  if (!/\.(md|json|js|ts|mjs|cjs|txt)$/i.test(r.path)) continue;
  let txt;
  try {
    txt = fs.readFileSync(r.abs, 'utf8');
  } catch {
    continue;
  }
  for (const k of keywords) {
    const n = txt.split(k).length - 1;
    if (n > 0) {
      keywordHits[k].count += n;
      if (keywordHits[k].files.length < 40) keywordHits[k].files.push({ path: r.path, n });
    }
  }
}
fs.writeFileSync(path.join(OUT, 'keyword_hits.json'), JSON.stringify({ collected_at: started, keywordHits }, null, 2));

console.log(JSON.stringify({ ok: true, files: rows.length, tests: allTestLike.length, testCalls: testCallTotal, started }, null, 2));
