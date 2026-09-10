import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditOpenspecCliHoldLock,
  probeOpenspecCli,
  OPENSPEC_CLI_HOLD_EVIDENCE_DOC,
  OPENSPEC_CLI_HOLD_RITUAL_DOC,
  OPENSPEC_CLI_HOLD_REQUIRED_PATHS,
  OPENSPEC_CLI_HOLD_NON_CLAIMS
} from '../scripts/lib/openspec-cli-hold-lock.js';
import { runOpenspecCliHoldGate } from '../scripts/ci/openspec-cli-hold-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('U6: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-u6-openspec-cli-hold');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('U6: evidence + ritual exist with required needles', () => {
  const evidence = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_EVIDENCE_DOC), 'utf8');
  const ritual = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_RITUAL_DOC), 'utf8');
  assert.ok(evidence.includes('CLI_ABSENT'));
  assert.ok(evidence.includes('CLI_ABSENT_HOLD'));
  assert.ok(evidence.includes('HOLD'));
  assert.ok(evidence.includes('optional'));
  assert.ok(evidence.includes('do NOT invent'));
  assert.ok(evidence.includes('CloudAgent'));
  assert.ok(ritual.includes('CLI_PRESENT_SMOKE'));
  assert.ok(ritual.includes('optional this quarter'));
  assert.ok(ritual.includes('FORBIDDEN'));
  assert.ok(ritual.includes('NON-MUTATING'));
  assert.ok(ritual.includes('CloudAgent out of'));
  assert.ok(
    evidence.includes('PRODUCTION_READY:** NO') ||
      evidence.includes('PRODUCTION_READY: NO') ||
      evidence.includes('**PRODUCTION_READY:** NO')
  );
});

test('U6: auditOpenspecCliHoldLock green on honest CLI_ABSENT_HOLD docs', () => {
  const audit = auditOpenspecCliHoldLock(rootDir, {
    skipLiveProbe: true,
    liveProbe: { present: false, probed: true, helperExit: 2 }
  });
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'CLI_ABSENT_HOLD');
  assert.equal(audit.cliPresent, false);
  assert.ok(audit.checks.length >= 5);
});

test('U6: fail-closed when evidence doc missing', () => {
  const audit = auditOpenspecCliHoldLock(rootDir, {
    docMissing: true,
    skipPathChecks: true,
    skipLiveProbe: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /missing/i.test(f.message)));
});

test('U6: fail-closed when HOLD / CLI_ABSENT language stripped', () => {
  const real = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_EVIDENCE_DOC), 'utf8');
  const stripped = real
    .replace(/CLI_ABSENT_HOLD/g, 'MODE_X')
    .replace(/CLI_ABSENT/g, 'GONE')
    .replace(/HOLD/g, 'MODE_X')
    .replace(/do NOT invent/g, 'REMOVED');
  const ritual = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_RITUAL_DOC), 'utf8');
  const audit = auditOpenspecCliHoldLock(rootDir, {
    evidenceDocText: stripped,
    ritualDocText: ritual,
    skipPathChecks: true,
    skipLiveProbe: true,
    liveProbe: { present: false, probed: true }
  });
  assert.equal(audit.ok, false);
});

test('U6: fail-closed pretend PRESENT when probe says ABSENT', () => {
  const real = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_EVIDENCE_DOC), 'utf8');
  const pretend =
    real
      .replace(/CLI_ABSENT_HOLD/g, 'CLI_PRESENT_SMOKE')
      .replace(/CLI_ABSENT/g, 'CLI_PRESENT') +
    '\n**Decision:** CLI_PRESENT_SMOKE — openspec --version green\n';
  const ritual = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_RITUAL_DOC), 'utf8');
  const audit = auditOpenspecCliHoldLock(rootDir, {
    evidenceDocText: pretend,
    ritualDocText: ritual,
    skipPathChecks: true,
    skipLiveProbe: false,
    liveProbe: { present: false, probed: true, helperExit: 2 }
  });
  assert.equal(audit.ok, false);
  assert.ok(
    audit.failures.some((f) => /pretend|invent|ABSENT|PRESENT/i.test(f.message))
  );
});

test('U6: PRESENT_SMOKE path passes only when probe proves present', () => {
  const real = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_EVIDENCE_DOC), 'utf8');
  const presentDoc =
    real
      .replace(/CLI_ABSENT_HOLD/g, 'CLI_PRESENT_SMOKE')
      .replace(/CLI_ABSENT/g, 'CLI_PRESENT')
      .replace(/do NOT invent install success/g, 'do NOT invent false ABSENT when proven') +
    '\n**Decision:** CLI_PRESENT_SMOKE\n';
  // Ensure required ABSENT needle still needed for real HOLD path — for PRESENT fixture
  // we still need "do NOT invent" somewhere; keep it.
  const ritual = fs.readFileSync(path.join(rootDir, OPENSPEC_CLI_HOLD_RITUAL_DOC), 'utf8');
  // PRESENT fixture will fail evidence required section CLI_ABSENT — so inject it as historical note
  const presentWithNeedle =
    presentDoc + '\nHistorical note: prior CLI_ABSENT HOLD before optional install.\n';
  const audit = auditOpenspecCliHoldLock(rootDir, {
    evidenceDocText: presentWithNeedle,
    ritualDocText: ritual,
    skipPathChecks: true,
    liveProbe: { present: true, probed: true, helperExit: 0, versionText: '1.2.3' }
  });
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'CLI_PRESENT_SMOKE');
  assert.equal(audit.cliPresent, true);
});

test('U6: gate PASS is NON-MUTATING with CLI_ABSENT_HOLD', () => {
  const report = runOpenspecCliHoldGate({
    skipLiveProbe: true,
    liveProbe: { present: false, probed: true, helperExit: 2 }
  });
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.mutating, false);
  assert.equal(report.PRODUCTION_READY, 'NO');
  assert.equal(report.mode, 'CLI_ABSENT_HOLD');
  assert.equal(report.cliPresent, false);
});

test('U6: package.json exposes test:u6; required paths present', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:u6'],
    'node --test tests/eos-u6-openspec-cli-hold.test.js'
  );
  for (const rel of OPENSPEC_CLI_HOLD_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
  assert.ok(OPENSPEC_CLI_HOLD_NON_CLAIMS.some((n) => /invent/i.test(n)));
});

test('U6: verify-eos wires OpenSpec CLI HOLD paths', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('eos-u6-openspec-cli-hold.test.js'));
  assert.ok(src.includes('EOS_U6_OPENSPEC_CLI_HOLD_2026-09-09.md'));
  assert.ok(src.includes('openspec-cli-hold-lock.js'));
  assert.ok(src.includes('OPENSPEC_CLI_HOLD_RITUAL.md'));
});

test('U6: live probeOpenspecCli reports boolean present (no invent)', () => {
  const probe = probeOpenspecCli(rootDir);
  assert.equal(typeof probe.present, 'boolean');
  assert.equal(probe.probed, true);
  // On this workstation we expect ABSENT; do not invent PRESENT
  if (!probe.present) {
    assert.notEqual(probe.helperExit, 0);
  }
});
