/**
 * @module dirty-defer-triage-lock
 * T8 — Dirty DEFER triage verify lock (Ladder 8 K8) + L8 closeout tip honesty.
 *
 * Fail-closed: triage evidence + ritual + L8 closeout must exist with
 * PROMOTE/DEFER/IGNORE language, no-mass-delete, PRODUCTION_READY=NO,
 * Fundacion Delta=0. FORBIDDEN claim of DISCARD executed without PO names.
 *
 * NON-CLAIM: triage/IGNORE != deleted from disk. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

export const DIRTY_DEFER_TRIAGE_DOC =
  'docs/releases/EOS_T8_DIRTY_DEFER_TRIAGE_2026-09-09.md';

export const DIRTY_DEFER_TRIAGE_RITUAL_DOC =
  'docs/harness/DIRTY_DEFER_TRIAGE_RITUAL.md';

export const LADDER_8_CLOSEOUT_DOC =
  'docs/releases/EOS_LADDER_8_CLOSEOUT_2026-09-09.md';

export const DIRTY_DEFER_TRIAGE_REQUIRED_SECTIONS = Object.freeze([
  '## Objetivo (T8 / K8 DoD)',
  '## Disposition table',
  '## TRACK this pass (PROMOTE)',
  '## DISCARD',
  '## No-claims',
  'DEFER',
  'IGNORE',
  'PROMOTE',
  'no mass delete',
  'PRODUCTION_READY',
  'Fundacion'
]);

export const DIRTY_DEFER_TRIAGE_RITUAL_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Legal modes',
  '## 2.1 CATALOG',
  '## 2.2 IGNORE',
  '## 2.3 PO_NAMED_DISCARD',
  '## 4. FORBIDDEN',
  '## 5. Non-claims',
  'FORBIDDEN',
  'NON-MUTATING',
  'mass delete',
  'PO names'
]);

export const LADDER_8_CLOSEOUT_REQUIRED_SECTIONS = Object.freeze([
  '## Meta (DoD)',
  '## Honestidad del pin',
  '## Ladder 8 T1–T8 summary',
  'Ladder 8',
  'CLOSED for local governed use',
  '1b48ff5',
  'PRODUCTION_READY',
  'T8'
]);

export const DIRTY_DEFER_TRIAGE_REQUIRED_PATHS = Object.freeze([
  DIRTY_DEFER_TRIAGE_DOC,
  DIRTY_DEFER_TRIAGE_RITUAL_DOC,
  LADDER_8_CLOSEOUT_DOC,
  'scripts/lib/dirty-defer-triage-lock.js',
  'scripts/ci/dirty-defer-triage-gate.js',
  'tests/eos-t8-dirty-defer-triage.test.js',
  'openspec/changes/eos-t8-dirty-defer-triage/proposal.md',
  'docs/releases/EOS_FREEZE_GATE_STATUS.md',
  'docs/releases/RELEASE_CAPABILITY_MATRIX.md'
]);

function requireNeedles(text, needles, label, failures, type) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures.push({
        path: label,
        message: 'Missing required needle: ' + needle,
        type
      });
    }
  }
}

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @returns {{ ok: boolean, checks: object[], failures: object[], mode: string }}
 */
export function auditDirtyDeferTriageLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  let mode = 'UNKNOWN';
  const type = 'dirty-defer-triage-lock';

  if (options.docMissing === true) {
    failures.push({
      path: DIRTY_DEFER_TRIAGE_DOC,
      message: 'T8 Dirty DEFER triage evidence doc missing (fail-closed)',
      type
    });
    return { ok: false, checks, failures, mode };
  }

  let triageText = options.triageDocText;
  if (triageText === undefined) {
    const full = path.join(rootDir, DIRTY_DEFER_TRIAGE_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: DIRTY_DEFER_TRIAGE_DOC,
        message: 'T8 Dirty DEFER triage evidence doc missing (fail-closed)',
        type
      });
      return { ok: false, checks, failures, mode };
    }
    triageText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: DIRTY_DEFER_TRIAGE_DOC + ' exists',
    status: 'VERIFIED',
    type
  });

  requireNeedles(
    triageText,
    DIRTY_DEFER_TRIAGE_REQUIRED_SECTIONS,
    DIRTY_DEFER_TRIAGE_DOC,
    failures,
    type
  );

  const hasProdNo =
    /PRODUCTION_READY:\*\*?\s*:?\s*NO/i.test(triageText) ||
    triageText.includes('PRODUCTION_READY:** NO') ||
    triageText.includes('PRODUCTION_READY: NO') ||
    triageText.includes('**PRODUCTION_READY:** NO');
  if (!hasProdNo) {
    failures.push({
      path: DIRTY_DEFER_TRIAGE_DOC,
      message: 'T8 triage must declare PRODUCTION_READY: NO',
      type
    });
  } else {
    checks.push({
      path: 'T8 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type
    });
  }

  // Fail-closed: must not claim mass DISCARD executed
  if (/DISCARD executed|mass delete completed|deleted all DEFER/i.test(triageText)) {
    failures.push({
      path: DIRTY_DEFER_TRIAGE_DOC,
      message: 'T8 fail-closed: must not claim DISCARD/mass delete executed without PO names',
      type
    });
  }

  if (/\*\*None\.\*\*|DISCARD[\s\S]{0,80}None/i.test(triageText)) {
    checks.push({
      path: 'T8 DISCARD none (no mass delete)',
      status: 'VERIFIED',
      type
    });
  }

  if (/CATALOG|IGNORE|DEFER/i.test(triageText)) {
    mode = /IGNORE/.test(triageText) ? 'CATALOG_IGNORE' : 'CATALOG';
  }

  let ritualText = options.ritualDocText;
  if (ritualText === undefined && options.skipRitual !== true) {
    const full = path.join(rootDir, DIRTY_DEFER_TRIAGE_RITUAL_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: DIRTY_DEFER_TRIAGE_RITUAL_DOC,
        message: 'T8 Dirty DEFER triage ritual missing (fail-closed)',
        type
      });
    } else {
      ritualText = fs.readFileSync(full, 'utf8');
    }
  }
  if (ritualText) {
    checks.push({
      path: DIRTY_DEFER_TRIAGE_RITUAL_DOC + ' exists',
      status: 'VERIFIED',
      type
    });
    requireNeedles(
      ritualText,
      DIRTY_DEFER_TRIAGE_RITUAL_REQUIRED_SECTIONS,
      DIRTY_DEFER_TRIAGE_RITUAL_DOC,
      failures,
      type
    );
  }

  let closeoutText = options.closeoutDocText;
  if (closeoutText === undefined && options.skipCloseout !== true) {
    const full = path.join(rootDir, LADDER_8_CLOSEOUT_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: LADDER_8_CLOSEOUT_DOC,
        message: 'L8 closeout doc missing (fail-closed)',
        type
      });
    } else {
      closeoutText = fs.readFileSync(full, 'utf8');
    }
  }
  if (closeoutText) {
    checks.push({
      path: LADDER_8_CLOSEOUT_DOC + ' exists',
      status: 'VERIFIED',
      type
    });
    requireNeedles(
      closeoutText,
      LADDER_8_CLOSEOUT_REQUIRED_SECTIONS,
      LADDER_8_CLOSEOUT_DOC,
      failures,
      type
    );
  }

  if (options.skipPathChecks !== true) {
    for (const rel of DIRTY_DEFER_TRIAGE_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required T8 path missing: ' + rel,
          type
        });
      } else {
        checks.push({ path: rel, status: 'VERIFIED', type });
      }
    }
  }

  // Tip honesty light: freeze main_tip pinned by tip-refresh-post-252 to live main after #251+#252+#253 (was tip-249 pin c12cc82 / #251 tip-249 + #252 Mission AU + #253 AS16)
  if (options.skipTipCheck !== true) {
    const freezePath = path.join(rootDir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md');
    if (fs.existsSync(freezePath)) {
      const freeze = options.freezeText || fs.readFileSync(freezePath, 'utf8');
      const tip = freeze.match(/^main_tip:\s*([0-9a-f]{40})\b/m);
      if (!tip || tip[1] !== '760d4851738f435444784ec22d49189d7d8e3f0b') {
        failures.push({
          path: 'docs/releases/EOS_FREEZE_GATE_STATUS.md',
          message:
            'tip-refresh-post-aw expected main_tip=760d4851738f435444784ec22d49189d7d8e3f0b (post-#258 / Mission AW (+ #256 AV + #257 AS16); tip honesty restored; L17 CLOSED; L18 OPEN (AX–BB pending))',
          type
        });
      } else {
        checks.push({
          path: 'freeze main_tip pinned to tip-refresh-post-aw / main@760d485 (post-#258 / Mission AW; L17 CLOSED; L18 OPEN)',
          status: 'VERIFIED',
          type
        });
      }
    }
  }

  return { ok: failures.length === 0, checks, failures, mode };
}
