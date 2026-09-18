/**
 * @module cross-ladder-composition-policy-gate
 * SPEC-0085 / Mission CB — Policy Gate for Cross-Ladder Composition Orchestrator.
 * Fail-closed validation for composition plans (ordered L22/L23 stages),
 * Law VI secret screening, Fundacion write barrier, and max stage bounds.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Cross-ladder composition ≠ Airflow/Temporal / ≠ general AGI planner.
 */

import { sha256Canonical } from './cross-ladder-composition-receipt.js';

/** @type {'NO'} */
export const CB_POLICY_GATE_PRODUCTION_READY = 'NO';

export const CB_POLICY_GATE_KIND = 'eos-cross-ladder-composition-policy-gate';

/** Default maximum stages per composition plan. */
export const CB_MAX_STAGES = 32;

/** Allowed ladder tags for composition stages. */
export const CB_ALLOWED_LADDERS = Object.freeze(['L22', 'L23']);

/**
 * Allowed satellites per ladder (compose/observe seals only — never reopen ladders).
 * L22: BR–BV · L23: BW–BZ
 */
export const CB_ALLOWED_SATELLITES = Object.freeze({
  L22: Object.freeze(['BR', 'BS', 'BT', 'BU', 'BV']),
  L23: Object.freeze(['BW', 'BX', 'BY', 'BZ'])
});

/** Flat set of all known satellite ids. */
export const CB_KNOWN_SATELLITE_IDS = Object.freeze(
  new Set([
    ...CB_ALLOWED_SATELLITES.L22,
    ...CB_ALLOWED_SATELLITES.L23
  ])
);

export const CB_CODES = Object.freeze({
  PLAN_VALID_OK: 'PLAN_VALID_OK',
  COMPOSE_OK: 'COMPOSE_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_PLAN_DENY: 'EMPTY_PLAN_DENY',
  OVERSIZED_PLAN_DENY: 'OVERSIZED_PLAN_DENY',
  UNKNOWN_STAGE_ID_DENY: 'UNKNOWN_STAGE_ID_DENY',
  UNKNOWN_LADDER_DENY: 'UNKNOWN_LADDER_DENY',
  LADDER_SATELLITE_MISMATCH_DENY: 'LADDER_SATELLITE_MISMATCH_DENY',
  MALFORMED_STAGE_DENY: 'MALFORMED_STAGE_DENY',
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
 * Policy Gate validator for cross-ladder composition plans.
 */
export class CrossLadderCompositionPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxStages]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxStages =
      options.maxStages != null ? Number(options.maxStages) : CB_MAX_STAGES;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a composition plan before hermetic compose simulation.
   * @param {unknown} plan
   * @returns {{ valid: boolean, code: string, reason?: string, stages?: object[] }}
   */
  evaluatePlan(plan) {
    if (plan == null || typeof plan !== 'object' || Array.isArray(plan)) {
      return {
        valid: false,
        code: CB_CODES.MALFORMED_PLAN_DENY,
        reason: 'Plan must be a non-null object'
      };
    }

    // Plan-level Fundacion targets
    if (
      isFundacionTarget(plan.target) ||
      isFundacionTarget(plan.targetPath) ||
      isFundacionTarget(plan.label) ||
      isFundacionTarget(plan.compositionId)
    ) {
      return {
        valid: false,
        code: CB_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Plan targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (scanForSecrets(plan)) {
      return {
        valid: false,
        code: CB_CODES.SECRET_DETECTED_DENY,
        reason: 'Plan labels/payloads contain plain secrets or credentials (Law VI)'
      };
    }

    const stages = plan.stages;
    if (!Array.isArray(stages)) {
      return {
        valid: false,
        code: CB_CODES.EMPTY_PLAN_DENY,
        reason: 'Plan.stages must be a non-empty array'
      };
    }

    if (stages.length === 0) {
      return {
        valid: false,
        code: CB_CODES.EMPTY_PLAN_DENY,
        reason: 'Empty composition plan is rejected fail-closed'
      };
    }

    if (stages.length > this.maxStages) {
      return {
        valid: false,
        code: CB_CODES.OVERSIZED_PLAN_DENY,
        reason: `Plan exceeds max stage bound (${this.maxStages}); got ${stages.length}`
      };
    }

    /** @type {object[]} */
    const normalized = [];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (stage == null || typeof stage !== 'object' || Array.isArray(stage)) {
        return {
          valid: false,
          code: CB_CODES.MALFORMED_STAGE_DENY,
          reason: `Stage at index ${i} must be a non-null object`
        };
      }

      const id = stage.id != null ? String(stage.id).trim() : '';
      if (!id) {
        return {
          valid: false,
          code: CB_CODES.MALFORMED_STAGE_DENY,
          reason: `Stage at index ${i} requires a non-empty id`
        };
      }

      const ladder = stage.ladder != null ? String(stage.ladder).trim().toUpperCase() : '';
      if (!CB_ALLOWED_LADDERS.includes(ladder)) {
        return {
          valid: false,
          code: CB_CODES.UNKNOWN_LADDER_DENY,
          reason: `Stage ${id}: ladder must be L22 or L23 (got ${stage.ladder})`
        };
      }

      const satellite =
        stage.satellite != null
          ? String(stage.satellite).trim().toUpperCase()
          : '';
      if (!satellite || !CB_KNOWN_SATELLITE_IDS.has(satellite)) {
        return {
          valid: false,
          code: CB_CODES.UNKNOWN_STAGE_ID_DENY,
          reason: `Stage ${id}: unknown satellite id '${stage.satellite}' (allowed: BR–BV, BW–BZ)`
        };
      }

      const allowedForLadder = CB_ALLOWED_SATELLITES[ladder];
      if (!allowedForLadder.includes(satellite)) {
        return {
          valid: false,
          code: CB_CODES.LADDER_SATELLITE_MISMATCH_DENY,
          reason: `Stage ${id}: satellite ${satellite} is not on ladder ${ladder}`
        };
      }

      // Per-stage Fundacion / secret scans
      if (
        isFundacionTarget(stage.target) ||
        isFundacionTarget(stage.targetPath) ||
        isFundacionTarget(stage.label) ||
        isFundacionTarget(stage.payload) ||
        isFundacionTarget(stage.inputDigest)
      ) {
        return {
          valid: false,
          code: CB_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Stage ${id} targets Fundacion directory (Fundacion Δ=0 invariant)`
        };
      }

      if (scanForSecrets(stage)) {
        return {
          valid: false,
          code: CB_CODES.SECRET_DETECTED_DENY,
          reason: `Stage ${id} labels/payloads contain plain secrets (Law VI)`
        };
      }

      normalized.push({
        id,
        ladder,
        satellite,
        label: stage.label != null ? String(stage.label) : null,
        inputDigest:
          stage.inputDigest != null && String(stage.inputDigest).trim() !== ''
            ? String(stage.inputDigest).trim()
            : null,
        payload: stage.payload != null ? stage.payload : null
      });
    }

    return {
      valid: true,
      code: CB_CODES.PLAN_VALID_OK,
      stages: normalized
    };
  }
}

export default {
  CB_POLICY_GATE_PRODUCTION_READY,
  CB_POLICY_GATE_KIND,
  CB_MAX_STAGES,
  CB_ALLOWED_LADDERS,
  CB_ALLOWED_SATELLITES,
  CB_KNOWN_SATELLITE_IDS,
  CB_CODES,
  scanForSecrets,
  isFundacionTarget,
  CrossLadderCompositionPolicyGate
};
