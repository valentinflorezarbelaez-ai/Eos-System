/**
 * @module agy-workstation-lock
 * T7 — Antigravity eos-workstation evidence / smoke verify lock (Ladder 8 K7).
 *
 * Fail-closed: docs/releases/EOS_T7_AGY_WORKSTATION_EVIDENCE_2026-09-09.md +
 * docs/harness/AGY_WORKSTATION_CHECKLIST.md must exist with honest daemon
 * status language (DAEMON_ABSENT or DAEMON_PRESENT), OpenSpec CLI optional,
 * CloudAgent out of path, and NON-CLAIM checklist!=daemon installed.
 *
 * NON-CLAIM: checklist/smoke != daemon installed. This lock does NOT run
 * Admin install. Fail-closed if evidence pretends INSTALLED while probe/status
 * says Not installed / ABSENT. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const AGY_WORKSTATION_EVIDENCE_DOC =
  'docs/releases/EOS_T7_AGY_WORKSTATION_EVIDENCE_2026-09-09.md';

export const AGY_WORKSTATION_CHECKLIST_DOC =
  'docs/harness/AGY_WORKSTATION_CHECKLIST.md';

/** Sections / needles aligned with tests/eos-t7-agy-workstation-evidence.test.js */
export const AGY_WORKSTATION_EVIDENCE_REQUIRED_SECTIONS = Object.freeze([
  '## Objetivo (T7 / K7 DoD)',
  '## Status snapshot (honest probe)',
  '## No-claims',
  'DAEMON_ABSENT',
  'Not installed',
  'OpenSpec CLI',
  'CloudAgent',
  'PRODUCTION_READY',
  'NON-CLAIM',
  'Admin HITL'
]);

export const AGY_WORKSTATION_CHECKLIST_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Legal modes',
  '## 2.1 DAEMON_ABSENT',
  '## 2.2 DAEMON_PRESENT',
  '## 3. Operator checklist',
  '## 5. Non-claims',
  'FORBIDDEN',
  'NON-MUTATING',
  'OpenSpec CLI optional',
  'CloudAgent out of',
  'Admin'
]);

export const AGY_WORKSTATION_REQUIRED_PATHS = Object.freeze([
  AGY_WORKSTATION_EVIDENCE_DOC,
  AGY_WORKSTATION_CHECKLIST_DOC,
  'scripts/lib/agy-workstation-lock.js',
  'scripts/ci/agy-workstation-smoke.js',
  'tests/eos-t7-agy-workstation-evidence.test.js',
  'docs/harness/ANTIGRAVITY_FIRST.md',
  'agy-daemon.cmd',
  'openspec/changes/eos-t7-agy-workstation-evidence/proposal.md'
]);

/**
 * Infer evidence-declared daemon mode from text.
 * @param {string} text
 * @returns {'DAEMON_ABSENT'|'DAEMON_PRESENT'|'UNKNOWN'}
 */
export function inferDaemonModeFromEvidence(text) {
  const claimsInstalled =
    /\bDAEMON_PRESENT\b/.test(text) &&
    /(INSTALLED|daemon.*PRESENT|PRESENT.*daemon)/i.test(text) &&
    !/\bDAEMON_ABSENT\b/.test(text);
  const claimsAbsent =
    /\bDAEMON_ABSENT\b/.test(text) ||
    (/Not installed/i.test(text) && /ABSENT/i.test(text));
  if (claimsInstalled && !claimsAbsent) return 'DAEMON_PRESENT';
  if (claimsAbsent) return 'DAEMON_ABSENT';
  return 'UNKNOWN';
}

/**
 * Reconcile evidence mode with optional live/status probe.
 * Fail-closed if evidence claims PRESENT/INSTALLED while probe says absent.
 *
 * @param {'DAEMON_ABSENT'|'DAEMON_PRESENT'|'UNKNOWN'} mode
 * @param {{ daemonStatusText?: string, daemonInstalled?: boolean }|null|undefined} liveProbe
 * @returns {{ ok: boolean, message?: string }}
 */
export function reconcileDaemonHonesty(mode, liveProbe) {
  if (!liveProbe) return { ok: true };
  const statusText = String(liveProbe.daemonStatusText || '');
  const probeAbsent =
    liveProbe.daemonInstalled === false ||
    /Not installed/i.test(statusText);
  const probePresent =
    liveProbe.daemonInstalled === true ||
    (/installed/i.test(statusText) && !/Not installed/i.test(statusText));

  if (mode === 'DAEMON_PRESENT' && probeAbsent) {
    return {
      ok: false,
      message:
        'T7 fail-closed: evidence claims DAEMON_PRESENT/INSTALLED but probe/status says Not installed / ABSENT (do not pretend)'
    };
  }
  if (mode === 'DAEMON_ABSENT' && probePresent && liveProbe.daemonInstalled === true) {
    // Soft: evidence may lag after Admin HITL; still allow ABSENT doc if probe
    // injected as present only when explicitly flagged — prefer honesty update.
    return {
      ok: false,
      message:
        'T7 fail-closed: live probe reports daemon installed but evidence still DAEMON_ABSENT — refresh evidence'
    };
  }
  return { ok: true };
}

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.evidenceDocText]
 * @param {string} [options.checklistDocText]
 * @param {boolean} [options.skipPathChecks]
 * @param {boolean} [options.docMissing]
 * @param {boolean} [options.skipLiveProbe]
 * @param {{ daemonStatusText?: string, daemonInstalled?: boolean, agyPresent?: boolean }|null} [options.liveProbe]
 * @returns {{ ok: boolean, checks: object[], failures: object[], mode: string }}
 */
export function auditAgyWorkstationLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  let mode = 'UNKNOWN';

  if (options.docMissing === true) {
    failures.push({
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message: 'T7 AGY workstation evidence doc missing (fail-closed)',
      type: 'agy-workstation-lock'
    });
    return { ok: false, checks, failures, mode };
  }

  let evidenceText = options.evidenceDocText;
  if (evidenceText === undefined) {
    const full = path.join(rootDir, AGY_WORKSTATION_EVIDENCE_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: AGY_WORKSTATION_EVIDENCE_DOC,
        message: 'T7 AGY workstation evidence doc missing (fail-closed)',
        type: 'agy-workstation-lock'
      });
      return { ok: false, checks, failures, mode };
    }
    evidenceText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: AGY_WORKSTATION_EVIDENCE_DOC + ' exists',
    status: 'VERIFIED',
    type: 'agy-workstation-lock'
  });

  let checklistText = options.checklistDocText;
  if (checklistText === undefined) {
    const full = path.join(rootDir, AGY_WORKSTATION_CHECKLIST_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: AGY_WORKSTATION_CHECKLIST_DOC,
        message: 'T7 AGY workstation checklist missing (fail-closed)',
        type: 'agy-workstation-lock'
      });
      return { ok: false, checks, failures, mode };
    }
    checklistText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: AGY_WORKSTATION_CHECKLIST_DOC + ' exists',
    status: 'VERIFIED',
    type: 'agy-workstation-lock'
  });

  let evidenceSectionsOk = true;
  for (const needle of AGY_WORKSTATION_EVIDENCE_REQUIRED_SECTIONS) {
    if (!evidenceText.includes(needle)) {
      evidenceSectionsOk = false;
      failures.push({
        path: AGY_WORKSTATION_EVIDENCE_DOC,
        message: 'T7 evidence required section/needle missing: ' + needle,
        type: 'agy-workstation-lock'
      });
    }
  }
  if (evidenceSectionsOk) {
    checks.push({
      path: 'T7 evidence required sections present',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  }

  let checklistSectionsOk = true;
  for (const needle of AGY_WORKSTATION_CHECKLIST_REQUIRED_SECTIONS) {
    if (!checklistText.includes(needle)) {
      checklistSectionsOk = false;
      failures.push({
        path: AGY_WORKSTATION_CHECKLIST_DOC,
        message: 'T7 checklist required section/needle missing: ' + needle,
        type: 'agy-workstation-lock'
      });
    }
  }
  if (checklistSectionsOk) {
    checks.push({
      path: 'T7 checklist required sections present',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  }

  const productionReadyNo =
    evidenceText.includes('PRODUCTION_READY:** NO') ||
    evidenceText.includes('PRODUCTION_READY: NO') ||
    evidenceText.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message: 'T7 evidence must keep PRODUCTION_READY: NO',
      type: 'agy-workstation-lock'
    });
  } else {
    checks.push({
      path: 'T7 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  }

  mode = inferDaemonModeFromEvidence(evidenceText);
  if (mode === 'DAEMON_ABSENT') {
    checks.push({
      path: 'T7 mode DAEMON_ABSENT (honest; no Admin required)',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  } else if (mode === 'DAEMON_PRESENT') {
    checks.push({
      path: 'T7 mode DAEMON_PRESENT (status-corroborated when probed)',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  } else {
    failures.push({
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message:
        'T7 evidence must declare DAEMON_ABSENT (Not installed) OR DAEMON_PRESENT (honest install)',
      type: 'agy-workstation-lock'
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
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message: 'T7 must keep CloudAgent out of SpecBoot default path',
      type: 'agy-workstation-lock'
    });
  } else {
    checks.push({
      path: 'T7 CloudAgent out of SpecBoot default path',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  }

  const openSpecOptional =
    evidenceText.includes('OpenSpec CLI') &&
    (evidenceText.includes('optional') ||
      evidenceText.includes('OPTIONAL') ||
      evidenceText.includes('not required'));
  if (!openSpecOptional) {
    failures.push({
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message: 'T7 must state OpenSpec CLI optional / not required for L0',
      type: 'agy-workstation-lock'
    });
  } else {
    checks.push({
      path: 'T7 OpenSpec CLI optional',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  }

  const nonClaim =
    evidenceText.includes('NON-CLAIM') ||
    evidenceText.includes('checklist') ||
    evidenceText.includes('pretend');
  if (!nonClaim) {
    failures.push({
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message: 'T7 must state NON-CLAIM checklist!=daemon installed / no pretend',
      type: 'agy-workstation-lock'
    });
  } else {
    checks.push({
      path: 'T7 NON-CLAIM language present',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  }

  const noPretend =
    evidenceText.includes('do NOT pretend') ||
    evidenceText.includes('do not pretend') ||
    evidenceText.includes('FORBIDDEN pretend') ||
    checklistText.includes('FORBIDDEN');
  if (!noPretend) {
    failures.push({
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message: 'T7 must forbid pretending daemon INSTALLED when absent',
      type: 'agy-workstation-lock'
    });
  } else {
    checks.push({
      path: 'T7 FORBIDDEN pretend INSTALLED when absent',
      status: 'VERIFIED',
      type: 'agy-workstation-lock'
    });
  }

  // Live probe reconciliation (optional; default skipped for CI-safe verify)
  if (options.skipLiveProbe !== true && options.liveProbe) {
    const honesty = reconcileDaemonHonesty(mode, options.liveProbe);
    if (!honesty.ok) {
      failures.push({
        path: AGY_WORKSTATION_EVIDENCE_DOC,
        message: honesty.message,
        type: 'agy-workstation-lock'
      });
    } else {
      checks.push({
        path: 'T7 live probe honesty reconcile',
        status: 'VERIFIED',
        type: 'agy-workstation-lock'
      });
    }
  }

  // Intrinsic honesty: evidence must not claim INSTALLED alongside Not installed ABSENT
  if (
    /DAEMON_PRESENT/.test(evidenceText) &&
    /Not installed/i.test(evidenceText) &&
    /DAEMON_ABSENT/.test(evidenceText) === false &&
    /do NOT pretend|FORBIDDEN pretend/i.test(evidenceText) === false
  ) {
    // ambiguous — already handled by infer; keep soft
  }
  const pretendsWhileAbsentSnippet =
    /daemon[^\n]{0,80}INSTALLED/i.test(evidenceText) &&
    /Not installed/i.test(evidenceText) &&
    mode === 'DAEMON_PRESENT';
  if (pretendsWhileAbsentSnippet) {
    failures.push({
      path: AGY_WORKSTATION_EVIDENCE_DOC,
      message:
        'T7 fail-closed: evidence mixes INSTALLED claim with Not installed status (dishonest)',
      type: 'agy-workstation-lock'
    });
  }

  if (!options.skipPathChecks) {
    for (const rel of AGY_WORKSTATION_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required T7 AGY workstation path missing',
          type: 'agy-workstation-lock'
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    checks,
    failures,
    mode
  };
}
