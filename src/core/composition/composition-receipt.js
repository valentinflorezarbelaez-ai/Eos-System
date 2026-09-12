/**
 * @module composition-receipt
 * SPEC-0050 / Mission AS — Composition receipt helpers.
 *
 * Thin hermetic helpers for sealing cross-satellite composition
 * receipts with shared EVD linkage across AN×AO×AP×AQ planes.
 * Injectable hash only. No I/O.
 *
 * NON-CLAIM:
 *   composition receipt ≠ E2E product suite
 *   composition receipt ≠ PRODUCTION_READY integration platform
 *   composition receipt ≠ CloudAgent orchestration
 *   not AT/AU/AV/AW
 *   Fundacion Δ=0
 *   Antigravity-first (no cloud-agent path)
 *
 * Law VI: never embed static vendor-key prefix literals.
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const AS_RECEIPT_PRODUCTION_READY = 'NO';

export const AS_RECEIPT_KIND = 'eos-composition-receipt';

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
 * Build a sealed composition receipt (caller still runs Law VI sanitize).
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @param {string|null} [opts.sharedEvdLink]
 * @returns {object}
 */
export function buildCompositionReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const at = String(nowFn());
  const sharedEvdLink =
    opts.sharedEvdLink != null
      ? String(opts.sharedEvdLink)
      : body.sharedEvdLink != null
        ? String(body.sharedEvdLink)
        : null;

  _rcptSeq += 1;
  const canonical = {
    kind: AS_RECEIPT_KIND,
    PRODUCTION_READY: AS_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false,
    code: body.code != null ? String(body.code) : 'OK',
    phase: body.phase != null ? String(body.phase) : 'SEAL',
    scenarioId: body.scenarioId != null ? String(body.scenarioId) : null,
    compositionId:
      body.compositionId != null ? String(body.compositionId) : null,
    planes: body.planes != null ? body.planes : null,
    planeCodes: body.planeCodes != null ? body.planeCodes : null,
    inconsistentPlanes:
      body.inconsistentPlanes != null ? body.inconsistentPlanes : null,
    sharedEvdLink,
    forensic: body.forensic === true,
    fundacionDelta: 0,
    cloudAgent: false,
    at,
    seq: _rcptSeq,
    // Carry selected body fields for forensics (caller sanitizes)
    reason: body.reason != null ? body.reason : null,
    decision: body.decision != null ? body.decision : null,
    status: body.status != null ? body.status : null,
    hitlRequired: body.hitlRequired === true,
    allow: body.allow,
    meta: body.meta != null ? body.meta : undefined
  };

  const receiptDigest = hashFn({
    kind: canonical.kind,
    code: canonical.code,
    phase: canonical.phase,
    scenarioId: canonical.scenarioId,
    compositionId: canonical.compositionId,
    planes: canonical.planes,
    planeCodes: canonical.planeCodes,
    sharedEvdLink: canonical.sharedEvdLink,
    at: canonical.at,
    seq: canonical.seq
  });

  const receiptId = `AS-RCPT-${receiptDigest.slice(0, 12)}`;

  return {
    ...canonical,
    receiptId,
    receiptDigest,
    sealed: true
  };
}

export default {
  AS_RECEIPT_KIND,
  AS_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  buildCompositionReceipt
};
