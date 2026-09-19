/**
 * @module specboot-continuity-policy-gate
 * SPEC-0102 / Mission CS — Policy Gate for SpecBoot Operator Continuity Port.
 * Fail-closed validation for continuity plans, Law VI secret screening,
 * Fundacion write barrier, auto-seal / PRODUCTION_READY flip claim refusal,
 * and continuityMode honesty (ACTIVE|HOLD).
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: SpecBoot continuity ≠ automatic closure / ≠ PRODUCTION_READY flip /
 * ≠ full SpecBoot CLI rewrite / ≠ Fundacion writes / ≠ reopen L26 / ≠ L27 closeout.
 *
 * Preserves human gates A6 (seal) + A7 (PRODUCTION_READY) — refuse auto.
 */

import {
  sha256Canonical,
  CS_CONTINUITY_MODES
} from './specboot-continuity-receipt.js';

/** @type {'NO'} */
export const CS_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CS_POLICY_GATE_KIND = 'eos-specboot-continuity-policy-gate';

/** Default maximum reasons per govern plan. */
export const CS_MAX_REASONS = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / change style).
 */
export const CS_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

/** Known LIDR + human-gate steps (mirrors friction-gate; soft-import may extend). */
export const CS_LIDR_STEPS = Object.freeze([
  'enrich_us',
  'propose',
  'apply',
  'verify',
  'code_review',
  'archive',
  'commit',
  'publish'
]);

export const CS_HUMAN_GATE_STEPS = Object.freeze([
  'publish',
  'seal',
  'production_ready_flip'
]);

export const CS_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_CHANGE_ID_DENY: 'MISSING_CHANGE_ID_DENY',
  MISSING_CONTINUITY_MODE_DENY: 'MISSING_CONTINUITY_MODE_DENY',
  INVALID_CONTINUITY_MODE_DENY: 'INVALID_CONTINUITY_MODE_DENY',
  MISSING_LIDR_STEP_DENY: 'MISSING_LIDR_STEP_DENY',
  INVALID_LIDR_STEP_DENY: 'INVALID_LIDR_STEP_DENY',
  MISSING_CONTINUITY_DIGEST_DENY: 'MISSING_CONTINUITY_DIGEST_DENY',
  INVALID_CONTINUITY_DIGEST_DENY: 'INVALID_CONTINUITY_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  AUTO_SEAL_CLAIM_DENY: 'AUTO_SEAL_CLAIM_DENY',
  AUTO_PRODUCTION_FLIP_CLAIM_DENY: 'AUTO_PRODUCTION_FLIP_CLAIM_DENY',
  FRICTION_REFUSE_DENY: 'FRICTION_REFUSE_DENY',
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
        'continuityMode',
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

/**
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
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
  if (!CS_ID_PATTERN.test(s)) return null;
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
 * Normalize LIDR / human-gate step aliases.
 * @param {unknown} step
 * @returns {string|null}
 */
export function normalizeLidrStep(step) {
  if (step == null || step === '') return null;
  const s = String(step)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/-/g, '_');
  const aliases = {
    enrichus: 'enrich_us',
    enrich: 'enrich_us',
    ff: 'propose',
    opsx_propose: 'propose',
    opsx_apply: 'apply',
    adversarial_review: 'code_review',
    adversarialreview: 'code_review',
    production_flip: 'production_ready_flip',
    production_ready: 'production_ready_flip'
  };
  const mapped = aliases[s] || s;
  if (
    CS_LIDR_STEPS.includes(mapped) ||
    CS_HUMAN_GATE_STEPS.includes(mapped)
  ) {
    return mapped;
  }
  return null;
}

/**
 * Policy Gate validator for SpecBoot Operator Continuity plans.
 */
export class SpecbootContinuityPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxReasons]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : CS_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a continuity govern plan before PASS|DENY|HOLD decision.
   * Fail-closed. Require planId + changeId + continuityMode + lidrStep.
   * continuityDigest optional when frictionInput present (computed later).
   * Reject empty plans, Fundacion, secrets, PRODUCTION_READY=YES flip,
   * auto-seal claims, tampered digests.
   *
   * @param {unknown} plan
   * @returns {object}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CS_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      plan.changeId != null ||
      (plan.continuityDigest != null &&
        String(plan.continuityDigest).trim() !== '') ||
      (plan.frictionInput != null && typeof plan.frictionInput === 'object') ||
      plan.lidrStep != null ||
      plan.step != null;
    if (!hasAnyId) {
      return {
        valid: false,
        code: CS_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty continuity plan rejected fail-closed'
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
        code: CS_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CS_CODES.SECRET_DETECTED_DENY,
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
        code: CS_CODES.PRODUCTION_READY_FLIP_DENY,
        reason:
          'Plan claims PRODUCTION_READY=YES flip (NON-CLAIM: ≠ PRODUCTION_READY flip; A7 refuse auto)'
      };
    }

    if (
      claimsAutoSeal(claimSurface) ||
      plan.autoSeal === true ||
      plan.automaticSeal === true
    ) {
      return {
        valid: false,
        code: CS_CODES.AUTO_SEAL_CLAIM_DENY,
        reason:
          'Plan claims auto-seal (NON-CLAIM: ≠ automatic closure; A6 refuse auto)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CS_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CS_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const changeId = normalizeIdStrict(plan.changeId);
    if (!changeId) {
      return {
        valid: false,
        code: CS_CODES.MISSING_CHANGE_ID_DENY,
        reason: 'changeId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(changeId)) {
      return {
        valid: false,
        code: CS_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'changeId targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }

    if (
      plan.continuityMode == null ||
      String(plan.continuityMode).trim() === ''
    ) {
      return {
        valid: false,
        code: CS_CODES.MISSING_CONTINUITY_MODE_DENY,
        reason: 'continuityMode is required (ACTIVE|HOLD — hermetic labels only)'
      };
    }
    const continuityMode = String(plan.continuityMode).trim().toUpperCase();
    if (!CS_CONTINUITY_MODES.includes(continuityMode)) {
      return {
        valid: false,
        code: CS_CODES.INVALID_CONTINUITY_MODE_DENY,
        reason:
          'continuityMode must be ACTIVE|HOLD (hermetic — NOT automatic closure)'
      };
    }

    const rawStep = plan.lidrStep != null ? plan.lidrStep : plan.step;
    if (rawStep == null || String(rawStep).trim() === '') {
      return {
        valid: false,
        code: CS_CODES.MISSING_LIDR_STEP_DENY,
        reason: 'lidrStep (or step) is required'
      };
    }
    const lidrStep = normalizeLidrStep(rawStep);
    if (!lidrStep) {
      return {
        valid: false,
        code: CS_CODES.INVALID_LIDR_STEP_DENY,
        reason: `lidrStep '${rawStep}' is not a known LIDR/human-gate step`
      };
    }

    const hasContinuityDigest =
      plan.continuityDigest != null &&
      String(plan.continuityDigest).trim() !== '';
    const hasFrictionInput =
      plan.frictionInput != null && typeof plan.frictionInput === 'object';
    const hasFrictionSnapshot =
      plan.frictionSnapshot != null &&
      typeof plan.frictionSnapshot === 'object';

    if (!hasContinuityDigest && !hasFrictionInput && !hasFrictionSnapshot) {
      return {
        valid: false,
        code: CS_CODES.MISSING_CONTINUITY_DIGEST_DENY,
        reason:
          'continuityDigest (sha256) or frictionInput/frictionSnapshot is required'
      };
    }

    let continuityDigest = null;
    if (hasContinuityDigest) {
      continuityDigest = String(plan.continuityDigest).trim();
      if (isTamperedDigest(continuityDigest)) {
        return {
          valid: false,
          code: CS_CODES.TAMPERED_DIGEST_DENY,
          reason: 'continuityDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(continuityDigest)) {
        return {
          valid: false,
          code: CS_CODES.INVALID_CONTINUITY_DIGEST_DENY,
          reason: 'continuityDigest must be sha256 hex'
        };
      }
    }

    /** @type {string[]} */
    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: CS_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max bound (${this.maxReasons}); got ${plan.reasons.length}`
        };
      }
      for (const r of plan.reasons) {
        if (r != null) reasons.push(String(r));
      }
    }

    return {
      valid: true,
      code: CS_CODES.PLAN_VALID_OK,
      planId,
      changeId,
      continuityMode,
      lidrStep,
      continuityDigest,
      frictionInput: hasFrictionInput ? plan.frictionInput : null,
      frictionSnapshot: hasFrictionSnapshot ? plan.frictionSnapshot : null,
      reasons
    };
  }
}

export default {
  CS_POLICY_GATE_PRODUCTION_READY,
  CS_POLICY_GATE_KIND,
  CS_MAX_REASONS,
  CS_ID_PATTERN,
  CS_LIDR_STEPS,
  CS_HUMAN_GATE_STEPS,
  CS_CODES,
  scanForSecrets,
  claimsProductionReadyFlip,
  claimsAutoSeal,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  normalizeLidrStep,
  SpecbootContinuityPolicyGate
};
