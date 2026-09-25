/**
 * @module admission-control-intake-policy-gate
 * SPEC-0146 / Mission EJ — Policy Gate for Sovereign Admission Control & Work-Intake Quotas Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin d7490fee (do NOT rewrite tip pins)
 *   Intake:
 *     - Requires intake with intakeId + workClass
 *     - Optional maxConcurrent / maxQueueDepth must be finite >= 1 when provided
 *     - Optional observedInflight / observedQueued (hermetic injected load state)
 *   Fail-closed DENY when quota exceeded (observedInflight >= maxConcurrent OR
 *     observedQueued >= maxQueueDepth) — receipted DENY, not DX trip
 *   Distinct from DX circuit breaker (failureThreshold/cooldown) — intake quotas only
 *   Refuse live OS schedulers / network rate limiters / wall-clock authority
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 / L34 / L35 reopen
 *   Refuse L36 auto-close (EK–EN pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EJ_PRODUCTION_READY,
  EJ_FREEZE_PIN_SHORT
} from './admission-control-intake-receipt.js';

/** @type {'NO'} */
export const EJ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EJ_POLICY_GATE_KIND = 'eos-admission-control-intake-policy-gate';

export const EJ_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'INTAKE_INSPECT',
  'QUOTA_SEAL',
  'ADMIT_SEAL',
  'SEAL'
]);

export const EJ_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_INTAKE: 'MISSING_INTAKE',
  INVALID_INTAKE: 'INVALID_INTAKE',
  MISSING_INTAKE_ID: 'MISSING_INTAKE_ID',
  MISSING_WORK_CLASS: 'MISSING_WORK_CLASS',
  INVALID_MAX_CONCURRENT: 'INVALID_MAX_CONCURRENT',
  INVALID_MAX_QUEUE_DEPTH: 'INVALID_MAX_QUEUE_DEPTH',
  INVALID_OBSERVED_INFLIGHT: 'INVALID_OBSERVED_INFLIGHT',
  INVALID_OBSERVED_QUEUED: 'INVALID_OBSERVED_QUEUED',
  LIVE_OS_SCHEDULER_FORBIDDEN: 'LIVE_OS_SCHEDULER_FORBIDDEN',
  NETWORK_RATE_LIMITER_FORBIDDEN: 'NETWORK_RATE_LIMITER_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
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
  L35_REOPEN_FORBIDDEN: 'L35_REOPEN_FORBIDDEN',
  L36_AUTO_CLOSE_FORBIDDEN: 'L36_AUTO_CLOSE_FORBIDDEN',
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

const L35_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*35/i,
  /l(?:adder)?[\s_-]*35\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*35/i
];

const L36_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*36/i,
  /l(?:adder)?[\s_-]*36\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*36/i,
  /close\s+l(?:adder)?[\s_-]*36\s+now/i
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

const LIVE_OS_SCHEDULER_PATTERNS = [
  /\blive\s+os\s+scheduler\b/i,
  /\breal\s+os\s+scheduler\b/i,
  /\bbind\s+os\s+scheduler\b/i,
  /\bschedule\s+via\s+os\b/i,
  /\bprocess\.hrtime\b/,
  /\bos\.cpus\b/,
  /\bclaim(?:ing)?\s+live\s+os\s+scheduler/i
];

const NETWORK_RATE_LIMITER_PATTERNS = [
  /\bnetwork\s+rate[-_]?limiter\b/i,
  /\breal\s+rate[-_]?limiter\b/i,
  /\blive\s+rate[-_]?limit/i,
  /\bredis\s+rate[-_]?limit/i,
  /\bnginx\s+rate[-_]?limit/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?network\s+rate[-_]?limiter/i
];

const WALL_CLOCK_AUTHORITY_PATTERNS = [
  /\bwall[-_]?clock\s+authority\b/i,
  /\bDate\.now\s+as\s+quota\s+authority\b/i,
  /\blive\s+wall[-_]?clock\s+quota\b/i,
  /\bclaim(?:ing)?\s+wall[-_]?clock\s+authority/i
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

export function claimsL35Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L35_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL36AutoClose(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L36_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(str));
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

export function claimsLiveOsScheduler(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return LIVE_OS_SCHEDULER_PATTERNS.some((pat) => pat.test(str));
}

export function claimsNetworkRateLimiter(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return NETWORK_RATE_LIMITER_PATTERNS.some((pat) => pat.test(str));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return WALL_CLOCK_AUTHORITY_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export function isValidPositiveQuota(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

export function isValidNonNegativeObserved(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export class AdmissionControlIntakePolicyGate {
  /**
   * Evaluates preconditions for the admission / work-intake quota ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.MISSING_CHANGE_ID,
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
        code: EJ_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–35 are permanently CLOSED — NEVER reopen L30–L35.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.L36_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 36 is forbidden. EJ first satellite; EK–EN pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-EJ is SEPARATE.'
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
        code: EJ_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EJ_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveOsScheduler === true ||
      plan.bindOsScheduler === true ||
      claimsLiveOsScheduler(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.LIVE_OS_SCHEDULER_FORBIDDEN,
        reason: 'Live OS scheduler is refused. PASS seals hermetic admission/quota receipt only — inject observed load state; do not bind real OS schedulers.'
      };
    }

    if (
      plan.networkRateLimiter === true ||
      plan.liveRateLimiter === true ||
      claimsNetworkRateLimiter(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.NETWORK_RATE_LIMITER_FORBIDDEN,
        reason: 'Network / live rate limiter is refused. Hermetic injected quota/load state only.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock authority for quota decisions is refused. Inject observedInflight/observedQueued hermetically.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EJ_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.intake) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.MISSING_INTAKE,
        reason: 'Missing intake in active ritual mode'
      };
    }

    if (typeof plan.intake !== 'object' || Array.isArray(plan.intake)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.INVALID_INTAKE,
        reason: 'intake must be a non-null object'
      };
    }

    if (
      !plan.intake.intakeId ||
      typeof plan.intake.intakeId !== 'string' ||
      !plan.intake.intakeId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.MISSING_INTAKE_ID,
        reason: 'intake.intakeId is required'
      };
    }

    if (
      !plan.intake.workClass ||
      typeof plan.intake.workClass !== 'string' ||
      !plan.intake.workClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.MISSING_WORK_CLASS,
        reason: 'intake.workClass is required'
      };
    }

    if (
      plan.intake.maxConcurrent !== undefined &&
      plan.intake.maxConcurrent !== null &&
      !isValidPositiveQuota(plan.intake.maxConcurrent)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.INVALID_MAX_CONCURRENT,
        reason: 'intake.maxConcurrent must be a finite number >= 1 when provided'
      };
    }

    if (
      plan.intake.maxQueueDepth !== undefined &&
      plan.intake.maxQueueDepth !== null &&
      !isValidPositiveQuota(plan.intake.maxQueueDepth)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.INVALID_MAX_QUEUE_DEPTH,
        reason: 'intake.maxQueueDepth must be a finite number >= 1 when provided'
      };
    }

    if (
      plan.intake.observedInflight !== undefined &&
      plan.intake.observedInflight !== null &&
      !isValidNonNegativeObserved(plan.intake.observedInflight)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.INVALID_OBSERVED_INFLIGHT,
        reason: 'intake.observedInflight must be a finite number >= 0 when provided (hermetic injection)'
      };
    }

    if (
      plan.intake.observedQueued !== undefined &&
      plan.intake.observedQueued !== null &&
      !isValidNonNegativeObserved(plan.intake.observedQueued)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.INVALID_OBSERVED_QUEUED,
        reason: 'intake.observedQueued must be a finite number >= 0 when provided (hermetic injection)'
      };
    }

    const maxConcurrent = plan.intake.maxConcurrent;
    const maxQueueDepth = plan.intake.maxQueueDepth;
    const observedInflight =
      plan.intake.observedInflight !== undefined && plan.intake.observedInflight !== null
        ? plan.intake.observedInflight
        : 0;
    const observedQueued =
      plan.intake.observedQueued !== undefined && plan.intake.observedQueued !== null
        ? plan.intake.observedQueued
        : 0;

    const concurrentExceeded =
      typeof maxConcurrent === 'number' && observedInflight >= maxConcurrent;
    const queueExceeded =
      typeof maxQueueDepth === 'number' && observedQueued >= maxQueueDepth;

    if (concurrentExceeded || queueExceeded) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.QUOTA_EXCEEDED,
        reason:
          'Fail-closed admission DENY — hermetic observed load exceeds intake quota (≠ DX circuit-breaker trip; ≠ live OS scheduler).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EJ_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EJ_CODES.OK,
      reason:
        'Plan satisfies all admission/work-intake quota preconditions (≠ DX trip ≠ live OS scheduler ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EJ_PRODUCTION_READY;
void EJ_FREEZE_PIN_SHORT;
