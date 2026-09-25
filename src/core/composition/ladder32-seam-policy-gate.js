/**
 * @module ladder32-seam-policy-gate
 * SPEC-0130 / Mission DT — Policy Gate for Ladder 32 CI Seam-Pack Consolidation & Closeout Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin fce84743
 *   Upstream satellites validation: DP, DQ, DR, DS receipts verified
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 reopen
 *   Refuse L32 reopen after closeout
 *   Refuse auto-seal without human gate
 *   Refuse tip-pin rewrite
 *   schemas AT_CEILING 35/35
 */

import {
  DT_PRODUCTION_READY,
  DT_FREEZE_PIN_SHORT
} from './ladder32-seam-receipt.js';

/** @type {'NO'} */
export const DT_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DT_POLICY_GATE_KIND = 'eos-ladder32-seam-policy-gate';

export const DT_SEAM_PHASES = Object.freeze([
  'PREFLIGHT',
  'UPSTREAM_VERIFY',
  'SEAM_CHAIN',
  'CLOSEOUT_SEAL'
]);

export const DT_CODES = Object.freeze({
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
  L32_REOPEN_FORBIDDEN: 'L32_REOPEN_FORBIDDEN',
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

const L32_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*32/i,
  /l(?:adder)?[\s_-]*32\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*32/i
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

export function checkFundacionViolation(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export function checkSecretLeak(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return SECRET_PATTERNS.some((pat) => pat.test(str));
}

export function checkProductionReadyFlip(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return PR_FLIP_PATTERNS.some((pat) => pat.test(str));
}

export function checkHardDelete(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return HARD_DELETE_PATTERNS.some((pat) => pat.test(str));
}

export function checkMassPrune(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return MASS_PRUNE_PATTERNS.some((pat) => pat.test(str));
}

export function checkL30Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L30_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function checkL31Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L31_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function checkL32Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L32_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function checkTipRewrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return TIP_REWRITE_PATTERNS.some((pat) => pat.test(str));
}

/**
 * Validates an upstream receipt from DP, DQ, DR, or DS
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
 * Validates plan against Ladder 32 Seam-Pack policy
 * @param {object} plan
 * @returns {{ ok: boolean, code: string, reason: string }}
 */
export function validateLadder32SeamPlan(plan = {}) {
  if (!plan || typeof plan !== 'object') {
    return { ok: false, code: DT_CODES.DENY, reason: 'Invalid plan object' };
  }

  if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
    return { ok: false, code: DT_CODES.MISSING_PLAN_ID, reason: 'planId is required' };
  }

  if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
    return { ok: false, code: DT_CODES.MISSING_CHANGE_ID, reason: 'changeId is required' };
  }

  // 1. Fundacion barrier
  if (checkFundacionViolation(plan.target) ||
      checkFundacionViolation(plan.targetPath) ||
      checkFundacionViolation(plan.path) ||
      checkFundacionViolation(plan.paths)) {
    return {
      ok: false,
      code: DT_CODES.FUNDACION_DENIED,
      reason: 'Target references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
    };
  }

  // Strip attached receipts for text scanning
  const planClean = stripReceipts(plan);

  // 2. Secret leakage check (Law VI)
  if (checkSecretLeak(planClean)) {
    return {
      ok: false,
      code: DT_CODES.SECRET_LEAK_FORBIDDEN,
      reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
    };
  }

  // 3. Hard delete check
  if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || checkHardDelete(planClean)) {
    return {
      ok: false,
      code: DT_CODES.HARD_DELETE_FORBIDDEN,
      reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
    };
  }

  // 4. Mass prune check
  if (plan.massPrune === true || checkMassPrune(planClean)) {
    return {
      ok: false,
      code: DT_CODES.MASS_PRUNE_FORBIDDEN,
      reason: 'Mass prune operations are strictly forbidden.'
    };
  }

  // 5. PRODUCTION_READY flip check
  if (plan.productionReady === 'YES' || checkProductionReadyFlip(planClean)) {
    return {
      ok: false,
      code: DT_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
      reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
    };
  }

  // 6. Ladder 30 / 29 reopen check
  if (checkL30Reopen(planClean)) {
    return {
      ok: false,
      code: DT_CODES.L30_REOPEN_FORBIDDEN,
      reason: 'Attempted to reopen Ladder 30/29. Ladders 17–31 are permanently CLOSED.'
    };
  }

  // 7. Ladder 31 reopen check
  if (checkL31Reopen(planClean)) {
    return {
      ok: false,
      code: DT_CODES.L31_REOPEN_FORBIDDEN,
      reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED.'
    };
  }

  // 8. Ladder 32 reopen check
  if (checkL32Reopen(planClean)) {
    return {
      ok: false,
      code: DT_CODES.L32_REOPEN_FORBIDDEN,
      reason: 'Attempted to reopen Ladder 32 after closeout. Reopening sealed ladders is strictly forbidden.'
    };
  }

  // 9. Tip rewrite check
  if (checkTipRewrite(planClean)) {
    return {
      ok: false,
      code: DT_CODES.TIP_REWRITE_FORBIDDEN,
      reason: 'Modifying historical git tip or force-pushing is strictly forbidden.'
    };
  }

  // 10. Ritual mode check
  if (plan.seamMode === 'HOLD') {
    return {
      ok: true,
      code: DT_CODES.HOLD,
      reason: 'Plan is in HOLD mode: zero mutations allowed.'
    };
  }

  // 11. Upstream receipts verification (ACTIVE mode)
  if (!plan.dpReceiptLink || !plan.dqReceiptLink || !plan.drReceiptLink || !plan.dsReceiptLink) {
    return {
      ok: false,
      code: DT_CODES.MISSING_UPSTREAM_RECEIPTS,
      reason: 'All four upstream satellite receipts (DP, DQ, DR, DS) must be provided in ACTIVE mode.'
    };
  }

  if (!validateUpstreamReceipt(plan.dpReceiptLink, 'DP-RCPT-')) {
    return {
      ok: false,
      code: DT_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing DP receipt link (must start with DP-RCPT- and have decision PASS).'
    };
  }

  if (!validateUpstreamReceipt(plan.dqReceiptLink, 'DQ-RCPT-')) {
    return {
      ok: false,
      code: DT_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing DQ receipt link (must start with DQ-RCPT- and have decision PASS).'
    };
  }

  if (!validateUpstreamReceipt(plan.drReceiptLink, 'DR-RCPT-')) {
    return {
      ok: false,
      code: DT_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing DR receipt link (must start with DR-RCPT- and have decision PASS).'
    };
  }

  if (!validateUpstreamReceipt(plan.dsReceiptLink, 'DS-RCPT-')) {
    return {
      ok: false,
      code: DT_CODES.INVALID_UPSTREAM_RECEIPT,
      reason: 'Invalid or failing DS receipt link (must start with DS-RCPT- and have decision PASS).'
    };
  }

  // 12. Auto-seal human gate check
  if (plan.autoSeal === true && !plan.humanGateHeld) {
    return {
      ok: false,
      code: DT_CODES.AUTO_SEAL_FORBIDDEN,
      reason: 'Auto-seal is forbidden without human gate holding.'
    };
  }

  return {
    ok: true,
    code: DT_CODES.OK,
    reason: 'Plan satisfies all Ladder 32 seam-pack preconditions.'
  };
}

export class Ladder32SeamPolicyGate {
  /**
   * Evaluates preconditions for the Ladder 32 seam-pack ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    const res = validateLadder32SeamPlan(plan);
    const decision = res.code === DT_CODES.OK ? 'PASS' : (res.code === DT_CODES.HOLD ? 'HOLD' : 'DENY');
    return {
      ok: res.ok,
      decision,
      code: res.code,
      reason: res.reason
    };
  }
}
