import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditAgyAdminHitlLock,
  AGY_ADMIN_HITL_EVIDENCE_DOC,
  AGY_ADMIN_HITL_CHECKLIST_DOC,
  AGY_ADMIN_HITL_REQUIRED_PATHS,
  AGY_ADMIN_HITL_DOCUMENTED_PATH,
  AGY_ADMIN_HITL_NON_CLAIMS
} from '../scripts/lib/agy-admin-hitl-lock.js';
import { runAgyAdminHitlChecklist } from '../scripts/ci/agy-admin-hitl-checklist.js';
import { inferDaemonModeFromEvidence } from '../scripts/lib/agy-workstation-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('U5: OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-u5-agy-admin-hitl-checklist');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('U5: evidence + Admin HITL checklist exist with required needles', () => {
  const evidence = fs.readFileSync(path.join(rootDir, AGY_ADMIN_HITL_EVIDENCE_DOC), 'utf8');
  const checklist = fs.readFileSync(path.join(rootDir, AGY_ADMIN_HITL_CHECKLIST_DOC), 'utf8');
  assert.ok(evidence.includes('DAEMON_ABSENT'));
  assert.ok(evidence.includes('Not installed'));
  assert.ok(evidence.includes('adminRequired=true'));
  assert.ok(evidence.includes('not executed') || evidence.includes('NOT EXECUTED'));
  assert.ok(evidence.includes('Admin HITL'));
  assert.ok(evidence.includes('CloudAgent'));
  assert.ok(checklist.includes('DAEMON_PRESENT'));
  assert.ok(checklist.includes('adminRequired=true'));
  assert.ok(checklist.includes('installExecuted=false'));
  assert.ok(checklist.includes('FORBIDDEN'));
  assert.ok(checklist.includes('NON-MUTATING'));
  assert.ok(checklist.includes('CloudAgent out of'));
  assert.ok(
    evidence.includes('PRODUCTION_READY:** NO') ||
      evidence.includes('PRODUCTION_READY: NO') ||
      evidence.includes('**PRODUCTION_READY:** NO')
  );
});

test('U5: auditAgyAdminHitlLock green on honest DAEMON_ABSENT docs', () => {
  const audit = auditAgyAdminHitlLock(rootDir, { skipLiveProbe: true });
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'DAEMON_ABSENT');
  assert.equal(audit.adminRequired, true);
  assert.equal(audit.installExecuted, false);
  assert.ok(audit.checks.length >= 5);
});

test('U5: fail-closed when evidence doc missing', () => {
  const audit = auditAgyAdminHitlLock(rootDir, {
    docMissing: true,
    skipPathChecks: true,
    skipLiveProbe: true,
    skipT7Baseline: true
  });
  assert.equal(audit.ok, false);
  assert.ok(audit.failures.some((f) => /missing/i.test(f.message)));
});

test('U5: fail-closed when DAEMON_ABSENT language stripped', () => {
  const real = fs.readFileSync(path.join(rootDir, AGY_ADMIN_HITL_EVIDENCE_DOC), 'utf8');
  const stripped = real
    .replace(/DAEMON_ABSENT/g, 'MODE_X')
    .replace(/Not installed/gi, 'STATUS_REMOVED')
    .replace(/ABSENT/g, 'GONE');
  const checklist = fs.readFileSync(path.join(rootDir, AGY_ADMIN_HITL_CHECKLIST_DOC), 'utf8');
  const audit = auditAgyAdminHitlLock(rootDir, {
    evidenceDocText: stripped,
    checklistDocText: checklist,
    skipPathChecks: true,
    skipLiveProbe: true,
    skipT7Baseline: true
  });
  assert.equal(audit.ok, false);
});

test('U5: fail-closed pretend PRESENT when probe says Not installed', () => {
  const real = fs.readFileSync(path.join(rootDir, AGY_ADMIN_HITL_EVIDENCE_DOC), 'utf8');
  const pretend =
    real
      .replace(/DAEMON_ABSENT/g, 'DAEMON_PRESENT')
      .replace(/Not installed/gi, 'INSTALLED')
      .replace(/\bABSENT\b/g, 'PRESENT') +
    '\n**Decision:** DAEMON_PRESENT — daemon INSTALLED\n';
  const checklist = fs.readFileSync(path.join(rootDir, AGY_ADMIN_HITL_CHECKLIST_DOC), 'utf8');
  const audit = auditAgyAdminHitlLock(rootDir, {
    evidenceDocText: pretend,
    checklistDocText: checklist,
    skipPathChecks: true,
    skipT7Baseline: true,
    skipLiveProbe: false,
    liveProbe: {
      daemonStatusText: '--- Daemon ---\\nNot installed.\\n',
      daemonInstalled: false,
      probed: true
    }
  });
  assert.equal(audit.ok, false);
  assert.ok(
    audit.failures.some((f) => /pretend|Not installed|ABSENT|PRESENT proven/i.test(f.message))
  );
});

test('U5: documented adminRequired path is true but installExecuted false', () => {
  assert.equal(AGY_ADMIN_HITL_DOCUMENTED_PATH.adminRequired, true);
  assert.equal(AGY_ADMIN_HITL_DOCUMENTED_PATH.installExecuted, false);
  assert.match(AGY_ADMIN_HITL_DOCUMENTED_PATH.command, /install --name eos-workstation/);
  assert.ok(AGY_ADMIN_HITL_NON_CLAIMS.some((n) => /adminRequired/i.test(n)));
});

test('U5: gate PASS is NON-MUTATING with installExecuted=false', () => {
  const report = runAgyAdminHitlChecklist({ skipLiveProbe: true });
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(report.mutating, false);
  assert.equal(report.adminRequired, true);
  assert.equal(report.installExecuted, false);
  assert.equal(report.PRODUCTION_READY, 'NO');
  assert.equal(report.mode, 'DAEMON_ABSENT');
});

test('U5: package.json exposes test:u5; required paths present', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:u5'],
    'node --test tests/eos-u5-agy-admin-hitl-checklist.test.js'
  );
  for (const rel of AGY_ADMIN_HITL_REQUIRED_PATHS) {
    assert.ok(fs.existsSync(path.join(rootDir, rel)), 'missing ' + rel);
  }
});

test('U5: verify-eos wires Admin HITL paths', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes('eos-u5-agy-admin-hitl-checklist.test.js'));
  assert.ok(src.includes('EOS_U5_AGY_ADMIN_HITL_CHECKLIST_2026-09-09.md'));
  assert.ok(src.includes('agy-admin-hitl-lock.js'));
  assert.ok(src.includes('AGY_ADMIN_HITL_CHECKLIST.md'));
});

test('U5: inferDaemonModeFromEvidence on U5 evidence is DAEMON_ABSENT', () => {
  const evidence = fs.readFileSync(path.join(rootDir, AGY_ADMIN_HITL_EVIDENCE_DOC), 'utf8');
  assert.equal(inferDaemonModeFromEvidence(evidence), 'DAEMON_ABSENT');
});
