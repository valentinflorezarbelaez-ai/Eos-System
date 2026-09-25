/**
 * @module feature-flag-runtime-toggle-policy-gate
 * SPEC-0151 / Mission EO — Policy Gate for Sovereign Feature-Flag & Runtime Toggle Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin f333afaf (do NOT rewrite tip pins)
 *   Toggle:
 *     - Requires toggle with flagKey + toggleClass + desiredState (ON|OFF|HOLD)
 *     - Optional observedState (hermetic injected flag state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Fail-closed DENY when hermetic flag/toggle claim invalid or unauthorized
 *   Distinct from sentinel-killswitch / FDIR trip — fold killswitch into fail-closed
 *     toggle governance; do NOT reopen FDIR as the axis / make killswitch the port
 *   Distinct from EJ/EK/EL/EM (admission/backpressure) and EH (temporal honesty)
 *   Refuse live remote config SDKs / wall-clock rollout authority
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 / L34 / L35 / L36 reopen
 *   Refuse L37 auto-close (EP–ES pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EO_PRODUCTION_READY,
  EO_FREEZE_PIN_SHORT,
  EO_FLAG_STATES
} from './feature-flag-runtime-toggle-receipt.js';

/** @type {'NO'} */
export const EO_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EO_POLICY_GATE_KIND = 'eos-feature-flag-runtime-toggle-policy-gate';

export const EO_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'TOGGLE_INSPECT',
  'FLAG_SEAL',
  'TOGGLE_SEAL',
  'SEAL'
]);

export const EO_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  TOGGLE_UNAUTHORIZED: 'TOGGLE_UNAUTHORIZED',
  INVALID_TOGGLE_CLAIM: 'INVALID_TOGGLE_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_TOGGLE: 'MISSING_TOGGLE',
  INVALID_TOGGLE: 'INVALID_TOGGLE',
  MISSING_FLAG_KEY: 'MISSING_FLAG_KEY',
  MISSING_TOGGLE_CLASS: 'MISSING_TOGGLE_CLASS',
  MISSING_DESIRED_STATE: 'MISSING_DESIRED_STATE',
  INVALID_DESIRED_STATE: 'INVALID_DESIRED_STATE',
  INVALID_OBSERVED_STATE: 'INVALID_OBSERVED_STATE',
  REMOTE_CONFIG_SDK_FORBIDDEN: 'REMOTE_CONFIG_SDK_FORBIDDEN',
  WALL_CLOCK_ROLLOUT_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_ROLLOUT_AUTHORITY_FORBIDDEN',
  KILLSWITCH_AS_PORT_FORBIDDEN: 'KILLSWITCH_AS_PORT_FORBIDDEN',
  FDIR_TRIP_AS_AXIS_FORBIDDEN: 'FDIR_TRIP_AS_AXIS_FORBIDDEN',
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

const REMOTE_CONFIG_SDK_PATTERNS = [
  /\blive\s+remote\s+config\s+sdk\b/i,
  /\bremote\s+config\s+sdk\b/i,
  /\blaunchdarkly\b/i,
  /\bunleash\s+client\b/i,
  /\bflagsmith\b/i,
  /\bsplit\.io\b/i,
  /\boptimizely\s+sdk\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?remote\s+config/i,
  /\bbind\s+remote\s+config\b/i
];

const WALL_CLOCK_ROLLOUT_PATTERNS = [
  /\bwall[-_]?clock\s+rollout\s+authority\b/i,
  /\bDate\.now\s+as\s+rollout\s+authority\b/i,
  /\blive\s+wall[-_]?clock\s+rollout\b/i,
  /\bclaim(?:ing)?\s+wall[-_]?clock\s+rollout/i,
  /\bpercent\s+rollout\s+by\s+wall[-_]?clock\b/i
];

const KILLSWITCH_AS_PORT_PATTERNS = [
  /\bkillswitch\s+as\s+(?:the\s+)?port\b/i,
  /\bsentinel[-_]?killswitch\s+as\s+(?:the\s+)?port\b/i,
  /\bmake\s+killswitch\s+the\s+port\b/i,
  /\belevate\s+sentinel[-_]?killswitch\s+to\s+port\b/i,
  /\breopen\s+fdir\s+as\s+(?:the\s+)?axis\b/i
];

const FDIR_TRIP_AS_AXIS_PATTERNS = [
  /\bfdir\s+trip\s+as\s+(?:the\s+)?axis\b/i,
  /\breopen\s+fdir\b/i,
  /\belevate\s+fdir\s+trip\b/i,
  /\btripFdirKillSwitch\s+as\s+axis\b/i
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

export function claimsRemoteConfigSdk(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return REMOTE_CONFIG_SDK_PATTERNS.some((pat) => pat.test(str));
}

export function claimsWallClockRolloutAuthority(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return WALL_CLOCK_ROLLOUT_PATTERNS.some((pat) => pat.test(str));
}

export function claimsKillswitchAsPort(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return KILLSWITCH_AS_PORT_PATTERNS.some((pat) => pat.test(str));
}

export function claimsFdirTripAsAxis(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return FDIR_TRIP_AS_AXIS_PATTERNS.some((pat) => pat.test(str));
}

export function isFundacionTarget(target) {
  if (!target) return false;
  const str = stringifySafe(target);
  return /(?:Fundacion|fundacion)/i.test(str);
}

export function isValidFlagState(value) {
  return typeof value === 'string' && EO_FLAG_STATES.includes(value);
}

export class FeatureFlagRuntimeTogglePolicyGate {
  /**
   * Evaluates preconditions for the feature-flag / runtime-toggle ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.MISSING_CHANGE_ID,
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
        code: EO_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–36 are permanently CLOSED — NEVER reopen L30–L36.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.L37_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 37 is forbidden. EO first satellite; EP–ES pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-EO is SEPARATE.'
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
        code: EO_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EO_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.remoteConfigSdk === true ||
      plan.liveRemoteConfig === true ||
      claimsRemoteConfigSdk(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.REMOTE_CONFIG_SDK_FORBIDDEN,
        reason: 'Live remote config SDK is refused. PASS seals hermetic flag/toggle receipt only — inject observed flag state; do not bind live remote config SDKs.'
      };
    }

    if (
      plan.wallClockRolloutAuthority === true ||
      claimsWallClockRolloutAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.WALL_CLOCK_ROLLOUT_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock rollout authority is refused. Inject observedState hermetically; do not use Date.now as rollout authority.'
      };
    }

    if (
      plan.killswitchAsPort === true ||
      plan.sentinelKillswitchAsPort === true ||
      claimsKillswitchAsPort(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.KILLSWITCH_AS_PORT_FORBIDDEN,
        reason: 'Sentinel killswitch as the EO port is refused. Fold killswitch concerns into fail-closed toggle governance; do NOT make killswitch the port.'
      };
    }

    if (
      plan.fdirTripAsAxis === true ||
      plan.reopenFdir === true ||
      claimsFdirTripAsAxis(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.FDIR_TRIP_AS_AXIS_FORBIDDEN,
        reason: 'FDIR trip as L37 axis is refused. Fold narrowly into EO emergency-override semantics; do NOT reopen FDIR as the axis.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EO_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.toggle) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.MISSING_TOGGLE,
        reason: 'Missing toggle in active ritual mode'
      };
    }

    if (typeof plan.toggle !== 'object' || Array.isArray(plan.toggle)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.INVALID_TOGGLE,
        reason: 'toggle must be a non-null object'
      };
    }

    if (
      !plan.toggle.flagKey ||
      typeof plan.toggle.flagKey !== 'string' ||
      !plan.toggle.flagKey.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.MISSING_FLAG_KEY,
        reason: 'toggle.flagKey is required'
      };
    }

    if (
      !plan.toggle.toggleClass ||
      typeof plan.toggle.toggleClass !== 'string' ||
      !plan.toggle.toggleClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.MISSING_TOGGLE_CLASS,
        reason: 'toggle.toggleClass is required'
      };
    }

    if (
      plan.toggle.desiredState === undefined ||
      plan.toggle.desiredState === null ||
      plan.toggle.desiredState === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.MISSING_DESIRED_STATE,
        reason: 'toggle.desiredState is required (ON|OFF|HOLD)'
      };
    }

    if (!isValidFlagState(plan.toggle.desiredState)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.INVALID_DESIRED_STATE,
        reason: 'toggle.desiredState must be one of ON|OFF|HOLD'
      };
    }

    if (
      plan.toggle.observedState !== undefined &&
      plan.toggle.observedState !== null &&
      !isValidFlagState(plan.toggle.observedState)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.INVALID_OBSERVED_STATE,
        reason: 'toggle.observedState must be one of ON|OFF|HOLD when provided (hermetic injection)'
      };
    }

    if (plan.toggle.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.TOGGLE_UNAUTHORIZED,
        reason:
          'Fail-closed toggle DENY — hermetic flag/toggle claim unauthorized (≠ sentinel-killswitch port; ≠ FDIR trip axis).'
      };
    }

    if (
      plan.toggle.observedState !== undefined &&
      plan.toggle.observedState !== null &&
      plan.toggle.observedState !== plan.toggle.desiredState
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.INVALID_TOGGLE_CLAIM,
        reason:
          'Fail-closed toggle DENY — hermetic observedState mismatches desiredState (invalid flag/toggle claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EO_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EO_CODES.OK,
      reason:
        'Plan satisfies all feature-flag/runtime-toggle governance preconditions (≠ killswitch port ≠ FDIR axis ≠ remote config SDK ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EO_PRODUCTION_READY;
void EO_FREEZE_PIN_SHORT;
