/**
 * @module process-manager-saga-policy-gate
 * SPEC-0136 / Mission DZ — Policy Gate for Sovereign Process Manager / Saga Orchestration Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin b382d29b (do NOT rewrite tip pins)
 *   Process / saga:
 *     - Requires processInstance with processId + processType + step
 *     - Requires triggerEvent with eventType + aggregateId + non-empty payload
 *     - Optional compensationPlan (hermetic in-memory COMPENSATE only)
 *   Refuse dual-write / outbox mutation / schema-json add
 *   Refuse hard delete / mass prune
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 reopen
 *   Refuse L34 auto-close
 *   Refuse tip-pin rewrite
 *   Refuse secrets / GHE / CloudAgent
 *   schemas AT_CEILING 35/35
 */

import {
  DZ_PRODUCTION_READY,
  DZ_FREEZE_PIN_SHORT
} from './process-manager-saga-receipt.js';

/** @type {'NO'} */
export const DZ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DZ_POLICY_GATE_KIND = 'eos-process-manager-saga-policy-gate';

export const DZ_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'PROCESS_INSPECT',
  'STEP_SEAL',
  'COMPENSATE_SEAL',
  'SEAL'
]);

export const DZ_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  COMPENSATE: 'COMPENSATE',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_PROCESS_INSTANCE: 'MISSING_PROCESS_INSTANCE',
  INVALID_PROCESS_INSTANCE: 'INVALID_PROCESS_INSTANCE',
  MISSING_PROCESS_ID: 'MISSING_PROCESS_ID',
  MISSING_PROCESS_TYPE: 'MISSING_PROCESS_TYPE',
  MISSING_STEP: 'MISSING_STEP',
  MISSING_TRIGGER_EVENT: 'MISSING_TRIGGER_EVENT',
  INVALID_TRIGGER_EVENT: 'INVALID_TRIGGER_EVENT',
  MISSING_EVENT_TYPE: 'MISSING_EVENT_TYPE',
  MISSING_AGGREGATE_ID: 'MISSING_AGGREGATE_ID',
  EMPTY_EVENT_PAYLOAD: 'EMPTY_EVENT_PAYLOAD',
  DUAL_WRITE_FORBIDDEN: 'DUAL_WRITE_FORBIDDEN',
  OUTBOX_MUTATION_FORBIDDEN: 'OUTBOX_MUTATION_FORBIDDEN',
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

const DUAL_WRITE_PATTERNS = [
  /\bdual[-_]?write\b/i,
  /\bwrite\s+to\s+(?:db|database)\s+and\s+(?:queue|outbox|bus)\b/i,
  /\bsimultaneous\s+write\b/i,
  /\btwo[-_]?phase\s+write\s+chaos\b/i
];

const OUTBOX_MUTATION_PATTERNS = [
  /\boutbox\s+mutation\b/i,
  /\bmutate\s+outbox\b/i,
  /\boutbox\s+rewrite\b/i,
  /\bpatch\s+outbox\s+record\b/i,
  /\bDV[-_]?RCPT\b.*\bmutat/i
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

export function claimsDualWrite(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return DUAL_WRITE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsOutboxMutation(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return OUTBOX_MUTATION_PATTERNS.some((pat) => pat.test(str));
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

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export class ProcessManagerSagaPolicyGate {
  /**
   * Evaluates preconditions for the process manager / saga ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_CHANGE_ID,
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
        code: DZ_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–33 are permanently CLOSED — NEVER reopen L30–L33.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.L34_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 34 is forbidden. DZ–ED pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only).'
      };
    }

    if (
      plan.dualWrite === true ||
      plan.enableDualWrite === true ||
      claimsDualWrite(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.DUAL_WRITE_FORBIDDEN,
        reason: 'Dual-write chaos is forbidden. Mission DZ seals hermetic in-memory saga steps only.'
      };
    }

    if (
      plan.outboxMutation === true ||
      plan.mutateOutbox === true ||
      claimsOutboxMutation(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.OUTBOX_MUTATION_FORBIDDEN,
        reason: 'Outbox mutation is refused. Soft-observe DV outbox only; DZ does not mutate outbox records.'
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
        code: DZ_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: DZ_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: DZ_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.processInstance) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_PROCESS_INSTANCE,
        reason: 'Missing processInstance in active ritual mode'
      };
    }

    if (typeof plan.processInstance !== 'object' || Array.isArray(plan.processInstance)) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.INVALID_PROCESS_INSTANCE,
        reason: 'processInstance must be a non-null object'
      };
    }

    if (
      !plan.processInstance.processId ||
      typeof plan.processInstance.processId !== 'string' ||
      !plan.processInstance.processId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_PROCESS_ID,
        reason: 'processInstance.processId is required'
      };
    }

    if (
      !plan.processInstance.processType ||
      typeof plan.processInstance.processType !== 'string' ||
      !plan.processInstance.processType.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_PROCESS_TYPE,
        reason: 'processInstance.processType is required'
      };
    }

    if (
      plan.processInstance.step === undefined ||
      plan.processInstance.step === null ||
      (typeof plan.processInstance.step === 'string' && !plan.processInstance.step.trim())
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_STEP,
        reason: 'processInstance.step is required'
      };
    }

    if (!plan.processInstance.triggerEvent) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_TRIGGER_EVENT,
        reason: 'processInstance.triggerEvent is required'
      };
    }

    if (
      typeof plan.processInstance.triggerEvent !== 'object' ||
      Array.isArray(plan.processInstance.triggerEvent)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.INVALID_TRIGGER_EVENT,
        reason: 'processInstance.triggerEvent must be a non-null object'
      };
    }

    const triggerEvent = plan.processInstance.triggerEvent;

    if (
      !triggerEvent.eventType ||
      typeof triggerEvent.eventType !== 'string' ||
      !triggerEvent.eventType.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_EVENT_TYPE,
        reason: 'processInstance.triggerEvent.eventType is required'
      };
    }

    if (
      !triggerEvent.aggregateId ||
      typeof triggerEvent.aggregateId !== 'string' ||
      !triggerEvent.aggregateId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.MISSING_AGGREGATE_ID,
        reason: 'processInstance.triggerEvent.aggregateId is required'
      };
    }

    if (
      triggerEvent.payload === undefined ||
      triggerEvent.payload === null ||
      (typeof triggerEvent.payload === 'object' &&
        !Array.isArray(triggerEvent.payload) &&
        Object.keys(triggerEvent.payload).length === 0)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.EMPTY_EVENT_PAYLOAD,
        reason: 'processInstance.triggerEvent.payload must be a non-empty object'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: DZ_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    if (plan.requestCompensate === true || plan.compensate === true) {
      return {
        ok: true,
        decision: 'COMPENSATE',
        code: DZ_CODES.COMPENSATE,
        reason: 'Fail-closed COMPENSATE path: hermetic in-memory compensation receipt only (≠ network write).'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: DZ_CODES.OK,
      reason: 'Plan satisfies all process manager / saga preconditions (≠ dual-write ≠ network write).'
    };
  }
}

void DZ_PRODUCTION_READY;
void DZ_FREEZE_PIN_SHORT;
