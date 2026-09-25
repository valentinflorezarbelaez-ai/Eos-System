/**
 * @module temporal-deadline-ttl-policy-gate
 * SPEC-0141 / Mission EE — Policy Gate for Temporal Deadline & TTL Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 9600063c (do NOT rewrite tip pins)
 *   Deadline:
 *     - Requires deadline with processId + deadlineAt (ISO-8601)
 *     - Optional ttlMs / clockSkewBudgetMs / triggerEvent / observedExpired
 *   ALLOW/PASS seals hermetic deadline/TTL receipt only
 *   EXPIRE when observedExpired is true (hermetic clock injection via input)
 *   Refuse live wall-clock scheduler / setTimeout / setInterval / network cron
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 / L34 reopen
 *   Refuse L35 auto-close
 *   Refuse tip-pin rewrite
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EE_PRODUCTION_READY,
  EE_FREEZE_PIN_SHORT
} from './temporal-deadline-ttl-receipt.js';

/** @type {'NO'} */
export const EE_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EE_POLICY_GATE_KIND = 'eos-temporal-deadline-ttl-policy-gate';

export const EE_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'DEADLINE_INSPECT',
  'TTL_SEAL',
  'APPLY_SEAL',
  'SEAL'
]);

export const EE_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  EXPIRE: 'EXPIRE',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_DEADLINE: 'MISSING_DEADLINE',
  INVALID_DEADLINE: 'INVALID_DEADLINE',
  MISSING_PROCESS_ID: 'MISSING_PROCESS_ID',
  MISSING_DEADLINE_AT: 'MISSING_DEADLINE_AT',
  INVALID_DEADLINE_AT: 'INVALID_DEADLINE_AT',
  LIVE_TIMER_FORBIDDEN: 'LIVE_TIMER_FORBIDDEN',
  SCHEMA_JSON_ADD_FORBIDDEN: 'SCHEMA_JSON_ADD_FORBIDDEN',
  HARD_DELETE_FORBIDDEN: 'HARD_DELETE_FORBIDDEN',
  MASS_PRUNE_FORBIDDEN: 'MASS_PRUNE_FORBIDDEN',
  SECRET_LEAK_FORBIDDEN: 'SECRET_LEAK_FORBIDDEN',
  FUNDACION_DENIED: 'FUNDACION_DENIED',
  PRODUCTION_READY_FLIP_FORBIDDEN: 'PRODUCTION_READY_FLIP_FORBIDDEN',
  L30_REOPEN_FORBIDDEN: 'L30_REOPEN_FORBIDDEN',
  L31_REOPEN_FORBIDDEN: 'L31_REOPEN_FORBIDDEN',
  L32_REOPEN_FORBIDDEN: 'L32_REOPEN_FORBIDDEN',
  L33_REOPEN_FORBIDDEN: 'L33_REOPEN_FORBIDDEN',
  L34_REOPEN_FORBIDDEN: 'L34_REOPEN_FORBIDDEN',
  L35_AUTO_CLOSE_FORBIDDEN: 'L35_AUTO_CLOSE_FORBIDDEN',
  TIP_REWRITE_FORBIDDEN: 'TIP_REWRITE_FORBIDDEN',
  AUTO_SEAL_FORBIDDEN: 'AUTO_SEAL_FORBIDDEN',
  GHE_CLAIM_FORBIDDEN: 'GHE_CLAIM_FORBIDDEN',
  NETWORK_WRITE_FORBIDDEN: 'NETWORK_WRITE_FORBIDDEN',
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
  /unseal\s+l(?:adder)?[\s_-]*30/i
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

const L33_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*33/i,
  /l(?:adder)?[\s_-]*33\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*33/i
];

const L34_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*34/i,
  /l(?:adder)?[\s_-]*34\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*34/i
];

const L35_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*35/i,
  /l(?:adder)?[\s_-]*35\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*35/i,
  /close\s+l(?:adder)?[\s_-]*35\s+now/i
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

const SCHEMA_JSON_PATTERNS = [
  /docs\/schemas\/.*\.json/i,
  /add\s+(?:new\s+)?schema\s+json/i,
  /create\s+docs\/schemas/i,
  /schemas?\s+AT_CEILING\s+bypass/i,
  /raise\s+schema\s+ceiling/i
];

const NETWORK_WRITE_PATTERNS = [
  /\bnetwork\s+write\b/i,
  /\bhttp\s+(?:post|put|patch)\b/i,
  /\bfetch\s*\(/i,
  /\baxios\./i,
  /\bremote\s+dispatch\b/i
];

const GHE_PATTERNS = [
  /\bGHE\b/,
  /GitHub\s+Enterprise/i,
  /claim\s+GHA\s+green/i,
  /enterprise\s+branch\s+protection\s+enforced/i
];

const LIVE_TIMER_PATTERNS = [
  /\bsetTimeout\b/,
  /\bsetInterval\b/,
  /\blive\s+wall[-_]?clock\b/i,
  /\bwall[-_]?clock\s+scheduler\b/i,
  /\bnetwork\s+cron\b/i,
  /\bschedule\s+live\s+timer\b/i,
  /\bbind\s+process\s+lifetime\b/i,
  /\bexecute\s+live\s+timer\b/i,
  /\brun\s+real\s+timer\b/i,
  /\bclaim(?:ing)?\s+live\s+(?:wall[-_]?clock\s+)?scheduler/i
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

export function claimsL33Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L33_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL34Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L34_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL35AutoClose(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L35_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsTipRewrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return TIP_REWRITE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsSchemaJsonAdd(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return SCHEMA_JSON_PATTERNS.some((pat) => pat.test(str));
}

export function claimsNetworkWrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return NETWORK_WRITE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsGhe(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return GHE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsLiveTimer(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return LIVE_TIMER_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export function isValidIsoDeadlineAt(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

export class TemporalDeadlineTtlPolicyGate {
  /**
   * Evaluates preconditions for the temporal deadline / TTL ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.MISSING_CHANGE_ID,
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
        code: EE_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–34 are permanently CLOSED — NEVER reopen L30–L34.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.L35_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 35 is forbidden. EE–EI pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only).'
      };
    }

    if (
      plan.addSchemaJson === true ||
      plan.schemaJsonAdd === true ||
      claimsSchemaJsonAdd(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        reason: 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.'
      };
    }

    if (
      plan.networkWrite === true ||
      plan.remoteDispatch === true ||
      claimsNetworkWrite(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveTimer === true ||
      plan.wallClockScheduler === true ||
      plan.bindProcessLifetime === true ||
      claimsLiveTimer(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.LIVE_TIMER_FORBIDDEN,
        reason: 'Live wall-clock scheduler / setTimeout / setInterval / network cron is refused. PASS seals hermetic deadline/TTL receipt only — NOT a live timer.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EE_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.deadline) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.MISSING_DEADLINE,
        reason: 'Missing deadline in active ritual mode'
      };
    }

    if (typeof plan.deadline !== 'object' || Array.isArray(plan.deadline)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.INVALID_DEADLINE,
        reason: 'deadline must be a non-null object'
      };
    }

    if (
      !plan.deadline.processId ||
      typeof plan.deadline.processId !== 'string' ||
      !plan.deadline.processId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.MISSING_PROCESS_ID,
        reason: 'deadline.processId is required'
      };
    }

    if (
      !plan.deadline.deadlineAt ||
      typeof plan.deadline.deadlineAt !== 'string' ||
      !plan.deadline.deadlineAt.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.MISSING_DEADLINE_AT,
        reason: 'deadline.deadlineAt (ISO-8601) is required'
      };
    }

    if (!isValidIsoDeadlineAt(plan.deadline.deadlineAt)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.INVALID_DEADLINE_AT,
        reason: 'deadline.deadlineAt must be a valid ISO-8601 timestamp'
      };
    }

    if (plan.observedExpired === true || plan.deadline.observedExpired === true) {
      return {
        ok: true,
        decision: 'EXPIRE',
        code: EE_CODES.EXPIRE,
        reason: 'Hermetic observedExpired=true — fail-closed EXPIRE seal (clock injected via input, not Date.now authority).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EE_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EE_CODES.OK,
      reason: 'Plan satisfies all temporal deadline/TTL preconditions (≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EE_PRODUCTION_READY;
void EE_FREEZE_PIN_SHORT;
