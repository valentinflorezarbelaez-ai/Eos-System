#!/usr/bin/env node
/**
 * Mission DJ host patcher — idempotently adds:
 *   - package.json scripts: test:ladder30-seam, test:mission-dj, test:ladder30-pack
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-ladder30-seam-pack.test.js
 *
 * CRLF-safe (Mission AH/AI/…/DA Windows lesson):
 *   - Set body matcher uses [\s\S] (NOT [^\n]* alone — that breaks on \r\n)
 *   - trailing-comma / line-end checks accept [\r\n]
 *
 * Usage:
 *   node scripts/patch-mission-dj.mjs
 *
 * PRODUCTION_READY: NO
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
const EXCLUDE = 'eos-ladder30-seam-pack.test.js';
const SCRIPTS = {
  'test:ladder30-seam':
    'node --test tests/eos-ladder30-seam-pack.test.js',
  'test:mission-dj':
    'node --test tests/eos-ladder30-seam-pack.test.js',
  'test:ladder30-pack':
    'npm run test:mission-df && npm run test:mission-dg && npm run test:mission-dh && npm run test:mission-di && npm run test:ladder30-seam'
};

let changed = false;

// ── package.json ────────────────────────────────────────────────────────────
if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-dj: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts || {};
for (const [k, v] of Object.entries(SCRIPTS)) {
  if (pkg.scripts[k] !== v) {
    pkg.scripts[k] = v;
    changed = true;
    console.log(`[patch-mission-dj] added script "${k}"`);
  }
}
if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

// ── scripts/test-runner.js ──────────────────────────────────────────────────
if (fs.existsSync(runnerPath)) {
  let content = fs.readFileSync(runnerPath, 'utf8');
  if (!content.includes(EXCLUDE)) {
    const setRegex = /(export\s+const\s+SLIM_SUITE_EXCLUDES\s*=\s*new\s+Set\(\s*\[)([\s\S]*?)(\]\s*\)\s*;)/;
    const match = content.match(setRegex);
    if (match) {
      const body = match[2];
      const trimmed = body.trimEnd();
      const needsComma = trimmed.length > 0 && !trimmed.endsWith(',');
      const sep = needsComma ? ',' : '';
      const insertion = `${sep}\n  '${EXCLUDE}'\n`;
      const newBody = trimmed + insertion;
      content = content.replace(setRegex, `$1${newBody}$3`);
      fs.writeFileSync(runnerPath, content, 'utf8');
      console.log(`[patch-mission-dj] added ${EXCLUDE} to SLIM_SUITE_EXCLUDES`);
    } else {
      console.warn('[patch-mission-dj] could not match SLIM_SUITE_EXCLUDES in test-runner.js');
    }
  }
}

console.log('[patch-mission-dj] complete.');
