/**
 * @module broker-receipt
 * SPEC-0052 / Mission AU — Law VI Broker Receipt.
 *
 * Sealed receipt WITHOUT secret values — hashes / presence flags only.
 * Injectable hash; hermetic; no I/O.
 *
 * NON-CLAIM:
 *   broker receipt ≠ vault audit log SaaS
 *   broker receipt ≠ KMS / secret-manager product
 *   not AV/AW
 *   Fundacion Δ=0
 *   Antigravity-first
 *
 * PRODUCTION_READY: NO
 */

import { sanitizeAuPayload } from './secret-leak-guard.js';

/** @type {'NO'} */
export const AU_RECEIPT_PRODUCTION_READY = 'NO';

export const AU_RECEIPT_KIND = 'eos-law-vi-broker-receipt';

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
 * Hash a secret value for presence/integrity without exposing it.
 * @param {string|null|undefined} value
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string|null}
 */
export function hashSecretPresence(value, hashFn = defaultHash) {
  if (value == null || value === '') return null;
  return hashFn({ presence: true, len: String(value).length, v: String(value) });
}

let _rcptSeq = 0;

/**
 * Build a sealed broker receipt — NEVER includes secret values.
 * @param {object} body
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string|number} [opts.now]
 * @returns {object}
 */
export function buildBrokerReceipt(body = {}, opts = {}) {
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : defaultHash;
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const at = String(nowFn());

  _rcptSeq += 1;

  const envKeyPresent =
    body.envKeyPresent === true ||
    (body.envValueHash != null && body.envValueHash !== '');

  const canonical = {
    kind: AU_RECEIPT_KIND,
    PRODUCTION_READY: AU_RECEIPT_PRODUCTION_READY,
    ok: body.ok !== false,
    code: body.code != null ? String(body.code) : 'OK',
    phase: body.phase != null ? String(body.phase) : 'SEAL',
    adapterId: body.adapterId != null ? String(body.adapterId) : null,
    envKey: body.envKey != null ? String(body.envKey) : null,
    envKeyPresent,
    envValueHash:
      body.envValueHash != null ? String(body.envValueHash) : null,
    secretPresent: body.secretPresent === true || envKeyPresent,
    targetClass: body.targetClass != null ? String(body.targetClass) : null,
    fundacionDelta: 0,
    cloudAgent: false,
    vaultClaim: false,
    kmsClaim: false,
    secretManagerClaim: false,
    cloudIamClaim: false,
    at,
    seq: _rcptSeq,
    reason: body.reason != null ? body.reason : null,
    decision: body.decision != null ? body.decision : null,
    status: body.status != null ? body.status : null,
    deny: body.deny === true || body.ok === false,
    meta: body.meta != null ? body.meta : undefined
  };

  // Strip any accidental secret fields before hashing/seal
  const safeCanonical = /** @type {Record<string, unknown>} */ (
    sanitizeAuPayload(canonical)
  );
  // Ensure value/token/secret keys never survive
  delete safeCanonical.value;
  delete safeCanonical.secret;
  delete safeCanonical.token;
  delete safeCanonical.apiKey;
  delete safeCanonical.api_key;

  const receiptDigest = hashFn({
    kind: safeCanonical.kind,
    code: safeCanonical.code,
    phase: safeCanonical.phase,
    adapterId: safeCanonical.adapterId,
    envKey: safeCanonical.envKey,
    envValueHash: safeCanonical.envValueHash,
    at: safeCanonical.at,
    seq: safeCanonical.seq
  });

  const receiptId = `AU-RCPT-${receiptDigest.slice(0, 12)}`;

  return {
    ...safeCanonical,
    receiptId,
    receiptDigest,
    sealed: true
  };
}

export default {
  AU_RECEIPT_KIND,
  AU_RECEIPT_PRODUCTION_READY,
  stableStringify,
  defaultHash,
  hashSecretPresence,
  buildBrokerReceipt
};
