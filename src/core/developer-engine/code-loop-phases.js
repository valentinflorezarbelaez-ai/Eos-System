/**
 * @module code-loop-phases
 * SPEC-0055 / Mission AX — Sovereign Developer Engine phase enum + transitions.
 *
 * Ordered loop: PLAN → EDIT → VERIFY → SEAL.
 * Fail-closed: illegal transitions → PHASE_DENIED.
 *
 * NON-CLAIM:
 *   phases ≠ unsupervised internet-facing agent
 *   phases ≠ PRODUCTION_READY coding SaaS
 *   not AY/AZ/BA/BB
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AX_PHASES_PRODUCTION_READY = 'NO';

export const AX_PHASES_KIND = 'eos-code-loop-phases';

/** Ordered phase enum (frozen). */
export const AX_PHASES = Object.freeze({
  PLAN: 'PLAN',
  EDIT: 'EDIT',
  VERIFY: 'VERIFY',
  SEAL: 'SEAL'
});

/** Canonical ordered list. */
export const AX_PHASE_ORDER = Object.freeze([
  AX_PHASES.PLAN,
  AX_PHASES.EDIT,
  AX_PHASES.VERIFY,
  AX_PHASES.SEAL
]);

/**
 * @param {unknown} phase
 * @returns {boolean}
 */
export function isValidPhase(phase) {
  return (
    typeof phase === 'string' &&
    Object.prototype.hasOwnProperty.call(AX_PHASES, phase)
  );
}

/**
 * Index of a phase in the ordered loop (-1 if invalid).
 * @param {unknown} phase
 * @returns {number}
 */
export function phaseIndex(phase) {
  if (!isValidPhase(phase)) return -1;
  return AX_PHASE_ORDER.indexOf(/** @type {string} */ (phase));
}

/**
 * Next phase after `from`, or null at end / invalid.
 * @param {unknown} from
 * @returns {string|null}
 */
export function nextPhase(from) {
  const i = phaseIndex(from);
  if (i < 0) return null;
  if (i >= AX_PHASE_ORDER.length - 1) return null;
  return AX_PHASE_ORDER[i + 1];
}

/**
 * Whether transition from → to is legal (forward-only, same phase OK as no-op).
 * @param {unknown} from
 * @param {unknown} to
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function canTransition(from, to) {
  if (!isValidPhase(from) || !isValidPhase(to)) {
    return {
      ok: false,
      code: 'PHASE_DENIED',
      reason: 'invalid phase'
    };
  }
  const a = phaseIndex(from);
  const b = phaseIndex(to);
  if (b < a) {
    return {
      ok: false,
      code: 'PHASE_DENIED',
      reason: `illegal backward transition ${from}→${to}`
    };
  }
  if (b > a + 1) {
    return {
      ok: false,
      code: 'PHASE_DENIED',
      reason: `illegal skip transition ${from}→${to}`
    };
  }
  return { ok: true, code: 'OK', reason: null };
}

/**
 * Assert Plan→Edit→Verify→Seal order on a phase list.
 * @param {unknown[]} phases
 * @returns {{ ok: boolean, code: string, reason: string|null }}
 */
export function assertPhaseOrder(phases) {
  if (!Array.isArray(phases) || phases.length === 0) {
    return {
      ok: false,
      code: 'PHASE_DENIED',
      reason: 'phases required'
    };
  }
  for (let i = 0; i < phases.length; i++) {
    if (!isValidPhase(phases[i])) {
      return {
        ok: false,
        code: 'PHASE_DENIED',
        reason: `invalid phase at ${i}`
      };
    }
    if (i === 0) continue;
    const t = canTransition(phases[i - 1], phases[i]);
    if (!t.ok) return t;
  }
  return { ok: true, code: 'OK', reason: null };
}

export default {
  AX_PHASES_KIND,
  AX_PHASES_PRODUCTION_READY,
  AX_PHASES,
  AX_PHASE_ORDER,
  isValidPhase,
  phaseIndex,
  nextPhase,
  canTransition,
  assertPhaseOrder
};
