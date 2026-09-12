/**
 * @module drift-receipt
 * SPEC-0053 / Mission AV — Freeze-drift sealed receipt.
 *
 * Sealed receipt: MATCHED | DRIFT_MEASURED | DENY (fail-closed).
 * No GH mutation fields claiming enforcement / auto-merge / billing.
 *
 * NON-CLAIM:
 *   drift receipt ≠ auto-merge bot
 *   drift receipt ≠ GH branch-protection mutation API
 *   drift receipt ≠ GH required-check enforcement
 *   drift receipt ≠ GH billing change
 *   not AW
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AV_RECEIPT_PRODUCTION_READY = 'NO';

export const AV_RECEIPT_KIND = 'eos-freeze-drift-receipt';

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
 * Build a sealed freeze-drift receipt.
 * Explicitly omits / false-flags any GH mutation / auto-merge / billing claims.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildDriftReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const at = String(nowFn());

  _rcptSeq += 1;

  const status =
    body.status != null
      ? String(body.status)
      : body.code === 'MATCHED'
        ? 'MATCHED'
        : body.code === 'DENY' || body.code === 'HONESTY_CLAIM_DENIED'
          ? 'DENY'
          : body.ok === false
            ? 'DRIFT_MEASURED'
            : 'MATCHED';

  const canonical = {
    kind: AV_RECEIPT_KIND,
    PRODUCTION_READY: AV_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false,
    code: body.code != null ? String(body.code) : 'OK',
    status,
    phase: body.phase != null ? String(body.phase) : 'OBSERVE',
    mode: body.mode != null ? String(body.mode) : 'observe',
    freezeTip: body.freezeTip != null ? String(body.freezeTip) : null,
    matrixTip: body.matrixTip != null ? String(body.matrixTip) : null,
    observedTip: body.observedTip != null ? String(body.observedTip) : null,
    drift: body.drift === true,
    deny: body.deny === true || body.ok === false,
    fundacionDelta: 0,
    // NON-CLAIM flags — always false; never GH mutation surface
    cloudAgent: false,
    autoMerge: false,
    autoMergeClaim: false,
    ghBranchProtectionMutation: false,
    ghRequiredCheckEnforcement: false,
    ghBillingChange: false,
    ghApiMutation: false,
    at,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    decision: body.decision != null ? body.decision : null,
    mismatches: Array.isArray(body.mismatches) ? body.mismatches : [],
    meta: body.meta != null ? body.meta : undefined
  };

  const receiptDigest = hashFn({
    kind: canonical.kind,
    code: canonical.code,
    status: canonical.status,
    freezeTip: canonical.freezeTip,
    matrixTip: canonical.matrixTip,
    observedTip: canonical.observedTip,
    mode: canonical.mode,
    at: canonical.at,
    seq: canonical.seq
  });

  const receiptId = `AV-RCPT-${receiptDigest.slice(0, 12)}`;

  return {
    ...canonical,
    receiptId,
    receiptDigest,
    sealed: true
  };
}

export default {
  AV_RECEIPT_KIND,
  AV_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildDriftReceipt
};
