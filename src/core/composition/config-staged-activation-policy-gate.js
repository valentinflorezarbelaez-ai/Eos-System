/**
 * @module config-staged-activation-policy-gate
 * SPEC-0153 / Mission EQ — Policy Gate for Config Change / Staged Activation Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 748000c3 (do NOT rewrite tip pins)
 *   Activation:
 *     - Requires activation with configKey + activationClass + desiredStage
 *       (STAGED|CANARY|FULL|HOLD|ROLLBACK_HOLD)
 *     - Optional observedActivation (hermetic injected stage claim)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Fail-closed DENY when hermetic stage claim invalid or unauthorized
 *   Distinct from EO feature-flag toggle / EP policy-pack binding
 *   Distinct from EJ/EK admission/backpressure, EG schedule wake, EH temporal honesty
 *   Fold emergency-override narrowly; do NOT reopen FDIR/DX as the axis
 *   Refuse live unsupervised mutation / wall-clock authority / remote config push
 *   Refuse tip-refresh authority / tip-pin rewrite
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 / L34 / L35 / L36 reopen
 *   Refuse L37 auto-close (ER–ES pending)
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EQ_PRODUCTION_READY,
  EQ_FREEZE_PIN_SHORT,
  EQ_STAGE_STATES
} from './config-staged-activation-receipt.js';

/** @type {'NO'} */
export const EQ_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EQ_POLICY_GATE_KIND = 'eos-config-staged-activation-policy-gate';

export const EQ_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'STAGE_INSPECT',
  'STAGE_SEAL',
  'ACTIVATION_SEAL',
  'SEAL'
]);

export const EQ_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  ACTIVATION_UNAUTHORIZED: 'ACTIVATION_UNAUTHORIZED',
  INVALID_ACTIVATION_CLAIM: 'INVALID_ACTIVATION_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_ACTIVATION: 'MISSING_ACTIVATION',
  INVALID_ACTIVATION: 'INVALID_ACTIVATION',
  MISSING_CONFIG_KEY: 'MISSING_CONFIG_KEY',
  MISSING_ACTIVATION_CLASS: 'MISSING_ACTIVATION_CLASS',
  MISSING_DESIRED_STAGE: 'MISSING_DESIRED_STAGE',
  INVALID_DESIRED_STAGE: 'INVALID_DESIRED_STAGE',
  INVALID_OBSERVED_ACTIVATION: 'INVALID_OBSERVED_ACTIVATION',
  REMOTE_CONFIG_PUSH_FORBIDDEN: 'REMOTE_CONFIG_PUSH_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  LIVE_UNSUPERVISED_MUTATION_FORBIDDEN: 'LIVE_UNSUPERVISED_MUTATION_FORBIDDEN',
  TIP_REFRESH_AUTHORITY_FORBIDDEN: 'TIP_REFRESH_AUTHORITY_FORBIDDEN',
  EO_FEATURE_FLAG_AS_ACTIVATION_FORBIDDEN: 'EO_FEATURE_FLAG_AS_ACTIVATION_FORBIDDEN',
  EP_POLICY_PACK_AS_ACTIVATION_FORBIDDEN: 'EP_POLICY_PACK_AS_ACTIVATION_FORBIDDEN',
  DX_CIRCUIT_BREAKER_AS_AXIS_FORBIDDEN: 'DX_CIRCUIT_BREAKER_AS_AXIS_FORBIDDEN',
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
  L36_REOPEN_FORBIDDEN: 'L36_REOPEN_FORBIDDEN',
  L37_AUTO_CLOSE_FORBIDDEN: 'L37_AUTO_CLOSE_FORBIDDEN',
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

const L36_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*36/i,
  /l(?:adder)?[\s_-]*36\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*36/i
];

const L37_AUTO_CLOSE_PATTERNS = [
  /auto(?:matic)?[-_\s]?close\s+l(?:adder)?[\s_-]*37/i,
  /l(?:adder)?[\s_-]*37\s+auto[-_\s]?close/i,
  /premature(?:ly)?\s+seal\s+l(?:adder)?[\s_-]*37/i,
  /close\s+l(?:adder)?[\s_-]*37\s+now/i
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

const REMOTE_CONFIG_PUSH_PATTERNS = [
  /\blive\s+remote\s+config\s+push\b/i,
  /\bremote\s+config\s+push\b/i,
  /\bpush\s+remote\s+config\b/i,
  /\blive\s+config\s+sidecar\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?remote\s+config\s+push/i,
  /\bbind\s+remote\s+config(?:\s+push)?\b/i
];

const WALL_CLOCK_AUTHORITY_PATTERNS = [
  /\bwall[-_]?clock\s+authority\b/i,
  /\bwall[-_]?clock\s+rollout\s+authority\b/i,
  /\bDate\.now\s+as\s+(?:rollout\s+)?authority\b/i,
  /\blive\s+wall[-_]?clock\b/i,
  /\bclaim(?:ing)?\s+wall[-_]?clock(?:\s+authority|\s+rollout)?/i,
  /\bstage\s+(?:rollout|activation)\s+by\s+wall[-_]?clock\b/i
];

const LIVE_UNSUPERVISED_MUTATION_PATTERNS = [
  /\blive\s+unsupervised\s+mutation\b/i,
  /\bunsupervised\s+(?:config\s+)?mutation\b/i,
  /\blive\s+config\s+mutation\b/i,
  /\bmutate\s+live\s+config\b/i,
  /\bclaim(?:ing)?\s+live\s+unsupervised\s+mutation/i
];

const TIP_REFRESH_AUTHORITY_PATTERNS = [
  /\btip[-_]?refresh\s+authority\b/i,
  /\btip[-_]?refresh\s+in\s+this\s+(?:pr|package|mission)\b/i,
  /\bclaim(?:ing)?\s+tip[-_]?refresh\b/i,
  /\brun\s+tip[-_]?refresh\s+now\b/i
];

const EO_FEATURE_FLAG_AS_ACTIVATION_PATTERNS = [
  /\bmake\s+feature-flag\s+the\s+activation\s+port\b/i,
  /\bfeature-flag\s+as\s+(?:the\s+)?activation\s+port\b/i,
  /\belevate\s+feature-flag\s+(?:to\s+)?staged\s+activation\b/i,
  /\beo\s+toggle\s+as\s+activation\b/i,
  /\bkillswitch\s+as\s+(?:the\s+)?activation\s+port\b/i
];

const EP_POLICY_PACK_AS_ACTIVATION_PATTERNS = [
  /\bmake\s+policy-pack\s+(?:binding\s+)?the\s+activation\s+port\b/i,
  /\bpolicy-pack\s+as\s+(?:the\s+)?activation\s+port\b/i,
  /\belevate\s+policy-pack\s+(?:to\s+)?staged\s+activation\b/i,
  /\bep\s+binding\s+as\s+activation\b/i
];

const DX_CIRCUIT_BREAKER_AS_AXIS_PATTERNS = [
  /\belevate\s+dx\s+circuit\s+breaker\s+as\s+axis\b/i,
  /\bdx\s+circuit\s+breaker\s+as\s+(?:the\s+)?axis\b/i,
  /\breopen\s+dx\s+breaker\s+as\s+activation\b/i,
  /\bfdir\s+trip\s+as\s+(?:the\s+)?axis\b/i,
  /\breopen\s+fdir\b/i
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

export function claimsL36Reopen(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L36_REOPEN_PATTERNS.some((pat) => pat.test(str));
}

export function claimsL37AutoClose(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return L37_AUTO_CLOSE_PATTERNS.some((pat) => pat.test(str));
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

export function claimsRemoteConfigPush(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return REMOTE_CONFIG_PUSH_PATTERNS.some((pat) => pat.test(str));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return WALL_CLOCK_AUTHORITY_PATTERNS.some((pat) => pat.test(str));
}

export function claimsLiveUnsupervisedMutation(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return LIVE_UNSUPERVISED_MUTATION_PATTERNS.some((pat) => pat.test(str));
}

export function claimsTipRefreshAuthority(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return TIP_REFRESH_AUTHORITY_PATTERNS.some((pat) => pat.test(str));
}

export function claimsEoFeatureFlagAsActivation(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return EO_FEATURE_FLAG_AS_ACTIVATION_PATTERNS.some((pat) => pat.test(str));
}

export function claimsEpPolicyPackAsActivation(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return EP_POLICY_PACK_AS_ACTIVATION_PATTERNS.some((pat) => pat.test(str));
}

export function claimsDxCircuitBreakerAsAxis(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return DX_CIRCUIT_BREAKER_AS_AXIS_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export function isValidStageState(value) {
  return typeof value === 'string' && EQ_STAGE_STATES.includes(value);
}

export class ConfigStagedActivationPolicyGate {
  /**
   * Evaluates preconditions for the staged-activation governance ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.MISSING_CHANGE_ID,
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
        code: EQ_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–36 are permanently CLOSED — NEVER reopen L30–L36.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.L37_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 37 is forbidden. EO+EP MEASURED; EQ this satellite; ER–ES pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-EQ is SEPARATE.'
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
        code: EQ_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EQ_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.remoteConfigPush === true ||
      plan.liveRemoteConfigPush === true ||
      claimsRemoteConfigPush(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.REMOTE_CONFIG_PUSH_FORBIDDEN,
        reason: 'Live remote config push is refused. PASS seals hermetic staged-activation receipt only — inject observedActivation; do not push live remote config.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock authority is refused. Inject observedActivation hermetically; do not use Date.now as authority.'
      };
    }

    if (
      plan.liveUnsupervisedMutation === true ||
      claimsLiveUnsupervisedMutation(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.LIVE_UNSUPERVISED_MUTATION_FORBIDDEN,
        reason: 'Live unsupervised mutation is refused. Hermetic staged-activation seal only.'
      };
    }

    if (
      plan.tipRefreshAuthority === true ||
      claimsTipRefreshAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.TIP_REFRESH_AUTHORITY_FORBIDDEN,
        reason: 'Tip-refresh authority is refused in this mission package. Tip-refresh post-EQ is SEPARATE.'
      };
    }

    if (
      plan.eoFeatureFlagAsActivation === true ||
      plan.eoToggleAsActivationPort === true ||
      claimsEoFeatureFlagAsActivation(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.EO_FEATURE_FLAG_AS_ACTIVATION_FORBIDDEN,
        reason: 'EO feature-flag as the activation port is refused. EQ is staged activation — do NOT elevate EO flag flips as the activation port.'
      };
    }

    if (
      plan.epPolicyPackAsActivation === true ||
      claimsEpPolicyPackAsActivation(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.EP_POLICY_PACK_AS_ACTIVATION_FORBIDDEN,
        reason: 'EP policy-pack binding as the activation port is refused. EQ is staged activation — distinct from EP pack bind+evaluate.'
      };
    }

    if (
      plan.dxCircuitBreakerAsAxis === true ||
      plan.elevateDxCircuitBreaker === true ||
      claimsDxCircuitBreakerAsAxis(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.DX_CIRCUIT_BREAKER_AS_AXIS_FORBIDDEN,
        reason: 'FDIR trip as L37 axis is refused. Fold emergency-override narrowly into fail-closed staged activation; do NOT reopen FDIR/DX as the axis.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EQ_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.activation) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.MISSING_ACTIVATION,
        reason: 'Missing activation in active ritual mode'
      };
    }

    if (typeof plan.activation !== 'object' || Array.isArray(plan.activation)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.INVALID_ACTIVATION,
        reason: 'activation must be a non-null object'
      };
    }

    if (
      !plan.activation.configKey ||
      typeof plan.activation.configKey !== 'string' ||
      !plan.activation.configKey.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.MISSING_CONFIG_KEY,
        reason: 'activation.configKey is required'
      };
    }

    if (
      !plan.activation.activationClass ||
      typeof plan.activation.activationClass !== 'string' ||
      !plan.activation.activationClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.MISSING_ACTIVATION_CLASS,
        reason: 'activation.activationClass is required'
      };
    }

    if (
      plan.activation.desiredStage === undefined ||
      plan.activation.desiredStage === null ||
      plan.activation.desiredStage === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.MISSING_DESIRED_STAGE,
        reason: 'activation.desiredStage is required (STAGED|CANARY|FULL|HOLD|ROLLBACK_HOLD)'
      };
    }

    if (!isValidStageState(plan.activation.desiredStage)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.INVALID_DESIRED_STAGE,
        reason: 'activation.desiredStage must be one of STAGED|CANARY|FULL|HOLD|ROLLBACK_HOLD'
      };
    }

    if (
      plan.activation.observedActivation !== undefined &&
      plan.activation.observedActivation !== null &&
      !isValidStageState(plan.activation.observedActivation)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.INVALID_OBSERVED_ACTIVATION,
        reason: 'activation.observedActivation must be one of STAGED|CANARY|FULL|HOLD|ROLLBACK_HOLD when provided (hermetic injection)'
      };
    }

    if (plan.activation.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.ACTIVATION_UNAUTHORIZED,
        reason:
          'Fail-closed activation DENY — hermetic stage claim unauthorized (≠ EO feature-flag port; ≠ EP pack port; ≠ EJ admission; ≠ DX circuit breaker).'
      };
    }

    if (
      plan.activation.observedActivation !== undefined &&
      plan.activation.observedActivation !== null &&
      plan.activation.observedActivation !== plan.activation.desiredStage
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.INVALID_ACTIVATION_CLAIM,
        reason:
          'Fail-closed activation DENY — hermetic observedActivation mismatches desiredStage (invalid stage claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EQ_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EQ_CODES.OK,
      reason:
        'Plan satisfies all staged-activation governance preconditions (≠ EO flag port ≠ EP pack port ≠ FDIR axis ≠ remote config push ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EQ_PRODUCTION_READY;
void EQ_FREEZE_PIN_SHORT;
