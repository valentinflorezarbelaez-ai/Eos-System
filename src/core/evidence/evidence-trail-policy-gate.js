/**
 * @module evidence-trail-policy-gate
 * SPEC-0101 / Mission CR — Policy Gate for Evidence Trail Ritual Binding Port.
 * Fail-closed validation for trail verify plans, Law VI secret screening,
 * Fundacion write barrier, SIEM/data-lake/WORM/GHE claim labels,
 * PRODUCTION_READY=YES flip claims, and trailMode honesty.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Evidence Trail Ritual Binding ≠ SIEM / ≠ production data lake /
 * ≠ WORM SaaS / ≠ Sigstore / ≠ GHE / ≠ auto-close L26 / ≠ new schemas JSON /
 * ≠ Fundacion writes / ≠ PRODUCTION_READY flip / ≠ L27 closeout.
 */

import {
  sha256Canonical,
  CR_TRAIL_MODES,
  CR_TRAIL_KIND,
  CR_PORT_ORDER
} from './evidence-trail-receipt.js';

/** @type {'NO'} */
export const CR_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CR_POLICY_GATE_KIND = 'eos-evidence-trail-policy-gate';

/** Default maximum reasons per verify plan. */
export const CR_MAX_REASONS = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / trail style).
 */
export const CR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CR_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  VERIFY_PASS: 'VERIFY_PASS',
  VERIFY_DENY: 'VERIFY_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_TRAIL_DENY: 'MISSING_TRAIL_DENY',
  MISSING_TRAIL_MODE_DENY: 'MISSING_TRAIL_MODE_DENY',
  INVALID_TRAIL_MODE_DENY: 'INVALID_TRAIL_MODE_DENY',
  MISSING_LINKS_DENY: 'MISSING_LINKS_DENY',
  ORDER_VIOLATION_DENY: 'ORDER_VIOLATION_DENY',
  CHAIN_BREAK_DENY: 'CHAIN_BREAK_DENY',
  DIRTY_TREE_DENY: 'DIRTY_TREE_DENY',
  FREEZE_LAG_DENY: 'FREEZE_LAG_DENY',
  MISMATCHED_HASH_DENY: 'MISMATCHED_HASH_DENY',
  UNVERIFIABLE_DENY: 'UNVERIFIABLE_DENY',
  SAMPLE_AS_LIVE_DENY: 'SAMPLE_AS_LIVE_DENY',
  REPLAY_DENY: 'REPLAY_DENY',
  CROSS_PORT_MISMATCH_DENY: 'CROSS_PORT_MISMATCH_DENY',
  PORT_DECISION_DENY: 'PORT_DECISION_DENY',
  SCHEMA_KIND_DENY: 'SCHEMA_KIND_DENY',
  NON_CLAIM_VIOLATION_DENY: 'NON_CLAIM_VIOLATION_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVERSIZED_REASONS_DENY: 'OVERSIZED_REASONS_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  SIEM_CLAIM_DENY: 'SIEM_CLAIM_DENY',
  DATA_LAKE_CLAIM_DENY: 'DATA_LAKE_CLAIM_DENY',
  WORM_SAAS_CLAIM_DENY: 'WORM_SAAS_CLAIM_DENY',
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

const GHE_ENFORCEMENT_PATTERNS = [
  /github\s*enterprise\s*enforcement/i,
  /gh\s*enterprise\s*enforcement/i,
  /ghe\s*enforcement/i,
  /claims?\s+ghe\s+enforcement/i,
  /required[\s-]?check\s+enforcement/i,
  /enterprise\s+enforcement\s+via\s+github/i
];

const SIEM_PATTERNS = [
  /SIEM\s+retention\s+SaaS/i,
  /SIEM\s+product/i,
  /claims?\s+SIEM/i,
  /security\s+information\s+and\s+event\s+management\s+SaaS/i
];

const DATA_LAKE_PATTERNS = [
  /production\s+data\s+lake/i,
  /data\s+lake\s+SaaS/i,
  /commercial\s+data\s+lake/i,
  /claims?\s+production\s+data\s+lake/i
];

const WORM_SAAS_PATTERNS = [
  /WORM\s+SaaS/i,
  /worm\s+retention\s+saas/i,
  /write[- ]once[- ]read[- ]many\s+saas/i,
  /commercial\s+WORM\s+product/i
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
        'trailMode',
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
export function claimsSiemProduct(value) {
  return matchesAnyPattern(value, SIEM_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsDataLake(value) {
  return matchesAnyPattern(value, DATA_LAKE_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsWormSaas(value) {
  return matchesAnyPattern(value, WORM_SAAS_PATTERNS);
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
  if (!CR_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * Policy Gate validator for Evidence Trail verify plans.
 */
export class EvidenceTrailPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxReasons]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxReasons =
      options.maxReasons != null ? Number(options.maxReasons) : CR_MAX_REASONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a trail verify plan before PASS|DENY decision.
   * Fail-closed. Require planId + trailMode + trail object.
   * Reject empty plans, Fundacion, secrets, PRODUCTION_READY=YES flip,
   * SIEM / data lake / WORM / GHE claim labels.
   *
   * @param {unknown} plan
   * @returns {object}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CR_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      (plan.trail != null && typeof plan.trail === 'object') ||
      (plan.trailId != null && String(plan.trailId).trim() !== '');
    if (!hasAnyId) {
      return {
        valid: false,
        code: CR_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty evidence-trail plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.trailId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CR_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CR_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    // Claim-label scans: operator-facing fields only (label/labels/description).
    // Do NOT scan trail.nonClaims / explicitNonClaims — those legitimately say "≠ SIEM".
    const claimSurface = {
      label: plan.label,
      labels: plan.labels,
      description: plan.description,
      claim: plan.claim,
      claims: plan.claims
    };

    if (claimsProductionReadyFlip(claimSurface)) {
      return {
        valid: false,
        code: CR_CODES.PRODUCTION_READY_FLIP_DENY,
        reason:
          'Plan claims PRODUCTION_READY=YES flip (NON-CLAIM: ≠ PRODUCTION_READY flip)'
      };
    }

    if (claimsGheEnforcement(claimSurface)) {
      return {
        valid: false,
        code: CR_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
        reason:
          'Plan claims GH Enterprise enforcement (NON-CLAIM: ≠ GHE enforcement)'
      };
    }

    if (claimsSiemProduct(claimSurface)) {
      return {
        valid: false,
        code: CR_CODES.SIEM_CLAIM_DENY,
        reason: 'Plan claims SIEM product (NON-CLAIM: trail ≠ SIEM)'
      };
    }

    if (claimsDataLake(claimSurface)) {
      return {
        valid: false,
        code: CR_CODES.DATA_LAKE_CLAIM_DENY,
        reason:
          'Plan claims production data lake (NON-CLAIM: trail ≠ production data lake)'
      };
    }

    if (claimsWormSaas(claimSurface)) {
      return {
        valid: false,
        code: CR_CODES.WORM_SAAS_CLAIM_DENY,
        reason: 'Plan claims WORM SaaS (NON-CLAIM: trail ≠ WORM SaaS)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CR_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CR_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (plan.trailMode == null || String(plan.trailMode).trim() === '') {
      return {
        valid: false,
        code: CR_CODES.MISSING_TRAIL_MODE_DENY,
        reason: 'trailMode is required (FIXTURE|LIVE)'
      };
    }
    const trailMode = String(plan.trailMode).trim().toUpperCase();
    if (!CR_TRAIL_MODES.includes(trailMode)) {
      return {
        valid: false,
        code: CR_CODES.INVALID_TRAIL_MODE_DENY,
        reason: 'trailMode must be FIXTURE|LIVE'
      };
    }

    if (plan.trail == null || typeof plan.trail !== 'object' || Array.isArray(plan.trail)) {
      return {
        valid: false,
        code: CR_CODES.MISSING_TRAIL_DENY,
        reason: 'trail object is required (EvidenceTrail CL→CM→CN document)'
      };
    }

    const trail = plan.trail;

    if (trail.kind != null && String(trail.kind) !== CR_TRAIL_KIND) {
      return {
        valid: false,
        code: CR_CODES.SCHEMA_KIND_DENY,
        reason: `trail.kind must be ${CR_TRAIL_KIND}`
      };
    }

    if (!Array.isArray(trail.links) || trail.links.length === 0) {
      return {
        valid: false,
        code: CR_CODES.MISSING_LINKS_DENY,
        reason: 'trail.links must be a non-empty array (expected CL→CM→CN)'
      };
    }

    /** @type {string[]} */
    const reasons = [];
    if (Array.isArray(plan.reasons)) {
      if (plan.reasons.length > this.maxReasons) {
        return {
          valid: false,
          code: CR_CODES.OVERSIZED_REASONS_DENY,
          reason: `Reasons list exceeds max bound (${this.maxReasons}); got ${plan.reasons.length}`
        };
      }
      for (const r of plan.reasons) {
        if (r != null) reasons.push(String(r));
      }
    }

    return {
      valid: true,
      code: CR_CODES.PLAN_VALID_OK,
      planId,
      trailMode,
      trail,
      trailId:
        trail.trailId != null ? String(trail.trailId) : null,
      reasons,
      expectedOrder: [...CR_PORT_ORDER]
    };
  }
}

export default {
  CR_POLICY_GATE_PRODUCTION_READY,
  CR_POLICY_GATE_KIND,
  CR_MAX_REASONS,
  CR_ID_PATTERN,
  CR_CODES,
  scanForSecrets,
  claimsGheEnforcement,
  claimsSiemProduct,
  claimsDataLake,
  claimsWormSaas,
  claimsProductionReadyFlip,
  isFundacionTarget,
  normalizeIdStrict,
  EvidenceTrailPolicyGate
};
