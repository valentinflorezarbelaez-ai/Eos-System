/**
 * @module domain-event-compatibility-policy-gate
 * SPEC-0139 / Mission EC — Policy Gate for Domain Event Compatibility Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 19b353d8 (do NOT rewrite tip pins)
 *   Evolution:
 *     - Requires evolution with eventType + changeKind
 *     - changeKind ∈ ADD_OPTIONAL_FIELD | RENAME_FORBIDDEN | BREAKING | COMPATIBLE
 *     - Optional fromVersion / toVersion / contractDigest
 *   ALLOW/PASS only for COMPATIBLE / ADD_OPTIONAL_FIELD (hermetic)
 *   DENY for BREAKING / RENAME_FORBIDDEN with sealed deny receipt
 *   Refuse breaking without explicit deny path misuse
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 reopen
 *   Refuse L34 auto-close
 *   Refuse tip-pin rewrite
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EC_PRODUCTION_READY,
  EC_FREEZE_PIN_SHORT,
  EC_CHANGE_KINDS,
  EC_COMPATIBLE_CHANGE_KINDS,
  EC_DENIED_CHANGE_KINDS
} from './domain-event-compatibility-receipt.js';

/** @type {'NO'} */
export const EC_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EC_POLICY_GATE_KIND = 'eos-domain-event-compatibility-policy-gate';

export const EC_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'EVOLUTION_INSPECT',
  'COMPATIBILITY_SEAL',
  'APPLY_SEAL',
  'SEAL'
]);

export const EC_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_EVOLUTION: 'MISSING_EVOLUTION',
  INVALID_EVOLUTION: 'INVALID_EVOLUTION',
  MISSING_EVENT_TYPE: 'MISSING_EVENT_TYPE',
  MISSING_CHANGE_KIND: 'MISSING_CHANGE_KIND',
  INVALID_CHANGE_KIND: 'INVALID_CHANGE_KIND',
  BREAKING_CHANGE_DENIED: 'BREAKING_CHANGE_DENIED',
  RENAME_FORBIDDEN_DENIED: 'RENAME_FORBIDDEN_DENIED',
  BREAKING_WITHOUT_DENY_MISUSE: 'BREAKING_WITHOUT_DENY_MISUSE',
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
  L34_AUTO_CLOSE_FORBIDDEN: 'L34_AUTO_CLOSE_FORBIDDEN',
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

const L34_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*34/i,
  /l(?:adder)?[\s_-]*34\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*34/i,
  /close\s+l(?:adder)?[\s_-]*34\s+now/i
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

const BREAKING_MISUSE_PATTERNS = [
  /force[-_]?allow\s+breaking/i,
  /allow\s+breaking\s+(?:without\s+deny|as\s+pass)/i,
  /bypass\s+breaking\s+deny/i,
  /treat\s+breaking\s+as\s+compatible/i,
  /skip\s+deny\s+(?:for\s+)?breaking/i,
  /breaking\s+without\s+(?:explicit\s+)?deny/i
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

export function claimsL34AutoClose(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L34_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(str));
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

export function claimsBreakingWithoutDenyMisuse(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return BREAKING_MISUSE_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export class DomainEventCompatibilityPolicyGate {
  /**
   * Evaluates preconditions for the domain-event compatibility ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.MISSING_CHANGE_ID,
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
        code: EC_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–33 are permanently CLOSED — NEVER reopen L30–L33.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.L34_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 34 is forbidden. EC–ED pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.TIP_REWRITE_FORBIDDEN,
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
        code: EC_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EC_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.forceAllowBreaking === true ||
      plan.bypassBreakingDeny === true ||
      claimsBreakingWithoutDenyMisuse(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.BREAKING_WITHOUT_DENY_MISUSE,
        reason: 'Breaking evolution without explicit sealed deny path is refused. BREAKING/RENAME_FORBIDDEN must seal DENY receipts.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EC_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.evolution) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.MISSING_EVOLUTION,
        reason: 'Missing evolution in active ritual mode'
      };
    }

    if (typeof plan.evolution !== 'object' || Array.isArray(plan.evolution)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.INVALID_EVOLUTION,
        reason: 'evolution must be a non-null object'
      };
    }

    if (
      !plan.evolution.eventType ||
      typeof plan.evolution.eventType !== 'string' ||
      !plan.evolution.eventType.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.MISSING_EVENT_TYPE,
        reason: 'evolution.eventType is required'
      };
    }

    if (
      !plan.evolution.changeKind ||
      typeof plan.evolution.changeKind !== 'string' ||
      !plan.evolution.changeKind.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.MISSING_CHANGE_KIND,
        reason: 'evolution.changeKind is required'
      };
    }

    if (!EC_CHANGE_KINDS.includes(plan.evolution.changeKind)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.INVALID_CHANGE_KIND,
        reason: `evolution.changeKind must be one of ${EC_CHANGE_KINDS.join('|')}`
      };
    }

    if (plan.evolution.changeKind === 'BREAKING') {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.BREAKING_CHANGE_DENIED,
        reason: 'BREAKING evolution is denied. Sealed DENY receipt required — PASS only for compatible evolution.'
      };
    }

    if (plan.evolution.changeKind === 'RENAME_FORBIDDEN') {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.RENAME_FORBIDDEN_DENIED,
        reason: 'RENAME_FORBIDDEN evolution is denied. Sealed DENY receipt required — PASS only for compatible evolution.'
      };
    }

    if (!EC_COMPATIBLE_CHANGE_KINDS.includes(plan.evolution.changeKind)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.INVALID_CHANGE_KIND,
        reason: 'Only COMPATIBLE / ADD_OPTIONAL_FIELD may PASS; BREAKING / RENAME_FORBIDDEN seal DENY.'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EC_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    void EC_DENIED_CHANGE_KINDS;

    return {
      ok: true,
      decision: 'PASS',
      code: EC_CODES.OK,
      reason: 'Plan satisfies all domain-event compatibility preconditions (≠ schema JSON ≠ network write ≠ tip-refresh).'
    };
  }
}

void EC_PRODUCTION_READY;
void EC_FREEZE_PIN_SHORT;
