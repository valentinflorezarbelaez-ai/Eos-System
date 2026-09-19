/**
 * @module spec-code-traceability-policy-gate
 * SPEC-0095 / Mission CL — Policy Gate for Spec↔Code Traceability Graph.
 * Fail-closed validation for link plans, Law VI secret screening,
 * Fundacion write barrier, node bounds, empty/oversize graphs,
 * and rejection of LSP/IDE / GitHub-code-search / GHE claim labels.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Spec↔Code Traceability ≠ full LSP/IDE product /
 * ≠ GitHub code search / ≠ claims GH Enterprise enforcement /
 * ≠ Fundacion writes.
 */

import { sha256Canonical } from './spec-code-traceability-receipt.js';

/** @type {'NO'} */
export const CL_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CL_POLICY_GATE_KIND = 'eos-spec-code-traceability-policy-gate';

/** Default maximum nodes per link plan. */
export const CL_MAX_NODES = 64;

/**
 * Id pattern (alphanumeric / mission-code / SPEC style).
 * Examples: plan-001, SPEC-0095, src.core.traceability, eos-ladder-26
 */
export const CL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.\-\/]{0,255}$/;

export const CL_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  LINK_PASS: 'LINK_PASS',
  LINK_DENY: 'LINK_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  MISSING_PLAN_ID_DENY: 'MISSING_PLAN_ID_DENY',
  MISSING_NODES_DENY: 'MISSING_NODES_DENY',
  OVERSIZED_GRAPH_DENY: 'OVERSIZED_GRAPH_DENY',
  INVALID_SPEC_ID_DENY: 'INVALID_SPEC_ID_DENY',
  INVALID_CODE_SURFACE_DENY: 'INVALID_CODE_SURFACE_DENY',
  INVALID_EVIDENCE_DIGEST_DENY: 'INVALID_EVIDENCE_DIGEST_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  LSP_IDE_CLAIM_DENY: 'LSP_IDE_CLAIM_DENY',
  GITHUB_CODE_SEARCH_CLAIM_DENY: 'GITHUB_CODE_SEARCH_CLAIM_DENY',
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

const LSP_IDE_PATTERNS = [
  /language\s*server\s*(protocol|saas|product)/i,
  /\bLSP\b.*\b(product|marketplace|saas)\b/i,
  /full\s+LSP\b/i,
  /IDE\s+(marketplace|product|plugin\s+marketplace)/i,
  /language-server\s+SaaS/i
];

const GITHUB_CODE_SEARCH_PATTERNS = [
  /github\s+code\s+search/i,
  /gh\s+code\s+search/i,
  /code\s+search\s+(via|through)\s+github/i
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
export function claimsLspIdeProduct(value) {
  return matchesAnyPattern(value, LSP_IDE_PATTERNS);
}

/** @param {unknown} value @returns {boolean} */
export function claimsGithubCodeSearch(value) {
  return matchesAnyPattern(value, GITHUB_CODE_SEARCH_PATTERNS);
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
  if (!CL_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * Policy Gate validator for Spec↔Code link plans.
 */
export class SpecCodeTraceabilityPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxNodes]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxNodes =
      options.maxNodes != null ? Number(options.maxNodes) : CL_MAX_NODES;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a link plan before PASS|DENY decision.
   * Fail-closed. Require planId + 1..CL_MAX nodes with valid specId
   * and codePath or moduleId. Reject empty plans, Fundacion, secrets,
   * LSP/IDE, GitHub-code-search, and GHE-enforcement claim labels.
   *
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, planId?: string, nodes?: Array<object>, reasons?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CL_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    const hasAnyId =
      plan.planId != null ||
      (Array.isArray(plan.nodes) && plan.nodes.length > 0);
    if (!hasAnyId) {
      return {
        valid: false,
        code: CL_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty link plan rejected fail-closed'
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
        code: CL_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CL_CODES.SECRET_DETECTED_DENY,
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
        code: CL_CODES.GHE_ENFORCEMENT_CLAIM_DENY,
        reason:
          'Plan claims GH Enterprise enforcement (NON-CLAIM: ≠ GHE enforcement)'
      };
    }

    if (
      claimsLspIdeProduct(plan) ||
      claimsLspIdeProduct(plan.label) ||
      claimsLspIdeProduct(plan.labels) ||
      claimsLspIdeProduct(plan.description)
    ) {
      return {
        valid: false,
        code: CL_CODES.LSP_IDE_CLAIM_DENY,
        reason:
          'Plan claims full LSP/IDE product (NON-CLAIM: ≠ LSP/IDE product)'
      };
    }

    if (
      claimsGithubCodeSearch(plan) ||
      claimsGithubCodeSearch(plan.label) ||
      claimsGithubCodeSearch(plan.labels) ||
      claimsGithubCodeSearch(plan.description)
    ) {
      return {
        valid: false,
        code: CL_CODES.GITHUB_CODE_SEARCH_CLAIM_DENY,
        reason:
          'Plan claims GitHub code search (NON-CLAIM: ≠ GitHub code search)'
      };
    }

    const planId = normalizeIdStrict(plan.planId);
    if (!planId) {
      return {
        valid: false,
        code: CL_CODES.MISSING_PLAN_ID_DENY,
        reason: 'planId must be a non-empty valid identifier'
      };
    }
    if (isFundacionTarget(planId)) {
      return {
        valid: false,
        code: CL_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'planId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (!Array.isArray(plan.nodes) || plan.nodes.length === 0) {
      return {
        valid: false,
        code: CL_CODES.MISSING_NODES_DENY,
        reason: 'nodes must be a non-empty array (1..CL_MAX)'
      };
    }

    if (plan.nodes.length > this.maxNodes) {
      return {
        valid: false,
        code: CL_CODES.OVERSIZED_GRAPH_DENY,
        reason: `Graph nodes exceed max bound (${this.maxNodes}); got ${plan.nodes.length}`
      };
    }

    /** @type {Array<object>} */
    const nodes = [];
    for (let i = 0; i < plan.nodes.length; i++) {
      const n = plan.nodes[i];
      if (n == null || typeof n !== 'object') {
        return {
          valid: false,
          code: CL_CODES.MALFORMED_PLAN_DENY,
          reason: `nodes[${i}] must be a non-null object`
        };
      }

      if (
        isFundacionTarget(n.specId) ||
        isFundacionTarget(n.codePath) ||
        isFundacionTarget(n.moduleId) ||
        isFundacionTarget(n.label)
      ) {
        return {
          valid: false,
          code: CL_CODES.FUNDACION_ALWAYS_DENY,
          reason: `nodes[${i}] touches Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      if (
        claimsGheEnforcement(n) ||
        claimsLspIdeProduct(n) ||
        claimsGithubCodeSearch(n)
      ) {
        return {
          valid: false,
          code: claimsGheEnforcement(n)
            ? CL_CODES.GHE_ENFORCEMENT_CLAIM_DENY
            : claimsLspIdeProduct(n)
              ? CL_CODES.LSP_IDE_CLAIM_DENY
              : CL_CODES.GITHUB_CODE_SEARCH_CLAIM_DENY,
          reason: `nodes[${i}] asserts a NON-CLAIM product surface`
        };
      }

      const specId = normalizeIdStrict(n.specId);
      if (!specId) {
        return {
          valid: false,
          code: CL_CODES.INVALID_SPEC_ID_DENY,
          reason: `nodes[${i}].specId must be a non-empty valid identifier`
        };
      }

      const codePath =
        n.codePath != null && String(n.codePath).trim() !== ''
          ? String(n.codePath).trim()
          : null;
      const moduleId =
        n.moduleId != null && String(n.moduleId).trim() !== ''
          ? String(n.moduleId).trim()
          : null;

      if (!codePath && !moduleId) {
        return {
          valid: false,
          code: CL_CODES.INVALID_CODE_SURFACE_DENY,
          reason: `nodes[${i}] must provide codePath or moduleId`
        };
      }

      if (codePath && isFundacionTarget(codePath)) {
        return {
          valid: false,
          code: CL_CODES.FUNDACION_ALWAYS_DENY,
          reason: `nodes[${i}].codePath touches Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      let evidenceDigest = null;
      if (n.evidenceDigest != null && String(n.evidenceDigest).trim() !== '') {
        evidenceDigest = String(n.evidenceDigest).trim();
        if (!SHA256_HEX_RE.test(evidenceDigest)) {
          return {
            valid: false,
            code: CL_CODES.INVALID_EVIDENCE_DIGEST_DENY,
            reason: `nodes[${i}].evidenceDigest must be sha256 hex when present`
          };
        }
      }

      nodes.push({
        specId,
        codePath,
        moduleId,
        evidenceDigest,
        label: n.label != null ? String(n.label) : null
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
      code: CL_CODES.PLAN_VALID_OK,
      planId,
      nodes,
      reasons
    };
  }
}

export default {
  CL_POLICY_GATE_PRODUCTION_READY,
  CL_POLICY_GATE_KIND,
  CL_MAX_NODES,
  CL_ID_PATTERN,
  CL_CODES,
  scanForSecrets,
  claimsGheEnforcement,
  claimsLspIdeProduct,
  claimsGithubCodeSearch,
  isFundacionTarget,
  normalizeIdStrict,
  SpecCodeTraceabilityPolicyGate
};
