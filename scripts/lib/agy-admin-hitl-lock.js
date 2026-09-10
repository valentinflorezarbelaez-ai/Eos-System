/**
 * @module agy-admin-hitl-lock
 * U5 — AGY daemon Admin HITL checklist lock (Ladder 9 K5).
 *
 * Extends T7 agy-workstation honesty: fail-closed DAEMON_ABSENT / Not installed
 * unless PRESENT proven. Documents adminRequired=true install path but NEVER
 * executes Admin install. NON-CLAIM: checklist != daemon installed; documented
 * path != executed. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  auditAgyWorkstationLock,
  inferDaemonModeFromEvidence,
  reconcileDaemonHonesty,
  AGY_WORKSTATION_EVIDENCE_DOC,
  AGY_WORKSTATION_CHECKLIST_DOC
} from './agy-workstation-lock.js';

export const AGY_ADMIN_HITL_EVIDENCE_DOC =
  'docs/releases/EOS_U5_AGY_ADMIN_HITL_CHECKLIST_2026-09-09.md';

export const AGY_ADMIN_HITL_CHECKLIST_DOC =
  'docs/harness/AGY_ADMIN_HITL_CHECKLIST.md';

/** Sections / needles aligned with tests/eos-u5-agy-admin-hitl-checklist.test.js */
export const AGY_ADMIN_HITL_EVIDENCE_REQUIRED_SECTIONS = Object.freeze([
  '## Objetivo (U5 / K5 DoD)',
  '## Status snapshot (honest probe)',
  '## No-claims',
  'DAEMON_ABSENT',
  'Not installed',
  'adminRequired=true',
  'not executed',
  'Admin HITL',
  'PRODUCTION_READY',
  'NON-CLAIM',
  'CloudAgent'
]);

export const AGY_ADMIN_HITL_CHECKLIST_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Legal modes',
  '## 2.1 DAEMON_ABSENT',
  '## 2.2 DAEMON_PRESENT',
  '## 3. Admin HITL operator checklist',
  '## 4. adminRequired=true path',
  '## 6. Non-claims',
  'installExecuted=false',
  'FORBIDDEN',
  'NON-MUTATING',
  'adminRequired=true',
  'CloudAgent out of'
]);

export const AGY_ADMIN_HITL_REQUIRED_PATHS = Object.freeze([
  AGY_ADMIN_HITL_EVIDENCE_DOC,
  AGY_ADMIN_HITL_CHECKLIST_DOC,
  'scripts/lib/agy-admin-hitl-lock.js',
  'scripts/ci/agy-admin-hitl-checklist.js',
  'tests/eos-u5-agy-admin-hitl-checklist.test.js',
  AGY_WORKSTATION_EVIDENCE_DOC,
  AGY_WORKSTATION_CHECKLIST_DOC,
  'scripts/lib/agy-workstation-lock.js',
  'scripts/ci/agy-workstation-smoke.js',
  'agy-daemon.cmd',
  'openspec/changes/eos-u5-agy-admin-hitl-checklist/proposal.md'
]);

export const AGY_ADMIN_HITL_NON_CLAIMS = Object.freeze([
  'checklist / gate != daemon installed',
  'adminRequired=true documented != Admin install executed',
  'DAEMON_ABSENT PASS != remote HITL ready',
  'status evidence != PRODUCTION_READY flip',
  'PRODUCTION_READY remains NO',
  'FORBIDDEN pretend INSTALLED when Not installed',
  'FORBIDDEN U5 agent/CI executing Admin install'
]);

/**
 * Documented Admin install path (never executed by this lock/gate).
 */
export const AGY_ADMIN_HITL_DOCUMENTED_PATH = Object.freeze({
  adminRequired: true,
  command: 'agy-daemon.cmd install --name eos-workstation',
  elevation: 'Administrator',
  installExecuted: false,
  mutating: false
});

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.evidenceDocText]
 * @param {string} [options.checklistDocText]
 * @param {boolean} [options.skipPathChecks]
 * @param {boolean} [options.docMissing]
 * @param {boolean} [options.skipLiveProbe]
 * @param {boolean} [options.skipT7Baseline]
 * @param {{ daemonStatusText?: string, daemonInstalled?: boolean, agyPresent?: boolean, probed?: boolean }|null} [options.liveProbe]
 * @returns {{ ok: boolean, checks: object[], failures: object[], mode: string, adminRequired: boolean, installExecuted: boolean }}
 */
export function auditAgyAdminHitlLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  let mode = 'UNKNOWN';

  if (options.docMissing === true) {
    failures.push({
      path: AGY_ADMIN_HITL_EVIDENCE_DOC,
      message: 'U5 AGY Admin HITL evidence doc missing (fail-closed)',
      type: 'agy-admin-hitl-lock'
    });
    return {
      ok: false,
      checks,
      failures,
      mode,
      adminRequired: true,
      installExecuted: false
    };
  }

  let evidenceText = options.evidenceDocText;
  if (evidenceText === undefined) {
    const full = path.join(rootDir, AGY_ADMIN_HITL_EVIDENCE_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: AGY_ADMIN_HITL_EVIDENCE_DOC,
        message: 'U5 AGY Admin HITL evidence doc missing (fail-closed)',
        type: 'agy-admin-hitl-lock'
      });
      return {
        ok: false,
        checks,
        failures,
        mode,
        adminRequired: true,
        installExecuted: false
      };
    }
    evidenceText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: AGY_ADMIN_HITL_EVIDENCE_DOC + ' exists',
    status: 'VERIFIED',
    type: 'agy-admin-hitl-lock'
  });

  let checklistText = options.checklistDocText;
  if (checklistText === undefined) {
    const full = path.join(rootDir, AGY_ADMIN_HITL_CHECKLIST_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: AGY_ADMIN_HITL_CHECKLIST_DOC,
        message: 'U5 AGY Admin HITL checklist missing (fail-closed)',
        type: 'agy-admin-hitl-lock'
      });
      return {
        ok: false,
        checks,
        failures,
        mode,
        adminRequired: true,
        installExecuted: false
      };
    }
    checklistText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: AGY_ADMIN_HITL_CHECKLIST_DOC + ' exists',
    status: 'VERIFIED',
    type: 'agy-admin-hitl-lock'
  });

  for (const needle of AGY_ADMIN_HITL_EVIDENCE_REQUIRED_SECTIONS) {
    if (!evidenceText.includes(needle)) {
      failures.push({
        path: AGY_ADMIN_HITL_EVIDENCE_DOC,
        message: 'U5 evidence required section/needle missing: ' + needle,
        type: 'agy-admin-hitl-lock'
      });
    }
  }
  if (
    AGY_ADMIN_HITL_EVIDENCE_REQUIRED_SECTIONS.every((n) =>
      evidenceText.includes(n)
    )
  ) {
    checks.push({
      path: 'U5 evidence required sections present',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  }

  for (const needle of AGY_ADMIN_HITL_CHECKLIST_REQUIRED_SECTIONS) {
    if (!checklistText.includes(needle)) {
      failures.push({
        path: AGY_ADMIN_HITL_CHECKLIST_DOC,
        message: 'U5 checklist required section/needle missing: ' + needle,
        type: 'agy-admin-hitl-lock'
      });
    }
  }
  if (
    AGY_ADMIN_HITL_CHECKLIST_REQUIRED_SECTIONS.every((n) =>
      checklistText.includes(n)
    )
  ) {
    checks.push({
      path: 'U5 checklist required sections present',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  }

  const productionReadyNo =
    evidenceText.includes('PRODUCTION_READY:** NO') ||
    evidenceText.includes('PRODUCTION_READY: NO') ||
    evidenceText.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: AGY_ADMIN_HITL_EVIDENCE_DOC,
      message: 'U5 evidence must keep PRODUCTION_READY: NO',
      type: 'agy-admin-hitl-lock'
    });
  } else {
    checks.push({
      path: 'U5 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  }

  mode = inferDaemonModeFromEvidence(evidenceText);
  if (mode === 'DAEMON_ABSENT') {
    checks.push({
      path: 'U5 mode DAEMON_ABSENT (honest; Admin install not executed)',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  } else if (mode === 'DAEMON_PRESENT') {
    checks.push({
      path: 'U5 mode DAEMON_PRESENT (only legal when status-corroborated)',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  } else {
    failures.push({
      path: AGY_ADMIN_HITL_EVIDENCE_DOC,
      message:
        'U5 evidence must declare DAEMON_ABSENT (Not installed) OR DAEMON_PRESENT (proven)',
      type: 'agy-admin-hitl-lock'
    });
  }

  const adminPathDocumented =
    (evidenceText.includes('adminRequired=true') ||
      checklistText.includes('adminRequired=true')) &&
    (evidenceText.includes('agy-daemon.cmd install') ||
      checklistText.includes('agy-daemon.cmd install --name eos-workstation'));
  if (!adminPathDocumented) {
    failures.push({
      path: AGY_ADMIN_HITL_CHECKLIST_DOC,
      message:
        'U5 must document adminRequired=true install path (eos-workstation)',
      type: 'agy-admin-hitl-lock'
    });
  } else {
    checks.push({
      path: 'U5 adminRequired=true path documented (not executed)',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  }

  const notExecuted =
    evidenceText.includes('not executed') ||
    evidenceText.includes('NOT EXECUTED') ||
    evidenceText.includes('installExecuted=false') ||
    checklistText.includes('installExecuted=false');
  if (!notExecuted) {
    failures.push({
      path: AGY_ADMIN_HITL_EVIDENCE_DOC,
      message:
        'U5 must state Admin install not executed / installExecuted=false',
      type: 'agy-admin-hitl-lock'
    });
  } else {
    checks.push({
      path: 'U5 installExecuted=false (documented path only)',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  }

  const cloudOut =
    evidenceText.includes('CloudAgent') &&
    (evidenceText.includes('OUT OF PATH') ||
      evidenceText.includes('out of path') ||
      evidenceText.includes('out of SpecBoot') ||
      checklistText.includes('CloudAgent out of'));
  if (!cloudOut) {
    failures.push({
      path: AGY_ADMIN_HITL_EVIDENCE_DOC,
      message: 'U5 must keep CloudAgent out of SpecBoot default path',
      type: 'agy-admin-hitl-lock'
    });
  } else {
    checks.push({
      path: 'U5 CloudAgent out of SpecBoot default path',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  }

  const noPretend =
    evidenceText.includes('do NOT pretend') ||
    evidenceText.includes('do not pretend') ||
    evidenceText.includes('FORBIDDEN pretend') ||
    checklistText.includes('FORBIDDEN');
  if (!noPretend) {
    failures.push({
      path: AGY_ADMIN_HITL_EVIDENCE_DOC,
      message: 'U5 must forbid pretending daemon INSTALLED when absent',
      type: 'agy-admin-hitl-lock'
    });
  } else {
    checks.push({
      path: 'U5 FORBIDDEN pretend INSTALLED when absent',
      status: 'VERIFIED',
      type: 'agy-admin-hitl-lock'
    });
  }

  // Live probe reconciliation — PRESENT only when proven
  if (options.skipLiveProbe !== true && options.liveProbe) {
    const honesty = reconcileDaemonHonesty(mode, options.liveProbe);
    if (!honesty.ok) {
      failures.push({
        path: AGY_ADMIN_HITL_EVIDENCE_DOC,
        message: honesty.message.replace(/^T7 /, 'U5 '),
        type: 'agy-admin-hitl-lock'
      });
    } else {
      checks.push({
        path: 'U5 live probe honesty reconcile',
        status: 'VERIFIED',
        type: 'agy-admin-hitl-lock'
      });
    }

    // Explicit: if probe says Not installed, mode must not be PRESENT
    const statusText = String(options.liveProbe.daemonStatusText || '');
    const probeAbsent =
      options.liveProbe.daemonInstalled === false ||
      /Not installed/i.test(statusText);
    if (probeAbsent && mode === 'DAEMON_PRESENT') {
      failures.push({
        path: AGY_ADMIN_HITL_EVIDENCE_DOC,
        message:
          'U5 fail-closed: status remains DAEMON_ABSENT / Not installed unless PRESENT proven (probe absent)',
        type: 'agy-admin-hitl-lock'
      });
    }
  }

  // T7 baseline still green (extend, do not break)
  if (options.skipT7Baseline !== true) {
    const t7 = auditAgyWorkstationLock(rootDir, {
      skipLiveProbe: true,
      skipPathChecks: options.skipPathChecks === true
    });
    if (!t7.ok) {
      failures.push({
        path: AGY_WORKSTATION_EVIDENCE_DOC,
        message:
          'U5 extends T7 but T7 baseline audit failed: ' +
          (t7.failures[0]?.message || 'unknown'),
        type: 'agy-admin-hitl-lock'
      });
    } else {
      checks.push({
        path: 'U5 extends T7 baseline (agy-workstation-lock green)',
        status: 'VERIFIED',
        type: 'agy-admin-hitl-lock'
      });
    }
  }

  if (!options.skipPathChecks) {
    for (const rel of AGY_ADMIN_HITL_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required U5 AGY Admin HITL path missing',
          type: 'agy-admin-hitl-lock'
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
    mode,
    adminRequired: true,
    installExecuted: false
  };
}
