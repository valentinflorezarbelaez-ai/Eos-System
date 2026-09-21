/**
 * @module mission-os-control-plane-honesty-policy-gate
 * SPEC-0108 / Mission CY — Policy Gate for Mission OS / Control-Plane L0 Residual Honesty.
 * Fail-closed plan validation: Fundacion barrier, Law VI secrets,
 * PRODUCTION_READY flip refuse, L27 reopen refuse, tip-pin rewrite refuse,
 * GHE claim refuse, auto-close L28 refuse, CZ start refuse,
 * missing planId/changeId/phase/honestyMode,
 * missing required CV+CW+CX observe labels (unless ack).
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 * NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 * ≠ GHE / ≠ L28 auto-close / ≠ CZ start / ≠ L27 reopen.
 */

import {
  sha256Canonical,
  CY_HONESTY_MODES,
  CY_REQUIRED_OBSERVE_PORTS,
  normalizeObservePortLabel
} from './mission-os-control-plane-honesty-receipt.js';

/** @type {'NO'} */
export const CY_POLICY_GATE_PRODUCTION_READY = 'NO';
export const CY_POLICY_GATE_KIND =
  'eos-mission-os-control-plane-honesty-policy-gate';
export const CY_MAX_REASONS = 64;
export const CY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CY_HONESTY_PHASES = Object.freeze([
  'compose_honesty_port',
  'observe_freeze_nonclaims',
  'soft_import_cv_cw_cx',
  'seal_receipt',
  'hold_observe',
  'runbook_fixture'
]);
/** Alias for CW/CX API compatibility. */
export const CY_RITUAL_PHASES = CY_HONESTY_PHASES;

export const CY_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',
  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_CHANGE_ID_DENY: 'MISSING_CHANGE_ID_DENY',
  MISSING_HONESTY_MODE_DENY: 'MISSING_HONESTY_MODE_DENY',
  INVALID_HONESTY_MODE_DENY: 'INVALID_HONESTY_MODE_DENY',
  MISSING_PHASE_DENY: 'MISSING_PHASE_DENY',
  INVALID_PHASE_DENY: 'INVALID_PHASE_DENY',
  MISSING_HONESTY_DIGEST_DENY: 'MISSING_HONESTY_DIGEST_DENY',
  INVALID_HONESTY_DIGEST_DENY: 'INVALID_HONESTY_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  WEAKEN_ALWAYS_DENY: 'WEAKEN_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  L27_REOPEN_CLAIM_DENY: 'L27_REOPEN_CLAIM_DENY',
  TIP_REWRITE_CLAIM_DENY: 'TIP_REWRITE_CLAIM_DENY',
  TIP_PIN_REWRITE_CLAIM_DENY: 'TIP_PIN_REWRITE_CLAIM_DENY',
  AUTO_SEAL_CLAIM_DENY: 'AUTO_SEAL_CLAIM_DENY',
  AUTO_SEAL_L28_CLAIM_DENY: 'AUTO_SEAL_L28_CLAIM_DENY',
  AUTO_CLOSE_L28_CLAIM_DENY: 'AUTO_CLOSE_L28_CLAIM_DENY',
  AUTO_PRODUCTION_FLIP_CLAIM_DENY: 'AUTO_PRODUCTION_FLIP_CLAIM_DENY',
  GHE_CLAIM_DENY: 'GHE_CLAIM_DENY',
  CZ_START_CLAIM_DENY: 'CZ_START_CLAIM_DENY',
  MISSING_REQUIRED_OBSERVE_LABELS_DENY: 'MISSING_REQUIRED_OBSERVE_LABELS_DENY',
  RESIDUAL_HONESTY_REFUSE_DENY: 'RESIDUAL_HONESTY_REFUSE_DENY',
  DENY: 'DENY',
  HOLD: 'HOLD'
});

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

const SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
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
const AUTO_SEAL_PATTERNS = [
  /auto[_ -]?seal/i,
  /automatic\s+seal/i,
  /seal\s+without\s+human/i,
  /unattended\s+seal/i
];
const AUTO_SEAL_L28_PATTERNS = [
  /auto[_ -]?seal\s+l(?:adder)?[\s_-]*28/i,
  /automatic\s+(?:close|seal|closeout)\s+l(?:adder)?[\s_-]*28/i,
  /unattended\s+l28\s+(?:seal|closeout)/i,
  /auto[_ -]?close\s+l(?:adder)?[\s_-]*28/i
];
const L27_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*27/i,
  /l(?:adder)?[\s_-]*27\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*27/i,
  /reopen\s+l1[7-9]|reopen\s+l2[0-7]/i
];
const TIP_REWRITE_PATTERNS = [
  /tip[_ -]?rewrite/i,
  /rewrite\s+(?:the\s+)?tip/i,
  /rewrite\s+freeze\s+main[_ ]?tip/i,
  /force[_ -]?pin\s+tip/i,
  /overwrite\s+freeze\s+tip/i,
  /tip[_ -]?pin[_ -]?rewrite/i,
  /rewrite\s+freeze\s+tip[_ -]?pin/i,
  /mutate\s+freeze\s+pin/i
];
const WEAKEN_PATTERNS = [
  /FUNDACION_ALWAYS_DENY\s*=\s*false/i,
  /weaken\s+(?:FUNDACION_)?ALWAYS_DENY/i,
  /allowFundacionWrite\s*=\s*true/i,
  /disable\s+FUNDACION_ALWAYS_DENY/i
];
const GHE_PATTERNS = [
  /\bghe\s+enforcement\b/i,
  /\bclaim\s+ghe\b/i,
  /\benable\s+ghe\b/i,
  /\bghe[_ -]?ready\b/i,
  /\bassert\s+ghe\b/i,
  /\bgoverned\s+human\s+escalation\s+enforcement\b/i,
  /required[\s-]?check\s+enforcement/i
];
const CZ_START_PATTERNS = [
  /\bstart\s+cz\b/i,
  /\bstart\s+mission\s+cz\b/i,
  /\bimplement\s+cz\b/i,
  /\bopen\s+cz\b/i,
  /\bcz[_ -]?start\b/i,
  /\blaunch\s+mission\s+cz\b/i
];

export function scanForSecrets(value) {
  if (value == null) return false;
  if (typeof value === 'string') {
    return SECRET_PATTERNS.some((p) => p.test(value));
  }
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value);
      return SECRET_PATTERNS.some((p) => p.test(s));
    } catch {
      return false;
    }
  }
  return false;
}

function matchesAny(value, patterns) {
  if (value == null) return false;
  const texts = [];
  if (typeof value === 'string') texts.push(value);
  else if (typeof value === 'object') {
    try {
      texts.push(JSON.stringify(value));
      for (const k of [
        'label',
        'labels',
        'title',
        'description',
        'claim',
        'claims',
        'note',
        'honestyMode',
        'ritualMode'
      ]) {
        if (value[k] != null) texts.push(String(value[k]));
      }
    } catch {
      /* ignore */
    }
  }
  return texts.some((t) => patterns.some((p) => p.test(t)));
}

export const claimsProductionReadyFlip = (v) => matchesAny(v, PR_FLIP_PATTERNS);
export const claimsAutoSeal = (v) => matchesAny(v, AUTO_SEAL_PATTERNS);
export const claimsAutoSealL28 = (v) => matchesAny(v, AUTO_SEAL_L28_PATTERNS);
export const claimsL27Reopen = (v) => matchesAny(v, L27_REOPEN_PATTERNS);
export const claimsTipRewrite = (v) => matchesAny(v, TIP_REWRITE_PATTERNS);
export const claimsTipPinRewrite = claimsTipRewrite;
export const claimsWeakenAlwaysDeny = (v) => matchesAny(v, WEAKEN_PATTERNS);
export const claimsGhe = (v) => matchesAny(v, GHE_PATTERNS);
export const claimsStartCz = (v) => matchesAny(v, CZ_START_PATTERNS);

export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'object') {
    try {
      return isFundacionTarget(JSON.stringify(target));
    } catch {
      return false;
    }
  }
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

export function normalizeIdStrict(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!s || !CY_ID_PATTERN.test(s)) return null;
  return s;
}

export function isTamperedDigest(digest) {
  if (digest == null) return false;
  const s = String(digest).trim();
  if (/^TAMPER/i.test(s)) return true;
  if (s.length === 64 && (/^0{64}$/.test(s) || /^f{64}$/i.test(s))) return true;
  return false;
}

export function normalizeHonestyPhase(phase) {
  if (phase == null || phase === '') return null;
  const s = String(phase)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/-/g, '_');
  const aliases = {
    p0: 'compose_honesty_port',
    compose: 'compose_honesty_port',
    honesty: 'compose_honesty_port',
    residual: 'compose_honesty_port',
    control_plane: 'compose_honesty_port',
    mission_os: 'compose_honesty_port',
    p1: 'observe_freeze_nonclaims',
    observe: 'observe_freeze_nonclaims',
    freeze: 'observe_freeze_nonclaims',
    freeze_nonclaims: 'observe_freeze_nonclaims',
    p2: 'soft_import_cv_cw_cx',
    soft_cv: 'soft_import_cv_cw_cx',
    soft_cw: 'soft_import_cv_cw_cx',
    soft_cx: 'soft_import_cv_cw_cx',
    cv_cw_cx: 'soft_import_cv_cw_cx',
    p3: 'seal_receipt',
    seal: 'seal_receipt',
    p4: 'hold_observe',
    hold: 'hold_observe',
    fixture: 'runbook_fixture',
    runbook: 'runbook_fixture'
  };
  const mapped = aliases[s] || s;
  return CY_HONESTY_PHASES.includes(mapped) ? mapped : null;
}
export const normalizeRitualPhase = normalizeHonestyPhase;

export function normalizeObservedPorts(ports) {
  const raw = Array.isArray(ports) ? ports.map(String) : [];
  const known = [];
  const seen = new Set();
  for (const p of raw) {
    const n = normalizeObservePortLabel(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      known.push(n);
    }
  }
  return { normalized: known, raw, known };
}

export function evaluateRequiredObserveSet(knownPorts) {
  const set = new Set((knownPorts || []).map((p) => String(p).toUpperCase()));
  const missing = CY_REQUIRED_OBSERVE_PORTS.filter((p) => !set.has(p));
  return { ok: missing.length === 0, missing };
}

export class MissionOsControlPlaneHonestyPolicyGate {
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : CY_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CY_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAny =
      plan.planId != null ||
      plan.changeId != null ||
      (plan.honestyDigest != null && String(plan.honestyDigest).trim() !== '') ||
      (plan.ritualDigest != null && String(plan.ritualDigest).trim() !== '') ||
      (Array.isArray(plan.observedPorts) && plan.observedPorts.length > 0) ||
      plan.phase != null ||
      plan.honestyPhase != null ||
      plan.ritualPhase != null;
    if (!hasAny) {
      return {
        valid: false,
        code: CY_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty residual honesty plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.changeId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CY_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }
    if (
      plan.writeAttempt === true ||
      plan.performFundacionWrite === true ||
      plan.fundacionWrite === true ||
      plan.allowFundacionWrite === true
    ) {
      return {
        valid: false,
        code: CY_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan claims Fundacion write (NON-CLAIM; FUNDACION_ALWAYS_DENY)'
      };
    }
    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CY_CODES.SECRET_DETECTED_DENY,
        reason: 'Plan labels/payloads contain plain secrets (Law VI)'
      };
    }

    const claimSurface = {
      label: plan.label,
      labels: plan.labels,
      description: plan.description,
      claim: plan.claim,
      claims: plan.claims,
      note: plan.note,
      honestyMode: plan.honestyMode,
      ritualMode: plan.ritualMode
    };

    if (
      claimsProductionReadyFlip(claimSurface) ||
      plan.autoProductionReady === true ||
      plan.flipProductionReady === true ||
      plan.autoProductionReadyFlip === true
    ) {
      return {
        valid: false,
        code: CY_CODES.PRODUCTION_READY_FLIP_DENY,
        reason: 'Plan claims PRODUCTION_READY=YES flip (refuse auto)'
      };
    }
    if (
      claimsWeakenAlwaysDeny(claimSurface) ||
      plan.FUNDACION_ALWAYS_DENY === false ||
      plan.fundacionAlwaysDeny === false ||
      plan.weakenAlwaysDeny === true
    ) {
      return {
        valid: false,
        code: CY_CODES.WEAKEN_ALWAYS_DENY,
        reason: 'Plan claims weakening FUNDACION_ALWAYS_DENY'
      };
    }
    if (
      claimsL27Reopen(claimSurface) ||
      plan.reopenL27 === true ||
      plan.l27Reopen === true ||
      plan.unsealL27 === true
    ) {
      return {
        valid: false,
        code: CY_CODES.L27_REOPEN_CLAIM_DENY,
        reason: 'Plan claims L27 reopen (NEVER reopen L27)'
      };
    }
    if (
      claimsTipRewrite(claimSurface) ||
      plan.tipRewrite === true ||
      plan.rewriteTip === true ||
      plan.rewriteFreezeTip === true ||
      plan.tipPinRewrite === true ||
      plan.rewriteTipPin === true ||
      plan.rewriteFreezeTipPin === true
    ) {
      return {
        valid: false,
        code: CY_CODES.TIP_PIN_REWRITE_CLAIM_DENY,
        reason:
          'Plan claims tip-pin rewrite (freeze stays 487a38bf soft-observe only)'
      };
    }
    if (
      claimsGhe(claimSurface) ||
      plan.gheEnforcement === true ||
      plan.enforceGhe === true ||
      plan.claimGhe === true ||
      plan.requireGhe === true
    ) {
      return {
        valid: false,
        code: CY_CODES.GHE_CLAIM_DENY,
        reason: 'Plan claims GHE enforcement (≠ GHE)'
      };
    }
    if (
      claimsStartCz(claimSurface) ||
      plan.startCz === true ||
      plan.startCZ === true ||
      plan.implementCz === true ||
      plan.openCz === true
    ) {
      return {
        valid: false,
        code: CY_CODES.CZ_START_CLAIM_DENY,
        reason: 'Plan claims CZ start (≠ CZ start from this package)'
      };
    }
    if (
      claimsAutoSealL28(claimSurface) ||
      plan.autoSealL28 === true ||
      plan.automaticSealL28 === true ||
      plan.autoCloseL28 === true
    ) {
      return {
        valid: false,
        code: CY_CODES.AUTO_CLOSE_L28_CLAIM_DENY,
        reason: 'Plan claims auto-close/seal L28 (≠ L28 auto-close)'
      };
    }
    if (
      claimsAutoSeal(claimSurface) ||
      plan.autoSeal === true ||
      plan.automaticSeal === true
    ) {
      return {
        valid: false,
        code: CY_CODES.AUTO_SEAL_CLAIM_DENY,
        reason: 'Plan claims auto-seal (refuse auto)'
      };
    }

    if (
      plan.freezeObserve &&
      typeof plan.freezeObserve === 'object' &&
      (plan.freezeObserve.readOnly === false ||
        plan.freezeObserve.tipRewrite === true ||
        (plan.freezeObserve.pin != null &&
          String(plan.freezeObserve.pin) !== '487a38bfa6b174141171aa476e5b7b98cf4a0a4e' &&
          String(plan.freezeObserve.pin) !== '487a38bf'))
    ) {
      return {
        valid: false,
        code: CY_CODES.TIP_PIN_REWRITE_CLAIM_DENY,
        reason:
          'Plan freezeObserve claims tip-pin rewrite (forced soft-observe 487a38bf)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CY_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CY_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion'
      };
    }

    const changeId = normalizeIdStrict(plan.changeId);
    if (!changeId) {
      return {
        valid: false,
        code: CY_CODES.MISSING_CHANGE_ID_DENY,
        reason: 'changeId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(changeId)) {
      return {
        valid: false,
        code: CY_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'changeId targets Fundacion'
      };
    }

    const rawMode =
      plan.honestyMode != null ? plan.honestyMode : plan.ritualMode;
    if (rawMode == null || String(rawMode).trim() === '') {
      return {
        valid: false,
        code: CY_CODES.MISSING_HONESTY_MODE_DENY,
        reason: 'honestyMode (or ritualMode) is required (ACTIVE|HOLD)'
      };
    }
    const honestyMode = String(rawMode).trim().toUpperCase();
    if (!CY_HONESTY_MODES.includes(honestyMode)) {
      return {
        valid: false,
        code: CY_CODES.INVALID_HONESTY_MODE_DENY,
        reason: 'honestyMode must be ACTIVE|HOLD'
      };
    }

    const rawPhase =
      plan.phase != null
        ? plan.phase
        : plan.honestyPhase != null
          ? plan.honestyPhase
          : plan.ritualPhase;
    if (rawPhase == null || String(rawPhase).trim() === '') {
      return {
        valid: false,
        code: CY_CODES.MISSING_PHASE_DENY,
        reason: 'phase (or honestyPhase/ritualPhase) is required'
      };
    }
    const phase = normalizeHonestyPhase(rawPhase);
    if (!phase) {
      return {
        valid: false,
        code: CY_CODES.INVALID_PHASE_DENY,
        reason: `phase '${rawPhase}' is not a known residual honesty phase`
      };
    }

    const digestRaw =
      plan.honestyDigest != null ? plan.honestyDigest : plan.ritualDigest;
    const hasDigest = digestRaw != null && String(digestRaw).trim() !== '';
    const hasPorts =
      Array.isArray(plan.observedPorts) && plan.observedPorts.length > 0;
    if (!hasDigest && !hasPorts) {
      return {
        valid: false,
        code: CY_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY,
        reason: 'observedPorts (CV+CW+CX+) or honestyDigest is required'
      };
    }

    let honestyDigest = null;
    if (hasDigest) {
      honestyDigest = String(digestRaw).trim();
      if (isTamperedDigest(honestyDigest)) {
        return {
          valid: false,
          code: CY_CODES.TAMPERED_DIGEST_DENY,
          reason: 'honestyDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(honestyDigest)) {
        return {
          valid: false,
          code: CY_CODES.INVALID_HONESTY_DIGEST_DENY,
          reason: 'honestyDigest must be sha256 hex'
        };
      }
    }

    const portInfo = normalizeObservedPorts(plan.observedPorts || []);
    const observeEval = evaluateRequiredObserveSet(portInfo.known);
    const ackMissing =
      plan.ackMissingObserveLabels === true ||
      plan.ackMissingRequiredObserveLabels === true;

    if (hasPorts && !observeEval.ok && !ackMissing) {
      return {
        valid: false,
        code: CY_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY,
        reason: `Missing required observe labels: ${observeEval.missing.join(',')}`
      };
    }

    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: CY_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max (${this.maxReasons})`
        };
      }
      for (const r of plan.reasons) if (r != null) reasons.push(String(r));
    }

    return {
      valid: true,
      code: CY_CODES.PLAN_VALID_OK,
      planId,
      changeId,
      honestyMode,
      ritualMode: honestyMode,
      phase,
      honestyDigest,
      observedPorts: portInfo.raw,
      observedPortCodes: portInfo.known,
      requiredObserveSet: [...CY_REQUIRED_OBSERVE_PORTS],
      observeOk: observeEval.ok,
      missingObservePorts: observeEval.missing,
      ackMissingObserveLabels: ackMissing,
      honestyOk: plan.honestyOk !== false,
      residualHonestyOk: plan.residualHonestyOk !== false,
      reasons
    };
  }
}

export default {
  CY_POLICY_GATE_PRODUCTION_READY,
  CY_POLICY_GATE_KIND,
  CY_MAX_REASONS,
  CY_ID_PATTERN,
  CY_HONESTY_PHASES,
  CY_RITUAL_PHASES,
  CY_CODES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsAutoSealL28,
  claimsL27Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsStartCz,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  normalizeHonestyPhase,
  normalizeRitualPhase,
  normalizeObservedPorts,
  evaluateRequiredObserveSet,
  MissionOsControlPlaneHonestyPolicyGate
};
