/**
 * @module repair-plan
 * SPEC-0057 / Mission AZ — Deterministic bounded repair plan builder.
 * Stable ordering; no randomness. Same fault → same plan hash.
 *
 * NON-CLAIM:
 *   repair-plan ≠ unbounded self-modifying AGI /
 *   ≠ unsupervised internet remediator /
 *   ≠ CloudAgent self-heal fleet
 *   not BA/BB; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';
import { FAULT_CLASSES } from './fault-classifier.js';

/** @type {'NO'} */
export const AZ_PLAN_PRODUCTION_READY = 'NO';

export const AZ_PLAN_KIND = 'eos-deterministic-repair-plan';

export const PLAN_ACTIONS = Object.freeze({
  FIX_SYNTAX: 'FIX_SYNTAX',
  RESOLVE_DEPENDENCY: 'RESOLVE_DEPENDENCY',
  THROTTLE_BUDGET: 'THROTTLE_BUDGET',
  ALIGN_SCHEMA: 'ALIGN_SCHEMA',
  NOOP_DENY: 'NOOP_DENY',
  ESCALATE_HITL: 'ESCALATE_HITL'
});

/**
 * Stable JSON stringify (sorted keys) for digests.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(/** @type {Record<string, unknown>} */ (value)[k]);
  }
  return out;
}

/**
 * sha256 hex of canonical payload.
 * @param {unknown} payload
 * @returns {string}
 */
export function planHash(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Map fault class → ordered bounded steps (deterministic).
 * @param {string} faultClass
 * @returns {object[]}
 */
export function stepsForClass(faultClass) {
  const cls = String(faultClass || '').toUpperCase();
  switch (cls) {
    case FAULT_CLASSES.SYNTAX_ERROR:
      return Object.freeze([
        Object.freeze({
          order: 1,
          action: PLAN_ACTIONS.FIX_SYNTAX,
          bound: true,
          scope: 'allowlisted-artifact'
        }),
        Object.freeze({
          order: 2,
          action: 'REVERIFY_PARSE',
          bound: true,
          scope: 'allowlisted-artifact'
        })
      ]);
    case FAULT_CLASSES.MISSING_DEPENDENCY:
      return Object.freeze([
        Object.freeze({
          order: 1,
          action: PLAN_ACTIONS.RESOLVE_DEPENDENCY,
          bound: true,
          scope: 'allowlisted-import'
        }),
        Object.freeze({
          order: 2,
          action: 'REVERIFY_IMPORT',
          bound: true,
          scope: 'allowlisted-artifact'
        })
      ]);
    case FAULT_CLASSES.BUDGET_TRIP:
      return Object.freeze([
        Object.freeze({
          order: 1,
          action: PLAN_ACTIONS.THROTTLE_BUDGET,
          bound: true,
          scope: 'local-budget'
        }),
        Object.freeze({
          order: 2,
          action: PLAN_ACTIONS.ESCALATE_HITL,
          bound: true,
          scope: 'operator'
        })
      ]);
    case FAULT_CLASSES.SCHEMA_DEVIATION:
      return Object.freeze([
        Object.freeze({
          order: 1,
          action: PLAN_ACTIONS.ALIGN_SCHEMA,
          bound: true,
          scope: 'allowlisted-artifact'
        }),
        Object.freeze({
          order: 2,
          action: 'REVERIFY_SCHEMA',
          bound: true,
          scope: 'allowlisted-artifact'
        })
      ]);
    default:
      return Object.freeze([
        Object.freeze({
          order: 1,
          action: PLAN_ACTIONS.NOOP_DENY,
          bound: true,
          scope: 'none'
        })
      ]);
  }
}

/**
 * Build a deterministic bounded repair plan.
 * Same classification + artifact → same planHash (no randomness, no Date).
 *
 * @param {object} opts
 * @param {string} opts.faultClass
 * @param {object} [opts.classification]
 * @param {string} [opts.artifactPath]
 * @param {string[]} [opts.allowlist]
 * @param {boolean} [opts.denied]
 * @param {string} [opts.denyCode]
 * @returns {object}
 */
export function buildRepairPlan(opts = {}) {
  const faultClass = String(opts.faultClass || FAULT_CLASSES.UNKNOWN).toUpperCase();
  const denied = opts.denied === true;
  const artifactPath =
    opts.artifactPath != null ? String(opts.artifactPath).replace(/\\/g, '/') : null;
  const allowlist = Array.isArray(opts.allowlist)
    ? [...opts.allowlist].map((p) => String(p).replace(/\\/g, '/')).sort()
    : [];

  const steps = denied
    ? [
        {
          order: 1,
          action: PLAN_ACTIONS.NOOP_DENY,
          bound: true,
          scope: 'none',
          denyCode: opts.denyCode || 'DENY'
        }
      ]
    : stepsForClass(faultClass).map((s) => ({ ...s }));

  // Stable sort by order then action
  steps.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return String(a.action).localeCompare(String(b.action));
  });

  const canonical = {
    kind: AZ_PLAN_KIND,
    PRODUCTION_READY: AZ_PLAN_PRODUCTION_READY,
    faultClass,
    artifactPath,
    allowlist,
    denied,
    denyCode: denied ? opts.denyCode || 'DENY' : null,
    steps: steps.map((s) => ({
      order: s.order,
      action: s.action,
      bound: true,
      scope: s.scope,
      ...(s.denyCode != null ? { denyCode: s.denyCode } : {})
    })),
    // NON-CLAIM
    unboundedSelfModifyingAgi: false,
    unsupervisedInternetRemediator: false,
    cloudAgentSelfHealFleet: false,
    cloudAgent: false,
    fundacionDelta: 0
  };

  const hash = planHash({
    kind: canonical.kind,
    faultClass: canonical.faultClass,
    artifactPath: canonical.artifactPath,
    allowlist: canonical.allowlist,
    denied: canonical.denied,
    denyCode: canonical.denyCode,
    steps: canonical.steps
  });

  return {
    ...canonical,
    planHash: hash,
    planId: `AZ-PLAN-${hash.slice(0, 12)}`,
    bounded: true,
    deterministic: true
  };
}

export default {
  AZ_PLAN_KIND,
  AZ_PLAN_PRODUCTION_READY,
  PLAN_ACTIONS,
  stableStringify,
  planHash,
  stepsForClass,
  buildRepairPlan
};
