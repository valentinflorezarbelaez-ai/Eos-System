#!/usr/bin/env node
/**
 * Mission FC host patcher — idempotently adds:
 *   - package.json scripts: test:ladder39-seam, test:ladder39-pack, test:mission-fc
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-fc-ladder39-seam-pack.test.js
 *
 * Satellite scripts (test:mission-ey..fb) and their SLIM excludes are assumed
 * already present from EY–FB patchers. This patcher only adds seam/pack wiring.
 *
 * CRLF-safe (Mission AH/AI/…/FB Windows lesson).
 * PRODUCTION_READY: NO
 * SPEC-0165 — do NOT tip-refresh / freeze rewrite / tip-seal L39 CLOSED from this package.
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
const EXCLUDE = 'eos-fc-ladder39-seam-pack.test.js';
const SCRIPTS = {
  'test:ladder39-seam':
    'node --test tests/eos-fc-ladder39-seam-pack.test.js',
  'test:mission-fc':
    'node --test tests/eos-fc-ladder39-seam-pack.test.js',
  'test:ladder39-pack':
    'npm run test:mission-ey && npm run test:mission-ez && npm run test:mission-fa && npm run test:mission-fb && npm run test:ladder39-seam'
};

let changed = false;

if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-fc: package.json not found at ${pkgPath}`);
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
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-fc: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
let runner = fs.readFileSync(runnerPath, 'utf8');
if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
  console.log(`= SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
} else {
  const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\][ \t]*\);)/;
  if (!re.test(runner)) {
    console.error('patch-mission-fc: could not locate SLIM_SUITE_EXCLUDES Set');
    process.exit(1);
  }
  const nl = /\r\n/.test(runner) ? '\r\n' : '\n';
  runner = runner.replace(re, (m, head, tail) => {
    let h = head;
    const stripped = h.replace(/[ \t\r\n]+$/g, '');
    if (!/,\s*$/.test(stripped)) {
      h = h.replace(/(['"][^'"]+['"])([ \t\r\n]*)$/, '$1,$2');
    }
    return `${h}${nl}  '${EXCLUDE}',${nl}${tail}`;
  });
  runner = runner.replace(/,(\s*,)+/g, ',');
  fs.writeFileSync(runnerPath, runner, 'utf8');
  changed = true;
  console.log(`+ SLIM_SUITE_EXCLUDES ${EXCLUDE}`);
}

console.log(changed ? 'patch-mission-fc: applied' : 'patch-mission-fc: no-op (already patched)');
