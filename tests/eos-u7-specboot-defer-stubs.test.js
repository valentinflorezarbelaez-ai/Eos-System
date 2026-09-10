import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditSpecbootDeferStubsLock,
  SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
  SPECBOOT_DEFER_STUBS_RITUAL_DOC,
  SPECBOOT_DEFER_STUBS_INDEX_DOC,
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
  assert.ok(/Decision:\s*\*\*IGNORE\*\*/i.test(evidence) || /Mode:\s*\*\*IGNORE\*\*/i.test(evidence));
  assert.ok(evidence.includes('IGNORE'));
  assert.ok(evidence.includes('DEFER'));
  assert.ok(evidence.includes('Gentleman'));
  assert.ok(evidence.includes('no Gentleman invent') || evidence.includes('Gentleman invent'));
  assert.ok(evidence.includes('CloudAgent'));
  assert.ok(evidence.includes('ai-specs'));
  assert.ok(ritual.includes('IGNORE'));
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

test('U7: forbidden SpecBoot checklist paths ABSENT (IGNORE; S2 TPC)', () => {
  for (const rel of SPECBOOT_DEFER_STUB_PATHS) {
    assert.ok(
      !fs.existsSync(path.join(rootDir, rel)),
      'must not invent ' + rel
    );
  }
});

test('U7: harness INDEX pointer present with EOS proxies (no Gentleman invent)', () => {
  const text = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_INDEX_DOC), 'utf8');
  assert.ok(text.includes('IGNORE'));
  assert.ok(text.includes('DEFER'));
  assert.ok(text.includes('base-standards'));
  assert.ok(text.includes('Gentleman'));
  assert.ok(text.includes('PRODUCTION_READY'));
  assert.ok(text.includes('frontend-standards'));
  assert.ok(text.includes('documentation-standards'));
  assert.ok(text.includes('development_guide'));
  assert.ok(!/theme-kit|Gentleman Design System/i.test(text), 'invent ban');
});

test('U7: auditSpecbootDeferStubsLock green on IGNORE', () => {
  const audit = auditSpecbootDeferStubsLock(rootDir);
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'IGNORE');
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

test('U7: fail-closed when IGNORE / Gentleman ban stripped', () => {
  const real = fs.readFileSync(path.join(rootDir, SPECBOOT_DEFER_STUBS_EVIDENCE_DOC), 'utf8');
  const stripped = real
    .replace(/IGNORE/g, 'MODE_X')
    .replace(/Gentleman/g, 'REMOVED');
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

test('U7: gate PASS is NON-MUTATING with IGNORE', () => {
  const report = runSpecbootDeferStubsGate();
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.mutating, false);
  assert.equal(report.PRODUCTION_READY, 'NO');
  assert.equal(report.mode, 'IGNORE');
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
  assert.ok(src.includes('SPECBOOT_DEFER_STUBS_INDEX.md'));
  assert.ok(!src.includes("'docs/frontend-standards.md'"));
  assert.ok(!src.includes("'docs/development_guide.md'"));
  assert.ok(!src.includes("'docs/documentation-standards.md'"));
});

test('U7: SPECBOOT_CYCLE gap notes IGNORE + harness INDEX', () => {
  const text = fs.readFileSync(path.join(rootDir, 'docs/harness/SPECBOOT_CYCLE.md'), 'utf8');
  assert.ok(text.includes('development_guide.md'));
  assert.ok(text.includes('IGNORE'));
  assert.ok(text.includes('SPECBOOT_DEFER_STUBS_INDEX'));
});
