/**
 * @module release-integrity-policy-gate
 * SPEC-0098 / Mission CO — Policy Gate for Release Integrity & Progressive Honesty.
 * Fail-closed validation for govern plans, Law VI secret screening,
 * Fundacion write barrier, claim bounds, empty/oversize lists,
 * tampered/invalid digests, PRODUCTION_READY=YES flip claims,
 * and rejection of Argo/Flagger / real canary / progressive-delivery SaaS / GHE claim labels.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Release Integrity Governor ≠ Argo/Flagger / ≠ real canary /
 * ≠ progressive-delivery SaaS / ≠ GHE enforcement / ≠ Fundacion writes /
 * ≠ PRODUCTION_READY flip.
 */

import { sha256Canonical, CO_HONESTY_MODES } from './release-integrity-receipt.js';

/** @type {'NO'} */
export const CO_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CO_POLICY_GATE_KIND = 'eos-release-integrity-policy-gate';

/** Default maximum claims per govern plan. */
export const CO_MAX_CLAIMS = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / release style).
 */
export const CO_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CO_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  GOVERN_PASS: 'GOVERN_PASS',
  GOVERN_DENY: 'GOVERN_DENY',
  GOVERN_HOLD: 'GOVERN_HOLD',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_RELEASE_ID_DENY: 'MISSING_RELEASE_ID_DENY',
  MISSING_INTEGRITY_DIGEST_DENY: 'MISSING_INTEGRITY_DIGEST_DENY',
  MISSING_HONESTY_MODE_DENY: 'MISSING_HONESTY_MODE_DENY',
  INVALID_HONESTY_MODE_DENY: 'INVALID_HONESTY_MODE_DENY',
  OVERSIZED_CLAIMS_DENY: 'OVERSIZED_CLAIMS_DENY',
  INVALID_CLAIM_ID_DENY: 'INVALID_CLAIM_ID_DENY',
  INVALID_INTEGRITY_DIGEST_DENY: 'INVALID_INTEGRITY_DIGEST_DENY',
  INVALID_ATTEST_DIGEST_DENY: 'INVALID_ATTEST_DIGEST_DENY',
  INVALID_BIND_DIGEST_DENY: 'INVALID_BIND_DIGEST_DENY',
  INVALID_LINK_DIGEST_DENY: 'INVALID_LINK_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  PRODUCTION_READY_FLIP_DENY: 'PRODUCTION_READY_FLIP_DENY',
  ARGO_FLAGGER_CLAIM_DENY: 'ARGO_FLAGGER_CLAIM_DENY',
  REAL_CANARY_CLAIM_DENY: 'REAL_CANARY_CLAIM_DENY',
  PROGRESSIVE_DELIVERY_SAAS_CLAIM_DENY: 'PROGRESSIVE_DELIVERY_SAAS_CLAIM_DENY',
  GHE_ENFORCEMENT_CLAIM_DENY: 'GHE_ENFORCEMENT_CLAIM_DENY',
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
  /enterprise\s+enforcement\s+via\s+github/i
];

const ARGO_FLAGGER_PATTERNS = [
  /Argo\s*Rollouts?\s*product/i,
  /Flagger\s*product/i,
  /Argo\/Flagger/i,
  /commercial\s+Argo\s+Flagger/i,
  /Argo\s+CD\s+progressive\s+delivery\s+product/i
];

const REAL_CANARY_PATTERNS = [
  /real\s+canary\s+deploy/i,
  /live\s+canary\s+traffic/i,
  /production\s+canary\s+split/i,
  /real\s+canary/i,
  /actual\s+canary\s+deployment/i
];

const PROGRESSIVE_DELIVERY_SAAS_PATTERNS = [
  /progressive\s+delivery\s+SaaS/i,
  /commercial\s+progressive\s+delivery/i,
  /progressive\s+delivery\s+product/i,
  /canary\s+SaaS\s+product/i
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
        'honestyMode'
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
export function claimsArgoFlagger(value) {
  return matchesAnyPattern(value, ARGO_FLAGGER_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsRealCanary(value) {
  return matchesAnyPattern(value, REAL_CANARY_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsProgressiveDeliverySaas(value) {
  return matchesAnyPattern(value, PROGRESSIVE_DELIVERY_SAAS_PATTERNS);
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
  if (!CO_ID_PATTERN.test(s)) return null;
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
 * @param {unknown} digest
 * @param {string} fieldName
 * @param {string} invalidCode
 * @returns {{ ok: true, digest: string|null } | { ok: false, code: string, reason: string }}
 */
function validateOptionalSha256(digest, fieldName, invalidCode) {
  if (digest == null || String(digest).trim() === '') {
    return { ok: true, digest: null };
  }
  const d = String(digest).trim();
  if (isTamperedDigest(d)) {
    return {
      ok: false,
      code: CO_CODES.TAMPERED_DIGEST_DENY,
      reason: `${fieldName} appears tampered (fail-closed)`
    };
  }
  if (!SHA256_HEX_RE.test(d)) {
    return {
      ok: false,
      code: invalidCode,
      reason: `${fieldName} must be sha256 hex when present`
    };
  }
  return { ok: true, digest: d };
}

/**
 * Policy Gate validator for Release Integrity / Progressive Honesty plans.
 */
export class ReleaseIntegrityPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxClaims]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxClaims =
      options.maxClaims != null ? Number(options.maxClaims) : CO_MAX_CLAIMS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a govern plan before PASS|DENY|HOLD decision.
   * Fail-closed. Require planId + releaseId + integrityDigest (or non-empty claims)
   * + honestyMode in HOLD|PROMOTE|ROLLBACK_HINT.
   * Optional prior CN attestDigest / CM bindDigest / CL linkDigest.
   * Reject empty plans, Fundacion, secrets, PRODUCTION_READY=YES flip,
   * Argo/Flagger / real canary / progressive-delivery SaaS / GHE claim labels,
   * tampered digests, and oversize claim lists.
   *
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, planId?: string, releaseId?: string, integrityDigest?: string, honestyMode?: string, attestDigest?: string|null, bindDigest?: string|null, linkDigest?: string|null, claims?: Array<object>, reasons?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CO_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      plan.releaseId != null ||
      (Array.isArray(plan.claims) && plan.claims.length > 0) ||
      (plan.integrityDigest != null &&
        String(plan.integrityDigest).trim() !== '');
    if (!hasAnyId) {
      return {
        valid: false,
        code: CO_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty govern plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.releaseId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CO_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CO_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    if (
      claimsProductionReadyFlip(plan) ||
      claimsProductionReadyFlip(plan.label) ||
      claimsProductionReadyFlip(plan.labels) ||
      claimsProductionReadyFlip(plan.description) ||
      claimsProductionReadyFlip(plan.claims)
    ) {
      return {
        valid: false,
        code: CO_CODES.PRODUCTION_READY_FLIP_DENY,
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
        code: CO_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
        reason:
          'Plan claims GH Enterprise enforcement (NON-CLAIM: ≠ GHE enforcement)'
      };
    }

    if (
      claimsArgoFlagger(plan) ||
      claimsArgoFlagger(plan.label) ||
      claimsArgoFlagger(plan.labels) ||
      claimsArgoFlagger(plan.description)
    ) {
      return {
        valid: false,
        code: CO_CODES.ARGO_FLAGGER_CLAIM_DENY,
        reason:
          'Plan claims Argo/Flagger product (NON-CLAIM: ≠ Argo/Flagger)'
      };
    }

    if (
      claimsRealCanary(plan) ||
      claimsRealCanary(plan.label) ||
      claimsRealCanary(plan.labels) ||
      claimsRealCanary(plan.description)
    ) {
      return {
        valid: false,
        code: CO_CODES.REAL_CANARY_CLAIM_DENY,
        reason: 'Plan claims real canary deploy (NON-CLAIM: ≠ real canary)'
      };
    }

    if (
      claimsProgressiveDeliverySaas(plan) ||
      claimsProgressiveDeliverySaas(plan.label) ||
      claimsProgressiveDeliverySaas(plan.labels) ||
      claimsProgressiveDeliverySaas(plan.description)
    ) {
      return {
        valid: false,
        code: CO_CODES.PROGRESSIVE_DELIVERY_SAAS_CLAIM_DENY,
        reason:
          'Plan claims progressive-delivery SaaS (NON-CLAIM: ≠ progressive-delivery SaaS)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CO_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CO_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const releaseId = normalizeIdStrict(plan.releaseId);
    if (!releaseId) {
      return {
        valid: false,
        code: CO_CODES.MISSING_RELEASE_ID_DENY,
        reason: 'releaseId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(releaseId)) {
      return {
        valid: false,
        code: CO_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'releaseId targets Fundacion (Fundacion Δ=0 invariant)'
      };
    }

    if (plan.honestyMode == null || String(plan.honestyMode).trim() === '') {
      return {
        valid: false,
        code: CO_CODES.MISSING_HONESTY_MODE_DENY,
        reason:
          'honestyMode is required (HOLD|PROMOTE|ROLLBACK_HINT — hermetic labels only)'
      };
    }
    const honestyMode = String(plan.honestyMode).trim().toUpperCase();
    if (!CO_HONESTY_MODES.includes(honestyMode)) {
      return {
        valid: false,
        code: CO_CODES.INVALID_HONESTY_MODE_DENY,
        reason:
          'honestyMode must be HOLD|PROMOTE|ROLLBACK_HINT (hermetic labels — NOT real deploy)'
      };
    }

    const hasIntegrityDigest =
      plan.integrityDigest != null &&
      String(plan.integrityDigest).trim() !== '';
    const hasClaims =
      Array.isArray(plan.claims) && plan.claims.length > 0;

    if (!hasIntegrityDigest && !hasClaims) {
      return {
        valid: false,
        code: CO_CODES.MISSING_INTEGRITY_DIGEST_DENY,
        reason:
          'integrityDigest (sha256) or non-empty claims[] is required'
      };
    }

    let integrityDigest = null;
    if (hasIntegrityDigest) {
      integrityDigest = String(plan.integrityDigest).trim();
      if (isTamperedDigest(integrityDigest)) {
        return {
          valid: false,
          code: CO_CODES.TAMPERED_DIGEST_DENY,
          reason: 'integrityDigest appears tampered (fail-closed)'
        };
      }
      if (!SHA256_HEX_RE.test(integrityDigest)) {
        return {
          valid: false,
          code: CO_CODES.INVALID_INTEGRITY_DIGEST_DENY,
          reason: 'integrityDigest must be sha256 hex'
        };
      }
    }

    const attestRes = validateOptionalSha256(
      plan.attestDigest,
      'attestDigest',
      CO_CODES.INVALID_ATTEST_DIGEST_DENY
    );
    if (!attestRes.ok) {
      return {
        valid: false,
        code: attestRes.code,
        reason: attestRes.reason
      };
    }

    const bindRes = validateOptionalSha256(
      plan.bindDigest,
      'bindDigest',
      CO_CODES.INVALID_BIND_DIGEST_DENY
    );
    if (!bindRes.ok) {
      return {
        valid: false,
        code: bindRes.code,
        reason: bindRes.reason
      };
    }

    const linkRes = validateOptionalSha256(
      plan.linkDigest,
      'linkDigest',
      CO_CODES.INVALID_LINK_DIGEST_DENY
    );
    if (!linkRes.ok) {
      return {
        valid: false,
        code: linkRes.code,
        reason: linkRes.reason
      };
    }

    /** @type {Array<object>} */
    const claims = [];
    if (hasClaims) {
      if (plan.claims.length > this.maxClaims) {
        return {
          valid: false,
          code: CO_CODES.OVERSIZED_CLAIMS_DENY,
          reason: `Claim set exceeds max bound (${this.maxClaims}); got ${plan.claims.length}`
        };
      }
      for (let i = 0; i < plan.claims.length; i++) {
        const c = plan.claims[i];
        if (c == null || typeof c !== 'object') {
          return {
            valid: false,
            code: CO_CODES.MALFORMED_PLAN_DENY,
            reason: `claims[${i}] must be a non-null object`
          };
        }
        if (
          isFundacionTarget(c.claimId) ||
          isFundacionTarget(c.id) ||
          isFundacionTarget(c.label)
        ) {
          return {
            valid: false,
            code: CO_CODES.FUNDACION_ALWAYS_DENY,
            reason: `claims[${i}] touches Fundacion (Fundacion Δ=0 invariant)`
          };
        }
        if (
          claimsGheEnforcement(c) ||
          claimsArgoFlagger(c) ||
          claimsRealCanary(c) ||
          claimsProgressiveDeliverySaas(c) ||
          claimsProductionReadyFlip(c)
        ) {
          const code = claimsProductionReadyFlip(c)
            ? CO_CODES.PRODUCTION_READY_FLIP_DENY
            : claimsGheEnforcement(c)
              ? CO_CODES.GHE_ENFORCEMENT_CLAIM_DENY
              : claimsArgoFlagger(c)
                ? CO_CODES.ARGO_FLAGGER_CLAIM_DENY
                : claimsRealCanary(c)
                  ? CO_CODES.REAL_CANARY_CLAIM_DENY
                  : CO_CODES.PROGRESSIVE_DELIVERY_SAAS_CLAIM_DENY;
          return {
            valid: false,
            code,
            reason: `claims[${i}] asserts a NON-CLAIM product surface`
          };
        }
        const claimId = normalizeIdStrict(c.claimId != null ? c.claimId : c.id);
        if (!claimId) {
          return {
            valid: false,
            code: CO_CODES.INVALID_CLAIM_ID_DENY,
            reason: `claims[${i}].claimId must be a non-empty valid identifier`
          };
        }
        let claimDigest = null;
        if (c.digest != null && String(c.digest).trim() !== '') {
          claimDigest = String(c.digest).trim();
          if (isTamperedDigest(claimDigest)) {
            return {
              valid: false,
              code: CO_CODES.TAMPERED_DIGEST_DENY,
              reason: `claims[${i}].digest appears tampered (fail-closed)`
            };
          }
          if (!SHA256_HEX_RE.test(claimDigest)) {
            return {
              valid: false,
              code: CO_CODES.INVALID_INTEGRITY_DIGEST_DENY,
              reason: `claims[${i}].digest must be sha256 hex when present`
            };
          }
        }
        claims.push({
          claimId,
          claimType:
            c.claimType != null
              ? String(c.claimType)
              : c.type != null
                ? String(c.type)
                : null,
          digest: claimDigest,
          label: c.label != null ? String(c.label) : null
        });
      }
    }

    if (!integrityDigest) {
      integrityDigest = this.hashFn({
        releaseId,
        claims,
        honestyMode
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
      code: CO_CODES.PLAN_VALID_OK,
      planId,
      releaseId,
      integrityDigest,
      honestyMode,
      attestDigest: attestRes.digest,
      bindDigest: bindRes.digest,
      linkDigest: linkRes.digest,
      claims,
      reasons
    };
  }
}

export default {
  CO_POLICY_GATE_PRODUCTION_READY,
  CO_POLICY_GATE_KIND,
  CO_MAX_CLAIMS,
  CO_ID_PATTERN,
  CO_CODES,
  scanForSecrets,
  claimsGheEnforcement,
  claimsArgoFlagger,
  claimsRealCanary,
  claimsProgressiveDeliverySaas,
  claimsProductionReadyFlip,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  ReleaseIntegrityPolicyGate
};
