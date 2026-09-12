/**
 * @module federation-custody-envelope
 * SPEC-0045 / Mission AN — thin seal/verify helpers for portable
 * multi-workstation session custody envelopes.
 *
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: envelope helpers ≠ cloud fleet / ≠ multi-tenant SaaS /
 * ≠ CloudAgent / ≠ PRODUCTION_READY.
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const AN_ENVELOPE_PRODUCTION_READY = 'NO';

export const AN_ENVELOPE_KIND = 'eos-federation-custody-envelope';

/**
 * Stable JSON stringify (sorted keys).
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
 * @param {unknown} payload
 * @returns {string}
 */
export function defaultHash(payload) {
  const body =
    typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : stableStringify(payload);
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Canonical body used for envelope digest (excludes `digest` itself).
 * @param {object} envelope
 * @returns {object}
 */
export function envelopeCanonicalBody(envelope) {
  return {
    envelopeId: envelope.envelopeId,
    fromWorkstation: envelope.fromWorkstation,
    sessionId: envelope.sessionId,
    tipPin: envelope.tipPin ?? null,
    custodyDigest: envelope.custodyDigest,
    payload: envelope.payload,
    sealedAt: envelope.sealedAt,
    kind: envelope.kind || AN_ENVELOPE_KIND,
    PRODUCTION_READY: envelope.PRODUCTION_READY || AN_ENVELOPE_PRODUCTION_READY
  };
}

/**
 * Seal a portable custody envelope (adds digest).
 * @param {object} partial
 * @param {(payload: any) => string} [hashFn]
 * @returns {object}
 */
export function sealEnvelope(partial, hashFn = defaultHash) {
  const body = envelopeCanonicalBody({
    ...partial,
    kind: AN_ENVELOPE_KIND,
    PRODUCTION_READY: AN_ENVELOPE_PRODUCTION_READY
  });
  const digest = hashFn(body);
  return Object.freeze({
    ...body,
    digest
  });
}

/**
 * Verify envelope digest integrity.
 * @param {object} envelope
 * @param {(payload: any) => string} [hashFn]
 * @returns {{ ok: boolean, code?: string, expectedDigest?: string, actualDigest?: string }}
 */
export function verifyEnvelopeDigest(envelope, hashFn = defaultHash) {
  if (!envelope || typeof envelope !== 'object') {
    return { ok: false, code: 'INVALID_ENVELOPE' };
  }
  if (
    !envelope.envelopeId ||
    !envelope.fromWorkstation ||
    !envelope.sessionId ||
    !envelope.custodyDigest ||
    !envelope.digest ||
    !envelope.sealedAt
  ) {
    return { ok: false, code: 'INVALID_ENVELOPE' };
  }
  const expected = hashFn(envelopeCanonicalBody(envelope));
  if (expected !== envelope.digest) {
    return {
      ok: false,
      code: 'TAMPER_DETECTED',
      expectedDigest: expected,
      actualDigest: envelope.digest
    };
  }
  return { ok: true };
}

/**
 * @param {unknown} value
 * @returns {any}
 */
export function structuredCloneSafe(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export default {
  sealEnvelope,
  verifyEnvelopeDigest,
  defaultHash,
  stableStringify,
  AN_ENVELOPE_KIND,
  AN_ENVELOPE_PRODUCTION_READY
};
