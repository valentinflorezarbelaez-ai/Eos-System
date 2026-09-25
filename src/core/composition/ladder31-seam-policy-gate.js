/**
 * @module ladder31-seam-policy-gate
 * SPEC-0125 / Mission DO — Policy Gate for Ladder 31 CI Seam-Pack Consolidation & Closeout Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 8a4db2c3
 *   Upstream satellites validation: DK, DL, DM, DN receipts verified
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 reopen
 *   Refuse L31 reopen after closeout
 *   Refuse auto-seal without human gate
 *   Refuse tip-pin rewrite
 *   schemas AT_CEILING 35/35
 */

import {
  DO_PRODUCTION_READY,
  DO_FREEZE_PIN_SHORT
} from './ladder31-seam-receipt.js';

/** @type {'NO'} */
export const DO_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DO_POLICY_GATE_KIND = 'eos-ladder31-seam-policy-gate';

export const DO_SEAM_PHASES = Object.freeze([
  'PREFLIGHT',
  'UPSTREAM_VERIFY',
  'SEAM_CHAIN',
  'CLOSEOUT_SEAL'
]);

export const DO_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_UPSTREAM_RECEIPTS: 'MISSING_UPSTREAM_RECEIPTS',
  INVALID_UPSTREAM_RECEIPT: 'INVALID_UPSTREAM_RECEIPT',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  PRODUCTION_READY_FLIP_FORBIDDEN: 'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN: 'L30_REOPEN_FORBIDDEN',
  L31_REOPEN_FORBIDDEN: 'L31_REOPEN_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN: 'TIP_REWRITE_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
  INVALID_SEAM_MODE: 'INVALID_SEAM_MODE',
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

/**
 * Strips attached receipts from input object before scanning text for forbidden patterns.
 * This prevents false-positive detection on non-claim labels inside prior receipts.
 */
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

/**
 * Checks for Fundacion write target or violation
 */
export function checkFundacionViolation(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

/**
 * Checks for synthetic or real secret tokens
 */
export function checkSecretLeak(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return SECRET_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Checks for PRODUCTION_READY flip attempts
 */
export function checkProductionReadyFlip(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return PR_FLIP_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Checks for hard delete / destructive operations
 */
export function checkHardDelete(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return HARD_DELETE_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Checks for mass prune operations
 */
export function checkMassPrune(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return MASS_PRUNE_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Checks for Ladder 30 / 29 reopen attempts
 */
export function checkL30Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L30_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Checks for Ladder 31 reopen attempts
 */
export function checkL31Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L31_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Checks for tip rewrite attempts
 */
export function checkTipRewrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return TIP_REWRITE_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Validates an upstream receipt from DK, DL, DM, or DN
 * @param {object} receipt
 * @param {string} prefix
 * @returns {boolean}
 */
export function validateUpstreamReceipt(receipt, prefix) {
  if (!receipt || typeof receipt !== 'object') return false;
  if (typeof receipt.receiptId !== 'string' || !receipt.receiptId.startsWith(prefix)) return false;
  if (receipt.decision !== 'PASS') return false;
  if (receipt.productionReady !== 'NO') return false;
  if (receipt.fundacionDelta !== 0) return false;
  return true;
}

/**
 * Validates plan against Ladder 31 Seam-Pack policy
 * @param {object} plan
 * @returns {{ ok: boolean, code: string, reason: string }}
 */
export function validateLadder31SeamPlan(plan = {}) {
  if (!plan || typeof plan !== 'object') {
    return { ok: false, code: DO_CODES.DENY, reason: 'Invalid plan object' };
  }

  if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
    return { ok: false, code: DO_CODES.MISSING_PLAN_ID, reason: 'planId is required' };
  }

  if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
    return { ok: false, code: DO_CODES.MISSING_CHANGE_ID, reason: 'changeId is required' };
  }

  // 1. Fundacion target check (Law IV)
  if (checkFundacionViolation(plan.target) ||
      checkFundacionViolation(plan.targetPath) ||
      checkFundacionViolation(plan.path) ||
      checkFundacionViolation(plan.paths)) {
    return {
      ok: false,
      code: DO_CODES.FUNDACION_DENIED,
      reason: 'Writing to or targeting Fundacion is strictly forbidden (FUNDACION_ALWAYS_DENY, Delta=0)'
    };
  }

  // Strip receipts before pattern checking to avoid false positives on non-claim labels
  const planClean = stripReceipts(plan);

  // 2. Secret check (Law VI)
  if (checkSecretLeak(planClean)) {
    return {
      ok: false,
      code: DO_CODES.SECRET_LEAK_FORBIDDEN,
      reason: 'Potential plain secret detected in plan. Law VI violation.'
    };
  }

  // 3. Hard delete check
  if (plan.forceDelete === true || checkHardDelete(planClean)) {
    return {
      ok: false,
      code: DO_CODES.HARD_DELETE_FORBIDDEN,
      reason: 'Hard delete / purge operations are strictly forbidden.'
    };
  }

  // 4. Mass prune check
  if (plan.massPrune === true || checkMassPrune(planClean)) {
    return {
      ok: false,
      code: DO_CODES.MASS_PRUNE_FORBIDDEN,
      reason: 'Mass prune operations are strictly forbidden in seam governance.'
    };
  }

  // 5. PRODUCTION_READY flip check
  if (plan.productionReady === 'YES' || checkProductionReadyFlip(planClean)) {
    return {
      ok: false,
      code: DO_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
      reason: 'Flipping PRODUCTION_READY to YES is forbidden. Status remains NO.'
    };
  }

  // 6. Ladder 30 / 29 reopen check
  if (checkL30Reopen(planClean)) {
    return {
      ok: false,
      code: DO_CODES.L30_REOPEN_FORBIDDEN,
      reason: 'Reopening Ladder 30 / Ladder 29 is strictly forbidden. Ladders 17–30 are permanently CLOSED.'
    };
  }

  // 7. Ladder 31 reopen check
  if (checkL31Reopen(planClean)) {
    return {
      ok: false,
      code: DO_CODES.L31_REOPEN_FORBIDDEN,
      reason: 'Reopening Ladder 31 is strictly forbidden once closed.'
    };
  }

  // 8. Tip rewrite check
  if (checkTipRewrite(planClean)) {
    return {
      ok: false,
      code: DO_CODES.TIP_REWRITE_FORBIDDEN,
      reason: 'Modifying historical git tip or force-pushing is strictly forbidden.'
    };
  }

  // 9. Upstream receipts verification (when provided)
  if (plan.dkReceipt && !validateUpstreamReceipt(plan.dkReceipt, 'DK-RCPT-')) {
    return {
      ok: false,
      code: DO_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing Mission DK upstream receipt'
    };
  }
  if (plan.dlReceipt && !validateUpstreamReceipt(plan.dlReceipt, 'DL-RCPT-')) {
    return {
      ok: false,
      code: DO_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing Mission DL upstream receipt'
    };
  }
  if (plan.dmReceipt && !validateUpstreamReceipt(plan.dmReceipt, 'DM-RCPT-')) {
    return {
      ok: false,
      code: DO_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing Mission DM upstream receipt'
    };
  }
  if (plan.dnReceipt && !validateUpstreamReceipt(plan.dnReceipt, 'DN-RCPT-')) {
    return {
      ok: false,
      code: DO_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing Mission DN upstream receipt'
    };
  }

  // 10. Auto seal check
  if (plan.autoSeal === true && !plan.humanGateHeld) {
    return {
      ok: false,
      code: DO_CODES.AUTO_SEAL_FORBIDDEN,
      reason: 'Auto-seal is forbidden without human gate holding.'
    };
  }

  return { ok: true, code: DO_CODES.OK, reason: 'Plan complies with Ladder 31 Seam-Pack policy' };
}
