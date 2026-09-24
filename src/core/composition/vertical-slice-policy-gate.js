/**
 * @module vertical-slice-policy-gate
 * SPEC-0126 / Mission DP — Policy Gate for Sovereign Vertical Slice & Screaming Architecture Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 8bbdd522
 *   Vertical slice isolation verification:
 *     - zero cross-slice direct imports (must use public ports)
 *     - screaming architecture use case cohesion
 *     - pure Node.js built-ins in Layer 0 domain slices
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 reopen
 *   Refuse L32 auto-close
 *   Refuse auto-seal without human gate
 *   Refuse tip-pin rewrite
 *   schemas AT_CEILING 35/35
 */

import {
  DP_PRODUCTION_READY,
  DP_FREEZE_PIN_SHORT,
  SLICE_INTEGRITY_STATES
} from './vertical-slice-receipt.js';

/** @type {'NO'} */
export const DP_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DP_POLICY_GATE_KIND = 'eos-vertical-slice-policy-gate';

export const DP_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'SLICE_AUDIT',
  'COHESION_VERIFY',
  'SEAL'
]);

export const DP_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_SLICE_REPORT: 'MISSING_SLICE_REPORT',
  INVALID_SLICE_REPORT: 'INVALID_SLICE_REPORT',
  CROSS_SLICE_LEAKAGE_DETECTED: 'CROSS_SLICE_LEAKAGE_DETECTED',
  NON_BUILTIN_DEPENDENCIES_FORBIDDEN: 'NON_BUILTIN_DEPENDENCIES_FORBIDDEN',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  PRODUCTION_READY_FLIP_FORBIDDEN: 'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN: 'L30_REOPEN_FORBIDDEN',
  L31_REOPEN_FORBIDDEN: 'L31_REOPEN_FORBIDDEN',
  L32_AUTO_CLOSE_FORBIDDEN: 'L32_AUTO_CLOSE_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN: 'TIP_REWRITE_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
  INVALID_RITUAL_MODE: 'INVALID_RITUAL_MODE',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

const SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

const PR_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /auto(?:matic)?\s+production[_ ]?ready\s+flip/i
];

const HARD_DELETE_PATTERNS = [
  /force[-_]?delete/i,
  /\bpurge\b/i,
  /hard[-_]?delete/i,
  /\bdestroy\b/i,
  /permanent(?:ly)?\s+delete/i,
  /rm\s+-rf/i,
  /\bunlinkSync\b/i,
  /\bdestructive\s+delete\b/i
];

const MASS_PRUNE_PATTERNS = [
  /\bmass[-_]?prune\b/i,
  /\bbulk[-_]?prune\b/i,
  /\bprune\s+all\b/i,
  /\bexecute\s+prune\b/i,
  /\brun\s+prune\s+now\b/i,
  /\bperform\s+mass\s+delete\b/i
];

const L30_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*30/i,
  /l(?:adder)?[\s_-]*30\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*30/i,
  /reopen\s+l(?:adder)?[\s_-]*29/i,
  /l(?:adder)?[\s_-]*29\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*29/i
];

const L31_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*31/i,
  /l(?:adder)?[\s_-]*31\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*31/i
];

const L32_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*32/i,
  /l(?:adder)?[\s_-]*32\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*32/i
];

const TIP_REWRITE_PATTERNS = [
  /rewrite\s+(?:git\s+)?tip/i,
  /force[-_]?push\s+main/i,
  /rebase[-_]?origin[-_]?main/i,
  /git\s+reset\s+--hard\s+origin/i,
  /modify\s+historical\s+tip/i
];

function stringifySafe(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function stripReceipts(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.endsWith('Receipt') || key.endsWith('ReceiptLink') || key === 'priorReceipts') {
      continue;
    }
    if (typeof val === 'object' && val !== null) {
      clone[key] = stripReceipts(val);
    } else {
      clone[key] = val;
    }
  }
  return clone;
}

export function scanForSecrets(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return SECRET_PATTERNS.some((pat) => pat.test(str));
}

export function claimsProductionReadyFlip(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return PR_FLIP_PATTERNS.some((pat) => pat.test(str));
}

export function claimsHardDelete(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return HARD_DELETE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsMassPrune(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return MASS_PRUNE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL30Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L30_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL31Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L31_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL32AutoClose(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L32_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsTipRewrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return TIP_REWRITE_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export class VerticalSlicePolicyGate {
  /**
   * Evaluates preconditions for the vertical slice ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.MISSING_CHANGE_ID,
        reason: 'Missing changeId in input'
      };
    }

    // 1. Fundacion write barrier check (Law IV)
    if (isFundacionTarget(plan.target) ||
        isFundacionTarget(plan.targetPath) ||
        isFundacionTarget(plan.path) ||
        isFundacionTarget(plan.paths)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    // Strip attached receipts before checking text patterns to avoid false positives on non-claim labels
    const planClean = stripReceipts(plan);

    // 2. Secret leakage check (Law VI)
    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    // 3. Hard delete check
    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    // 4. Mass prune check
    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    // 5. PRODUCTION_READY flip check
    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    // 6. Ladder 30 / 29 reopen check
    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30/29. Ladders 17–31 are permanently CLOSED.'
      };
    }

    // 7. Ladder 31 reopen check
    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED.'
      };
    }

    // 8. Ladder 32 auto-close check
    if (claimsL32AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.L32_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 32 is forbidden.'
      };
    }

    // 9. Tip rewrite check
    if (claimsTipRewrite(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip or force-pushing is strictly forbidden.'
      };
    }

    // 10. Ritual mode check
    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: DP_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed.'
      };
    }

    // 11. Slice report check (required in ACTIVE mode)
    if (!plan.sliceReport) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.MISSING_SLICE_REPORT,
        reason: 'Missing sliceReport in active ritual mode'
      };
    }

    if (typeof plan.sliceReport !== 'object' || Array.isArray(plan.sliceReport)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.INVALID_SLICE_REPORT,
        reason: 'sliceReport must be a non-null object'
      };
    }

    // 12. Cross-slice leakage check
    const crossSliceLeaks = Number(plan.sliceReport.crossSliceLeaksCount || 0);
    const leaksArray = Array.isArray(plan.sliceReport.crossSliceLeaks) ? plan.sliceReport.crossSliceLeaks : [];
    if (crossSliceLeaks > 0 || leaksArray.length > 0) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.CROSS_SLICE_LEAKAGE_DETECTED,
        reason: `Cross-slice leakage detected (${crossSliceLeaks} leak(s)). Direct private imports between slices forbidden.`
      };
    }

    // 13. Non-builtin imports in pure domain check (Layer 0 purity)
    const nonBuiltinImports = Number(plan.sliceReport.nonBuiltinImportsCount || 0);
    if (nonBuiltinImports > 0) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.NON_BUILTIN_DEPENDENCIES_FORBIDDEN,
        reason: `Non-builtin dependencies detected in domain slice (${nonBuiltinImports}). Layer-0 purity requires NODE_BUILTINS_ONLY.`
      };
    }

    // 14. Auto-seal human gate check
    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: DP_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: DP_CODES.OK,
      reason: 'Plan satisfies all vertical slice & screaming architecture policy preconditions.'
    };
  }
}
