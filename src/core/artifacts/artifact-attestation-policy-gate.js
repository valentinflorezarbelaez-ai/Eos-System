/**
 * @module artifact-attestation-policy-gate
 * SPEC-0097 / Mission CN — Policy Gate for Governed Artifact / SBOM Attestation.
 * Fail-closed validation for attest plans, Law VI secret screening,
 * Fundacion write barrier, artifact/component bounds, empty/oversize lists,
 * tampered/invalid digests, and rejection of commercial SBOM/Sigstore/GHE claim labels.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Governed Artifact / SBOM Attestation ≠ commercial SBOM SaaS /
 * ≠ Sigstore product / ≠ public package registry / ≠ SLSA commercial product /
 * ≠ claims GH Enterprise enforcement / ≠ Fundacion writes.
 * Extends BF local RC notary themes — do NOT reopen L19.
 */

import { sha256Canonical } from './artifact-attestation-receipt.js';

/** @type {'NO'} */
export const CN_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CN_POLICY_GATE_KIND = 'eos-artifact-attestation-policy-gate';

/** Default maximum artifacts per attest plan. */
export const CN_MAX_ARTIFACTS = 64;

/** Default maximum components per artifact. */
export const CN_MAX_COMPONENTS = 256;

/**
 * Id pattern (alphanumeric / mission-code / SPEC / artifact style).
 */
export const CN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CN_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  ATTEST_PASS: 'ATTEST_PASS',
  ATTEST_DENY: 'ATTEST_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_ARTIFACTS_DENY: 'MISSING_ARTIFACTS_DENY',
  OVERSIZED_ARTIFACTS_DENY: 'OVERSIZED_ARTIFACTS_DENY',
  OVERSIZED_COMPONENTS_DENY: 'OVERSIZED_COMPONENTS_DENY',
  INVALID_ARTIFACT_ID_DENY: 'INVALID_ARTIFACT_ID_DENY',
  MISSING_SBOM_DIGEST_DENY: 'MISSING_SBOM_DIGEST_DENY',
  INVALID_SBOM_DIGEST_DENY: 'INVALID_SBOM_DIGEST_DENY',
  INVALID_BIND_DIGEST_DENY: 'INVALID_BIND_DIGEST_DENY',
  INVALID_LINK_DIGEST_DENY: 'INVALID_LINK_DIGEST_DENY',
  TAMPERED_DIGEST_DENY: 'TAMPERED_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  COMMERCIAL_SBOM_CLAIM_DENY: 'COMMERCIAL_SBOM_CLAIM_DENY',
  SIGSTORE_CLAIM_DENY: 'SIGSTORE_CLAIM_DENY',
  PUBLIC_REGISTRY_CLAIM_DENY: 'PUBLIC_REGISTRY_CLAIM_DENY',
  SLSA_COMMERCIAL_CLAIM_DENY: 'SLSA_COMMERCIAL_CLAIM_DENY',
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

const COMMERCIAL_SBOM_PATTERNS = [
  /commercial\s+SBOM\s+SaaS/i,
  /SBOM\s+SaaS\s+product/i,
  /commercial\s+SBOM\s+product/i,
  /SBOM\s+as\s+a\s+service/i
];

const SIGSTORE_PATTERNS = [
  /Sigstore\s+product/i,
  /commercial\s+Sigstore/i,
  /Sigstore\s+SaaS/i,
  /fulcio\s+rekor\s+product/i
];

const PUBLIC_REGISTRY_PATTERNS = [
  /public\s+package\s+registry/i,
  /public\s+registry\s+publish/i,
  /npm\s+public\s+registry\s+product/i,
  /commercial\s+public\s+registry/i
];

const SLSA_COMMERCIAL_PATTERNS = [
  /SLSA\s+commercial\s+product/i,
  /commercial\s+SLSA\s+product/i,
  /SLSA\s+SaaS/i
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
export function claimsCommercialSbom(value) {
  return matchesAnyPattern(value, COMMERCIAL_SBOM_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsSigstoreProduct(value) {
  return matchesAnyPattern(value, SIGSTORE_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsPublicRegistry(value) {
  return matchesAnyPattern(value, PUBLIC_REGISTRY_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsSlsaCommercial(value) {
  return matchesAnyPattern(value, SLSA_COMMERCIAL_PATTERNS);
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
  if (!CN_ID_PATTERN.test(s)) return null;
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
 * Policy Gate validator for Artifact / SBOM Attestation plans.
 */
export class ArtifactAttestationPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxArtifacts]
   * @param {number} [options.maxComponents]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxArtifacts =
      options.maxArtifacts != null
        ? Number(options.maxArtifacts)
        : CN_MAX_ARTIFACTS;
    this.maxComponents =
      options.maxComponents != null
        ? Number(options.maxComponents)
        : CN_MAX_COMPONENTS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate an attest plan before PASS|DENY decision.
   * Fail-closed. Require planId + 1..CN_MAX artifacts with valid artifactId
   * and sha256 sbomDigest (optional packagePath, prior CM bindDigest, prior CL linkDigest).
   * Reject empty plans, Fundacion, secrets, commercial SBOM/Sigstore/registry/SLSA/GHE
   * claim labels, tampered digests, and oversize artifact/component lists.
   *
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, planId?: string, artifacts?: Array<object>, reasons?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CN_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      (Array.isArray(plan.artifacts) && plan.artifacts.length > 0);
    if (!hasAnyId) {
      return {
        valid: false,
        code: CN_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty attest plan rejected fail-closed'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.planId) ||
      isFundacionTarget(plan.payload) ||
      isFundacionTarget(plan.packagePath)
    ) {
      return {
        valid: false,
        code: CN_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CN_CODES.SECRET_DETECTED_DENY,
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
        code: CN_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
        reason:
          'Plan claims GH Enterprise enforcement (NON-CLAIM: ≠ GHE enforcement)'
      };
    }

    if (
      claimsCommercialSbom(plan) ||
      claimsCommercialSbom(plan.label) ||
      claimsCommercialSbom(plan.labels) ||
      claimsCommercialSbom(plan.description)
    ) {
      return {
        valid: false,
        code: CN_CODES.COMMERCIAL_SBOM_CLAIM_DENY,
        reason:
          'Plan claims commercial SBOM SaaS (NON-CLAIM: ≠ commercial SBOM SaaS)'
      };
    }

    if (
      claimsSigstoreProduct(plan) ||
      claimsSigstoreProduct(plan.label) ||
      claimsSigstoreProduct(plan.labels) ||
      claimsSigstoreProduct(plan.description)
    ) {
      return {
        valid: false,
        code: CN_CODES.SIGSTORE_CLAIM_DENY,
        reason: 'Plan claims Sigstore product (NON-CLAIM: ≠ Sigstore product)'
      };
    }

    if (
      claimsPublicRegistry(plan) ||
      claimsPublicRegistry(plan.label) ||
      claimsPublicRegistry(plan.labels) ||
      claimsPublicRegistry(plan.description)
    ) {
      return {
        valid: false,
        code: CN_CODES.PUBLIC_REGISTRY_CLAIM_DENY,
        reason:
          'Plan claims public package registry (NON-CLAIM: ≠ public registry)'
      };
    }

    if (
      claimsSlsaCommercial(plan) ||
      claimsSlsaCommercial(plan.label) ||
      claimsSlsaCommercial(plan.labels) ||
      claimsSlsaCommercial(plan.description)
    ) {
      return {
        valid: false,
        code: CN_CODES.SLSA_COMMERCIAL_CLAIM_DENY,
        reason:
          'Plan claims SLSA commercial product (NON-CLAIM: ≠ SLSA commercial)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CN_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CN_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (!Array.isArray(plan.artifacts) || plan.artifacts.length === 0) {
      return {
        valid: false,
        code: CN_CODES.MISSING_ARTIFACTS_DENY,
        reason: 'artifacts must be a non-empty array (1..CN_MAX)'
      };
    }

    if (plan.artifacts.length > this.maxArtifacts) {
      return {
        valid: false,
        code: CN_CODES.OVERSIZED_ARTIFACTS_DENY,
        reason: `Artifact set exceeds max bound (${this.maxArtifacts}); got ${plan.artifacts.length}`
      };
    }

    /** @type {Array<object>} */
    const artifacts = [];
    for (let i = 0; i < plan.artifacts.length; i++) {
      const a = plan.artifacts[i];
      if (a == null || typeof a !== 'object') {
        return {
          valid: false,
          code: CN_CODES.MALFORMED_PLAN_DENY,
          reason: `artifacts[${i}] must be a non-null object`
        };
      }

      if (
        isFundacionTarget(a.artifactId) ||
        isFundacionTarget(a.packagePath) ||
        isFundacionTarget(a.label)
      ) {
        return {
          valid: false,
          code: CN_CODES.FUNDACION_ALWAYS_DENY,
          reason: `artifacts[${i}] touches Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      if (
        claimsGheEnforcement(a) ||
        claimsCommercialSbom(a) ||
        claimsSigstoreProduct(a) ||
        claimsPublicRegistry(a) ||
        claimsSlsaCommercial(a)
      ) {
        const code = claimsGheEnforcement(a)
          ? CN_CODES.GHE_ENFORCEMENT_CLAIM_DENY
          : claimsCommercialSbom(a)
            ? CN_CODES.COMMERCIAL_SBOM_CLAIM_DENY
            : claimsSigstoreProduct(a)
              ? CN_CODES.SIGSTORE_CLAIM_DENY
              : claimsPublicRegistry(a)
                ? CN_CODES.PUBLIC_REGISTRY_CLAIM_DENY
                : CN_CODES.SLSA_COMMERCIAL_CLAIM_DENY;
        return {
          valid: false,
          code,
          reason: `artifacts[${i}] asserts a NON-CLAIM product surface`
        };
      }

      const artifactId = normalizeIdStrict(a.artifactId);
      if (!artifactId) {
        return {
          valid: false,
          code: CN_CODES.INVALID_ARTIFACT_ID_DENY,
          reason: `artifacts[${i}].artifactId must be a non-empty valid identifier`
        };
      }

      if (a.sbomDigest == null || String(a.sbomDigest).trim() === '') {
        return {
          valid: false,
          code: CN_CODES.MISSING_SBOM_DIGEST_DENY,
          reason: `artifacts[${i}].sbomDigest is required (sha256 hex)`
        };
      }

      const sbomDigest = String(a.sbomDigest).trim();
      if (isTamperedDigest(sbomDigest)) {
        return {
          valid: false,
          code: CN_CODES.TAMPERED_DIGEST_DENY,
          reason: `artifacts[${i}].sbomDigest appears tampered (fail-closed)`
        };
      }
      if (!SHA256_HEX_RE.test(sbomDigest)) {
        return {
          valid: false,
          code: CN_CODES.INVALID_SBOM_DIGEST_DENY,
          reason: `artifacts[${i}].sbomDigest must be sha256 hex`
        };
      }

      let bindDigest = null;
      if (a.bindDigest != null && String(a.bindDigest).trim() !== '') {
        bindDigest = String(a.bindDigest).trim();
        if (isTamperedDigest(bindDigest)) {
          return {
            valid: false,
            code: CN_CODES.TAMPERED_DIGEST_DENY,
            reason: `artifacts[${i}].bindDigest appears tampered (fail-closed)`
          };
        }
        if (!SHA256_HEX_RE.test(bindDigest)) {
          return {
            valid: false,
            code: CN_CODES.INVALID_BIND_DIGEST_DENY,
            reason: `artifacts[${i}].bindDigest must be sha256 hex when present (prior CM)`
          };
        }
      }

      let linkDigest = null;
      if (a.linkDigest != null && String(a.linkDigest).trim() !== '') {
        linkDigest = String(a.linkDigest).trim();
        if (isTamperedDigest(linkDigest)) {
          return {
            valid: false,
            code: CN_CODES.TAMPERED_DIGEST_DENY,
            reason: `artifacts[${i}].linkDigest appears tampered (fail-closed)`
          };
        }
        if (!SHA256_HEX_RE.test(linkDigest)) {
          return {
            valid: false,
            code: CN_CODES.INVALID_LINK_DIGEST_DENY,
            reason: `artifacts[${i}].linkDigest must be sha256 hex when present (prior CL)`
          };
        }
      }

      const packagePath =
        a.packagePath != null && String(a.packagePath).trim() !== ''
          ? String(a.packagePath).trim()
          : null;

      if (packagePath && isFundacionTarget(packagePath)) {
        return {
          valid: false,
          code: CN_CODES.FUNDACION_ALWAYS_DENY,
          reason: `artifacts[${i}].packagePath touches Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      let components = null;
      if (a.components != null) {
        if (!Array.isArray(a.components)) {
          return {
            valid: false,
            code: CN_CODES.MALFORMED_PLAN_DENY,
            reason: `artifacts[${i}].components must be an array when present`
          };
        }
        if (a.components.length > this.maxComponents) {
          return {
            valid: false,
            code: CN_CODES.OVERSIZED_COMPONENTS_DENY,
            reason: `artifacts[${i}].components exceeds max bound (${this.maxComponents}); got ${a.components.length}`
          };
        }
        components = a.components.map((c) => {
          if (c == null || typeof c !== 'object') {
            return { name: String(c), version: null, digest: null };
          }
          return {
            name: c.name != null ? String(c.name) : 'unknown',
            version: c.version != null ? String(c.version) : null,
            digest:
              c.digest != null && String(c.digest).trim() !== ''
                ? String(c.digest).trim()
                : null
          };
        });
      }

      artifacts.push({
        artifactId,
        sbomDigest,
        packagePath,
        bindDigest,
        linkDigest,
        components,
        label: a.label != null ? String(a.label) : null
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
      code: CN_CODES.PLAN_VALID_OK,
      planId,
      artifacts,
      reasons
    };
  }
}

export default {
  CN_POLICY_GATE_PRODUCTION_READY,
  CN_POLICY_GATE_KIND,
  CN_MAX_ARTIFACTS,
  CN_MAX_COMPONENTS,
  CN_ID_PATTERN,
  CN_CODES,
  scanForSecrets,
  claimsGheEnforcement,
  claimsCommercialSbom,
  claimsSigstoreProduct,
  claimsPublicRegistry,
  claimsSlsaCommercial,
  isFundacionTarget,
  normalizeIdStrict,
  isTamperedDigest,
  ArtifactAttestationPolicyGate
};
