/**
 * @module local-ci-continuity-policy-gate
 * SPEC-0100 / Mission CQ — Policy Gate for Local CI Continuity Port.
 * Fail-closed validation for continuity plans, Law VI secret screening,
 * Fundacion write barrier, BILLING_BLOCKED honesty, GH-green claim refusal,
 * PRODUCTION_READY=YES flip claims, and GHE enforcement claim labels.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Local CI Continuity ≠ GHA green / ≠ GHE enforcement /
 * ≠ Fundacion writes / ≠ PRODUCTION_READY flip / ≠ reopen L26.
 */

import {
  sha256Canonical,
  CQ_CONTINUITY_MODES,
  forceCiEnvironment
} from './local-ci-continuity-receipt.js';

/** @type {'NO'} */
export const CQ_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CQ_POLICY_GATE_KIND = 'eos-local-ci-continuity-policy-gate';

/** Default maximum reasons per govern plan. */
export const CQ_MAX_REASONS = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / run style).
 */
export const CQ_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CQ_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_RUN_ID_DENY: 'MISSING_RUN_ID_DENY',
  MISSING_CONTINUITY_MODE_DENY: 'MISSING_CONTINUITY_MODE_DENY',
  INVALID_CONTINUITY_MODE_DENY: 'INVALID_CONTINUITY_MODE_DENY',
  MISSING_CONTINUITY_DIGEST_DENY: 'MISSING_CONTINUITY_DIGEST_DENY',
  INVALID_CONTINUITY_DIGEST_DENY: 'INVALID_CONTINUITY_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  GHA_GREEN_CLAIM_DENY: 'GHA_GREEN_CLAIM_DENY',
  GHE_ENFORCEMENT_CLAIM_DENY: 'GHE_ENFORCEMENT_CLAIM_DENY',
  SURROGATE_FAIL_DENY: 'SURROGATE_FAIL_DENY',
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

const GHE_ENFORCEMENT_PATTERNS = [
  /github\s*enterprise\s*enforcement/i,
  /gh\s*enterprise\s*enforcement/i,
  /ghe\s*enforcement/i,
  /claims?\s+ghe\s+enforcement/i,
  /required[\s-]?check\s+enforcement/i,
  /enterprise\s+enforcement\s+via\s+github/i
];

const GHA_GREEN_PATTERNS = [
  /github\s*actions\s*(green|pass|success|passed)/i,
  /gha\s*(green|pass|success)/i,
  /claims?\s+github\s*actions\s*(green|pass)/i,
  /ci_environment\.github_actions\s*=\s*(PASS|GREEN|SUCCESS)/i,
  /github_actions_verdict\s*=\s*(PASS|GREEN)/i,
  /remote\s+CI\s+green/i
];

const PRODUCTION_READY_FLIP_PATTERNS = [
  /PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION[_ ]READY\s*:\s*YES/i,
  /flip\s+PRODUCTION_READY\s+to\s+YES/i,
  /claim\s+PRODUCTION_READY\s*=\s*YES/i,
  /PRODUCTION_READY\s+YES\s+flip/i
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
export function claimsGheEnforcement(value) {
  return matchesAnyPattern(value, GHE_ENFORCEMENT_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsGhaGreen(value) {
  return matchesAnyPattern(value, GHA_GREEN_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsProductionReadyFlip(value) {
  return matchesAnyPattern(value, PRODUCTION_READY_FLIP_PATTERNS);
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
  if (!CQ_ID_PATTERN.test(s)) return null;
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
 * Policy Gate validator for Local CI Continuity plans.
 */
export class LocalCiContinuityPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxReasons]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : CQ_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a continuity govern plan before PASS|DENY|HOLD decision.
   * Fail-closed. Require planId + runId + continuityMode in ACTIVE|HOLD.
   * continuityDigest optional when surrogateInput present (computed later).
   * Reject empty plans, Fundacion, secrets, PRODUCTION_READY=YES flip,
   * GHA green claims, GHE claim labels, tampered digests.
   *
   * @param {unknown} plan
   * @returns {object}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CQ_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      plan.runId != null ||
      (plan.continuityDigest != null &&
        String(plan.continuityDigest).trim() !== '') ||
      (plan.surrogateInput != null && typeof plan.surrogateInput === 'object');
    if (!hasAnyId) {
      return {
        valid: false,
        code: CQ_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty continuity plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.runId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CQ_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CQ_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    if (
      claimsProductionReadyFlip(plan) ||
      claimsProductionReadyFlip(plan.label) ||
      claimsProductionReadyFlip(plan.labels) ||
      claimsProductionReadyFlip(plan.description)
    ) {
      return {
        valid: false,
        code: CQ_CODES.PRODUCTION_READY_FLIP_DENY,
        reason:
          'Plan claims PRODUCTION_READY=YES flip (NON-CLAIM: ≠ PRODUCTION_READY flip)'
      };
    }

    if (
      claimsGheEnforcement(plan) ||
      claimsGheEnforcement(plan.label) ||
      claimsGheEnforcement(plan.labels) ||
      claimsGheEnforcement(plan.description)
    ) {
      return {
        valid: false,
        code: CQ_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
        reason:
          'Plan claims GH Enterprise enforcement (NON-CLAIM: ≠ GHE enforcement)'
      };
    }

    if (
      claimsGhaGreen(plan) ||
      claimsGhaGreen(plan.label) ||
      claimsGhaGreen(plan.labels) ||
      claimsGhaGreen(plan.description) ||
      claimsGhaGreen(plan.ciEnvironment)
    ) {
      return {
        valid: false,
        code: CQ_CODES.GHA_GREEN_CLAIM_DENY,
        reason:
          'Plan claims GitHub Actions green (NON-CLAIM: local CI ≠ GHA green)'
      };
    }

    // Reject explicit ciEnvironment overrides that claim GH green
    if (plan.ciEnvironment && typeof plan.ciEnvironment === 'object') {
      const ga = plan.ciEnvironment.github_actions;
      const gav = plan.ciEnvironment.github_actions_verdict;
      if (
        ga === 'PASS' ||
        ga === 'GREEN' ||
        ga === 'SUCCESS' ||
        gav === 'PASS' ||
        gav === 'GREEN'
      ) {
        return {
          valid: false,
          code: CQ_CODES.GHA_GREEN_CLAIM_DENY,
          reason:
            'ciEnvironment override claims GitHub Actions green (fail-closed)'
        };
      }
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CQ_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CQ_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const runId = normalizeIdStrict(plan.runId);
    if (!runId) {
      return {
        valid: false,
        code: CQ_CODES.MISSING_RUN_ID_DENY,
        reason: 'runId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(runId)) {
      return {
        valid: false,
        code: CQ_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'runId targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }

    if (
      plan.continuityMode == null ||
      String(plan.continuityMode).trim() === ''
    ) {
      return {
        valid: false,
        code: CQ_CODES.MISSING_CONTINUITY_MODE_DENY,
        reason: 'continuityMode is required (ACTIVE|HOLD — hermetic labels only)'
      };
    }
    const continuityMode = String(plan.continuityMode).trim().toUpperCase();
    if (!CQ_CONTINUITY_MODES.includes(continuityMode)) {
      return {
        valid: false,
        code: CQ_CODES.INVALID_CONTINUITY_MODE_DENY,
        reason:
          'continuityMode must be ACTIVE|HOLD (hermetic — NOT GHA green claim)'
      };
    }

    const hasContinuityDigest =
      plan.continuityDigest != null &&
      String(plan.continuityDigest).trim() !== '';
    const hasSurrogateInput =
      plan.surrogateInput != null && typeof plan.surrogateInput === 'object';
    const hasGateSnapshot =
      plan.gateSnapshot != null && typeof plan.gateSnapshot === 'object';

    if (!hasContinuityDigest && !hasSurrogateInput && !hasGateSnapshot) {
      return {
        valid: false,
        code: CQ_CODES.MISSING_CONTINUITY_DIGEST_DENY,
        reason:
          'continuityDigest (sha256) or surrogateInput/gateSnapshot is required'
      };
    }

    let continuityDigest = null;
    if (hasContinuityDigest) {
      continuityDigest = String(plan.continuityDigest).trim();
      if (isTamperedDigest(continuityDigest)) {
        return {
          valid: false,
          code: CQ_CODES.TAMPERED_DIGEST_DENY,
          reason: 'continuityDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(continuityDigest)) {
        return {
          valid: false,
          code: CQ_CODES.INVALID_CONTINUITY_DIGEST_DENY,
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
          code: CQ_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max bound (${this.maxReasons}); got ${plan.reasons.length}`
        };
      }
      for (const r of plan.reasons) {
        if (r != null) reasons.push(String(r));
      }
    }

    const ciEnvironment = forceCiEnvironment(plan.ciEnvironment || {});

    return {
      valid: true,
      code: CQ_CODES.PLAN_VALID_OK,
      planId,
      runId,
      continuityMode,
      continuityDigest,
      ciEnvironment,
      surrogateInput: hasSurrogateInput ? plan.surrogateInput : null,
      gateSnapshot: hasGateSnapshot ? plan.gateSnapshot : null,
      reasons
    };
  }
}

export default {
  CQ_POLICY_GATE_PRODUCTION_READY,
  CQ_POLICY_GATE_KIND,
  CQ_MAX_REASONS,
  CQ_ID_PATTERN,
  CQ_CODES,
  scanForSecrets,
  claimsGheEnforcement,
  claimsGhaGreen,
  claimsProductionReadyFlip,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  LocalCiContinuityPolicyGate
};
