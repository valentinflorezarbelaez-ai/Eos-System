/**
 * @module execution-loop-controller-policy-gate
 * SPEC-0128 / Mission DR — Policy Gate for Deterministic Autonomous Execution Loop Controller Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 898aa96a
 *   Execution loop state transitions:
 *     - Only deterministic transitions in the 7-phase cycle allowed
 *     - Out-of-order execution, phase skipping, or uncontrolled jumps rejected
 *     - Transition to VERIFIED requires allChecksPassed === true
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 reopen
 *   Refuse L32 auto-close
 *   Refuse auto-seal without human gate
 *   Refuse tip-pin rewrite
 *   schemas AT_CEILING 35/35
 */

import {
  DR_PRODUCTION_READY,
  DR_FREEZE_PIN_SHORT,
  VALID_LIFECYCLE_STATES
} from './execution-loop-controller-receipt.js';

/** @type {'NO'} */
export const DR_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DR_POLICY_GATE_KIND = 'eos-execution-loop-controller-policy-gate';

export const DR_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'STATE_VALIDATE',
  'TRANSITION_ALIGN',
  'SEAL'
]);

export const DR_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_LOOP_REPORT: 'MISSING_LOOP_REPORT',
  INVALID_LOOP_REPORT: 'INVALID_LOOP_REPORT',
  INVALID_LIFECYCLE_TRANSITION: 'INVALID_LIFECYCLE_TRANSITION',
  CHECKS_FAILED_FOR_VERIFIED: 'CHECKS_FAILED_FOR_VERIFIED',
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

const ALLOWED_TRANSITIONS = new Map([
  ['INTAKE', new Set(['SPEC_APPROVAL'])],
  ['SPEC_APPROVAL', new Set(['TDD_RED'])],
  ['TDD_RED', new Set(['TDD_GREEN'])],
  ['TDD_GREEN', new Set(['QUALITY_AUDIT'])],
  ['QUALITY_AUDIT', new Set(['VERIFIED'])],
  ['VERIFIED', new Set(['SEALED'])]
]);

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

export class ExecutionLoopControllerPolicyGate {
  /**
   * Evaluates preconditions for the execution loop controller ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.MISSING_CHANGE_ID,
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
        code: DR_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    // Strip attached receipts before checking text patterns
    const planClean = stripReceipts(plan);

    // 2. Secret leakage check (Law VI)
    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    // 3. Hard delete check
    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    // 4. Mass prune check
    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    // 5. PRODUCTION_READY flip check
    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    // 6. Ladder 30 / 29 reopen check
    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30/29. Ladders 17–31 are permanently CLOSED.'
      };
    }

    // 7. Ladder 31 reopen check
    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED.'
      };
    }

    // 8. Ladder 32 auto-close check
    if (claimsL32AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.L32_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 32 is forbidden.'
      };
    }

    // 9. Tip rewrite check
    if (claimsTipRewrite(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip or force-pushing is strictly forbidden.'
      };
    }

    // 10. Ritual mode check
    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: DR_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed.'
      };
    }

    // 11. Loop report check (required in ACTIVE mode)
    if (!plan.loopReport) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.MISSING_LOOP_REPORT,
        reason: 'Missing loopReport in active ritual mode'
      };
    }

    if (typeof plan.loopReport !== 'object' || Array.isArray(plan.loopReport)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.INVALID_LOOP_REPORT,
        reason: 'loopReport must be a non-null object'
      };
    }

    // 12. Lifecycle state transition validation
    const fromState = plan.loopReport.fromState;
    const toState = plan.loopReport.toState;

    if (!VALID_LIFECYCLE_STATES.includes(fromState) || !VALID_LIFECYCLE_STATES.includes(toState)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.INVALID_LIFECYCLE_TRANSITION,
        reason: `Invalid lifecycle states: fromState="${fromState}", toState="${toState}". Must be one of ${VALID_LIFECYCLE_STATES.join(', ')}.`
      };
    }

    const allowed = ALLOWED_TRANSITIONS.get(fromState);
    if (!allowed || !allowed.has(toState)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.INVALID_LIFECYCLE_TRANSITION,
        reason: `Disallowed lifecycle transition from "${fromState}" to "${toState}". Transitions must be strictly sequential.`
      };
    }

    // 13. Quality gate check for transition to VERIFIED
    if (toState === 'VERIFIED' && plan.loopReport.allChecksPassed !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.CHECKS_FAILED_FOR_VERIFIED,
        reason: 'Transition to VERIFIED denied: allChecksPassed must be true.'
      };
    }

    // 14. Auto-seal human gate check
    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: DR_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: DR_CODES.OK,
      reason: 'Plan satisfies all deterministic execution loop controller preconditions.'
    };
  }
}
