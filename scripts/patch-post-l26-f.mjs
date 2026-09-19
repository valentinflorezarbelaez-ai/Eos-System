#!/usr/bin/env node
/**
 * Post-L26 Workstream F host patcher — idempotently adds:
 *   - package.json scripts: test:fundacion-gameday, test:post-l26-f
 *   - scripts/test-runner.js SLIM_SUITE_EXCLUDES entry for the gameday suite
 *
 * CRLF-safe (Windows lesson): Set body matcher uses [\s\S].
 *
 * Usage (from worktree root after CopyFromBox):
 *   node scripts/patch-post-l26-f.mjs
 *
 * PRODUCTION_READY: NO — patcher only; NO Fundacion paths; no AI attribution.
 * NON-CLAIM: patching scripts ≠ game-day seal ≠ PRODUCTION_READY flip.
 * FUNDACION_ALWAYS_DENY — this script never touches Fundacion.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveRoot() {
  const cwd = process.cwd();
  if (
    fs.existsSync(path.join(cwd, 'package.json')) &&
    fs.existsSync(path.join(cwd, 'scripts'))
  ) {
    return cwd;
  }
  const fromScript = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(fromScript, 'package.json'))) return fromScript;
  return cwd;
}

const root = resolveRoot();
const pkgPath = path.join(root, 'package.json');
const runnerPath = path.join(root, 'scripts', 'test-runner.js');
const EXCLUDE = 'eos-post-l26-f-fundacion-gameday.test.js';
const SCRIPTS = {
  'test:fundacion-gameday':
    'node --test tests/eos-post-l26-f-fundacion-gameday.test.js',
  'test:post-l26-f':
    'node --test tests/eos-post-l26-f-fundacion-gameday.test.js'
};

let changed = false;

if (!fs.existsSync(pkgPath)) {
  console.error(`patch-post-l26-f: package.json not found at ${pkgPath}`);
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
  console.error(`patch-post-l26-f: test-runner.js not found at ${runnerPath}`);
  console.error(
    '  (hermetic package itself has no test-runner — run this on host after CopyFromBox)'
  );
  if (
    fs.existsSync(
      path.join(root, 'src/core/fundacion/fundacion-delta0-gameday.js')
    )
  ) {
    console.log(
      '= SLIM_SUITE_EXCLUDES skipped (hermetic package; apply on host)'
    );
    console.log(
      changed
        ? 'patch-post-l26-f: applied (scripts only; host needs SLIM exclude)'
        : 'patch-post-l26-f: no-op scripts; host needs SLIM exclude'
    );
    process.exit(0);
  }
  process.exit(1);
}

let runner = fs.readFileSync(runnerPath, 'utf8');
if (runner.includes(`'${EXCLUDE}'`) || runner.includes(`"${EXCLUDE}"`)) {
  console.log(`= SLIM_SUITE_EXCLUDES already has ${EXCLUDE}`);
} else {
  const re =
    /(export const SLIM_SUITE_EXCLUDES = new Set\(\[[\s\S]*?)(\][ \t]*\);)/;
  if (!re.test(runner)) {
    console.error(
      'patch-post-l26-f: could not locate SLIM_SUITE_EXCLUDES Set'
    );
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

console.log(
  changed
    ? 'patch-post-l26-f: applied'
    : 'patch-post-l26-f: no-op (already patched)'
);
