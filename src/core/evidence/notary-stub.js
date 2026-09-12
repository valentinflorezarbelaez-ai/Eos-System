/**
 * @module notary-stub
 * SPEC-0048 / Mission AQ — Hermetic notary stub (observe-only).
 *
 * Optional external-notary interface fake for CI. Records observe
 * receipts WITHOUT claiming legal compliance certification,
 * external audit platform status, or PRODUCTION_READY notarization.
 *
 * NON-CLAIM:
 *   notary stub ≠ legal notarization service
 *   notary stub ≠ compliance certification product
 *   notary stub ≠ external audit platform
 *   observe-only; NEVER claims legal compliance
 *   not AR
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * PRODUCTION_READY: NO
 */

import { defaultHash, stableStringify } from './sealed-evd-pack.js';

/** @type {'NO'} */
export const AQ_NOTARY_PRODUCTION_READY = 'NO';

export const AQ_NOTARY_KIND = 'eos-notary-stub';

export const AQ_NOTARY_CODES = Object.freeze({
  OK: 'OK',
  NOTARY_OBSERVE_ONLY: 'NOTARY_OBSERVE_ONLY',
  INVALID_REQUEST: 'INVALID_REQUEST',
  DISABLED: 'DISABLED'
});

/**
 * Create a hermetic notary stub (observe-only).
 * @param {object} [options]
 * @param {boolean} [options.enabled] — default true when created standalone
 * @param {(payload: unknown) => string} [options.hash]
 * @param {() => string|number} [options.now]
 */
export function createNotaryStub(options = {}) {
  const enabled = options.enabled !== false;
  const hashFn =
    typeof options.hash === 'function' ? options.hash : defaultHash;
  const nowFn =
    typeof options.now === 'function'
      ? options.now
      : () => new Date().toISOString();

  /** @type {object[]} */
  const receipts = [];
  let observeCount = 0;

  function nonClaimFlags() {
    return {
      notLegalNotary: true,
      notComplianceCert: true,
      notExternalAuditPlatform: true,
      observeOnly: true,
      neverClaimsLegalCompliance: true,
      notAr: true,
      fundacionDelta0: true,
      antigravityFirst: true,
      cloudAgentOut: true
    };
  }

  /**
   * Observe a sealed pack — record stub receipt; NEVER claim compliance.
   * @param {object} pack
   * @param {object} [meta]
   */
  function observe(pack, meta = {}) {
    if (!enabled) {
      return {
        ok: false,
        code: AQ_NOTARY_CODES.DISABLED,
        reason: 'notarization observe mode is OFF',
        complianceClaim: false,
        legalNotaryClaim: false,
        PRODUCTION_READY: AQ_NOTARY_PRODUCTION_READY,
        kind: AQ_NOTARY_KIND,
        nonClaim: nonClaimFlags()
      };
    }
    if (pack == null || typeof pack !== 'object') {
      return {
        ok: false,
        code: AQ_NOTARY_CODES.INVALID_REQUEST,
        reason: 'observe requires a sealed pack object',
        complianceClaim: false,
        PRODUCTION_READY: AQ_NOTARY_PRODUCTION_READY,
        kind: AQ_NOTARY_KIND,
        nonClaim: nonClaimFlags()
      };
    }

    observeCount += 1;
    const at = String(nowFn());
    const packDigest =
      pack.packDigest != null
        ? String(pack.packDigest)
        : pack.manifest && pack.manifest.packDigest != null
          ? String(pack.manifest.packDigest)
          : hashFn({ packId: pack.packId, at });
    const receiptId = `AQ-NOTARY-${hashFn({ packDigest, at, seq: observeCount }).slice(0, 12)}`;
    const receipt = {
      kind: AQ_NOTARY_KIND,
      PRODUCTION_READY: AQ_NOTARY_PRODUCTION_READY,
      code: AQ_NOTARY_CODES.NOTARY_OBSERVE_ONLY,
      receiptId,
      at,
      packId: pack.packId != null ? String(pack.packId) : null,
      packDigest,
      chainTip: pack.chainTip != null ? String(pack.chainTip) : null,
      observeOnly: true,
      complianceClaim: false,
      legalNotaryClaim: false,
      externalAuditClaim: false,
      certified: false,
      notarizedLegally: false,
      meta: meta && typeof meta === 'object' ? { ...meta } : {},
      nonClaim: nonClaimFlags()
    };
    receipts.push(receipt);
    return {
      ok: true,
      code: AQ_NOTARY_CODES.NOTARY_OBSERVE_ONLY,
      receipt,
      observeOnly: true,
      complianceClaim: false,
      legalNotaryClaim: false,
      PRODUCTION_READY: AQ_NOTARY_PRODUCTION_READY,
      kind: AQ_NOTARY_KIND,
      nonClaim: nonClaimFlags()
    };
  }

  function getReceipts() {
    return receipts.map((r) => ({ ...r }));
  }

  function getState() {
    return {
      kind: AQ_NOTARY_KIND,
      PRODUCTION_READY: AQ_NOTARY_PRODUCTION_READY,
      enabled,
      observeCount,
      receiptCount: receipts.length,
      complianceClaim: false,
      legalNotaryClaim: false,
      nonClaim: nonClaimFlags()
    };
  }

  return {
    kind: AQ_NOTARY_KIND,
    PRODUCTION_READY: AQ_NOTARY_PRODUCTION_READY,
    enabled,
    observe,
    getReceipts,
    getState,
    stableStringify,
    _codes: AQ_NOTARY_CODES
  };
}

export default createNotaryStub;
