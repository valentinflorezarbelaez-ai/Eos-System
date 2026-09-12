/**
 * @module continuity-receipt
 * SPEC-0051 / Mission AT — Continuity receipt helpers.
 *
 * Thin hermetic helpers for sealing operator continuity / crash-recovery
 * receipts. Injectable hash only. No I/O.
 *
 * NON-CLAIM:
 *   continuity receipt ≠ HA multi-region SaaS
 *   continuity receipt ≠ multi-AZ failover product
 *   continuity receipt ≠ CloudAgent fleet recovery
 *   not AU/AV/AW
 *   Fundacion Δ=0
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AT_RECEIPT_PRODUCTION_READY = 'NO';

export const AT_RECEIPT_KIND = 'eos-continuity-receipt';

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
 * Default FNV-1a style hex digest (hermetic; no crypto dep required).
 * @param {unknown} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let out = (h >>> 0).toString(16).padStart(8, '0');
  let h2 = h ^ 0xdeadbeef;
  for (let i = 0; i < s.length; i++) {
    h2 ^= s.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  out += (h2 >>> 0).toString(16).padStart(8, '0');
  let h3 = h2 ^ 0xcafebabe;
  for (let i = 0; i < s.length; i++) {
    h3 ^= s.charCodeAt(i);
    h3 = Math.imul(h3, 0x01000193);
  }
  out += (h3 >>> 0).toString(16).padStart(8, '0');
  let h4 = h3 ^ 0x0ddba11;
  for (let i = 0; i < s.length; i++) {
    h4 ^= s.charCodeAt(i);
    h4 = Math.imul(h4, 0x01000193);
  }
  out += (h4 >>> 0).toString(16).padStart(8, '0');
  while (out.length < 64) out += out;
  return out.slice(0, 64);
}

let _rcptSeq = 0;

/**
 * Build a sealed continuity receipt (caller still runs Law VI sanitize).
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildContinuityReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const at = String(nowFn());

  _rcptSeq += 1;
  const canonical = {
    kind: AT_RECEIPT_KIND,
    PRODUCTION_READY: AT_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false,
    code: body.code != null ? String(body.code) : 'OK',
    phase: body.phase != null ? String(body.phase) : 'SEAL',
    sessionId: body.sessionId != null ? String(body.sessionId) : null,
    checkpointId:
      body.checkpointId != null ? String(body.checkpointId) : null,
    tipPin: body.tipPin != null ? String(body.tipPin) : null,
    custodyDigest:
      body.custodyDigest != null ? String(body.custodyDigest) : null,
    forensic: body.forensic === true,
    fundacionDelta: 0,
    cloudAgent: false,
    at,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    decision: body.decision != null ? body.decision : null,
    status: body.status != null ? body.status : null,
    allow: body.allow,
    recoveryInProgress: body.recoveryInProgress === true,
    partialApply: false,
    haMultiRegionClaim: false,
    multiAzFailoverClaim: false,
    cloudAgentFleetClaim: false,
    meta: body.meta != null ? body.meta : undefined
  };

  const receiptDigest = hashFn({
    kind: canonical.kind,
    code: canonical.code,
    phase: canonical.phase,
    sessionId: canonical.sessionId,
    checkpointId: canonical.checkpointId,
    tipPin: canonical.tipPin,
    custodyDigest: canonical.custodyDigest,
    at: canonical.at,
    seq: canonical.seq
  });

  const receiptId = `AT-RCPT-${receiptDigest.slice(0, 12)}`;

  return {
    ...canonical,
    receiptId,
    receiptDigest,
    sealed: true
  };
}

export default {
  AT_RECEIPT_KIND,
  AT_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildContinuityReceipt
};
