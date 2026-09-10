/**
 * @module complexity-ceiling-hold-lock
 * T6 — Complexity ceiling HOLD / standing-order verify lock (Ladder 8 K6).
 *
 * Fail-closed: docs/releases/EOS_T6_COMPLEXITY_CEILING_HOLD_2026-09-09.md +
 * docs/harness/COMPLEXITY_CEILING_HOLD_RITUAL.md must exist with HOLD or PO_NAMED
 * language, AT_CEILING standing order, and NON-CLAIM HOLD!=executed prune.
 * Re-audits R4 complexity-budget-lock (must stay green under HOLD).
 *
 * NON-CLAIM: gate/HOLD != executed prune. This lock does not prune schemas or
 * engines. PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';
import { auditComplexityBudgetLock } from './complexity-budget-lock.js';

export const COMPLEXITY_CEILING_HOLD_DOC =
  'docs/releases/EOS_T6_COMPLEXITY_CEILING_HOLD_2026-09-09.md';

export const COMPLEXITY_CEILING_HOLD_RITUAL_DOC =
  'docs/harness/COMPLEXITY_CEILING_HOLD_RITUAL.md';

/** Sections / needles aligned with tests/eos-t6-complexity-ceiling-hold.test.js */
export const COMPLEXITY_CEILING_HOLD_REQUIRED_SECTIONS = Object.freeze([
  '## Objetivo (T6 / K6 DoD)',
  '## Decision HOLD (rationale)',
  '## Budget reconcile (HOLD)',
  '## No-claims',
  'HOLD',
  'hold AT_CEILING',
  'no new schemas',
  'PRODUCTION_READY',
  'NON-CLAIM',
  'vibe schemas'
]);

export const COMPLEXITY_CEILING_HOLD_RITUAL_REQUIRED_SECTIONS = Object.freeze([
  '## 2. Legal modes',
  '## 2.1 HOLD',
  '## 2.2 PO_NAMED',
  '## 3. Verify / budget gate',
  '## 5. Non-claims',
  'FORBIDDEN',
  'PO_NAMED',
  'HOLD',
  'NON-MUTATING',
  'AT_CEILING'
]);

export const COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS = Object.freeze([
  COMPLEXITY_CEILING_HOLD_DOC,
  COMPLEXITY_CEILING_HOLD_RITUAL_DOC,
  'scripts/lib/complexity-ceiling-hold-lock.js',
  'scripts/ci/complexity-ceiling-hold-gate.js',
  'tests/eos-t6-complexity-ceiling-hold.test.js',
  'docs/governance/COMPLEXITY_BUDGET.json',
  'scripts/lib/complexity-budget-lock.js',
  'docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md',
  'scripts/lib/p6-inventory-lock.js',
  'openspec/changes/eos-t6-complexity-ceiling-hold/proposal.md'
]);

/**
 * @param {string} rootDir
 * @param {object} [options]
 * @param {string} [options.holdDocText]
 * @param {string} [options.ritualDocText]
 * @param {boolean} [options.skipPathChecks]
 * @param {boolean} [options.skipBudgetReconcile]
 * @param {boolean} [options.docMissing]
 * @returns {{ ok: boolean, checks: object[], failures: object[], mode: string }}
 */
export function auditComplexityCeilingHoldLock(rootDir, options = {}) {
  const checks = [];
  const failures = [];
  let mode = 'UNKNOWN';

  if (options.docMissing === true) {
    failures.push({
      path: COMPLEXITY_CEILING_HOLD_DOC,
      message: 'T6 complexity ceiling HOLD evidence doc missing (fail-closed)',
      type: 'complexity-ceiling-hold-lock'
    });
    return { ok: false, checks, failures, mode };
  }

  let holdText = options.holdDocText;
  if (holdText === undefined) {
    const full = path.join(rootDir, COMPLEXITY_CEILING_HOLD_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: COMPLEXITY_CEILING_HOLD_DOC,
        message: 'T6 complexity ceiling HOLD evidence doc missing (fail-closed)',
        type: 'complexity-ceiling-hold-lock'
      });
      return { ok: false, checks, failures, mode };
    }
    holdText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: COMPLEXITY_CEILING_HOLD_DOC + ' exists',
    status: 'VERIFIED',
    type: 'complexity-ceiling-hold-lock'
  });

  let ritualText = options.ritualDocText;
  if (ritualText === undefined) {
    const full = path.join(rootDir, COMPLEXITY_CEILING_HOLD_RITUAL_DOC);
    if (!fs.existsSync(full)) {
      failures.push({
        path: COMPLEXITY_CEILING_HOLD_RITUAL_DOC,
        message: 'T6 complexity ceiling hold ritual runbook missing (fail-closed)',
        type: 'complexity-ceiling-hold-lock'
      });
      return { ok: false, checks, failures, mode };
    }
    ritualText = fs.readFileSync(full, 'utf8');
  }

  checks.push({
    path: COMPLEXITY_CEILING_HOLD_RITUAL_DOC + ' exists',
    status: 'VERIFIED',
    type: 'complexity-ceiling-hold-lock'
  });

  let holdSectionsOk = true;
  for (const needle of COMPLEXITY_CEILING_HOLD_REQUIRED_SECTIONS) {
    if (!holdText.includes(needle)) {
      holdSectionsOk = false;
      failures.push({
        path: COMPLEXITY_CEILING_HOLD_DOC,
        message: 'T6 HOLD evidence required section/needle missing: ' + needle,
        type: 'complexity-ceiling-hold-lock'
      });
    }
  }
  if (holdSectionsOk) {
    checks.push({
      path: 'T6 HOLD evidence required sections present',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-lock'
    });
  }

  let ritualSectionsOk = true;
  for (const needle of COMPLEXITY_CEILING_HOLD_RITUAL_REQUIRED_SECTIONS) {
    if (!ritualText.includes(needle)) {
      ritualSectionsOk = false;
      failures.push({
        path: COMPLEXITY_CEILING_HOLD_RITUAL_DOC,
        message: 'T6 ritual runbook required section/needle missing: ' + needle,
        type: 'complexity-ceiling-hold-lock'
      });
    }
  }
  if (ritualSectionsOk) {
    checks.push({
      path: 'T6 ritual runbook required sections present',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-lock'
    });
  }

  const productionReadyNo =
    holdText.includes('PRODUCTION_READY:** NO') ||
    holdText.includes('PRODUCTION_READY: NO') ||
    holdText.includes('**PRODUCTION_READY:** NO');
  if (!productionReadyNo) {
    failures.push({
      path: COMPLEXITY_CEILING_HOLD_DOC,
      message: 'T6 HOLD evidence must keep PRODUCTION_READY: NO',
      type: 'complexity-ceiling-hold-lock'
    });
  } else {
    checks.push({
      path: 'T6 PRODUCTION_READY=NO',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-lock'
    });
  }

  const hasHold =
    holdText.includes('hold AT_CEILING') && holdText.includes('no new schemas');
  const hasPoNamed =
    holdText.includes('PO_NAMED') &&
    (/PO names|PO_NAMED list|exact (schema|engine|paths)/i.test(holdText));

  if (hasHold) {
    mode = 'HOLD';
    checks.push({
      path: 'T6 mode HOLD (hold AT_CEILING; no new schemas)',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-lock'
    });
  } else if (hasPoNamed) {
    mode = 'PO_NAMED';
    checks.push({
      path: 'T6 mode PO_NAMED (named path list)',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-lock'
    });
  } else {
    failures.push({
      path: COMPLEXITY_CEILING_HOLD_DOC,
      message:
        'T6 evidence must declare HOLD (hold AT_CEILING; no new schemas) OR PO_NAMED exact paths',
      type: 'complexity-ceiling-hold-lock'
    });
  }

  const noVibe =
    holdText.includes('vibe schemas') ||
    holdText.includes('no vibe') ||
    ritualText.includes('FORBIDDEN');
  if (!noVibe) {
    failures.push({
      path: COMPLEXITY_CEILING_HOLD_DOC,
      message: 'T6 must forbid vibe schemas / silent new schemas',
      type: 'complexity-ceiling-hold-lock'
    });
  } else {
    checks.push({
      path: 'T6 NON-CLAIM no vibe schemas',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-lock'
    });
  }

  const nonClaim =
    holdText.includes('NON-CLAIM') ||
    holdText.includes('HOLD') ||
    holdText.includes('inventory');
  if (!nonClaim) {
    failures.push({
      path: COMPLEXITY_CEILING_HOLD_DOC,
      message: 'T6 must state NON-CLAIM HOLD!=executed prune / inventory!=quarantine',
      type: 'complexity-ceiling-hold-lock'
    });
  } else {
    checks.push({
      path: 'T6 NON-CLAIM language present',
      status: 'VERIFIED',
      type: 'complexity-ceiling-hold-lock'
    });
  }

  if (!options.skipBudgetReconcile) {
    try {
      const budget = auditComplexityBudgetLock(rootDir);
      if (budget.ok) {
        checks.push({
          path: 'T6 R4 complexity-budget lock green (AT_CEILING under HOLD)',
          status: 'VERIFIED',
          type: 'complexity-ceiling-hold-lock'
        });
      } else {
        for (const f of budget.failures) {
          failures.push({
            path: f.path,
            message: 'T6 budget reconcile gate failed: ' + f.message,
            type: 'complexity-ceiling-hold-lock'
          });
        }
      }
    } catch (err) {
      failures.push({
        path: 'scripts/lib/complexity-budget-lock.js',
        message: 'T6 budget reconcile gate threw: ' + (err.message || err),
        type: 'complexity-ceiling-hold-lock'
      });
    }
  }

  if (!options.skipPathChecks) {
    for (const rel of COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS) {
      const full = path.join(rootDir, rel);
      if (!fs.existsSync(full)) {
        failures.push({
          path: rel,
          message: 'Required T6 complexity ceiling HOLD path missing',
          type: 'complexity-ceiling-hold-lock'
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
