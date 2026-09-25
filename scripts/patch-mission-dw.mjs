#!/usr/bin/env node
/**
 * Mission DW host patcher — idempotently adds:
 *   - package.json scripts: test:mission-dw, test:idempotent-message-consumer
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES: eos-dw-idempotent-message-consumer-port.test.js
 *
 * CRLF-safe (Mission AH/AI/…/DV Windows lesson):
 *   - Set body matcher uses [\s\S] (NOT [^\n]* alone — that breaks on \r\n)
 *   - trailing-comma / line-end checks accept [\r\n]
 *
 * Usage (from worktree root):
 *   node path/to/payload/scripts/patch-mission-dw.mjs
 *   node scripts/patch-mission-dw.mjs   (after copy into worktree)
 *
 * PRODUCTION_READY: NO — patcher only; no Fundacion paths; no AI attribution.
 * Explicitly: no tip-refresh / no tip-pin rewrite from this package.
 * Freeze honesty pin soft-observe b485ae0b (PR #447 / tip-refresh-post-447 preferred).
 * Soft-import DV outbox observe when present; optionally soft-observe DU publisher.
 * PASS = idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close.
 * NEVER reopen L30–L32; refuse L33 auto-close.
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
const EXCLUDE = 'eos-dw-idempotent-message-consumer-port.test.js';
const SCRIPTS = {
  'test:mission-dw': 'node --test tests/eos-dw-idempotent-message-consumer-port.test.js',
  'test:idempotent-message-consumer': 'node --test tests/eos-dw-idempotent-message-consumer-port.test.js'
};

let changed = false;

if (!fs.existsSync(pkgPath)) {
  console.error(`patch-mission-dw: package.json not found at ${pkgPath}`);
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
  console.error(`patch-mission-dw: test-runner.js not found at ${runnerPath}`);
  process.exit(1);
}
let runner = fs.readFileSync(runnerPath, 'utf8');
if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
  console.log(`= SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
} else {
  const re = /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\][ \t]*\);)/;
  if (!re.test(runner)) {
    console.error('patch-mission-dw: could not locate SLIM_SUITE_EXCLUDES Set');
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

console.log(changed ? 'patch-mission-dw: applied' : 'patch-mission-dw: no-op (already patched)');
