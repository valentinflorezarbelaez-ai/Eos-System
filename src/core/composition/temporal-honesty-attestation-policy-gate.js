/**
 * @module temporal-honesty-attestation-policy-gate
 * SPEC-0144 / Mission EH — Policy Gate for Temporal Honesty & Deadline Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin ff4b6d19 (do NOT rewrite tip pins)
 *   Attestation:
 *     - Requires attestation with subjectKind + honestyClaims
 *     - subjectKind ∈ DEADLINE | SCHEDULE | COMPENSATION | COMPOSITE
 *     - honestyClaims must assert softObserveFreeze, noLiveTimer, productionReadyNo, schemasAtCeiling
 *   ALLOW/PASS seals hermetic honesty attestation receipt only
 *   Refuse live-timer / wall-clock honesty lies
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 / L34 reopen
 *   Refuse L35 auto-close
 *   Refuse tip-pin rewrite
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EH_PRODUCTION_READY,
  EH_FREEZE_PIN_SHORT,
  EH_SUBJECT_KINDS
} from './temporal-honesty-attestation-receipt.js';

/** @type {'NO'} */
export const EH_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EH_POLICY_GATE_KIND = 'eos-temporal-honesty-attestation-policy-gate';

export const EH_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'ATTEST_INSPECT',
  'HONESTY_SEAL',
  'APPLY_SEAL',
  'SEAL'
]);

export const EH_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_ATTESTATION: 'MISSING_ATTESTATION',
  INVALID_ATTESTATION: 'INVALID_ATTESTATION',
  MISSING_SUBJECT_KIND: 'MISSING_SUBJECT_KIND',
  INVALID_SUBJECT_KIND: 'INVALID_SUBJECT_KIND',
  MISSING_HONESTY_CLAIMS: 'MISSING_HONESTY_CLAIMS',
  INVALID_HONESTY_CLAIMS: 'INVALID_HONESTY_CLAIMS',
  LIVE_TIMER_HONESTY_LIE: 'LIVE_TIMER_HONESTY_LIE',
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

const GHE_PATTERNS = [
  /\bGHE\b/,
  /GitHub\s+Enterprise/i,
  /claim\s+GHA\s+green/i,
  /enterprise\s+branch\s+protection\s+enforced/i
];

const LIVE_TIMER_HONESTY_LIE_PATTERNS = [
  /\blive[-_\s]?timer\s+authority\b/i,
  /\bwall[-_\s]?clock\s+authority\b/i,
  /\bclaim(?:ing)?\s+live[-_\s]?timer\b/i,
  /\bclaim(?:ing)?\s+wall[-_\s]?clock\b/i,
  /\bnoLiveTimer\s*[:=]\s*false\b/i,
  /\blive\s+setTimeout\b/i,
  /\blive\s+setInterval\b/i,
  /\bschedule\s+real\s+wall[-_\s]?clock\b/i,
  /\bassert\s+live[-_\s]?timer\s+honest\b/i
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

export function claimsGhe(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return GHE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsLiveTimerHonestyLie(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return LIVE_TIMER_HONESTY_LIE_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

function honestyClaimsAreValid(claims) {
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return false;
  return (
    claims.softObserveFreeze === true &&
    claims.noLiveTimer === true &&
    claims.productionReadyNo === true &&
    claims.schemasAtCeiling === true
  );
}

export class TemporalHonestyAttestationPolicyGate {
  /**
   * Evaluates preconditions for the temporal honesty attestation ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.MISSING_CHANGE_ID,
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
        code: EH_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–34 are permanently CLOSED — NEVER reopen L30–L34.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.L35_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 35 is forbidden. EH–EI pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.TIP_REWRITE_FORBIDDEN,
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
        code: EH_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
        reason: 'Adding docs/schemas/**/*.json is forbidden. schemas AT_CEILING 35/35 held.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.liveTimerAuthority === true ||
      plan.wallClockAuthority === true ||
      plan.claimLiveTimer === true ||
      claimsLiveTimerHonestyLie(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.LIVE_TIMER_HONESTY_LIE,
        reason: 'Live-timer / wall-clock authority honesty lie refused. Attestation ≠ wall-clock authority.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EH_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.attestation) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.MISSING_ATTESTATION,
        reason: 'Missing attestation in active ritual mode'
      };
    }

    if (typeof plan.attestation !== 'object' || Array.isArray(plan.attestation)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.INVALID_ATTESTATION,
        reason: 'attestation must be a non-null object'
      };
    }

    if (
      !plan.attestation.subjectKind ||
      typeof plan.attestation.subjectKind !== 'string' ||
      !plan.attestation.subjectKind.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.MISSING_SUBJECT_KIND,
        reason: 'attestation.subjectKind is required'
      };
    }

    if (!EH_SUBJECT_KINDS.includes(plan.attestation.subjectKind)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.INVALID_SUBJECT_KIND,
        reason: 'attestation.subjectKind must be one of DEADLINE|SCHEDULE|COMPENSATION|COMPOSITE'
      };
    }

    if (!plan.attestation.honestyClaims) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.MISSING_HONESTY_CLAIMS,
        reason: 'attestation.honestyClaims is required'
      };
    }

    if (!honestyClaimsAreValid(plan.attestation.honestyClaims)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.INVALID_HONESTY_CLAIMS,
        reason: 'attestation.honestyClaims must assert softObserveFreeze, noLiveTimer, productionReadyNo, schemasAtCeiling all true'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EH_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EH_CODES.OK,
      reason: 'Plan satisfies all temporal honesty attestation preconditions (≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EH_PRODUCTION_READY;
void EH_FREEZE_PIN_SHORT;
