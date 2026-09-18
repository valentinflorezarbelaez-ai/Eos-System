#!/usr/bin/env node
/**
 * Mission BY host patcher — idempotently adds:
 *   - package.json scripts: test:mission-by, test:spec-synthesis
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-by-spec-synthesis-compiler-port.test.js
 *
 * CRLF-safe:
 *   - Set body matcher uses [\s\S]
 *   - trailing-comma / line-end checks accept [\r\n]
 *
 * Usage:
 *   node scripts/patch-mission-by.mjs
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveRoot() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'package.json')) && fs.existsSync(path.join(cwd, 'scripts'))) {
    return cwd;
  }
  const fromScript = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(fromScript, 'package.json'))) return fromScript;
  return cwd;
}

const root = resolveRoot();
const pkgPath = path.join(root, 'package.json');
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
const EXCLUDE = 'eos-by-spec-synthesis-compiler-port.test.js';
const SCRIPTS = {
  'test:mission-by':
    'node --test tests/eos-by-spec-synthesis-compiler-port.test.js',
  'test:spec-synthesis':
    'node --test tests/eos-by-spec-synthesis-compiler-port.test.js'
};

let changed = false;

// ── package.json ────────────────────────────────────────────────────────────
if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-by: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
for (const [k, v] of Object.entries(SCRIPTS)) {
  if (pkg.scripts[k] !== v) {
    pkg.scripts[k] = v;
    changed = true;
    console.log(`+ package.json scripts.${k}`);
  } else {
    console.log(`= package.json scripts.${k} (already present)`);
  }
}
if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

// ── scripts/test-runner.js ───────────────────────────────────────────────────
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-by: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
let runner = fs.readFileSync(runnerPath, 'utf8');
if (!runner.includes(EXCLUDE)) {
  const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[)([\s\S]*?)(\]\);)/;
  const match = runner.match(re);
  if (!match) {
    console.error('patch-mission-by: could not locate SLIM_SUITE_EXCLUDES Set in test-runner.js');
    process.exit(1);
  }
  const body = match[2];
  const trimmed = body.trimEnd();
  const sep = trimmed.endsWith(',') ? '\n' : ',\n';
  const insertion = `  '${EXCLUDE}',\n`;
  const newBody = trimmed + sep + insertion;
  runner = runner.replace(re, `$1${newBody}$3`);
  fs.writeFileSync(runnerPath, runner, 'utf8');
  console.log(`+ scripts/test-runner.js SLIM_SUITE_EXCLUDES <- '${EXCLUDE}'`);
} else {
  console.log(`= scripts/test-runner.js SLIM_SUITE_EXCLUDES (already contains '${EXCLUDE}')`);
}

console.log('patch-mission-by: complete');
