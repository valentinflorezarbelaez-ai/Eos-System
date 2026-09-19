/**
 * @module adversarial-verification-policy-gate
 * SPEC-0093 / Mission CJ — Policy Gate for Continuous Adversarial Verification.
 * Fail-closed validation for probe plans, Law VI secret screening,
 * Fundacion write barrier, claim-status enums, target bounds,
 * and rejection of empty probes / GHE-enforcement claim labels.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Continuous Adversarial Verification ≠ red-team consulting product /
 * ≠ claims GH Enterprise enforcement / ≠ Fundacion writes.
 */

import {
  sha256Canonical,
  CJ_CLAIM_STATUSES
} from './adversarial-verification-receipt.js';

/** @type {'NO'} */
export const CJ_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CJ_POLICY_GATE_KIND = 'eos-adversarial-verification-policy-gate';

/** Default maximum targets per probe plan. */
export const CJ_MAX_TARGETS = 32;

/**
 * Id pattern (alphanumeric / mission-code style).
 * Examples: probe-001, claim-cg-measured, CJ, eos-ladder-25
 */
export const CJ_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

export const CJ_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  PROBE_PASS: 'PROBE_PASS',
  PROBE_CHALLENGE: 'PROBE_CHALLENGE',
  PROBE_DENY: 'PROBE_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PROBE_DENY: 'EMPTY_PROBE_DENY',
  MISSING_PROBE_ID_DENY: 'MISSING_PROBE_ID_DENY',
  MISSING_TARGETS_DENY: 'MISSING_TARGETS_DENY',
  OVERSIZED_TARGETS_DENY: 'OVERSIZED_TARGETS_DENY',
  INVALID_CLAIM_STATUS_DENY: 'INVALID_CLAIM_STATUS_DENY',
  INVALID_CLAIM_ID_DENY: 'INVALID_CLAIM_ID_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  GHE_ENFORCEMENT_CLAIM_DENY: 'GHE_ENFORCEMENT_CLAIM_DENY',
  DENY: 'DENY'
});

const FORBIDDEN_SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

/** Reject labels that claim GitHub Enterprise enforcement (NON-CLAIM). */
const GHE_ENFORCEMENT_PATTERNS = [
  /github\s*enterprise\s*enforcement/i,
  /gh\s*enterprise\s*enforcement/i,
  /ghe\s*enforcement/i,
  /claims?\s+ghe\s+enforcement/i,
  /enterprise\s+enforcement\s+via\s+github/i
];

/**
 * Check if a string, object, or property contains secret patterns (Law VI).
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
 * Detect GH Enterprise enforcement claim language in labels/payloads.
 * @param {unknown} value
 * @returns {boolean}
 */
export function claimsGheEnforcement(value) {
  if (value == null) return false;
  const texts = [];
  if (typeof value === 'string') {
    texts.push(value);
  } else if (typeof value === 'object') {
    try {
      texts.push(JSON.stringify(value));
      for (const k of ['label', 'labels', 'title', 'description', 'claim', 'claims']) {
        if (/** @type {Record<string, unknown>} */ (value)[k] != null) {
          texts.push(String(/** @type {Record<string, unknown>} */ (value)[k]));
        }
      }
    } catch {
      /* ignore */
    }
  }
  for (const t of texts) {
    for (const pat of GHE_ENFORCEMENT_PATTERNS) {
      if (pat.test(t)) return true;
    }
  }
  return false;
}

/**
 * Check if a target string touches the forbidden Fundacion directory.
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
 * Normalize / validate an id field.
 * @param {unknown} id
 * @returns {string|null}
 */
export function normalizeIdStrict(id) {
  if (id == null) return null;
  const s = String(id).trim();
  if (!s) return null;
  if (!CJ_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * Policy Gate validator for adversarial verification probe plans.
 */
export class AdversarialVerificationPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxTargets]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxTargets =
      options.maxTargets != null
        ? Number(options.maxTargets)
        : CJ_MAX_TARGETS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a probe plan before PASS|CHALLENGE|DENY decision.
   * Fail-closed. Require probeId + 1..CJ_MAX targets with valid claim statuses.
   * Reject empty probes, Fundacion, secrets, and GHE-enforcement claim labels.
   *
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, probeId?: string, targets?: Array<object>, reasons?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CJ_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.probeId != null ||
      (Array.isArray(plan.targets) && plan.targets.length > 0);
    if (!hasAnyId) {
      return {
        valid: false,
        code: CJ_CODES.EMPTY_PROBE_DENY,
        reason: 'Empty probe plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.probeId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CJ_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CJ_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
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
        code: CJ_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
        reason:
          'Plan claims GH Enterprise enforcement (NON-CLAIM: ≠ GHE enforcement)'
      };
    }

    const probeId = normalizeIdStrict(plan.probeId);
    if (!probeId) {
      return {
        valid: false,
        code: CJ_CODES.MISSING_PROBE_ID_DENY,
        reason: 'probeId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(probeId)) {
      return {
        valid: false,
        code: CJ_CODES.FUNDACION_ALWAYS_DENY,
        reason:
          'probeId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (!Array.isArray(plan.targets) || plan.targets.length === 0) {
      return {
        valid: false,
        code: CJ_CODES.MISSING_TARGETS_DENY,
        reason: 'targets must be a non-empty array (1..CJ_MAX)'
      };
    }

    if (plan.targets.length > this.maxTargets) {
      return {
        valid: false,
        code: CJ_CODES.OVERSIZED_TARGETS_DENY,
        reason: `Targets exceed max bound (${this.maxTargets}); got ${plan.targets.length}`
      };
    }

    /** @type {Array<object>} */
    const targets = [];
    for (let i = 0; i < plan.targets.length; i++) {
      const t = plan.targets[i];
      if (t == null || typeof t !== 'object') {
        return {
          valid: false,
          code: CJ_CODES.MALFORMED_PLAN_DENY,
          reason: `targets[${i}] must be a non-null object`
        };
      }

      if (
        isFundacionTarget(t.claimId) ||
        isFundacionTarget(t.target) ||
        isFundacionTarget(t.label)
      ) {
        return {
          valid: false,
          code: CJ_CODES.FUNDACION_ALWAYS_DENY,
          reason: `targets[${i}] touches Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      if (claimsGheEnforcement(t) || claimsGheEnforcement(t.label)) {
        return {
          valid: false,
          code: CJ_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
          reason: `targets[${i}] claims GH Enterprise enforcement (NON-CLAIM)`
        };
      }

      const claimId = normalizeIdStrict(t.claimId);
      if (!claimId) {
        return {
          valid: false,
          code: CJ_CODES.INVALID_CLAIM_ID_DENY,
          reason: `targets[${i}].claimId must be a non-empty valid identifier`
        };
      }

      const claimedStatus =
        t.claimedStatus != null
          ? String(t.claimedStatus).trim().toUpperCase()
          : '';
      if (!claimedStatus || !CJ_CLAIM_STATUSES.includes(claimedStatus)) {
        return {
          valid: false,
          code: CJ_CODES.INVALID_CLAIM_STATUS_DENY,
          reason:
            `targets[${i}].claimedStatus must be MEASURED|UNKNOWN|BLOCKED`
        };
      }

      targets.push({
        claimId,
        claimedStatus,
        evidenceDigest:
          t.evidenceDigest != null && t.evidenceDigest !== ''
            ? String(t.evidenceDigest)
            : null,
        expectedDigest:
          t.expectedDigest != null && t.expectedDigest !== ''
            ? String(t.expectedDigest)
            : null,
        evidenceQuality:
          t.evidenceQuality != null
            ? String(t.evidenceQuality).trim().toLowerCase()
            : null,
        label: t.label != null ? String(t.label) : null
      });
    }

    /** @type {string[]} */
    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      for (const r of plan.reasons) {
        if (r != null) reasons.push(String(r));
      }
    }

    return {
      valid: true,
      code: CJ_CODES.PLAN_VALID_OK,
      probeId,
      targets,
      reasons
    };
  }
}

export default {
  CJ_POLICY_GATE_PRODUCTION_READY,
  CJ_POLICY_GATE_KIND,
  CJ_MAX_TARGETS,
  CJ_ID_PATTERN,
  CJ_CODES,
  scanForSecrets,
  claimsGheEnforcement,
  isFundacionTarget,
  normalizeIdStrict,
  AdversarialVerificationPolicyGate
};
