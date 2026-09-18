/**
 * @module external-tool-federation-policy-gate
 * SPEC-0090 / Mission CG — Policy Gate for External Tool / MCP Federation.
 * Fail-closed validation for federation plans (tool ids + allowlists),
 * Law VI secret screening, Fundacion write barrier, max tool bounds,
 * and rejection of unrestricted `*` allow-all.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: External tool federation ≠ unrestricted tool proxy / ≠ Fundacion writes.
 */

import { sha256Canonical } from './external-tool-federation-receipt.js';

/** @type {'NO'} */
export const CG_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CG_POLICY_GATE_KIND = 'eos-external-tool-federation-policy-gate';

/** Default maximum tools per federation plan. */
export const CG_MAX_TOOLS = 32;

/**
 * Tool id pattern (alphanumeric / MCP-style).
 * Examples: figma_get_screenshot, mcp.figma/get-screenshot, server:tool_name
 */
export const CG_TOOL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:\/-]{0,127}$/;

export const CG_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  FEDERATE_ALLOW: 'FEDERATE_ALLOW',
  FEDERATE_DENY: 'FEDERATE_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  EMPTY_TOOLS_DENY: 'EMPTY_TOOLS_DENY',
  EMPTY_ALLOWLIST_DENY: 'EMPTY_ALLOWLIST_DENY',
  OVERSIZED_TOOLS_DENY: 'OVERSIZED_TOOLS_DENY',
  INVALID_FEDERATION_ID_DENY: 'INVALID_FEDERATION_ID_DENY',
  INVALID_TOOL_ID_DENY: 'INVALID_TOOL_ID_DENY',
  UNKNOWN_TOOL_OUTSIDE_ALLOWLIST_DENY: 'UNKNOWN_TOOL_OUTSIDE_ALLOWLIST_DENY',
  UNRESTRICTED_ALLOWALL_DENY: 'UNRESTRICTED_ALLOWALL_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
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
 * Normalize / validate a tool id against MCP-style pattern.
 * @param {unknown} toolId
 * @returns {string|null}
 */
export function normalizeToolIdStrict(toolId) {
  if (toolId == null) return null;
  const s = String(toolId).trim();
  if (!s) return null;
  if (s === '*') return null;
  if (!CG_TOOL_ID_PATTERN.test(s)) return null;
  return s;
}

/**
 * True if allowlist entry is unrestricted allow-all wildcard.
 * @param {unknown} entry
 * @returns {boolean}
 */
export function isUnrestrictedAllowAll(entry) {
  if (entry == null) return false;
  const s = String(entry).trim();
  return s === '*' || s === '**' || s.toLowerCase() === 'allow-all';
}

/**
 * Policy Gate validator for external tool federation plans.
 */
export class ExternalToolFederationPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxTools]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxTools =
      options.maxTools != null ? Number(options.maxTools) : CG_MAX_TOOLS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a federation plan before ALLOW decision.
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, federationId?: string, toolIds?: string[], allowlist?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CG_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.federationId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CG_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CG_CODES.SECRET_DETECTED_DENY,
        reason:
          'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const federationId =
      plan.federationId != null ? String(plan.federationId).trim() : '';
    if (!federationId) {
      return {
        valid: false,
        code: CG_CODES.INVALID_FEDERATION_ID_DENY,
        reason: 'federationId must be a non-empty string'
      };
    }
    if (isFundacionTarget(federationId)) {
      return {
        valid: false,
        code: CG_CODES.FUNDACION_ALWAYS_DENY,
        reason:
          'federationId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const toolsRaw =
      plan.toolIds != null
        ? plan.toolIds
        : plan.tools != null
          ? plan.tools
          : null;

    if (!Array.isArray(toolsRaw)) {
      return {
        valid: false,
        code: CG_CODES.EMPTY_PLAN_DENY,
        reason: 'Plan.toolIds must be a non-empty array of tool ids'
      };
    }

    if (toolsRaw.length === 0) {
      return {
        valid: false,
        code: CG_CODES.EMPTY_TOOLS_DENY,
        reason: 'Empty toolIds are rejected fail-closed'
      };
    }

    if (toolsRaw.length > this.maxTools) {
      return {
        valid: false,
        code: CG_CODES.OVERSIZED_TOOLS_DENY,
        reason: `Tools exceed max tool bound (${this.maxTools}); got ${toolsRaw.length}`
      };
    }

    const allowlistRaw =
      plan.allowlist != null
        ? plan.allowlist
        : plan.allowedTools != null
          ? plan.allowedTools
          : null;

    if (!Array.isArray(allowlistRaw)) {
      return {
        valid: false,
        code: CG_CODES.EMPTY_ALLOWLIST_DENY,
        reason: 'Plan.allowlist must be a non-empty array (no unrestricted *)'
      };
    }

    if (allowlistRaw.length === 0) {
      return {
        valid: false,
        code: CG_CODES.EMPTY_ALLOWLIST_DENY,
        reason: 'Empty allowlist is rejected fail-closed'
      };
    }

    /** @type {string[]} */
    const allowlist = [];
    for (let i = 0; i < allowlistRaw.length; i++) {
      const entry = allowlistRaw[i];
      if (isUnrestrictedAllowAll(entry)) {
        return {
          valid: false,
          code: CG_CODES.UNRESTRICTED_ALLOWALL_DENY,
          reason:
            'Unrestricted allow-all (*) is rejected — federation ≠ unrestricted tool proxy'
        };
      }
      if (isFundacionTarget(entry)) {
        return {
          valid: false,
          code: CG_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Allowlist entry at index ${i} targets Fundacion (Fundacion Δ=0 invariant)`
        };
      }
      if (scanForSecrets(entry)) {
        return {
          valid: false,
          code: CG_CODES.SECRET_DETECTED_DENY,
          reason: `Allowlist entry at index ${i} contains plain secrets (Law VI)`
        };
      }
      const normalized = normalizeToolIdStrict(entry);
      if (!normalized) {
        return {
          valid: false,
          code: CG_CODES.INVALID_TOOL_ID_DENY,
          reason: `Allowlist entry at index ${i}: '${entry}' is not a valid MCP-style tool id`
        };
      }
      allowlist.push(normalized);
    }

    if (allowlist.length > this.maxTools) {
      return {
        valid: false,
        code: CG_CODES.OVERSIZED_TOOLS_DENY,
        reason: `Allowlist exceeds max tool bound (${this.maxTools}); got ${allowlist.length}`
      };
    }

    const allowSet = new Set(allowlist);

    /** @type {string[]} */
    const toolIds = [];
    for (let i = 0; i < toolsRaw.length; i++) {
      const raw = toolsRaw[i];
      if (isUnrestrictedAllowAll(raw)) {
        return {
          valid: false,
          code: CG_CODES.UNRESTRICTED_ALLOWALL_DENY,
          reason:
            'Unrestricted tool id (*) is rejected — federation ≠ unrestricted tool proxy'
        };
      }
      if (isFundacionTarget(raw)) {
        return {
          valid: false,
          code: CG_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Tool id at index ${i} targets Fundacion (Fundacion Δ=0 invariant)`
        };
      }
      if (scanForSecrets(raw)) {
        return {
          valid: false,
          code: CG_CODES.SECRET_DETECTED_DENY,
          reason: `Tool id at index ${i} contains plain secrets (Law VI)`
        };
      }
      const normalized = normalizeToolIdStrict(raw);
      if (!normalized) {
        return {
          valid: false,
          code: CG_CODES.INVALID_TOOL_ID_DENY,
          reason: `Tool id at index ${i}: '${raw}' is not a valid MCP-style tool id`
        };
      }
      if (!allowSet.has(normalized)) {
        return {
          valid: false,
          code: CG_CODES.UNKNOWN_TOOL_OUTSIDE_ALLOWLIST_DENY,
          reason: `Tool '${normalized}' is outside the federation allowlist`
        };
      }
      toolIds.push(normalized);
    }

    return {
      valid: true,
      code: CG_CODES.PLAN_VALID_OK,
      federationId,
      toolIds,
      allowlist
    };
  }
}

export default {
  CG_POLICY_GATE_PRODUCTION_READY,
  CG_POLICY_GATE_KIND,
  CG_MAX_TOOLS,
  CG_TOOL_ID_PATTERN,
  CG_CODES,
  scanForSecrets,
  isFundacionTarget,
  normalizeToolIdStrict,
  isUnrestrictedAllowAll,
  ExternalToolFederationPolicyGate
};
