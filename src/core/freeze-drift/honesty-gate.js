/**
 * @module honesty-gate
 * SPEC-0053 / Mission AV — Optional fail-closed honesty gate.
 *
 * When mode is fail-closed and drift is MEASURED, DENY release honesty
 * claims until tip SSOT is refreshed (no silent accept).
 *
 * NON-CLAIM:
 *   honesty-gate ≠ auto-merge bot
 *   honesty-gate ≠ GH required-check enforcement
 *   honesty-gate ≠ GH billing change
 *   not AW
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AV_HONESTY_GATE_PRODUCTION_READY = 'NO';

export const AV_HONESTY_GATE_KIND = 'eos-release-honesty-gate';

export const AV_HONESTY_GATE_CODES = Object.freeze({
  OK: 'OK',
  MATCHED: 'MATCHED',
  DENY: 'DENY',
  HONESTY_CLAIM_DENIED: 'HONESTY_CLAIM_DENIED',
  DRIFT_MEASURED: 'DRIFT_MEASURED',
  INVALID_REQUEST: 'INVALID_REQUEST'
});

/**
 * Evaluate honesty gate given an observe result / drift flag.
 * @param {object} input
 * @param {boolean} [input.drift]
 * @param {'observe'|'fail-closed'} [input.mode='observe']
 * @param {string} [input.code]
 * @param {boolean} [input.matched]
 * @returns {{ ok: boolean, code: string, deny: boolean, honestyClaimAllowed: boolean, reason: string|null }}
 */
export function evaluateHonestyGate(input = {}) {
  if (input == null || typeof input !== 'object') {
    return {
      ok: false,
      code: AV_HONESTY_GATE_CODES.INVALID_REQUEST,
      deny: true,
      honestyClaimAllowed: false,
      reason: 'gate input required'
    };
  }

  const mode = input.mode === 'fail-closed' ? 'fail-closed' : 'observe';
  const drift = input.drift === true;
  const matched = input.matched === true || input.code === 'MATCHED';

  if (!drift && matched) {
    return {
      ok: true,
      code: AV_HONESTY_GATE_CODES.MATCHED,
      deny: false,
      honestyClaimAllowed: true,
      reason: null
    };
  }

  if (drift && mode === 'fail-closed') {
    return {
      ok: false,
      code: AV_HONESTY_GATE_CODES.HONESTY_CLAIM_DENIED,
      deny: true,
      honestyClaimAllowed: false,
      reason:
        'fail-closed: tip SSOT drift MEASURED — honesty claims DENY until tip refresh'
    };
  }

  if (drift) {
    // observe mode: report only — do not DENY honesty claims here
    return {
      ok: true,
      code: AV_HONESTY_GATE_CODES.DRIFT_MEASURED,
      deny: false,
      honestyClaimAllowed: true,
      reason: 'observe: drift MEASURED — report only (no silent accept of match)'
    };
  }

  return {
    ok: true,
    code: AV_HONESTY_GATE_CODES.OK,
    deny: false,
    honestyClaimAllowed: true,
    reason: null
  };
}

/**
 * Create honesty gate surface.
 * @returns {object}
 */
export function createHonestyGate() {
  return {
    kind: AV_HONESTY_GATE_KIND,
    PRODUCTION_READY: AV_HONESTY_GATE_PRODUCTION_READY,
    codes: AV_HONESTY_GATE_CODES,
    evaluate: evaluateHonestyGate,
    // NON-CLAIM surface — no GH APIs
    autoMerge: false,
    mutateGhBranchProtection: false,
    claimGhBillingUpgrade: false
  };
}

export default {
  AV_HONESTY_GATE_KIND,
  AV_HONESTY_GATE_PRODUCTION_READY,
  AV_HONESTY_GATE_CODES,
  evaluateHonestyGate,
  createHonestyGate
};
