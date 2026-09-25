/**
 * @module policy-pack-binding-policy-gate
 * SPEC-0152 / Mission EP — Policy Gate for Sovereign Policy-Pack Binding & Evaluation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 75131386 (do NOT rewrite tip pins)
 *   Toggle:
 *     - Requires binding with packId + bindingClass + desiredBinding (BOUND|UNBOUND|HOLD)
 *     - Optional observedBinding (hermetic injected flag state)
 *     - authorized must be true for PASS; fail-closed DENY when unauthorized
 *   Fail-closed DENY when hermetic pack-binding claim invalid or unauthorized
 *   Distinct from EO feature-flag / FDIR trip — fold killswitch into fail-closed
 *     binding governance; do NOT reopen DX circuit breaker as the axis / make feature-flag the pack port
 *   Distinct from EJ/EK/EL/EM (admission/backpressure) and EH (temporal honesty)
 *   Refuse live remote policy engines / wall-clock authority
 *   Refuse PRODUCTION_READY flip
 *   Refuse L30 / L31 / L32 / L33 / L34 / L35 / L36 reopen
 *   Refuse L37 auto-close (EQ–ES pending)
 *   Refuse tip-pin rewrite / tip-refresh
 *   Refuse secrets / GHE / CloudAgent
 *   Refuse schema-json add
 *   schemas AT_CEILING 35/35
 */

import {
  EP_PRODUCTION_READY,
  EP_FREEZE_PIN_SHORT,
  EP_BINDING_STATES
} from './policy-pack-binding-receipt.js';

/** @type {'NO'} */
export const EP_POLICY_GATE_PRODUCTION_READY = 'NO';
export const EP_POLICY_GATE_KIND = 'eos-policy-pack-binding-policy-gate';

export const EP_RITUAL_PHASES = Object.freeze([
  'PREFLIGHT',
  'PACK_INSPECT',
  'PACK_SEAL',
  'BINDING_SEAL',
  'SEAL'
]);

export const EP_CODES = Object.freeze({
  OK: 'OK',
  PASS: 'PASS',
  DENY: 'DENY',
  HOLD: 'HOLD',
  BINDING_UNAUTHORIZED: 'BINDING_UNAUTHORIZED',
  INVALID_BINDING_CLAIM: 'INVALID_BINDING_CLAIM',
  MISSING_PLAN_ID: 'MISSING_PLAN_ID',
  MISSING_CHANGE_ID: 'MISSING_CHANGE_ID',
  MISSING_BINDING: 'MISSING_BINDING',
  INVALID_BINDING: 'INVALID_BINDING',
  MISSING_PACK_ID: 'MISSING_PACK_ID',
  MISSING_BINDING_CLASS: 'MISSING_BINDING_CLASS',
  MISSING_DESIRED_BINDING: 'MISSING_DESIRED_BINDING',
  INVALID_DESIRED_BINDING: 'INVALID_DESIRED_BINDING',
  INVALID_OBSERVED_BINDING: 'INVALID_OBSERVED_BINDING',
  REMOTE_POLICY_ENGINE_FORBIDDEN: 'REMOTE_POLICY_ENGINE_FORBIDDEN',
  WALL_CLOCK_AUTHORITY_FORBIDDEN: 'WALL_CLOCK_AUTHORITY_FORBIDDEN',
  EO_FEATURE_FLAG_AS_PACK_FORBIDDEN: 'EO_FEATURE_FLAG_AS_PACK_FORBIDDEN',
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

const REMOTE_POLICY_ENGINE_PATTERNS = [
  /\blive\s+remote\s+policy\s+engine\b/i,
  /\bremote\s+policy\s+engine\b/i,
  /\bopa\s+live\b/i,
  /\bcedar\s+remote\b/i,
  /\blive\s+policy\s+sidecar\b/i,
  /\bclaim(?:ing)?\s+(?:live\s+)?remote\s+policy\s+engine/i,
  /\bbind\s+remote\s+policy(?:\s+engine)?\b/i
];

const WALL_CLOCK_AUTHORITY_PATTERNS = [
  /\bwall[-_]?clock\s+authority\b/i,
  /\bwall[-_]?clock\s+rollout\s+authority\b/i,
  /\bDate\.now\s+as\s+(?:rollout\s+)?authority\b/i,
  /\blive\s+wall[-_]?clock\b/i,
  /\bclaim(?:ing)?\s+wall[-_]?clock(?:\s+authority|\s+rollout)?/i,
  /\bpercent\s+(?:rollout|bind)\s+by\s+wall[-_]?clock\b/i
];

const EO_FEATURE_FLAG_AS_PACK_PATTERNS = [
  /\bmake\s+feature-flag\s+the\s+pack\s+port\b/i,
  /\bfeature-flag\s+as\s+(?:the\s+)?pack\s+port\b/i,
  /\belevate\s+feature-flag\s+(?:to\s+)?pack\s+port\b/i,
  /\beo\s+binding\s+as\s+pack\b/i,
  /\bkillswitch\s+as\s+(?:the\s+)?port\b/i
];

const DX_CIRCUIT_BREAKER_AS_AXIS_PATTERNS = [
  /\belevate\s+dx\s+circuit\s+breaker\s+as\s+axis\b/i,
  /\bdx\s+circuit\s+breaker\s+as\s+(?:the\s+)?axis\b/i,
  /\breopen\s+dx\s+breaker\s+as\s+pack\b/i,
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

export function claimsRemotePolicyEngine(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return REMOTE_POLICY_ENGINE_PATTERNS.some((pat) => pat.test(str));
}

export function claimsWallClockAuthority(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return WALL_CLOCK_AUTHORITY_PATTERNS.some((pat) => pat.test(str));
}

export function claimsEoFeatureFlagAsPack(val) {
  if (!val) return false;
  const str = stringifySafe(val);
  return EO_FEATURE_FLAG_AS_PACK_PATTERNS.some((pat) => pat.test(str));
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

export function isValidBindingState(value) {
  return typeof value === 'string' && EP_BINDING_STATES.includes(value);
}

export class PolicyPackBindingPolicyGate {
  /**
   * Evaluates preconditions for the policy-pack binding/evaluation ritual
   * @param {object} plan
   * @returns {{ ok: boolean, decision: string, code: string, reason: string }}
   */
  evaluatePreconditions(plan = {}) {
    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.DENY,
        reason: 'Invalid plan: input must be an object'
      };
    }

    if (!plan.planId || typeof plan.planId !== 'string' || !plan.planId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.MISSING_PLAN_ID,
        reason: 'Missing planId in input'
      };
    }

    if (!plan.changeId || typeof plan.changeId !== 'string' || !plan.changeId.trim()) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.MISSING_CHANGE_ID,
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
        code: EP_CODES.FUNDACION_DENIED,
        reason: 'Target path references Fundacion. Write barrier FUNDACION_ALWAYS_DENY is absolute (Delta=0).'
      };
    }

    const planClean = stripReceipts(plan);

    if (scanForSecrets(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.SECRET_LEAK_FORBIDDEN,
        reason: 'Plan contains potential plain secret token. Law VI absolute rejection.'
      };
    }

    if (plan.forceDelete === true || plan.purge === true || plan.hardDelete === true || claimsHardDelete(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.HARD_DELETE_FORBIDDEN,
        reason: 'Hard delete / purge operations are strictly forbidden in EOS governance.'
      };
    }

    if (plan.massPrune === true || claimsMassPrune(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.MASS_PRUNE_FORBIDDEN,
        reason: 'Mass prune operations are strictly forbidden.'
      };
    }

    if (plan.productionReady === 'YES' || claimsProductionReadyFlip(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.PRODUCTION_READY_FLIP_FORBIDDEN,
        reason: 'Attempted to flip PRODUCTION_READY to YES. Permitted status is NO only.'
      };
    }

    if (claimsL30Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L30_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 30. Ladders 30–36 are permanently CLOSED — NEVER reopen L30–L36.'
      };
    }

    if (claimsL31Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L31_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 31. Ladder 31 is permanently CLOSED — NEVER reopen L31.'
      };
    }

    if (claimsL32Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L32_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 32. Ladder 32 is permanently CLOSED — NEVER reopen L32.'
      };
    }

    if (claimsL33Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L33_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 33. Ladder 33 is permanently CLOSED — NEVER reopen L33.'
      };
    }

    if (claimsL34Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L34_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 34. Ladder 34 is permanently CLOSED — NEVER reopen L34.'
      };
    }

    if (claimsL35Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L35_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 35. Ladder 35 is permanently CLOSED — NEVER reopen L35.'
      };
    }

    if (claimsL36Reopen(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L36_REOPEN_FORBIDDEN,
        reason: 'Attempted to reopen Ladder 36. Ladder 36 is permanently CLOSED — NEVER reopen L36.'
      };
    }

    if (claimsL37AutoClose(planClean)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.L37_AUTO_CLOSE_FORBIDDEN,
        reason: 'Premature or automatic closeout of Ladder 37 is forbidden. EO MEASURED; EP this satellite; EQ–ES pending.'
      };
    }

    if (claimsTipRewrite(planClean) || plan.rewriteFreezeTip === true || plan.tipRefresh === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.TIP_REWRITE_FORBIDDEN,
        reason: 'Modifying historical git tip / freeze tip pins / EXPECTED_TIP from this mission is strictly forbidden (soft-observe only). Tip-refresh post-EP is SEPARATE.'
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
        code: EP_CODES.SCHEMA_JSON_ADD_FORBIDDEN,
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
        code: EP_CODES.NETWORK_WRITE_FORBIDDEN,
        reason: 'Network write / remote dispatch is refused. PASS ≠ network write. Hermetic in-memory only.'
      };
    }

    if (claimsGhe(planClean) || plan.claimGhe === true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.GHE_CLAIM_FORBIDDEN,
        reason: 'GHE / enterprise enforcement claims are refused.'
      };
    }

    if (
      plan.remotePolicyEngine === true ||
      plan.liveRemotePolicyEngine === true ||
      claimsRemotePolicyEngine(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.REMOTE_POLICY_ENGINE_FORBIDDEN,
        reason: 'Live remote policy engine is refused. PASS seals hermetic policy-pack binding receipt only — inject observedBinding; do not bind live remote policy engines.'
      };
    }

    if (
      plan.wallClockAuthority === true ||
      claimsWallClockAuthority(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.WALL_CLOCK_AUTHORITY_FORBIDDEN,
        reason: 'Wall-clock rollout authority is refused. Inject observedBinding hermetically; do not use Date.now as authority.'
      };
    }

    if (
      plan.eoFeatureFlagAsPack === true ||
      plan.eoToggleAsPackPort === true ||
      claimsEoFeatureFlagAsPack(planClean)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.EO_FEATURE_FLAG_AS_PACK_FORBIDDEN,
        reason: 'EO feature-flag as the pack port is refused. EP is policy-pack bind+evaluate — do NOT elevate EO flag flips as the pack port.'
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
        code: EP_CODES.DX_CIRCUIT_BREAKER_AS_AXIS_FORBIDDEN,
        reason: 'FDIR trip as L37 axis is refused. Fold narrowly into EO emergency-override semantics; do NOT reopen DX circuit breaker as the axis.'
      };
    }

    if (plan.ritualMode === 'HOLD') {
      return {
        ok: true,
        decision: 'HOLD',
        code: EP_CODES.HOLD,
        reason: 'Plan is in HOLD mode: zero mutations allowed; freeze soft-observe only.'
      };
    }

    if (!plan.binding) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.MISSING_BINDING,
        reason: 'Missing binding in active ritual mode'
      };
    }

    if (typeof plan.binding !== 'object' || Array.isArray(plan.binding)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.INVALID_BINDING,
        reason: 'binding must be a non-null object'
      };
    }

    if (
      !plan.binding.packId ||
      typeof plan.binding.packId !== 'string' ||
      !plan.binding.packId.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.MISSING_PACK_ID,
        reason: 'binding.packId is required'
      };
    }

    if (
      !plan.binding.bindingClass ||
      typeof plan.binding.bindingClass !== 'string' ||
      !plan.binding.bindingClass.trim()
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.MISSING_BINDING_CLASS,
        reason: 'binding.bindingClass is required'
      };
    }

    if (
      plan.binding.desiredBinding === undefined ||
      plan.binding.desiredBinding === null ||
      plan.binding.desiredBinding === ''
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.MISSING_DESIRED_BINDING,
        reason: 'binding.desiredBinding is required (BOUND|UNBOUND|HOLD)'
      };
    }

    if (!isValidBindingState(plan.binding.desiredBinding)) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.INVALID_DESIRED_BINDING,
        reason: 'binding.desiredBinding must be one of BOUND|UNBOUND|HOLD'
      };
    }

    if (
      plan.binding.observedBinding !== undefined &&
      plan.binding.observedBinding !== null &&
      !isValidBindingState(plan.binding.observedBinding)
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.INVALID_OBSERVED_BINDING,
        reason: 'binding.observedBinding must be one of BOUND|UNBOUND|HOLD when provided (hermetic injection)'
      };
    }

    if (plan.binding.authorized !== true) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.BINDING_UNAUTHORIZED,
        reason:
          'Fail-closed binding DENY — hermetic pack-binding claim unauthorized (≠ EO feature-flag port; ≠ EJ admission; ≠ DX circuit breaker).'
      };
    }

    if (
      plan.binding.observedBinding !== undefined &&
      plan.binding.observedBinding !== null &&
      plan.binding.observedBinding !== plan.binding.desiredBinding
    ) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.INVALID_BINDING_CLAIM,
        reason:
          'Fail-closed binding DENY — hermetic observedBinding mismatches desiredBinding (invalid pack-binding claim).'
      };
    }

    if (plan.autoSeal === true && !plan.humanGateHeld) {
      return {
        ok: false,
        decision: 'DENY',
        code: EP_CODES.AUTO_SEAL_FORBIDDEN,
        reason: 'Auto-seal is forbidden without human gate holding.'
      };
    }

    return {
      ok: true,
      decision: 'PASS',
      code: EP_CODES.OK,
      reason:
        'Plan satisfies all policy-pack-binding governance preconditions (≠ EO flag port ≠ FDIR axis ≠ remote policy engine ≠ tip-refresh ≠ PRODUCTION_READY).'
    };
  }
}

void EP_PRODUCTION_READY;
void EP_FREEZE_PIN_SHORT;
