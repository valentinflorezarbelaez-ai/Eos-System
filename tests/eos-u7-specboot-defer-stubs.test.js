import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditSpecbootDeferStubsLock,
  SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
  SPECBOOT_DEFER_STUBS_RITUAL_DOC,
  SPECBOOT_DEFER_STUB_PATHS,
  SPECBOOT_DEFER_STUBS_REQUIRED_PATHS,
  SPECBOOT_DEFER_STUBS_NON_CLAIMS
} from '../scripts/lib/specboot-defer-stubs-lock.js';
import { runSpecbootDeferStubsGate } from '../scripts/ci/specboot-defer-stubs-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('U7: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-u7-specboot-defer-stubs');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('U7: evidence + ritual exist with required needles', () => {
  const evidence = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_EVIDENCE_DOC), 'utf8');
  const ritual = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_RITUAL_DOC), 'utf8');
  assert.ok(evidence.includes('INDEX_STUBS'));
  assert.ok(evidence.includes('DEFER'));
  assert.ok(evidence.includes('Gentleman'));
  assert.ok(evidence.includes('no Gentleman invent') || evidence.includes('Gentleman invent'));
  assert.ok(evidence.includes('CloudAgent'));
  assert.ok(evidence.includes('ai-specs'));
  assert.ok(ritual.includes('INDEX_STUBS'));
  assert.ok(ritual.includes('Gentleman invent'));
  assert.ok(ritual.includes('FORBIDDEN'));
  assert.ok(ritual.includes('CloudAgent out of'));
  assert.ok(
    evidence.includes('PRODUCTION_READY:** NO') ||
      evidence.includes('PRODUCTION_READY: NO') ||
      evidence.includes('**PRODUCTION_READY:** NO')
  );
});

test('U7: three INDEX stubs tracked with EOS pointers (no Gentleman invent)', () => {
  for (const rel of SPECBOOT_DEFER_STUB_PATHS) {
    const text = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    assert.ok(text.includes('INDEX'), rel + ' missing INDEX');
    assert.ok(text.includes('DEFER'), rel + ' missing DEFER');
    assert.ok(text.includes('base-standards'), rel + ' missing base-standards');
    assert.ok(text.includes('Gentleman'), rel + ' missing Gentleman ban');
    assert.ok(text.includes('PRODUCTION_READY'), rel + ' missing PRODUCTION_READY');
    assert.ok(!/theme-kit|Gentleman Design System/i.test(text), rel + ' invent ban');
  }
});

test('U7: auditSpecbootDeferStubsLock green on INDEX_STUBS docs', () => {
  const audit = auditSpecbootDeferStubsLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'INDEX_STUBS');
  assert.ok(audit.checks.length >= 5);
});

test('U7: fail-closed when evidence doc missing', () => {
  const audit = auditSpecbootDeferStubsLock(rootDir, {
    docMissing: true,
    skipPathChecks: true,
    skipStubChecks: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /missing/i.test(f.message)));
});

test('U7: fail-closed when INDEX_STUBS / Gentleman ban stripped', () => {
  const real = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_EVIDENCE_DOC), 'utf8');
  const stripped = real
    .replace(/INDEX_STUBS/g, 'MODE_X')
    .replace(/Gentleman invent/g, 'REMOVED')
    .replace(/no Gentleman invent/g, 'REMOVED');
  const ritual = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_RITUAL_DOC), 'utf8');
  const audit = auditSpecbootDeferStubsLock(rootDir, {
    evidenceDocText: stripped,
    ritualDocText: ritual,
    skipPathChecks: true,
    skipStubChecks: true
  });
  assert.equal(audit.ok, false);
});

test('U7: fail-closed pretend Gentleman standards complete', () => {
  const real = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_EVIDENCE_DOC), 'utf8');
  const pretend = real + '\nDelivered: Gentleman standards COMPLETE for frontend.\n';
  const ritual = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_RITUAL_DOC), 'utf8');
  const audit = auditSpecbootDeferStubsLock(rootDir, {
    evidenceDocText: pretend,
    ritualDocText: ritual,
    skipPathChecks: true,
    skipStubChecks: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /Gentleman|wholesale|complete/i.test(f.message)));
});

test('U7: gate PASS is NON-MUTATING with INDEX_STUBS', () => {
  const report = runSpecbootDeferStubsGate();
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.mutating, false);
  assert.equal(report.PRODUCTION_READY, 'NO');
  assert.equal(report.mode, 'INDEX_STUBS');
});

test('U7: package.json exposes test:u7; required paths present', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:u7'],
    'node --test tests/eos-u7-specboot-defer-stubs.test.js'
  );
  for (const rel of SPECBOOT_DEFER_STUBS_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
  assert.ok(SPECBOOT_DEFER_STUBS_NON_CLAIMS.some((n) => /Gentleman/i.test(n)));
});

test('U7: verify-eos wires SpecBoot DEFER stubs paths', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('eos-u7-specboot-defer-stubs.test.js'));
  assert.ok(src.includes('EOS_U7_SPECBOOT_DEFER_STUBS_2026-09-09.md'));
  assert.ok(src.includes('specboot-defer-stubs-lock.js'));
  assert.ok(src.includes('SPECBOOT_DEFER_STUBS_RITUAL.md'));
});

test('U7: SPECBOOT_CYCLE gap notes INDEX stubs (not leave dirty)', () => {
  const text = fs.readFileSync(path.join(rootDir, 'docs/harness/SPECBOOT_CYCLE.md'), 'utf8');
  assert.ok(text.includes('development_guide.md'));
  assert.ok(text.includes('INDEX') || text.includes('INDEX_STUBS') || text.includes('index'));
  assert.ok(!/leave dirty unstaged until filled/i.test(text));
});
