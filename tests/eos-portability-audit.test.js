/**
 * Portability audit — clean-clone reproducibility guard.
 *
 * A hardcoded operator home path (`C:\Users\<name>\...`) inside
 * RealProjectDiscoveryEngine made the suite unreproducible on any host but one.
 * These checks keep the canonical Mission OS surface free of host-specific paths and
 * pin the legacy harness so the leak cannot grow again.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Absolute paths anchored in a specific user's home directory on a specific machine.
const HOST_PATH_PATTERNS = [
  /[A-Za-z]:\\{1,2}Users\\{1,2}[A-Za-z0-9._-]+/,
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//
];

// Generic forms that describe *any* host rather than one host are legitimate:
// redaction regexes, env-var fallbacks and doc placeholders.
const ALLOWED_GENERIC = [
  /C:\\\\Users\\\\\[\^\\\\\]\+\\\\/, // redaction regex source
  /process\.env\.USERPROFILE/,
  /process\.env\.HOME/
];

function collectFiles(dir, exts = ['.js', '.mjs', '.json']) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, exts));
    else if (exts.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function hostPathHits(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    if (ALLOWED_GENERIC.some((p) => p.test(line))) return;
    if (HOST_PATH_PATTERNS.some((p) => p.test(line))) {
      hits.push({ file: path.relative(rootDir, file), line: i + 1 });
    }
  });
  return hits;
}

test('PORT-01: canonical Mission OS runtime contains zero hardcoded host paths', () => {
  const files = [...collectFiles(path.join(rootDir, 'src')), ...collectFiles(path.join(rootDir, 'bin'))];
  assert.ok(files.length > 0, 'expected to scan the canonical runtime');

  const hits = files.flatMap(hostPathHits);
  assert.deepEqual(hits, [], `canonical runtime must be host-independent, found: ${JSON.stringify(hits)}`);
});

test('PORT-02: the discovery engine default target resolves without operator-specific paths', async () => {
  const { resolveDefaultDiscoveryTarget } = await import(
    '../scripts/engine/real-project-discovery-engine.js'
  );

  const fallback = resolveDefaultDiscoveryTarget({});
  assert.ok(path.isAbsolute(fallback));
  assert.equal(fallback, path.join(rootDir, 'Fundacion'));
  assert.ok(HOST_PATH_PATTERNS.every((p) => !p.test(fallback.replace(rootDir, ''))));

  assert.equal(
    resolveDefaultDiscoveryTarget({ EOS_DISCOVERY_TARGET: '/tmp/some-target' }),
    '/tmp/some-target'
  );
});

test('PORT-03: legacy harness host-path leakage does not grow', () => {
  // Known debt: the pre-canonical scripts/engine harness and its tests still embed one
  // operator's paths as opaque string fixtures. They do not resolve on disk, so they do not
  // break a clean clone — but the count is pinned so no new leakage is introduced.
  const LEGACY_BUDGET = 35;

  const files = [
    ...collectFiles(path.join(rootDir, 'scripts')),
    ...collectFiles(path.join(rootDir, 'tests'))
  ].filter((f) => !f.endsWith('eos-portability-audit.test.js'));

  const leaking = new Set(files.flatMap(hostPathHits).map((h) => h.file));
  assert.ok(
    leaking.size <= LEGACY_BUDGET,
    `legacy host-path leakage grew to ${leaking.size} files (budget ${LEGACY_BUDGET}); ` +
      `make new code host-independent instead of raising the budget`
  );
});

test('PORT-04: mission operational state is excluded from version control', () => {
  const ignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
  assert.ok(/^\.missions\/$/m.test(ignore), '.missions/ must be gitignored');
});
