/**
 * @module evidence-binding-policy-gate
 * SPEC-0096 / Mission CM — Policy Gate for Evidence Binding & Claim Custody.
 * Fail-closed validation for bind plans, Law VI secret screening,
 * Fundacion write barrier, claim bounds, empty/oversize claims,
 * tampered/invalid digests, and rejection of WORM/SIEM/audit/GHE claim labels.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Evidence Binding & Claim Custody ≠ WORM SaaS /
 * ≠ external audit product / ≠ SIEM retention SaaS / ≠ production data lake /
 * ≠ claims GH Enterprise enforcement / ≠ Fundacion writes.
 */

import { sha256Canonical } from './evidence-binding-receipt.js';

/** @type {'NO'} */
export const CM_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CM_POLICY_GATE_KIND = 'eos-evidence-binding-policy-gate';

/** Default maximum claims per bind plan. */
export const CM_MAX_CLAIMS = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / claim style).
 * Examples: plan-001, SPEC-0096, claim.measured.l26-cm-001, eos-ladder-26
 */
export const CM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CM_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  BIND_PASS: 'BIND_PASS',
  BIND_DENY: 'BIND_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_CLAIMS_DENY: 'MISSING_CLAIMS_DENY',
  OVERSIZED_CLAIMS_DENY: 'OVERSIZED_CLAIMS_DENY',
  INVALID_CLAIM_ID_DENY: 'INVALID_CLAIM_ID_DENY',
  MISSING_EVIDENCE_DIGEST_DENY: 'MISSING_EVIDENCE_DIGEST_DENY',
  INVALID_EVIDENCE_DIGEST_DENY: 'INVALID_EVIDENCE_DIGEST_DENY',
  INVALID_LINK_DIGEST_DENY: 'INVALID_LINK_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  WORM_SAAS_CLAIM_DENY: 'WORM_SAAS_CLAIM_DENY',
  EXTERNAL_AUDIT_CLAIM_DENY: 'EXTERNAL_AUDIT_CLAIM_DENY',
  SIEM_CLAIM_DENY: 'SIEM_CLAIM_DENY',
  DATA_LAKE_CLAIM_DENY: 'DATA_LAKE_CLAIM_DENY',
  GHE_ENFORCEMENT_CLAIM_DENY: 'GHE_ENFORCEMENT_CLAIM_DENY',
  DENY: 'DENY'
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

const WORM_SAAS_PATTERNS = [
  /WORM\s+SaaS/i,
  /worm\s+retention\s+saas/i,
  /write[- ]once[- ]read[- ]many\s+saas/i,
  /commercial\s+WORM\s+product/i
];

const EXTERNAL_AUDIT_PATTERNS = [
  /external\s+audit\s+product/i,
  /third[- ]party\s+audit\s+SaaS/i,
  /commercial\s+audit\s+platform/i,
  /external\s+audit\s+SaaS/i
];

const SIEM_PATTERNS = [
  /SIEM\s+retention\s+SaaS/i,
  /SIEM\s+product/i,
  /security\s+information\s+and\s+event\s+management\s+SaaS/i
];

const DATA_LAKE_PATTERNS = [
  /production\s+data\s+lake/i,
  /data\s+lake\s+SaaS/i,
  /commercial\s+data\s+lake/i
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
        'claims'
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
export function claimsWormSaas(value) {
  return matchesAnyPattern(value, WORM_SAAS_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsExternalAuditProduct(value) {
  return matchesAnyPattern(value, EXTERNAL_AUDIT_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsSiemProduct(value) {
  return matchesAnyPattern(value, SIEM_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsDataLake(value) {
  return matchesAnyPattern(value, DATA_LAKE_PATTERNS);
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
  if (!CM_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * Detect obviously tampered digests (wrong length hex that almost looks sha256,
 * or known sentinel tamper markers).
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
 * Policy Gate validator for Evidence Binding / Claim Custody plans.
 */
export class EvidenceBindingPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxClaims]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxClaims =
      options.maxClaims != null ? Number(options.maxClaims) : CM_MAX_CLAIMS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a bind plan before PASS|DENY decision.
   * Fail-closed. Require planId + 1..CM_MAX claims with valid claimId
   * and sha256 evidenceDigest (optional prior CL linkDigest).
   * Reject empty plans, Fundacion, secrets, WORM/SIEM/audit/GHE claim labels,
   * tampered digests, and oversize claim sets.
   *
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, planId?: string, claims?: Array<object>, reasons?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CM_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      (Array.isArray(plan.claims) && plan.claims.length > 0);
    if (!hasAnyId) {
      return {
        valid: false,
        code: CM_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty bind plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CM_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CM_CODES.SECRET_DETECTED_DENY,
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
        code: CM_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
        reason:
          'Plan claims GH Enterprise enforcement (NON-CLAIM: ≠ GHE enforcement)'
      };
    }

    if (
      claimsWormSaas(plan) ||
      claimsWormSaas(plan.label) ||
      claimsWormSaas(plan.labels) ||
      claimsWormSaas(plan.description)
    ) {
      return {
        valid: false,
        code: CM_CODES.WORM_SAAS_CLAIM_DENY,
        reason: 'Plan claims WORM SaaS (NON-CLAIM: ≠ WORM SaaS)'
      };
    }

    if (
      claimsExternalAuditProduct(plan) ||
      claimsExternalAuditProduct(plan.label) ||
      claimsExternalAuditProduct(plan.labels) ||
      claimsExternalAuditProduct(plan.description)
    ) {
      return {
        valid: false,
        code: CM_CODES.EXTERNAL_AUDIT_CLAIM_DENY,
        reason:
          'Plan claims external audit product (NON-CLAIM: ≠ external audit product)'
      };
    }

    if (
      claimsSiemProduct(plan) ||
      claimsSiemProduct(plan.label) ||
      claimsSiemProduct(plan.labels) ||
      claimsSiemProduct(plan.description)
    ) {
      return {
        valid: false,
        code: CM_CODES.SIEM_CLAIM_DENY,
        reason: 'Plan claims SIEM retention SaaS (NON-CLAIM: ≠ SIEM)'
      };
    }

    if (
      claimsDataLake(plan) ||
      claimsDataLake(plan.label) ||
      claimsDataLake(plan.labels) ||
      claimsDataLake(plan.description)
    ) {
      return {
        valid: false,
        code: CM_CODES.DATA_LAKE_CLAIM_DENY,
        reason:
          'Plan claims production data lake (NON-CLAIM: ≠ production data lake)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CM_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CM_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (!Array.isArray(plan.claims) || plan.claims.length === 0) {
      return {
        valid: false,
        code: CM_CODES.MISSING_CLAIMS_DENY,
        reason: 'claims must be a non-empty array (1..CM_MAX)'
      };
    }

    if (plan.claims.length > this.maxClaims) {
      return {
        valid: false,
        code: CM_CODES.OVERSIZED_CLAIMS_DENY,
        reason: `Claim set exceeds max bound (${this.maxClaims}); got ${plan.claims.length}`
      };
    }

    /** @type {Array<object>} */
    const claims = [];
    for (let i = 0; i < plan.claims.length; i++) {
      const c = plan.claims[i];
      if (c == null || typeof c !== 'object') {
        return {
          valid: false,
          code: CM_CODES.MALFORMED_PLAN_DENY,
          reason: `claims[${i}] must be a non-null object`
        };
      }

      if (
        isFundacionTarget(c.claimId) ||
        isFundacionTarget(c.specId) ||
        isFundacionTarget(c.codePath) ||
        isFundacionTarget(c.label)
      ) {
        return {
          valid: false,
          code: CM_CODES.FUNDACION_ALWAYS_DENY,
          reason: `claims[${i}] touches Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      if (
        claimsGheEnforcement(c) ||
        claimsWormSaas(c) ||
        claimsExternalAuditProduct(c) ||
        claimsSiemProduct(c) ||
        claimsDataLake(c)
      ) {
        const code = claimsGheEnforcement(c)
          ? CM_CODES.GHE_ENFORCEMENT_CLAIM_DENY
          : claimsWormSaas(c)
            ? CM_CODES.WORM_SAAS_CLAIM_DENY
            : claimsExternalAuditProduct(c)
              ? CM_CODES.EXTERNAL_AUDIT_CLAIM_DENY
              : claimsSiemProduct(c)
                ? CM_CODES.SIEM_CLAIM_DENY
                : CM_CODES.DATA_LAKE_CLAIM_DENY;
        return {
          valid: false,
          code,
          reason: `claims[${i}] asserts a NON-CLAIM product surface`
        };
      }

      const claimId = normalizeIdStrict(c.claimId);
      if (!claimId) {
        return {
          valid: false,
          code: CM_CODES.INVALID_CLAIM_ID_DENY,
          reason: `claims[${i}].claimId must be a non-empty valid identifier`
        };
      }

      if (c.evidenceDigest == null || String(c.evidenceDigest).trim() === '') {
        return {
          valid: false,
          code: CM_CODES.MISSING_EVIDENCE_DIGEST_DENY,
          reason: `claims[${i}].evidenceDigest is required (sha256 hex)`
        };
      }

      const evidenceDigest = String(c.evidenceDigest).trim();
      if (isTamperedDigest(evidenceDigest)) {
        return {
          valid: false,
          code: CM_CODES.TAMPERED_DIGEST_DENY,
          reason: `claims[${i}].evidenceDigest appears tampered (fail-closed)`
        };
      }
      if (!SHA256_HEX_RE.test(evidenceDigest)) {
        return {
          valid: false,
          code: CM_CODES.INVALID_EVIDENCE_DIGEST_DENY,
          reason: `claims[${i}].evidenceDigest must be sha256 hex`
        };
      }

      let linkDigest = null;
      if (c.linkDigest != null && String(c.linkDigest).trim() !== '') {
        linkDigest = String(c.linkDigest).trim();
        if (isTamperedDigest(linkDigest)) {
          return {
            valid: false,
            code: CM_CODES.TAMPERED_DIGEST_DENY,
            reason: `claims[${i}].linkDigest appears tampered (fail-closed)`
          };
        }
        if (!SHA256_HEX_RE.test(linkDigest)) {
          return {
            valid: false,
            code: CM_CODES.INVALID_LINK_DIGEST_DENY,
            reason: `claims[${i}].linkDigest must be sha256 hex when present (prior CL)`
          };
        }
      }

      const specId =
        c.specId != null && String(c.specId).trim() !== ''
          ? String(c.specId).trim()
          : null;
      const codePath =
        c.codePath != null && String(c.codePath).trim() !== ''
          ? String(c.codePath).trim()
          : null;

      if (codePath && isFundacionTarget(codePath)) {
        return {
          valid: false,
          code: CM_CODES.FUNDACION_ALWAYS_DENY,
          reason: `claims[${i}].codePath touches Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      claims.push({
        claimId,
        evidenceDigest,
        linkDigest,
        specId,
        codePath,
        label: c.label != null ? String(c.label) : null
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
      code: CM_CODES.PLAN_VALID_OK,
      planId,
      claims,
      reasons
    };
  }
}

export default {
  CM_POLICY_GATE_PRODUCTION_READY,
  CM_POLICY_GATE_KIND,
  CM_MAX_CLAIMS,
  CM_ID_PATTERN,
  CM_CODES,
  scanForSecrets,
  claimsGheEnforcement,
  claimsWormSaas,
  claimsExternalAuditProduct,
  claimsSiemProduct,
  claimsDataLake,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  EvidenceBindingPolicyGate
};
