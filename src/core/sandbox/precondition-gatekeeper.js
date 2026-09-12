/**
 * @module precondition-gatekeeper
 * SPEC-0031 / Mission Z — Level 2 Precondition Verifier.
 *
 * Fail-closed evaluator of the six constitutional Level-2 preconditions
 * (same keys as T-gate SPEC-0025a). Any missing or false key denies.
 *
 * NON-CLAIM:
 *   Gatekeeper ok ≠ Fundacion Δ=0 flipped.
 *   Level-2 receipts ≠ PRODUCTION_READY.
 *   Simulation ≠ Fundacion Δ opened.
 *   This is NOT a rewrite of external-write-gateway / write-barrier.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const GATEKEEPER_PRODUCTION_READY = 'NO';

export const GATEKEEPER_KIND = 'eos-level-2-precondition-gatekeeper';

/**
 * Six constitutional Level-2 preconditions — all required; fail-closed.
 * Frozen list; same order/names as T-gate EXTERNAL_WRITE_PRECONDITIONS.
 * @type {readonly string[]}
 */
export const PRECONDITION_KEYS = Object.freeze([
  'REGISTERED',
  'INTAKE_COMPLETE',
  'SPEC_APPROVED',
  'AUDIT_COMPLETE',
  'OWNER_APPROVAL',
  'LEVEL_2_AUTHORIZED'
]);

export const GATEKEEPER_CODES = Object.freeze({
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  PRECONDITION_INVALID: 'PRECONDITION_INVALID'
});

/**
 * Typed error for gatekeeper assertion failures (evaluate itself does not throw).
 */
export class PreconditionGatekeeperError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = GATEKEEPER_CODES.PRECONDITION_FAILED, details = {}) {
    super(message);
    this.name = 'PreconditionGatekeeperError';
    this.code = code;
    Object.assign(this, details);
  }
}

/**
 * Receipt truthy / { ok: true } / { passed: true } / non-empty string acceptance.
 * Fail-closed: undefined, null, false, 0, '', { ok: false } are NOT ok.
 * @param {*} value
 * @returns {boolean}
 */
export function receiptOk(value) {
  if (value === true) return true;
  if (value && typeof value === 'object' && (value.ok === true || value.passed === true)) {
    return true;
  }
  if (typeof value === 'string' && value.trim().length > 0) return true;
  return false;
}

/**
 * Pure fail-closed evaluation of a preconditions map.
 * @param {object} preconditions
 * @param {readonly string[]} [keys]
 * @returns {{ ok: boolean, missing: string[], PRODUCTION_READY: 'NO' }}
 */
export function evaluatePreconditions(preconditions, keys = PRECONDITION_KEYS) {
  const missing = [];
  const p = preconditions && typeof preconditions === 'object' ? preconditions : {};
  for (const key of keys) {
    if (!receiptOk(p[key])) missing.push(key);
  }
  return {
    ok: missing.length === 0,
    missing,
    PRODUCTION_READY: GATEKEEPER_PRODUCTION_READY
  };
}

/**
 * Create a Level-2 precondition gatekeeper.
 *
 * @param {object} [opts]
 * @param {readonly string[]} [opts.keys] override key list (defaults to PRECONDITION_KEYS)
 * @param {(value: *) => boolean} [opts.receiptOk]
 * @returns {{
 *   evaluate: (preconditions: object) => { ok: boolean, missing: string[], PRODUCTION_READY: 'NO' },
 *   assert: (preconditions: object) => { ok: true, missing: [], PRODUCTION_READY: 'NO' },
 *   keys: string[],
 *   kind: string,
 *   PRODUCTION_READY: 'NO',
 *   health: () => object
 * }}
 */
export function createPreconditionGatekeeper(opts = {}) {
  const keys = Object.freeze(
    Array.isArray(opts.keys) && opts.keys.length > 0
      ? [...opts.keys]
      : [...PRECONDITION_KEYS]
  );
  const okFn = typeof opts.receiptOk === 'function' ? opts.receiptOk : receiptOk;

  /**
   * @param {object} preconditions
   * @returns {{ ok: boolean, missing: string[], PRODUCTION_READY: 'NO', preconditions: object }}
   */
  function evaluate(preconditions) {
    const missing = [];
    const p = preconditions && typeof preconditions === 'object' ? preconditions : {};
    const flags = {};
    for (const key of keys) {
      const present = okFn(p[key]);
      flags[key] = present;
      if (!present) missing.push(key);
    }
    return {
      ok: missing.length === 0,
      missing,
      preconditions: flags,
      PRODUCTION_READY: GATEKEEPER_PRODUCTION_READY
    };
  }

  /**
   * @param {object} preconditions
   * @returns {{ ok: true, missing: [], PRODUCTION_READY: 'NO' }}
   */
  function assert(preconditions) {
    const result = evaluate(preconditions);
    if (!result.ok || result.missing.length > 0) {
      const listed = result.missing.length ? result.missing : ['UNKNOWN'];
      throw new PreconditionGatekeeperError(
        `PRECONDITION_FAILED: missing ${listed.join(',')}`,
        GATEKEEPER_CODES.PRECONDITION_FAILED,
        { missing: listed }
      );
    }
    return { ok: true, missing: [], PRODUCTION_READY: GATEKEEPER_PRODUCTION_READY };
  }

  function health() {
    return {
      kind: GATEKEEPER_KIND,
      PRODUCTION_READY: GATEKEEPER_PRODUCTION_READY,
      keys: [...keys],
      fundacionDeltaOpened: false,
      level2ReceiptsMeanProductionReady: false
    };
  }

  return {
    evaluate,
    assert,
    keys: [...keys],
    kind: GATEKEEPER_KIND,
    PRODUCTION_READY: GATEKEEPER_PRODUCTION_READY,
    health
  };
}

export default createPreconditionGatekeeper;
