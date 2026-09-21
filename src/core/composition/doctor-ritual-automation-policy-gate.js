/**
 * @module doctor-ritual-automation-policy-gate
 * SPEC-0111 / Mission DB — Policy Gate for Doctor Ritual Automation.
 * Fail-closed plan validation: Fundacion barrier, Law VI secrets,
 * PRODUCTION_READY flip refuse, L28 reopen refuse, tip-pin rewrite refuse,
 * GHE claim refuse, auto-close L29 refuse, missing planId/changeId/phase/ritualMode,
 * missing required DA observe labels (unless ack).
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 * NON-CLAIM: ≠ PRODUCTION_READY flip / ≠ tip-pin rewrite / ≠ Fundacion write /
 * ≠ GHE / ≠ L29 auto-close / ≠ L28 reopen / ≠ external APM.
 */

import {
  sha256Canonical,
  DB_RITUAL_MODES,
  DB_REQUIRED_OBSERVE_PORTS,
  DB_SOFT_OBSERVE_L28_PORTS,
  DB_FREEZE_PIN,
  DB_FREEZE_PIN_SHORT,
  normalizeObservePortLabel
} from './doctor-ritual-automation-receipt.js';

/** @type {'NO'} */
export const DB_POLICY_GATE_PRODUCTION_READY = 'NO';
export const DB_POLICY_GATE_KIND =
  'eos-doctor-ritual-automation-policy-gate';
export const DB_MAX_REASONS = 64;
export const DB_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const DB_RITUAL_PHASES = Object.freeze([
  'compose_doctor_ritual_port',
  'observe_da_labels',
  'soft_import_da_observability',
  'soft_observe_l28_honesty',
  'seal_receipt',
  'hold_observe',
  'runbook_fixture'
]);
/** Aliases for DA/CY/CX API compatibility. */
export const DB_HONESTY_PHASES = DB_RITUAL_PHASES;
export const DB_AGGREGATION_PHASES = DB_RITUAL_PHASES;

export const DB_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',
  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_CHANGE_ID_DENY: 'MISSING_CHANGE_ID_DENY',
  MISSING_RITUAL_MODE_DENY: 'MISSING_RITUAL_MODE_DENY',
  INVALID_RITUAL_MODE_DENY: 'INVALID_RITUAL_MODE_DENY',
  MISSING_HONESTY_MODE_DENY: 'MISSING_RITUAL_MODE_DENY',
  INVALID_HONESTY_MODE_DENY: 'INVALID_RITUAL_MODE_DENY',
  MISSING_AGGREGATION_MODE_DENY: 'MISSING_RITUAL_MODE_DENY',
  INVALID_AGGREGATION_MODE_DENY: 'INVALID_RITUAL_MODE_DENY',
  MISSING_PHASE_DENY: 'MISSING_PHASE_DENY',
  INVALID_PHASE_DENY: 'INVALID_PHASE_DENY',
  MISSING_RITUAL_DIGEST_DENY: 'MISSING_RITUAL_DIGEST_DENY',
  INVALID_RITUAL_DIGEST_DENY: 'INVALID_RITUAL_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  WEAKEN_ALWAYS_DENY: 'WEAKEN_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  L28_REOPEN_CLAIM_DENY: 'L28_REOPEN_CLAIM_DENY',
  TIP_REWRITE_CLAIM_DENY: 'TIP_REWRITE_CLAIM_DENY',
  TIP_PIN_REWRITE_CLAIM_DENY: 'TIP_PIN_REWRITE_CLAIM_DENY',
  AUTO_SEAL_CLAIM_DENY: 'AUTO_SEAL_CLAIM_DENY',
  AUTO_SEAL_L29_CLAIM_DENY: 'AUTO_SEAL_L29_CLAIM_DENY',
  AUTO_CLOSE_L29_CLAIM_DENY: 'AUTO_CLOSE_L29_CLAIM_DENY',
  AUTO_PRODUCTION_FLIP_CLAIM_DENY: 'AUTO_PRODUCTION_FLIP_CLAIM_DENY',
  GHE_CLAIM_DENY: 'GHE_CLAIM_DENY',
  EXTERNAL_APM_CLAIM_DENY: 'EXTERNAL_APM_CLAIM_DENY',
  MISSING_REQUIRED_OBSERVE_LABELS_DENY: 'MISSING_REQUIRED_OBSERVE_LABELS_DENY',
  RITUAL_REFUSE_DENY: 'RITUAL_REFUSE_DENY',
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
const AUTO_SEAL_L29_PATTERNS = [
  /auto[_ -]?seal\s+l(?:adder)?[\s_-]*29/i,
  /automatic\s+(?:close|seal|closeout)\s+l(?:adder)?[\s_-]*29/i,
  /unattended\s+l29\s+(?:seal|closeout)/i,
  /auto[_ -]?close\s+l(?:adder)?[\s_-]*29/i
];
const L28_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*28/i,
  /l(?:adder)?[\s_-]*28\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*28/i,
  /reopen\s+l1[7-9]|reopen\s+l2[0-8]/i
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
const EXTERNAL_APM_PATTERNS = [
  /\bexternal\s+apm\b/i,
  /\bdatadog\s+enforcement\b/i,
  /\bnewrelic\s+claim\b/i,
  /\bclaim\s+external\s+apm\b/i,
  /\benable\s+external\s+apm\b/i
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
        'ritualMode',
        'honestyMode',
        'aggregationMode',
        'observeMode'
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
export const claimsAutoSealL29 = (v) => matchesAny(v, AUTO_SEAL_L29_PATTERNS);
export const claimsL28Reopen = (v) => matchesAny(v, L28_REOPEN_PATTERNS);
export const claimsTipRewrite = (v) => matchesAny(v, TIP_REWRITE_PATTERNS);
export const claimsTipPinRewrite = claimsTipRewrite;
export const claimsWeakenAlwaysDeny = (v) => matchesAny(v, WEAKEN_PATTERNS);
export const claimsGhe = (v) => matchesAny(v, GHE_PATTERNS);
export const claimsExternalApm = (v) => matchesAny(v, EXTERNAL_APM_PATTERNS);

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
  if (!s || !DB_ID_PATTERN.test(s)) return null;
  return s;
}

export function isTamperedDigest(digest) {
  if (digest == null) return false;
  const s = String(digest).trim();
  if (/^TAMPER/i.test(s)) return true;
  if (s.length === 64 && (/^0{64}$/.test(s) || /^f{64}$/i.test(s))) return true;
  return false;
}

export function normalizeRitualPhase(phase) {
  if (phase == null || phase === '') return null;
  const s = String(phase)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/-/g, '_');
  const aliases = {
    p0: 'compose_doctor_ritual_port',
    compose: 'compose_doctor_ritual_port',
    ritual: 'compose_doctor_ritual_port',
    doctor: 'compose_doctor_ritual_port',
    doctor_ritual: 'compose_doctor_ritual_port',
    automation: 'compose_doctor_ritual_port',
    p1: 'observe_da_labels',
    observe: 'observe_da_labels',
    da: 'observe_da_labels',
    da_labels: 'observe_da_labels',
    p2: 'soft_import_da_observability',
    soft_da: 'soft_import_da_observability',
    soft_import_da: 'soft_import_da_observability',
    da_observability: 'soft_import_da_observability',
    p3: 'soft_observe_l28_honesty',
    soft_l28: 'soft_observe_l28_honesty',
    l28_honesty: 'soft_observe_l28_honesty',
    cv_cw_cx_cy: 'soft_observe_l28_honesty',
    p4: 'seal_receipt',
    seal: 'seal_receipt',
    p5: 'hold_observe',
    hold: 'hold_observe',
    fixture: 'runbook_fixture',
    runbook: 'runbook_fixture'
  };
  const mapped = aliases[s] || s;
  return DB_RITUAL_PHASES.includes(mapped) ? mapped : null;
}
export const normalizeHonestyPhase = normalizeRitualPhase;
export const normalizeAggregationPhase = normalizeRitualPhase;

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
  const missing = DB_REQUIRED_OBSERVE_PORTS.filter((p) => !set.has(p));
  return { ok: missing.length === 0, missing };
}

export function evaluateSoftObserveL28(knownPorts) {
  const set = new Set((knownPorts || []).map((p) => String(p).toUpperCase()));
  const present = DB_SOFT_OBSERVE_L28_PORTS.filter((p) => set.has(p));
  const missing = DB_SOFT_OBSERVE_L28_PORTS.filter((p) => !set.has(p));
  return { present, missing, allPresent: missing.length === 0 };
}

export class DoctorRitualAutomationPolicyGate {
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : DB_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: DB_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAny =
      plan.planId != null ||
      plan.changeId != null ||
      (plan.ritualDigest != null && String(plan.ritualDigest).trim() !== '') ||
      (plan.honestyDigest != null && String(plan.honestyDigest).trim() !== '') ||
      (plan.observabilityDigest != null &&
        String(plan.observabilityDigest).trim() !== '') ||
      (Array.isArray(plan.observedPorts) && plan.observedPorts.length > 0) ||
      plan.phase != null ||
      plan.ritualPhase != null ||
      plan.honestyPhase != null ||
      plan.aggregationPhase != null;
    if (!hasAny) {
      return {
        valid: false,
        code: DB_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty doctor ritual automation plan rejected fail-closed'
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
        code: DB_CODES.FUNDACION_ALWAYS_DENY,
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
        code: DB_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan claims Fundacion write (NON-CLAIM; FUNDACION_ALWAYS_DENY)'
      };
    }
    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: DB_CODES.SECRET_DETECTED_DENY,
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
      ritualMode: plan.ritualMode,
      honestyMode: plan.honestyMode,
      aggregationMode: plan.aggregationMode,
      observeMode: plan.observeMode
    };

    if (
      claimsProductionReadyFlip(claimSurface) ||
      plan.autoProductionReady === true ||
      plan.flipProductionReady === true ||
      plan.autoProductionReadyFlip === true
    ) {
      return {
        valid: false,
        code: DB_CODES.PRODUCTION_READY_FLIP_DENY,
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
        code: DB_CODES.WEAKEN_ALWAYS_DENY,
        reason: 'Plan claims weakening FUNDACION_ALWAYS_DENY'
      };
    }
    if (
      claimsL28Reopen(claimSurface) ||
      plan.reopenL28 === true ||
      plan.l28Reopen === true ||
      plan.unsealL28 === true
    ) {
      return {
        valid: false,
        code: DB_CODES.L28_REOPEN_CLAIM_DENY,
        reason: 'Plan claims L28 reopen (NEVER reopen L28)'
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
        code: DB_CODES.TIP_PIN_REWRITE_CLAIM_DENY,
        reason:
          'Plan claims tip-pin rewrite (freeze stays daae7380 soft-observe only)'
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
        code: DB_CODES.GHE_CLAIM_DENY,
        reason: 'Plan claims GHE enforcement (≠ GHE)'
      };
    }
    if (
      claimsExternalApm(claimSurface) ||
      plan.externalApm === true ||
      plan.claimExternalApm === true ||
      plan.enableExternalApm === true
    ) {
      return {
        valid: false,
        code: DB_CODES.EXTERNAL_APM_CLAIM_DENY,
        reason: 'Plan claims external APM (≠ external APM)'
      };
    }
    if (
      claimsAutoSealL29(claimSurface) ||
      plan.autoSealL29 === true ||
      plan.automaticSealL29 === true ||
      plan.autoCloseL29 === true
    ) {
      return {
        valid: false,
        code: DB_CODES.AUTO_CLOSE_L29_CLAIM_DENY,
        reason: 'Plan claims auto-close/seal L29 (≠ L29 auto-close)'
      };
    }
    if (
      claimsAutoSeal(claimSurface) ||
      plan.autoSeal === true ||
      plan.automaticSeal === true
    ) {
      return {
        valid: false,
        code: DB_CODES.AUTO_SEAL_CLAIM_DENY,
        reason: 'Plan claims auto-seal (refuse auto)'
      };
    }

    if (
      plan.freezeObserve &&
      typeof plan.freezeObserve === 'object' &&
      (plan.freezeObserve.readOnly === false ||
        plan.freezeObserve.tipRewrite === true ||
        (plan.freezeObserve.pin != null &&
          String(plan.freezeObserve.pin) !== DB_FREEZE_PIN &&
          String(plan.freezeObserve.pin) !== DB_FREEZE_PIN_SHORT &&
          !String(plan.freezeObserve.pin).startsWith(DB_FREEZE_PIN_SHORT)))
    ) {
      return {
        valid: false,
        code: DB_CODES.TIP_PIN_REWRITE_CLAIM_DENY,
        reason:
          'Plan freezeObserve claims tip-pin rewrite (forced soft-observe daae7380)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: DB_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: DB_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion'
      };
    }

    const changeId = normalizeIdStrict(plan.changeId);
    if (!changeId) {
      return {
        valid: false,
        code: DB_CODES.MISSING_CHANGE_ID_DENY,
        reason: 'changeId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(changeId)) {
      return {
        valid: false,
        code: DB_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'changeId targets Fundacion'
      };
    }

    const rawMode =
      plan.ritualMode != null
        ? plan.ritualMode
        : plan.honestyMode != null
          ? plan.honestyMode
          : plan.aggregationMode != null
            ? plan.aggregationMode
            : plan.observeMode;
    if (rawMode == null || String(rawMode).trim() === '') {
      return {
        valid: false,
        code: DB_CODES.MISSING_RITUAL_MODE_DENY,
        reason: 'ritualMode (or honestyMode/aggregationMode) is required (ACTIVE|HOLD)'
      };
    }
    const ritualMode = String(rawMode).trim().toUpperCase();
    if (!DB_RITUAL_MODES.includes(ritualMode)) {
      return {
        valid: false,
        code: DB_CODES.INVALID_RITUAL_MODE_DENY,
        reason: 'ritualMode must be ACTIVE|HOLD'
      };
    }

    const rawPhase =
      plan.phase != null
        ? plan.phase
        : plan.ritualPhase != null
          ? plan.ritualPhase
          : plan.honestyPhase != null
            ? plan.honestyPhase
            : plan.aggregationPhase;
    if (rawPhase == null || String(rawPhase).trim() === '') {
      return {
        valid: false,
        code: DB_CODES.MISSING_PHASE_DENY,
        reason: 'phase (or ritualPhase/honestyPhase/aggregationPhase) is required'
      };
    }
    const phase = normalizeRitualPhase(rawPhase);
    if (!phase) {
      return {
        valid: false,
        code: DB_CODES.INVALID_PHASE_DENY,
        reason: `phase '${rawPhase}' is not a known doctor ritual automation phase`
      };
    }

    const digestRaw =
      plan.ritualDigest != null
        ? plan.ritualDigest
        : plan.honestyDigest != null
          ? plan.honestyDigest
          : plan.observabilityDigest;
    const hasDigest = digestRaw != null && String(digestRaw).trim() !== '';
    const hasPorts =
      Array.isArray(plan.observedPorts) && plan.observedPorts.length > 0;
    if (!hasDigest && !hasPorts) {
      return {
        valid: false,
        code: DB_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY,
        reason: 'observedPorts (DA+) or ritualDigest is required'
      };
    }

    let ritualDigest = null;
    if (hasDigest) {
      ritualDigest = String(digestRaw).trim();
      if (isTamperedDigest(ritualDigest)) {
        return {
          valid: false,
          code: DB_CODES.TAMPERED_DIGEST_DENY,
          reason: 'ritualDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(ritualDigest)) {
        return {
          valid: false,
          code: DB_CODES.INVALID_RITUAL_DIGEST_DENY,
          reason: 'ritualDigest must be sha256 hex'
        };
      }
    }

    const portInfo = normalizeObservedPorts(plan.observedPorts || []);
    const observeEval = evaluateRequiredObserveSet(portInfo.known);
    const softL28 = evaluateSoftObserveL28(portInfo.known);
    const ackMissing =
      plan.ackMissingObserveLabels === true ||
      plan.ackMissingRequiredObserveLabels === true;

    if (hasPorts && !observeEval.ok && !ackMissing) {
      return {
        valid: false,
        code: DB_CODES.MISSING_REQUIRED_OBSERVE_LABELS_DENY,
        reason: `Missing required observe labels: ${observeEval.missing.join(',')}`
      };
    }

    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: DB_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max (${this.maxReasons})`
        };
      }
      for (const r of plan.reasons) if (r != null) reasons.push(String(r));
    }

    return {
      valid: true,
      code: DB_CODES.PLAN_VALID_OK,
      planId,
      changeId,
      ritualMode,
      honestyMode: ritualMode,
      aggregationMode: ritualMode,
      phase,
      ritualDigest,
      honestyDigest: ritualDigest,
      observabilityDigest: ritualDigest,
      observedPorts: portInfo.raw,
      observedPortCodes: portInfo.known,
      requiredObserveSet: [...DB_REQUIRED_OBSERVE_PORTS],
      softObserveL28Ports: [...DB_SOFT_OBSERVE_L28_PORTS],
      softObserveL28: softL28,
      observeOk: observeEval.ok,
      missingObservePorts: observeEval.missing,
      ackMissingObserveLabels: ackMissing,
      honestyOk: plan.honestyOk !== false,
      ritualOk: plan.ritualOk !== false,
      aggregationOk: plan.aggregationOk !== false,
      reasons
    };
  }
}

export default {
  DB_POLICY_GATE_PRODUCTION_READY,
  DB_POLICY_GATE_KIND,
  DB_MAX_REASONS,
  DB_ID_PATTERN,
  DB_RITUAL_PHASES,
  DB_HONESTY_PHASES,
  DB_AGGREGATION_PHASES,
  DB_CODES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsAutoSealL29,
  claimsL28Reopen,
  claimsTipRewrite,
  claimsTipPinRewrite,
  claimsWeakenAlwaysDeny,
  claimsGhe,
  claimsExternalApm,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  normalizeRitualPhase,
  normalizeHonestyPhase,
  normalizeAggregationPhase,
  normalizeObservedPorts,
  evaluateRequiredObserveSet,
  evaluateSoftObserveL28,
  DoctorRitualAutomationPolicyGate
};
