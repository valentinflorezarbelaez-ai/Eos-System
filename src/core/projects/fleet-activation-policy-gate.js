/**
 * @module fleet-activation-policy-gate
 * SPEC-0087 / Mission CD — Policy Gate for Fleet Project Governed Activation.
 * Fail-closed validation for project SSOT → mission allowlist activation plans,
 * Law VI secret screening, Fundacion write barrier, and max mission bounds.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Fleet activation ≠ Kubernetes multi-cluster control plane / ≠ Fundacion touch.
 */

import { sha256Canonical } from './fleet-activation-receipt.js';

/** @type {'NO'} */
export const CD_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CD_POLICY_GATE_KIND = 'eos-fleet-activation-policy-gate';

/** Default maximum missions per activation allowlist. */
export const CD_MAX_MISSIONS = 32;

/**
 * Mission id pattern (Ladder satellite / mission-code style).
 * Examples: CB, CC, CD, A-1, AB-XYZ
 */
export const CD_MISSION_ID_PATTERN = /^[A-Z]{1,3}(-[A-Z0-9]+)?$/i;

/** 64-char lowercase/uppercase hex digest (project SSOT). */
export const CD_SSOT_DIGEST_PATTERN = /^[a-f0-9]{64}$/i;

export const CD_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  ACTIVATE_ALLOW: 'ACTIVATE_ALLOW',
  ACTIVATE_DENY: 'ACTIVATE_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  EMPTY_ALLOWLIST_DENY: 'EMPTY_ALLOWLIST_DENY',
  OVERSIZED_ALLOWLIST_DENY: 'OVERSIZED_ALLOWLIST_DENY',
  UNKNOWN_MISSION_ID_DENY: 'UNKNOWN_MISSION_ID_DENY',
  INVALID_PROJECT_ID_DENY: 'INVALID_PROJECT_ID_DENY',
  INVALID_SSOT_DIGEST_DENY: 'INVALID_SSOT_DIGEST_DENY',
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
 * Policy Gate validator for fleet project activation plans.
 */
export class FleetActivationPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxMissions]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxMissions =
      options.maxMissions != null
        ? Number(options.maxMissions)
        : CD_MAX_MISSIONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a fleet activation plan before activation decision.
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, projectId?: string, projectSsotDigest?: string, allowlist?: string[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CD_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    // Plan-level Fundacion targets (projectId / paths / labels / payloads)
    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.projectId) ||
      isFundacionTarget(plan.payload)
    ) {
      return {
        valid: false,
        code: CD_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CD_CODES.SECRET_DETECTED_DENY,
        reason: 'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const projectId =
      plan.projectId != null ? String(plan.projectId).trim() : '';
    if (!projectId) {
      return {
        valid: false,
        code: CD_CODES.INVALID_PROJECT_ID_DENY,
        reason: 'projectId must be a non-empty string'
      };
    }
    if (isFundacionTarget(projectId)) {
      return {
        valid: false,
        code: CD_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'projectId targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    const ssotRaw =
      plan.projectSsotDigest != null
        ? plan.projectSsotDigest
        : plan.ssotDigest != null
          ? plan.ssotDigest
          : null;
    const projectSsotDigest =
      ssotRaw != null ? String(ssotRaw).trim().toLowerCase() : '';
    if (!projectSsotDigest || !CD_SSOT_DIGEST_PATTERN.test(projectSsotDigest)) {
      return {
        valid: false,
        code: CD_CODES.INVALID_SSOT_DIGEST_DENY,
        reason: 'projectSsotDigest must be a 64-character hex SHA-256 digest'
      };
    }

    const allowlistRaw =
      plan.allowlist != null
        ? plan.allowlist
        : plan.missionAllowlist != null
          ? plan.missionAllowlist
          : plan.missions != null
            ? plan.missions
            : null;

    if (!Array.isArray(allowlistRaw)) {
      return {
        valid: false,
        code: CD_CODES.EMPTY_ALLOWLIST_DENY,
        reason: 'Plan.allowlist must be a non-empty array of mission ids'
      };
    }

    if (allowlistRaw.length === 0) {
      return {
        valid: false,
        code: CD_CODES.EMPTY_ALLOWLIST_DENY,
        reason: 'Empty mission allowlist is rejected fail-closed'
      };
    }

    if (allowlistRaw.length > this.maxMissions) {
      return {
        valid: false,
        code: CD_CODES.OVERSIZED_ALLOWLIST_DENY,
        reason: `Allowlist exceeds max mission bound (${this.maxMissions}); got ${allowlistRaw.length}`
      };
    }

    /** @type {string[]} */
    const normalized = [];

    for (let i = 0; i < allowlistRaw.length; i++) {
      const entry = allowlistRaw[i];
      const missionId =
        entry != null && typeof entry === 'object' && !Array.isArray(entry)
          ? entry.missionId != null
            ? String(entry.missionId).trim()
            : ''
          : String(entry ?? '').trim();

      if (!missionId || !CD_MISSION_ID_PATTERN.test(missionId)) {
        return {
          valid: false,
          code: CD_CODES.UNKNOWN_MISSION_ID_DENY,
          reason: `Allowlist entry at index ${i}: missionId '${entry}' does not match known mission id pattern`
        };
      }

      if (isFundacionTarget(missionId)) {
        return {
          valid: false,
          code: CD_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Allowlist mission ${missionId} targets Fundacion (Fundacion Δ=0 invariant)`
        };
      }

      if (typeof entry === 'object' && entry != null) {
        if (
          isFundacionTarget(entry.target) ||
          isFundacionTarget(entry.targetPath) ||
          isFundacionTarget(entry.label) ||
          isFundacionTarget(entry.payload)
        ) {
          return {
            valid: false,
            code: CD_CODES.FUNDACION_ALWAYS_DENY,
            reason: `Allowlist entry ${missionId} targets Fundacion directory (Fundacion Δ=0 invariant)`
          };
        }
        if (scanForSecrets(entry)) {
          return {
            valid: false,
            code: CD_CODES.SECRET_DETECTED_DENY,
            reason: `Allowlist entry ${missionId} labels/payloads contain plain secrets (Law VI)`
          };
        }
      }

      normalized.push(missionId.toUpperCase());
    }

    return {
      valid: true,
      code: CD_CODES.PLAN_VALID_OK,
      projectId,
      projectSsotDigest,
      allowlist: normalized
    };
  }
}

export default {
  CD_POLICY_GATE_PRODUCTION_READY,
  CD_POLICY_GATE_KIND,
  CD_MAX_MISSIONS,
  CD_MISSION_ID_PATTERN,
  CD_SSOT_DIGEST_PATTERN,
  CD_CODES,
  scanForSecrets,
  isFundacionTarget,
  FleetActivationPolicyGate
};
