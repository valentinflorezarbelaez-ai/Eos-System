/**
 * @module dead-letter-quarantine-policy-gate
 * SPEC-0138 / Mission EB — Policy Gate for Dead-Letter Quarantine Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 037f9578 (do NOT rewrite tip pins)
 *   Quarantine:
 *     - Requires quarantine with messageId + poisonReason + sourceConsumer + attemptCount
 *     - Optional payloadDigest + disposition (hermetic in-memory seal only)
 *   Refuse silent drop / unsupervised retry
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 reopen
 *   Refuse L34 auto-close
 *   Refuse tip-pin rewrite
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EB_PRODUCTION_READY,
  EB_FREEZE_PIN_SHORT
} from './dead-letter-quarantine-receipt.js';

/** @type {'NO'} */
export const EB_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EB_POLICY_GATE_KIND = 'eos-dead-letter-quarantine-policy-gate';

export const EB_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'QUARANTINE_INSPECT',
  'APPLY_SEAL',
  'DISPOSITION_SEAL',
  'SEAL'
]);

export const EB_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_QUARANTINE: 'MISSING_QUARANTINE',
  INVALID_QUARANTINE: 'INVALID_QUARANTINE',
  MISSING_MESSAGE_ID: 'MISSING_MESSAGE_ID',
  MISSING_POISON_REASON: 'MISSING_POISON_REASON',
  MISSING_SOURCE_CONSUMER: 'MISSING_SOURCE_CONSUMER',
  INVALID_ATTEMPT_COUNT: 'INVALID_ATTEMPT_COUNT',
  SILENT_DROP_FORBIDDEN: 'SILENT_DROP_FORBIDDEN',
  UNSUPERVISED_RETRY_FORBIDDEN: 'UNSUPERVISED_RETRY_FORBIDDEN',
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
  LIVE_BROKER_WRITE_FORBIDDEN: 'LIVE_BROKER_WRITE_FORBIDDEN',
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

const SILENT_DROP_PATTERNS = [
  /\bsilent[-_]?drop\b/i,
  /\bsilently\s+drop\b/i,
  /\bdrop\s+(?:the\s+)?message\s+silently\b/i,
  /\bdiscard\s+without\s+(?:receipt|audit|trace)\b/i,
  /\bdrop\s+poison\s+quietly\b/i,
  /\bno[-_]?log\s+drop\b/i
];

const UNSUPERVISED_RETRY_PATTERNS = [
  /\bunsupervised[-_]?retry\b/i,
  /\bunsupervised\s+retry\b/i,
  /\bretry\s+without\s+(?:governance|gate|receipt)\b/i,
  /\binfinite[-_]?retry\b/i,
  /\bunbounded[-_]?retry\b/i,
  /\bauto[-_]?retry\s+forever\b/i,
  /\bretry\s+loop\s+without\s+quarantine\b/i
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

const LIVE_BROKER_PATTERNS = [
  /\blive\s+broker\s+write\b/i,
  /\bwrite\s+to\s+(?:live\s+)?(?:kafka|rabbitmq|sqs|pubsub)\b/i,
  /\bmutate\s+live\s+(?:queue|broker|topic)\b/i,
  /\bproduction\s+broker\s+dispatch\b/i
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

export function claimsSilentDrop(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return SILENT_DROP_PATTERNS.some((pat) => pat.test(str));
}

export function claimsUnsupervisedRetry(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return UNSUPERVISED_RETRY_PATTERNS.some((pat) => pat.test(str));
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

export function claimsLiveBrokerWrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return LIVE_BROKER_PATTERNS.some((pat) => pat.test(str));
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

export class DeadLetterQuarantinePolicyGate {
  /**
   * Evaluates preconditions for the dead-letter quarantine ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.MISSING_CHANGE_ID,
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
        code: EB_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–33 are permanently CLOSED — NEVER reopen L30–L33.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.L34_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 34 is forbidden. EB–ED pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only).'
      };
    }

    if (
      plan.silentDrop === true ||
      plan.dropSilently === true ||
      claimsSilentDrop(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.SILENT_DROP_FORBIDDEN,
        reason: 'Silent drop of poison messages is forbidden. Fail-closed quarantine with EB-RCPT-* receipt is mandatory.'
      };
    }

    if (
      plan.unsupervisedRetry === true ||
      plan.infiniteRetry === true ||
      claimsUnsupervisedRetry(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.UNSUPERVISED_RETRY_FORBIDDEN,
        reason: 'Unsupervised / unbounded retry is forbidden. Exhausted messages must enter governed quarantine.'
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
        code: EB_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EB_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (
      plan.liveBrokerWrite === true ||
      plan.writeLiveBroker === true ||
      claimsLiveBrokerWrite(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.LIVE_BROKER_WRITE_FORBIDDEN,
        reason: 'Live broker write is refused. Disposition seals hermetic in-memory quarantine receipt only — not a live broker.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EB_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.quarantine) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.MISSING_QUARANTINE,
        reason: 'Missing quarantine in active ritual mode'
      };
    }

    if (typeof plan.quarantine !== 'object' || Array.isArray(plan.quarantine)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.INVALID_QUARANTINE,
        reason: 'quarantine must be a non-null object'
      };
    }

    if (
      !plan.quarantine.messageId ||
      typeof plan.quarantine.messageId !== 'string' ||
      !plan.quarantine.messageId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.MISSING_MESSAGE_ID,
        reason: 'quarantine.messageId is required'
      };
    }

    if (
      !plan.quarantine.poisonReason ||
      typeof plan.quarantine.poisonReason !== 'string' ||
      !plan.quarantine.poisonReason.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.MISSING_POISON_REASON,
        reason: 'quarantine.poisonReason is required'
      };
    }

    if (
      !plan.quarantine.sourceConsumer ||
      typeof plan.quarantine.sourceConsumer !== 'string' ||
      !plan.quarantine.sourceConsumer.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.MISSING_SOURCE_CONSUMER,
        reason: 'quarantine.sourceConsumer is required'
      };
    }

    if (
      typeof plan.quarantine.attemptCount !== 'number' ||
      !Number.isFinite(plan.quarantine.attemptCount) ||
      plan.quarantine.attemptCount < 1
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.INVALID_ATTEMPT_COUNT,
        reason: 'quarantine.attemptCount must be a finite number >= 1'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EB_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EB_CODES.OK,
      reason: 'Plan satisfies all dead-letter quarantine preconditions (≠ silent drop ≠ unsupervised retry ≠ network write).'
    };
  }
}

void EB_PRODUCTION_READY;
void EB_FREEZE_PIN_SHORT;
