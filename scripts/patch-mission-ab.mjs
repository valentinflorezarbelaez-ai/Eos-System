#!/usr/bin/env node
/**
 * Mission AB host patcher — idempotently adds:
 *   - package.json scripts: test:telemetry-server, test:mission-ab
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-ab-telemetry-server.test.js
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-ab.mjs
 *   node scripts/patch-mission-ab.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Resolve repo root: cwd if it looks like EOS, else parent of scripts/ when copied in. */
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
const EXCLUDE = 'eos-ab-telemetry-server.test.js';
const SCRIPTS = {
  'test:telemetry-server':
    'node --test tests/eos-ab-telemetry-server.test.js',
  'test:mission-ab':
    'node --test tests/eos-ab-telemetry-server.test.js'
};

let changed = false;

// ── package.json ────────────────────────────────────────────────────────────
if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-ab: package.json not found at ${pkgPath}`);
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

// ── SLIM_SUITE_EXCLUDES ─────────────────────────────────────────────────────
if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-ab: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
let runner = fs.readFileSync(runnerPath, 'utf8');
if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
  console.log(`= SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
} else {
  const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\]\);)/;
  if (!re.test(runner)) {
    console.error('patch-mission-ab: could not locate SLIM_SUITE_EXCLUDES Set');
    process.exit(1);
  }
  runner = runner.replace(re, (m, head, tail) => {
    let h = head;
    if (!/,\s*$/.test(h.trimEnd())) {
      h = h.replace(/(['"][^'"]+['"])(\s*)$/, '$1,$2');
    }
    return `${h}\n  '${EXCLUDE}',\n${tail}`;
  });
  runner = runner.replace(/,(\s*,)+/g, ',');
  fs.writeFileSync(runnerPath, runner, 'utf8');
  changed = true;
  console.log(`+ SLIM_SUITE_EXCLUDES ${EXCLUDE}`);
}

console.log(changed ? 'patch-mission-ab: applied' : 'patch-mission-ab: no-op (already patched)');
