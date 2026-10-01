#!/usr/bin/env node
/**
 * Mission FJ host patcher — idempotently adds:
 *   - package.json scripts: test:mission-fj, test:round-trip-request-reply-integrity
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-fj-round-trip-request-reply-integrity.test.js
 *
 * CRLF-safe (Mission AH/AI/…/EP/EY/FD Windows lesson):
 *   - Set body matcher uses [\s\S] (NOT [^\n]* alone — that breaks on \r\n)
 *   - trailing-comma / line-end checks accept [\r\n]
 *
 * Surgical: only mutates package.json scripts keys + SLIM_SUITE_EXCLUDES entry.
 * NEVER overwrites authorize.js. NEVER wholesale-replaces package.json content
 * beyond the scripts map merge (JSON round-trip preserves other fields).
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-fj.mjs
 *   node scripts/patch-mission-fj.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 * Explicitly: no tip-refresh / no tip-pin rewrite from this package.
 * Freeze honesty pin soft-observe 78141c3d (tip-open #564 / tip-refresh #565).
 * PASS = sealed round-trip request-reply integrity verify ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/FD/FI/FK.
 * NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending).
 * Schema-json add / live HTTP egress / wall-clock authority refused.
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
const EXCLUDE = 'eos-fj-round-trip-request-reply-integrity.test.js';
const SCRIPTS = {
  'test:mission-fj': 'node --test tests/eos-fj-round-trip-request-reply-integrity.test.js',
  'test:round-trip-request-reply-integrity': 'node --test tests/eos-fj-round-trip-request-reply-integrity.test.js'
};

let changed = false;

if (fs.existsSync(authorizePath)) {
  // Hard guard: never touch authorize.js
  console.log('= authorize.js present (left untouched)');
}

if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-fj: package.json not found at ${pkgPath}`);
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
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

if (!fs.existsSync(runnerPath)) {
  console.error(`patch-mission-fj: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
let runner = fs.readFileSync(runnerPath, 'utf8');
if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
  console.log(`= SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
} else {
  const re = /(export const SLIM_SUITE_EXCLUDES = new Set\([\[\s\S]*?)(\][ \t]*\);)/;
  if (!re.test(runner)) {
    console.error('patch-mission-fj: could not locate SLIM_SUITE_EXCLUDES Set');
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

console.log(changed ? 'patch-mission-fj: applied' : 'patch-mission-fj: no-op (already patched)');
