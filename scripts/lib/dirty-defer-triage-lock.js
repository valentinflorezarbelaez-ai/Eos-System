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

  // Tip honesty light: freeze main_tip pinned by tip-seal-post-500 / tip-seal L36 / Tip seal post-#500 / Formal L36 CLOSED to Mission EN #499 merge tip (prior freeze tip 9fd2be07e192694623d2c15c0a99d2800f1ffbdb; tip-refresh-post-497 / tip-post-497 / Tip honesty post-#497 / L36 OPEN (Audit MEASURED · EJ MEASURED · EK MEASURED · EL MEASURED · EM MEASURED · EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric) then; prior tip was tip-refresh-post-497 merge tip (prior freeze tip 933f32ae07fd3526b322cbd8ed389f66d8b298f1; tip-refresh-post-495 / tip-post-495 / Tip honesty post-#495 / L36 OPEN (Audit MEASURED · EJ MEASURED · EK MEASURED · EL MEASURED · EM–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric) then; prior tip was tip-refresh-post-495 merge tip (prior freeze tip 72697dd506284284e5cbbe3ebf2c68cef8fbf006; tip-refresh-post-493 / tip-post-493 / Tip honesty post-#493 / L36 OPEN (Audit MEASURED · EJ MEASURED · EK MEASURED · EL–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric) then; prior tip was tip-refresh-post-493 merge tip (prior freeze tip 5e5af28130d3e742ae5274fab9913453317c913b; tip-refresh-post-491 / tip-post-491 / Tip honesty post-#491 / L36 OPEN (Audit MEASURED · EJ MEASURED · EK–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric) then; prior tip was tip-refresh-post-491 merge tip (prior freeze tip d7490fee0e419fc58602f67b0051ca06e649595a; tip-refresh-post-489 / tip-post-489 / Tip honesty post-#489 / L36 OPEN (Audit MEASURED · EJ–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric) then; prior tip was tip-open #489 / tip-refresh-post-489 merge tip (prior freeze tip 73276cbab1e750fc69f3aaf71353e12d517e00ed; tip-open-post-488 / tip-open L36 / Tip open post-#488 / L36 OPEN (Audit MEASURED · EJ–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric); Formal L30 CLOSED retained; Formal L31 CLOSED retained; Formal L32 CLOSED retained; Formal L33 CLOSED retained; Formal L34 CLOSED retained; Formal L35 CLOSED retained; NEVER reopen L17–L35; NEVER reopen L29; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; NEVER reopen L33; NEVER reopen L34; NEVER reopen L35; Do NOT claim EJ–EN MEASURED; Do NOT claim L36 CLOSED; Do NOT claim PRODUCTION_READY; Complexity prune deferred PO-gated (inventory≠delete) — dirty-defer retained)))

  if (options.skipTipCheck !== true) {
    const freezePath = path.join(rootDir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md');
    if (fs.existsSync(freezePath)) {
      const freeze = options.freezeText || fs.readFileSync(freezePath, 'utf8');
      const tip = freeze.match(/^main_tip:\s*([0-9a-f]{40})\b/m);
      if (!tip || tip[1] !== '9722b8123b9ce303119b4e48eb9f9b56f1207b29') {
        failures.push({
          path: 'docs/releases/EOS_FREEZE_GATE_STATUS.md',
          message:
            'tip-seal-post-500 expected main_tip=9722b8123b9ce303119b4e48eb9f9b56f1207b29 (tip-refresh-post-456 / tip-post-456 / Tip honesty post-#456 / Formal L33 CLOSED retained (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DU + DV + DW + DX + DY MEASURED + seam-pack + closeout; Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric); tip-seal-post-455 sealed baseline; Formal L30 CLOSED retained; Formal L31 CLOSED retained; Formal L32 CLOSED retained; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; NEVER reopen L33; Do NOT claim PRODUCTION_READY; Complexity prune deferred PO-gated (inventory≠delete))',
          type
        });
      } else {
        checks.push({
          path: 'freeze main_tip pinned to tip-seal-post-500 / tip-seal L36 / Tip seal post-#500 / Formal L36 CLOSED / main@9722b812 (Formal L30+L31+L32+L33+L34+L35 CLOSED retained; Formal L36 CLOSED CLOSED_FOR_LOCAL_GOVERNED_USE Audit + EJ + EK + EL + EM + EN MEASURED + seam-pack + closeout; NEVER reopen L30/L31/L32/L33/L34/L35/L36)',
          status: 'VERIFIED',
          type
        });
      }
    }
  }

  return { ok: failures.length === 0, checks, failures, mode };
}
