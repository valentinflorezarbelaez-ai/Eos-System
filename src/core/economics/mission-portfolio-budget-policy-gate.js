/**
 * @module mission-portfolio-budget-policy-gate
 * SPEC-0086 / Mission CC — Policy Gate for Mission Portfolio Budget Governor.
 * Fail-closed validation for portfolio envelope plans (latency/cost/risk budgets),
 * Law VI secret screening, Fundacion write barrier, and max allocation bounds.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Mission economics portfolio ≠ FinOps SaaS / ≠ cloud billing integrator.
 */

import { sha256Canonical } from './mission-portfolio-budget-receipt.js';

/** @type {'NO'} */
export const CC_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CC_POLICY_GATE_KIND = 'eos-mission-portfolio-budget-policy-gate';

/** Default maximum allocations per portfolio envelope plan. */
export const CC_MAX_ALLOCATIONS = 32;

/**
 * Soft utilization ratio at/above which a valid-under-budget plan THROTTLEs.
 * Hard over-budget is always DENY.
 */
export const CC_THROTTLE_RATIO = 0.85;

/**
 * Mission id pattern (Ladder satellite / mission-code style).
 * Examples: CB, CC, BR, BW, MISSION-CC → accepted via leading two letters + optional suffix.
 */
export const CC_MISSION_ID_PATTERN = /^[A-Z]{2}([A-Z0-9_-]{0,30})?$/i;

export const CC_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  EVALUATE_ALLOW: 'EVALUATE_ALLOW',
  EVALUATE_THROTTLE: 'EVALUATE_THROTTLE',
  EVALUATE_DENY: 'EVALUATE_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  OVERSIZED_PLAN_DENY: 'OVERSIZED_PLAN_DENY',
  UNKNOWN_MISSION_ID_DENY: 'UNKNOWN_MISSION_ID_DENY',
  INVALID_ENVELOPE_DENY: 'INVALID_ENVELOPE_DENY',
  MALFORMED_ALLOCATION_DENY: 'MALFORMED_ALLOCATION_DENY',
  MALFORMED_PLAN_DENY: 'MALFORMED_PLAN_DENY',
  OVER_BUDGET_DENY: 'OVER_BUDGET_DENY',
  OVER_BUDGET_THROTTLE: 'OVER_BUDGET_THROTTLE',
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
 * @param {unknown} n
 * @returns {boolean}
 */
function isNonNegativeFinite(n) {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

/**
 * Policy Gate validator for mission portfolio budget envelope plans.
 */
export class MissionPortfolioBudgetPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxAllocations]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxAllocations =
      options.maxAllocations != null
        ? Number(options.maxAllocations)
        : CC_MAX_ALLOCATIONS;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a portfolio envelope plan before budget decision.
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, portfolioId?: string, envelope?: object, allocations?: object[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CC_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    // Plan-level Fundacion targets
    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.portfolioId)
    ) {
      return {
        valid: false,
        code: CC_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CC_CODES.SECRET_DETECTED_DENY,
        reason: 'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const envelope = plan.envelope;
    if (envelope == null || typeof envelope !== 'object' || Array.isArray(envelope)) {
      return {
        valid: false,
        code: CC_CODES.INVALID_ENVELOPE_DENY,
        reason: 'Plan.envelope must be a non-null object with non-negative budgets'
      };
    }

    const latencyMsBudget = envelope.latencyMsBudget;
    const costUnitsBudget = envelope.costUnitsBudget;
    const riskScoreBudget = envelope.riskScoreBudget;

    if (
      !isNonNegativeFinite(latencyMsBudget) ||
      !isNonNegativeFinite(costUnitsBudget) ||
      !isNonNegativeFinite(riskScoreBudget)
    ) {
      return {
        valid: false,
        code: CC_CODES.INVALID_ENVELOPE_DENY,
        reason:
          'Envelope budgets latencyMsBudget/costUnitsBudget/riskScoreBudget must be non-negative finite numbers'
      };
    }

    const allocations = plan.allocations;
    if (!Array.isArray(allocations)) {
      return {
        valid: false,
        code: CC_CODES.EMPTY_PLAN_DENY,
        reason: 'Plan.allocations must be a non-empty array'
      };
    }

    if (allocations.length === 0) {
      return {
        valid: false,
        code: CC_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty allocation list is rejected fail-closed'
      };
    }

    if (allocations.length > this.maxAllocations) {
      return {
        valid: false,
        code: CC_CODES.OVERSIZED_PLAN_DENY,
        reason: `Plan exceeds max allocation bound (${this.maxAllocations}); got ${allocations.length}`
      };
    }

    /** @type {object[]} */
    const normalized = [];

    for (let i = 0; i < allocations.length; i++) {
      const row = allocations[i];
      if (row == null || typeof row !== 'object' || Array.isArray(row)) {
        return {
          valid: false,
          code: CC_CODES.MALFORMED_ALLOCATION_DENY,
          reason: `Allocation at index ${i} must be a non-null object`
        };
      }

      const missionId =
        row.missionId != null ? String(row.missionId).trim() : '';
      if (!missionId || !CC_MISSION_ID_PATTERN.test(missionId)) {
        return {
          valid: false,
          code: CC_CODES.UNKNOWN_MISSION_ID_DENY,
          reason: `Allocation at index ${i}: missionId '${row.missionId}' does not match known mission id pattern`
        };
      }

      if (
        isFundacionTarget(row.target) ||
        isFundacionTarget(row.targetPath) ||
        isFundacionTarget(row.label) ||
        isFundacionTarget(row.missionId) ||
        isFundacionTarget(row.payload)
      ) {
        return {
          valid: false,
          code: CC_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Allocation ${missionId} targets Fundacion directory (Fundacion Δ=0 invariant)`
        };
      }

      if (scanForSecrets(row)) {
        return {
          valid: false,
          code: CC_CODES.SECRET_DETECTED_DENY,
          reason: `Allocation ${missionId} labels/payloads contain plain secrets (Law VI)`
        };
      }

      const latencyMs = row.latencyMs;
      const costUnits = row.costUnits;
      const riskScore = row.riskScore;

      if (
        !isNonNegativeFinite(latencyMs) ||
        !isNonNegativeFinite(costUnits) ||
        !isNonNegativeFinite(riskScore)
      ) {
        return {
          valid: false,
          code: CC_CODES.MALFORMED_ALLOCATION_DENY,
          reason: `Allocation ${missionId}: latencyMs/costUnits/riskScore must be non-negative finite numbers`
        };
      }

      normalized.push({
        missionId: missionId.toUpperCase(),
        latencyMs: Number(latencyMs),
        costUnits: Number(costUnits),
        riskScore: Number(riskScore),
        label: row.label != null ? String(row.label) : null
      });
    }

    const portfolioId =
      plan.portfolioId != null && String(plan.portfolioId).trim() !== ''
        ? String(plan.portfolioId).trim()
        : null;

    return {
      valid: true,
      code: CC_CODES.PLAN_VALID_OK,
      portfolioId,
      envelope: {
        latencyMsBudget: Number(latencyMsBudget),
        costUnitsBudget: Number(costUnitsBudget),
        riskScoreBudget: Number(riskScoreBudget)
      },
      allocations: normalized
    };
  }
}

export default {
  CC_POLICY_GATE_PRODUCTION_READY,
  CC_POLICY_GATE_KIND,
  CC_MAX_ALLOCATIONS,
  CC_THROTTLE_RATIO,
  CC_MISSION_ID_PATTERN,
  CC_CODES,
  scanForSecrets,
  isFundacionTarget,
  MissionPortfolioBudgetPolicyGate
};
