/**
 * @module hud-doctor-honesty-ritual-policy-gate
 * SPEC-0105 / Mission CV — Policy Gate for HUD/Doctor Honesty Ritual Composition Port.
 * Fail-closed validation for honesty ritual plans, Law VI secret screening,
 * Fundacion write barrier, PRODUCTION_READY flip claim refuse, L27 reopen claim refuse,
 * tip rewrite claim refuse, dirty-without-ack, freeze-lag-unmeasured-without-ack,
 * and ritualMode honesty (ACTIVE|HOLD).
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: HUD/Doctor Honesty Ritual Composition Port ≠ PRODUCTION_READY flip /
 * ≠ L27 reopen / ≠ tip rewrite / ≠ GHE / ≠ L28 closeout.
 *
 * Preserves human gates — refuse auto PRODUCTION_READY flip; refuse Fundacion writes.
 */

import {
  sha256Canonical,
  CV_RITUAL_MODES
} from './hud-doctor-honesty-ritual-receipt.js';

/** @type {'NO'} */
export const CV_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CV_POLICY_GATE_KIND = 'eos-hud-doctor-honesty-ritual-policy-gate';

/** Default maximum reasons per govern plan. */
export const CV_MAX_REASONS = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / change style).
 */
export const CV_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

/** Known honesty ritual phases (Layer-0 composition). */
export const CV_RITUAL_PHASES = Object.freeze([
  'compose_honesty',
  'observe_cq_ct',
  'seal_receipt',
  'hold_observe',
  'doctor_surface',
  'hud_surface'
]);

export const CV_CODES = Object.freeze({
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
  MISSING_RITUAL_PHASE_DENY: 'MISSING_RITUAL_PHASE_DENY',
  INVALID_RITUAL_PHASE_DENY: 'INVALID_RITUAL_PHASE_DENY',
  MISSING_HONESTY_INPUT_DENY: 'MISSING_HONESTY_INPUT_DENY',
  MISSING_RITUAL_DIGEST_DENY: 'MISSING_RITUAL_DIGEST_DENY',
  INVALID_RITUAL_DIGEST_DENY: 'INVALID_RITUAL_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  WEAKEN_ALWAYS_DENY: 'WEAKEN_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  L27_REOPEN_CLAIM_DENY: 'L27_REOPEN_CLAIM_DENY',
  TIP_REWRITE_CLAIM_DENY: 'TIP_REWRITE_CLAIM_DENY',
  AUTO_SEAL_CLAIM_DENY: 'AUTO_SEAL_CLAIM_DENY',
  AUTO_PRODUCTION_FLIP_CLAIM_DENY: 'AUTO_PRODUCTION_FLIP_CLAIM_DENY',
  DIRTY_WITHOUT_ACK_DENY: 'DIRTY_WITHOUT_ACK_DENY',
  FREEZE_LAG_UNMEASURED_WITHOUT_ACK_DENY:
    'FREEZE_LAG_UNMEASURED_WITHOUT_ACK_DENY',
  HONESTY_REFUSE_DENY: 'HONESTY_REFUSE_DENY',
  DENY: 'DENY',
  HOLD: 'HOLD'
});

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

const FORBIDDEN_SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

const PRODUCTION_READY_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION_READY\s+YES\s+flip/i,
  /auto(?:matic)?\s+production[_ ]?ready\s+flip/i
];

const AUTO_SEAL_PATTERNS = [
  /auto[_ -]?seal/i,
  /automatic\s+seal/i,
  /seal\s+without\s+human/i,
  /claims?\s+auto[_ -]?seal/i,
  /unattended\s+seal/i
];

const L27_REOPEN_PATTERNS = [
  /reopen\s+l(?:adder)?[\s_-]*27/i,
  /l(?:adder)?[\s_-]*27\s+reopen/i,
  /unseal\s+l(?:adder)?[\s_-]*27/i,
  /reopen\s+l1[7-9]|reopen\s+l2[0-7]/i,
  /never\s+reopen\s+l27\s*=\s*false/i,
  /l27[_ ]closed\s*=\s*false/i
];

const TIP_REWRITE_PATTERNS = [
  /tip[_ -]?rewrite/i,
  /rewrite\s+(?:the\s+)?tip/i,
  /rewrite\s+freeze\s+main[_ ]?tip/i,
  /rewrite\s+main[_ ]?tip/i,
  /force[_ -]?pin\s+tip/i,
  /overwrite\s+freeze\s+tip/i,
  /mutate\s+freeze\s+tip\s+pin/i
];

const WEAKEN_ALWAYS_DENY_PATTERNS = [
  /FUNDACION_ALWAYS_DENY\s*=\s*false/i,
  /weaken\s+(?:FUNDACION_)?ALWAYS_DENY/i,
  /allowFundacionWrite\s*=\s*true/i,
  /fundacionWriteAllowed\s*=\s*true/i,
  /disable\s+FUNDACION_ALWAYS_DENY/i,
  /override\s+ALWAYS_DENY/i
];

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function scanForSecrets(value) {
  if (value == null) return false;

  if (typeof value === 'string') {
    for (const pat of FORBIDDEN_SECRET_PATTERNS) {
      if (pat.test(value)) return true;
    }
    return false;
  }

  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);
      for (const pat of FORBIDDEN_SECRET_PATTERNS) {
        if (pat.test(serialized)) return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * @param {unknown} value
 * @param {RegExp[]} patterns
 * @returns {boolean}
 */
function matchesAnyPattern(value, patterns) {
  if (value == null) return false;
  const texts = [];
  if (typeof value === 'string') {
    texts.push(value);
  } else if (typeof value === 'object') {
    try {
      texts.push(JSON.stringify(value));
      for (const k of [
        'label',
        'labels',
        'title',
        'description',
        'claim',
        'claims',
        'ritualMode',
        'note'
      ]) {
        if (/** @type {Record<string, unknown>} */ (value)[k] != null) {
          texts.push(
            String(/** @type {Record<string, unknown>} */ (value)[k])
          );
        }
      }
    } catch {
      /* ignore */
    }
  }
  for (const t of texts) {
    for (const pat of patterns) {
      if (pat.test(t)) return true;
    }
  }
  return false;
}

/** @param {unknown} value @returns {boolean} */
export function claimsProductionReadyFlip(value) {
  return matchesAnyPattern(value, PRODUCTION_READY_FLIP_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsAutoSeal(value) {
  return matchesAnyPattern(value, AUTO_SEAL_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsL27Reopen(value) {
  return matchesAnyPattern(value, L27_REOPEN_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsTipRewrite(value) {
  return matchesAnyPattern(value, TIP_REWRITE_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsWeakenAlwaysDeny(value) {
  return matchesAnyPattern(value, WEAKEN_ALWAYS_DENY_PATTERNS);
}

/**
 * @param {unknown} target
 * @returns {boolean}
 */
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

/**
 * @param {unknown} id
 * @returns {string|null}
 */
export function normalizeIdStrict(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!s) return null;
  if (!CV_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * @param {string} digest
 * @returns {boolean}
 */
export function isTamperedDigest(digest) {
  if (digest == null) return false;
  const s = String(digest).trim();
  if (/^TAMPER/i.test(s)) return true;
  if (/0{64}/.test(s) && s.length === 64) return true;
  if (/f{64}/i.test(s) && s.length === 64) return true;
  return false;
}

/**
 * Normalize ritual phase aliases.
 * @param {unknown} phase
 * @returns {string|null}
 */
export function normalizeRitualPhase(phase) {
  if (phase == null || phase === '') return null;
  const s = String(phase)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/-/g, '_');
  const aliases = {
    p0: 'compose_honesty',
    compose: 'compose_honesty',
    honesty: 'compose_honesty',
    p1: 'observe_cq_ct',
    observe: 'observe_cq_ct',
    cq_ct: 'observe_cq_ct',
    p2: 'seal_receipt',
    seal: 'seal_receipt',
    p3: 'hold_observe',
    hold: 'hold_observe',
    doctor: 'doctor_surface',
    hud: 'hud_surface'
  };
  const mapped = aliases[s] || s;
  if (CV_RITUAL_PHASES.includes(mapped)) {
    return mapped;
  }
  return null;
}

/**
 * Policy Gate validator for HUD/Doctor Honesty Ritual Composition plans.
 */
export class HudDoctorHonestyRitualPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxReasons]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : CV_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate an honesty ritual govern plan before PASS|DENY|HOLD decision.
   * Fail-closed. Require planId + changeId + ritualMode + ritualPhase.
   * honestyInput or honestySurface or ritualDigest required.
   * Reject empty plans, Fundacion writes, secrets, PRODUCTION_READY=YES flip,
   * L27 reopen claims, tip rewrite claims, auto-seal claims, tampered digests.
   * Dirty / freeze-lag-unmeasured without ack are deferred to port honesty eval
   * but also fail here when flags are explicit on the plan.
   *
   * @param {unknown} plan
   * @returns {object}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CV_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      plan.changeId != null ||
      (plan.ritualDigest != null && String(plan.ritualDigest).trim() !== '') ||
      (plan.honestyInput != null && typeof plan.honestyInput === 'object') ||
      (plan.honestySurface != null && typeof plan.honestySurface === 'object') ||
      plan.ritualPhase != null ||
      plan.phase != null;
    if (!hasAnyId) {
      return {
        valid: false,
        code: CV_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty honesty ritual plan rejected fail-closed'
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
        code: CV_CODES.FUNDACION_ALWAYS_DENY,
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
        code: CV_CODES.FUNDACION_ALWAYS_DENY,
        reason:
          'Plan claims Fundacion write (NON-CLAIM: ≠ Fundacion write auth; FUNDACION_ALWAYS_DENY)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CV_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const claimSurface = {
      label: plan.label,
      labels: plan.labels,
      description: plan.description,
      claim: plan.claim,
      claims: plan.claims,
      note: plan.note
    };

    if (
      claimsProductionReadyFlip(claimSurface) ||
      plan.autoProductionReady === true ||
      plan.flipProductionReady === true ||
      plan.autoProductionReadyFlip === true
    ) {
      return {
        valid: false,
        code: CV_CODES.PRODUCTION_READY_FLIP_DENY,
        reason:
          'Plan claims PRODUCTION_READY=YES flip (NON-CLAIM: ≠ PRODUCTION_READY flip; refuse auto)'
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
        code: CV_CODES.WEAKEN_ALWAYS_DENY,
        reason:
          'Plan claims weakening FUNDACION_ALWAYS_DENY (NON-CLAIM: ≠ weaken ALWAYS_DENY)'
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
        code: CV_CODES.L27_REOPEN_CLAIM_DENY,
        reason:
          'Plan claims L27 reopen (NON-CLAIM: L17–L27 CLOSED never reopen; NEVER reopen L27)'
      };
    }

    if (
      claimsTipRewrite(claimSurface) ||
      plan.tipRewrite === true ||
      plan.rewriteTip === true ||
      plan.rewriteFreezeTip === true
    ) {
      return {
        valid: false,
        code: CV_CODES.TIP_REWRITE_CLAIM_DENY,
        reason:
          'Plan claims tip rewrite (NON-CLAIM: ≠ tip rewrite; freeze pin stays audit tip until parent tip-refresh)'
      };
    }

    if (
      claimsAutoSeal(claimSurface) ||
      plan.autoSeal === true ||
      plan.automaticSeal === true
    ) {
      return {
        valid: false,
        code: CV_CODES.AUTO_SEAL_CLAIM_DENY,
        reason:
          'Plan claims auto-seal (NON-CLAIM: ≠ automatic closure; refuse auto)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CV_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CV_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const changeId = normalizeIdStrict(plan.changeId);
    if (!changeId) {
      return {
        valid: false,
        code: CV_CODES.MISSING_CHANGE_ID_DENY,
        reason: 'changeId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(changeId)) {
      return {
        valid: false,
        code: CV_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'changeId targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }

    if (plan.ritualMode == null || String(plan.ritualMode).trim() === '') {
      return {
        valid: false,
        code: CV_CODES.MISSING_RITUAL_MODE_DENY,
        reason: 'ritualMode is required (ACTIVE|HOLD — hermetic labels only)'
      };
    }
    const ritualMode = String(plan.ritualMode).trim().toUpperCase();
    if (!CV_RITUAL_MODES.includes(ritualMode)) {
      return {
        valid: false,
        code: CV_CODES.INVALID_RITUAL_MODE_DENY,
        reason:
          'ritualMode must be ACTIVE|HOLD (hermetic — NOT automatic closure)'
      };
    }

    const rawPhase = plan.ritualPhase != null ? plan.ritualPhase : plan.phase;
    if (rawPhase == null || String(rawPhase).trim() === '') {
      return {
        valid: false,
        code: CV_CODES.MISSING_RITUAL_PHASE_DENY,
        reason: 'ritualPhase (or phase) is required'
      };
    }
    const ritualPhase = normalizeRitualPhase(rawPhase);
    if (!ritualPhase) {
      return {
        valid: false,
        code: CV_CODES.INVALID_RITUAL_PHASE_DENY,
        reason: `ritualPhase '${rawPhase}' is not a known honesty ritual phase`
      };
    }

    const hasRitualDigest =
      plan.ritualDigest != null && String(plan.ritualDigest).trim() !== '';
    const hasHonestyInput =
      plan.honestyInput != null && typeof plan.honestyInput === 'object';
    const hasHonestySurface =
      plan.honestySurface != null && typeof plan.honestySurface === 'object';
    const hasHonestySnapshot =
      plan.honestySnapshot != null && typeof plan.honestySnapshot === 'object';

    if (
      !hasRitualDigest &&
      !hasHonestyInput &&
      !hasHonestySurface &&
      !hasHonestySnapshot
    ) {
      return {
        valid: false,
        code: CV_CODES.MISSING_HONESTY_INPUT_DENY,
        reason:
          'honestyInput / honestySurface / honestySnapshot or ritualDigest is required'
      };
    }

    let ritualDigest = null;
    if (hasRitualDigest) {
      ritualDigest = String(plan.ritualDigest).trim();
      if (isTamperedDigest(ritualDigest)) {
        return {
          valid: false,
          code: CV_CODES.TAMPERED_DIGEST_DENY,
          reason: 'ritualDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(ritualDigest)) {
        return {
          valid: false,
          code: CV_CODES.INVALID_RITUAL_DIGEST_DENY,
          reason: 'ritualDigest must be sha256 hex'
        };
      }
    }

    // Explicit dirty-without-ack on plan (preflight; port also enforces via honesty)
    const honestyProbe = hasHonestyInput
      ? plan.honestyInput
      : hasHonestySurface
        ? plan.honestySurface
        : hasHonestySnapshot
          ? plan.honestySnapshot
          : null;
    if (honestyProbe && typeof honestyProbe === 'object') {
      const dirty =
        honestyProbe.dirty === true ||
        (Array.isArray(honestyProbe.dirtyPaths) &&
          honestyProbe.dirtyPaths.length > 0);
      const ackDirty =
        plan.ackDirtyDefer === true ||
        honestyProbe.ackDirtyDefer === true ||
        honestyProbe.allowOptimisticWhenDirty === true;
      if (dirty && !ackDirty) {
        return {
          valid: false,
          code: CV_CODES.DIRTY_WITHOUT_ACK_DENY,
          reason:
            'Dirty tree without ackDirtyDefer / allowOptimisticWhenDirty (fail-closed)'
        };
      }

      const freezeRevision =
        honestyProbe.freezeRevision || honestyProbe.freeze_revision || null;
      const sourceRevision =
        honestyProbe.sourceRevision || honestyProbe.source_revision || null;
      const lagProvided =
        honestyProbe.lagCommits !== undefined &&
        honestyProbe.lagCommits !== null;
      const matchHint =
        honestyProbe.revisionMatch === true ||
        (freezeRevision &&
          sourceRevision &&
          String(freezeRevision).slice(0, 7) ===
            String(sourceRevision).slice(0, 7));
      const lagUnmeasured =
        !matchHint &&
        freezeRevision &&
        sourceRevision &&
        !lagProvided &&
        honestyProbe.lag_measurable !== true;
      const ackLag =
        plan.ackFreezeLagUnmeasured === true ||
        honestyProbe.ackFreezeLagUnmeasured === true;
      if (lagUnmeasured && !ackLag) {
        return {
          valid: false,
          code: CV_CODES.FREEZE_LAG_UNMEASURED_WITHOUT_ACK_DENY,
          reason:
            'Freeze lag unmeasured (freeze≠source, no lagCommits) without ackFreezeLagUnmeasured'
        };
      }
    }

    /** @type {string[]} */
    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: CV_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max bound (${this.maxReasons}); got ${plan.reasons.length}`
        };
      }
      for (const r of plan.reasons) {
        if (r != null) reasons.push(String(r));
      }
    }

    const cqCtObserveLabels = Array.isArray(plan.cqCtObserveLabels)
      ? plan.cqCtObserveLabels.map(String)
      : Array.isArray(plan.observeLabels)
        ? plan.observeLabels.map(String)
        : [];

    return {
      valid: true,
      code: CV_CODES.PLAN_VALID_OK,
      planId,
      changeId,
      ritualMode,
      ritualPhase,
      ritualDigest,
      honestyInput: hasHonestyInput ? plan.honestyInput : null,
      honestySurface: hasHonestySurface ? plan.honestySurface : null,
      honestySnapshot: hasHonestySnapshot ? plan.honestySnapshot : null,
      cqCtObserveLabels,
      ackDirtyDefer: plan.ackDirtyDefer === true,
      ackFreezeLagUnmeasured: plan.ackFreezeLagUnmeasured === true,
      reasons
    };
  }
}

export default {
  CV_POLICY_GATE_PRODUCTION_READY,
  CV_POLICY_GATE_KIND,
  CV_MAX_REASONS,
  CV_ID_PATTERN,
  CV_RITUAL_PHASES,
  CV_CODES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  claimsL27Reopen,
  claimsTipRewrite,
  claimsWeakenAlwaysDeny,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  normalizeRitualPhase,
  HudDoctorHonestyRitualPolicyGate
};
