/**
 * @module transactional-outbox-policy-gate
 * SPEC-0132 / Mission DV — Policy Gate for Transactional Resilient Outbox Pattern Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin cd1512a9 (do NOT rewrite tip pins)
 *   Outbox:
 *     - Requires domainEvent (compose DU) with eventType + aggregateId + non-empty payload
 *     - Requires outboxRecord with outboxId + payloadDigest (or derives)
 *     - Seals persist + at-least-once dispatch (PASS ≠ PRODUCTION_READY ≠ tip rewrite)
 *   Refuse tip rewrite / PRODUCTION_READY flip / L30–L32 reopen / L33 auto-close
 *   Refuse secrets / Fundacion / GHE / CloudAgent / mass prune / unsupervised hard delete
 *   schemas AT_CEILING 35/35
 */

import {
  DV_PRODUCTION_READY,
  DV_FREEZE_PIN_SHORT
} from './transactional-outbox-receipt.js';

/** @type {'NO'} */
export const DV_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DV_POLICY_GATE_KIND = 'eos-transactional-outbox-policy-gate';

export const DV_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'OUTBOX_INSPECT',
  'PERSIST_SEAL',
  'DISPATCH_SEAL',
  'SEAL'
]);

export const DV_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_DOMAIN_EVENT: 'MISSING_DOMAIN_EVENT',
  INVALID_DOMAIN_EVENT: 'INVALID_DOMAIN_EVENT',
  MISSING_EVENT_TYPE: 'MISSING_EVENT_TYPE',
  MISSING_AGGREGATE_ID: 'MISSING_AGGREGATE_ID',
  EMPTY_EVENT_PAYLOAD: 'EMPTY_EVENT_PAYLOAD',
  MISSING_OUTBOX_RECORD: 'MISSING_OUTBOX_RECORD',
  INVALID_OUTBOX_RECORD: 'INVALID_OUTBOX_RECORD',
  MISSING_OUTBOX_ID: 'MISSING_OUTBOX_ID',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  PRODUCTION_READY_FLIP_FORBIDDEN: 'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN: 'L30_REOPEN_FORBIDDEN',
  L31_REOPEN_FORBIDDEN: 'L31_REOPEN_FORBIDDEN',
  L32_REOPEN_FORBIDDEN: 'L32_REOPEN_FORBIDDEN',
  L33_AUTO_CLOSE_FORBIDDEN: 'L33_AUTO_CLOSE_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN: 'TIP_REWRITE_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
  GHE_CLAIM_FORBIDDEN: 'GHE_CLAIM_FORBIDDEN',
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

const L32_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*32/i,
  /l(?:adder)?[\s_-]*32\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*32/i
];

const L33_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*33/i,
  /l(?:adder)?[\s_-]*33\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*33/i,
  /close\s+l(?:adder)?[\s_-]*33\s+now/i
];

const TIP_REWRITE_PATTERNS = [
  /rewrite\s+(?:git\s+)?tip/i,
  /force[-_]?push\s+main/i,
  /rebase[-_]?origin[-_]?main/i,
  /git\s+reset\s+--hard\s+origin/i,
  /modify\s+historical\s+tip/i,
  /rewrite\s+freeze\s+tip/i,
  /advance\s+EXPECTED_TIP/i
];

const GHE_PATTERNS = [
  /\bGHE\b/,
  /GitHub\s+Enterprise/i,
  /claim\s+GHA\s+green/i,
  /enterprise\s+branch\s+protection\s+enforced/i
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

export function claimsL32Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L32_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL33AutoClose(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L33_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsTipRewrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return TIP_REWRITE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsGhe(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return GHE_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export class TransactionalOutboxPolicyGate {
  /**
   * Evaluates preconditions for the transactional outbox ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MISSING_CHANGE_ID,
        reason: 'Missing changeId in input'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.path) ||
      isFundacionTarget(plan.paths)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30/29. Ladders 17–32 are permanently CLOSED — NEVER reopen L30.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.L33_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 33 is forbidden. DV–DY pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only).'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: DV_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.domainEvent) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MISSING_DOMAIN_EVENT,
        reason: 'Missing domainEvent (compose DU events) in active ritual mode'
      };
    }

    if (typeof plan.domainEvent !== 'object' || Array.isArray(plan.domainEvent)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.INVALID_DOMAIN_EVENT,
        reason: 'domainEvent must be a non-null object'
      };
    }

    if (
      !plan.domainEvent.eventType ||
      typeof plan.domainEvent.eventType !== 'string' ||
      !plan.domainEvent.eventType.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MISSING_EVENT_TYPE,
        reason: 'domainEvent.eventType is required'
      };
    }

    if (
      !plan.domainEvent.aggregateId ||
      typeof plan.domainEvent.aggregateId !== 'string' ||
      !plan.domainEvent.aggregateId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MISSING_AGGREGATE_ID,
        reason: 'domainEvent.aggregateId is required'
      };
    }

    if (
      plan.domainEvent.payload === undefined ||
      plan.domainEvent.payload === null ||
      (typeof plan.domainEvent.payload === 'object' &&
        !Array.isArray(plan.domainEvent.payload) &&
        Object.keys(plan.domainEvent.payload).length === 0)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.EMPTY_EVENT_PAYLOAD,
        reason: 'domainEvent.payload must be a non-empty object (aggregate state change evidence)'
      };
    }

    if (!plan.outboxRecord) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MISSING_OUTBOX_RECORD,
        reason: 'Missing outboxRecord in active ritual mode'
      };
    }

    if (typeof plan.outboxRecord !== 'object' || Array.isArray(plan.outboxRecord)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.INVALID_OUTBOX_RECORD,
        reason: 'outboxRecord must be a non-null object'
      };
    }

    if (
      !plan.outboxRecord.outboxId ||
      typeof plan.outboxRecord.outboxId !== 'string' ||
      !plan.outboxRecord.outboxId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.MISSING_OUTBOX_ID,
        reason: 'outboxRecord.outboxId is required'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: DV_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: DV_CODES.OK,
      reason: 'Plan satisfies all transactional outbox preconditions (persist + at-least-once dispatch seal).'
    };
  }
}

void DV_PRODUCTION_READY;
void DV_FREEZE_PIN_SHORT;
