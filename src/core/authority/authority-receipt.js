/**
 * @module authority-receipt
 * SPEC-0047 / Mission AP — Authority receipt seal helpers.
 *
 * Thin hermetic helpers for sealing PO/HITL authority receipts with
 * AJ-like ledger tip linkage. Injectable hash + ledger tip only.
 *
 * NON-CLAIM:
 *   authority receipt ≠ GH required-check enforcement
 *   authority receipt ≠ org IAM product
 *   authority receipt ≠ PRODUCTION_READY approval SaaS
 *   not AQ/AR
 *   Fundacion Δ=0
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AP_RECEIPT_PRODUCTION_READY = 'NO';

export const AP_RECEIPT_KIND = 'eos-authority-receipt';

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

/**
 * Build a sealed authority receipt body (caller still runs Law VI sanitize).
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @param {string|null} [opts.ledgerTip]
 * @returns {object}
 */
export function buildAuthorityReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const at = String(nowFn());
  const ledgerTip =
    opts.ledgerTip != null ? String(opts.ledgerTip) : null;
  const digestSource = {
    code: body.code,
    at,
    requestId: body.requestId,
    decision: body.decision,
    phase: body.phase,
    ledgerTip,
    actionId: body.actionId
  };
  const receiptDigest = hashFn(digestSource);
  return {
    ...body,
    kind: AP_RECEIPT_KIND,
    PRODUCTION_READY: AP_RECEIPT_PRODUCTION_READY,
    at,
    sealed: true,
    ledgerTip,
    receiptDigest,
    receiptId: `AP-RCPT-${receiptDigest.slice(0, 12)}`,
    fundacionDelta: 0,
    cloudAgent: false,
    usesCloudAgent: false,
    replayLink: ledgerTip
      ? { ledgerTip, kind: 'aj-like-ledger-tip' }
      : null
  };
}

export default {
  AP_RECEIPT_KIND,
  AP_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildAuthorityReceipt
};
