#!/usr/bin/env node
/**
 * Mission EU host patcher — idempotently adds:
 *   - package.json scripts: test:mission-eu, test:secret-zero-leak-deny
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-eu-secret-zero-leak-deny.test.js
 *
 * CRLF-safe (Mission AH/AI/…/EP Windows lesson):
 *   - Set body matcher uses [\s\S] (NOT [^\n]* alone — that breaks on \r\n)
 *   - trailing-comma / line-end checks accept [\r\n]
 *
 * Surgical: only mutates package.json scripts keys + SLIM_SUITE_EXCLUDES entry.
 * NEVER overwrites authorize.js. NEVER wholesale-replaces package.json content
 * beyond the scripts map merge (JSON round-trip preserves other fields).
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-eu.mjs
 *   node scripts/patch-mission-eu.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 * Explicitly: no tip-refresh / no tip-pin rewrite from this package.
 * Freeze honesty pin soft-observe bc24c17b (tip-open #519 / post tip-refresh #520).
 * PASS = sealed redaction/deny receipt ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO/EP/ET/AU.
 * NEVER reopen L30–L37; refuse L38 auto-close (EV–EX pending).
 * Schema-json add / live secret store / wall-clock authority refused.
 * Law VI held — never seal secrets.
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
const authorizePath = path.join(root, 'scripts', 'authorize.js');
const EXCLUDE = 'eos-eu-secret-zero-leak-deny.test.js';
const SCRIPTS = {
  'test:mission-eu': 'node --test tests/eos-eu-secret-zero-leak-deny.test.js',
  'test:secret-zero-leak-deny': 'node --test tests/eos-eu-secret-zero-leak-deny.test.js'
};

let changed = false;

if (fs.existsSync(authorizePath)) {
  // Hard guard: never touch authorize.js
  console.log('= authorize.js present (left untouched)');
}

if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-eu: package.json not found at ${pkgPath}`);
  process.exit(1);
}
const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
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
  // Surgical scripts merge only — preserve other package.json fields via parse/stringify.
  // Do not invent new top-level keys; do not touch authorize.js.
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-eu: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
let runner = fs.readFileSync(runnerPath, 'utf8');
if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
  console.log(`= SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
} else {
  const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\][ \t]*\);)/;
  if (!re.test(runner)) {
    console.error('patch-mission-eu: could not locate SLIM_SUITE_EXCLUDES Set');
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

console.log(changed ? 'patch-mission-eu: applied' : 'patch-mission-eu: no-op (already patched)');
