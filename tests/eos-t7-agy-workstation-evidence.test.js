import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditAgyWorkstationLock,
  inferDaemonModeFromEvidence,
  reconcileDaemonHonesty,
  AGY_WORKSTATION_EVIDENCE_DOC,
  AGY_WORKSTATION_CHECKLIST_DOC,
  AGY_WORKSTATION_REQUIRED_PATHS
} from '../scripts/lib/agy-workstation-lock.js';
import {
  runAgyWorkstationSmoke,
  probeAgyWorkstation
} from '../scripts/ci/agy-workstation-smoke.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('T7: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-t7-agy-workstation-evidence');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('T7: evidence + checklist exist with required needles', () => {
  const evidence = fs.readFileSync(path.join(rootDir, AGY_WORKSTATION_EVIDENCE_DOC), 'utf8');
  const checklist = fs.readFileSync(path.join(rootDir, AGY_WORKSTATION_CHECKLIST_DOC), 'utf8');
  assert.ok(evidence.includes('DAEMON_ABSENT'));
  assert.ok(evidence.includes('Not installed'));
  assert.ok(evidence.includes('OpenSpec CLI'));
  assert.ok(evidence.includes('CloudAgent'));
  assert.ok(evidence.includes('Admin HITL'));
  assert.ok(checklist.includes('DAEMON_PRESENT'));
  assert.ok(checklist.includes('FORBIDDEN'));
  assert.ok(checklist.includes('NON-MUTATING'));
  assert.ok(checklist.includes('OpenSpec CLI optional'));
  assert.ok(checklist.includes('CloudAgent out of'));
  assert.ok(
    evidence.includes('PRODUCTION_READY:** NO') ||
      evidence.includes('PRODUCTION_READY: NO') ||
      evidence.includes('**PRODUCTION_READY:** NO')
  );
});

test('T7: auditAgyWorkstationLock green on honest DAEMON_ABSENT docs', () => {
  const audit = auditAgyWorkstationLock(rootDir, { skipLiveProbe: true });
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'DAEMON_ABSENT');
  assert.ok(audit.checks.length >= 5);
});

test('T7: fail-closed when evidence doc missing', () => {
  const audit = auditAgyWorkstationLock(rootDir, {
    docMissing: true,
    skipPathChecks: true,
    skipLiveProbe: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /missing/i.test(f.message)));
});

test('T7: fail-closed when DAEMON_ABSENT language stripped', () => {
  const real = fs.readFileSync(path.join(rootDir, AGY_WORKSTATION_EVIDENCE_DOC), 'utf8');
  const stripped = real
    .replace(/DAEMON_ABSENT/g, 'MODE_X')
    .replace(/Not installed/gi, 'STATUS_REMOVED')
    .replace(/ABSENT/g, 'GONE');
  const checklist = fs.readFileSync(path.join(rootDir, AGY_WORKSTATION_CHECKLIST_DOC), 'utf8');
  const audit = auditAgyWorkstationLock(rootDir, {
    evidenceDocText: stripped,
    checklistDocText: checklist,
    skipPathChecks: true,
    skipLiveProbe: true
  });
  assert.equal(audit.ok, false);
});

test('T7: fail-closed pretend INSTALLED when probe says Not installed', () => {
  const real = fs.readFileSync(path.join(rootDir, AGY_WORKSTATION_EVIDENCE_DOC), 'utf8');
  // Force PRESENT claim without ABSENT honesty
  const pretend =
    real
      .replace(/DAEMON_ABSENT/g, 'DAEMON_PRESENT')
      .replace(/Not installed/gi, 'INSTALLED')
      .replace(/\bABSENT\b/g, 'PRESENT') +
    '\n**Decision:** DAEMON_PRESENT — daemon INSTALLED\n';
  const checklist = fs.readFileSync(path.join(rootDir, AGY_WORKSTATION_CHECKLIST_DOC), 'utf8');
  const audit = auditAgyWorkstationLock(rootDir, {
    evidenceDocText: pretend,
    checklistDocText: checklist,
    skipPathChecks: true,
    skipLiveProbe: false,
    liveProbe: {
      daemonStatusText: '--- Daemon ---\\nNot installed.\\n',
      daemonInstalled: false,
      probed: true
    }
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /pretend|Not installed|ABSENT/i.test(f.message)));
});

test('T7: reconcileDaemonHonesty + inferDaemonModeFromEvidence', () => {
  const evidence = fs.readFileSync(path.join(rootDir, AGY_WORKSTATION_EVIDENCE_DOC), 'utf8');
  assert.equal(inferDaemonModeFromEvidence(evidence), 'DAEMON_ABSENT');
  const bad = reconcileDaemonHonesty('DAEMON_PRESENT', {
    daemonInstalled: false,
    daemonStatusText: 'Not installed.'
  });
  assert.equal(bad.ok, false);
  const good = reconcileDaemonHonesty('DAEMON_ABSENT', {
    daemonInstalled: false,
    daemonStatusText: 'Not installed.'
  });
  assert.equal(good.ok, true);
});

test('T7: smoke gate PASS is NON-MUTATING (doc path)', () => {
  const report = runAgyWorkstationSmoke({ skipLiveProbe: true });
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.mutating, false);
  assert.equal(report.adminRequired, false);
  assert.equal(report.PRODUCTION_READY, 'NO');
  assert.equal(report.mode, 'DAEMON_ABSENT');
});

test('T7: package.json exposes test:t7; required paths present', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:t7'],
    'node --test tests/eos-t7-agy-workstation-evidence.test.js'
  );
  for (const rel of AGY_WORKSTATION_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('T7: verify-eos wires agy-workstation lock', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('auditAgyWorkstationLock'));
  assert.ok(src.includes('AGY_WORKSTATION_REQUIRED_PATHS'));
  assert.ok(src.includes('agy-workstation-lock'));
  assert.ok(src.includes('eos-t7-agy-workstation-evidence.test.js'));
});

test('T7: probe helper is importable (non-mutating)', () => {
  const probe = probeAgyWorkstation(rootDir);
  assert.ok(probe);
  assert.equal(typeof probe.agyPresent, 'boolean');
  // On non-Windows CI, probed=false; on Windows workstation, probed=true
  assert.equal(typeof probe.probed, 'boolean');
});
