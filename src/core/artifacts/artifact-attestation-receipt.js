/**
 * @module artifact-attestation-receipt
 * SPEC-0097 / Mission CN — Governed Artifact / SBOM Attestation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, artifactCount,
 *     artifactsDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   artifacts[] { artifactId, sbomDigest, packagePath?, bindDigest?, linkDigest?,
 *                 components? },
 *   reasons[], attestationDigest?
 *
 * NON-CLAIM:
 *   Governed Artifact / SBOM Attestation Port ≠ commercial SBOM SaaS /
 *   ≠ Sigstore product / ≠ public package registry /
 *   ≠ SLSA commercial product /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ PRODUCTION_READY=YES.
 *   Extends BF local RC notary themes — do NOT reopen L19.
 *   L17–L25 CLOSED never reopen;
 *   L26 OPEN (Audit + CL + CM MEASURED · CN in progress · CO–CP pending);
 *   Axis: Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/artifacts.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CN_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CN_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CN_RECEIPT_KIND = 'eos-artifact-attestation-receipt';

export const CN_DECISIONS = Object.freeze(['PASS', 'DENY']);

/**
 * Stable JSON stringify (sorted keys) for deterministic digests.
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
 * sha256 hex digest of canonical payload (node:crypto).
 * @param {unknown} payload
 * @returns {string}
 */
export function sha256Canonical(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Alias used by injectable hash opts. */
export function defaultHash(payload) {
  return sha256Canonical(payload);
}

let _rcptSeq = 0;

/**
 * Reset in-process receipt sequence (tests only).
 */
export function _resetReceiptSeqForTests() {
  _rcptSeq = 0;
}

/**
 * Normalize an artifact attestation node for sealing / display.
 * @param {unknown} artifact
 * @returns {{ artifactId: string, sbomDigest: string, packagePath: string|null, bindDigest: string|null, linkDigest: string|null, components: Array<object>|null }|null}
 */
export function normalizeArtifact(artifact) {
  if (artifact == null || typeof artifact !== 'object') return null;
  const artifactId =
    artifact.artifactId != null ? String(artifact.artifactId).trim() : '';
  const sbomDigest =
    artifact.sbomDigest != null && String(artifact.sbomDigest).trim() !== ''
      ? String(artifact.sbomDigest).trim()
      : '';
  if (!artifactId || !sbomDigest) return null;
  const packagePath =
    artifact.packagePath != null && String(artifact.packagePath).trim() !== ''
      ? String(artifact.packagePath).trim()
      : null;
  const bindDigest =
    artifact.bindDigest != null && String(artifact.bindDigest).trim() !== ''
      ? String(artifact.bindDigest).trim()
      : null;
  const linkDigest =
    artifact.linkDigest != null && String(artifact.linkDigest).trim() !== ''
      ? String(artifact.linkDigest).trim()
      : null;
  let components = null;
  if (Array.isArray(artifact.components)) {
    components = artifact.components.map((c) => {
      if (c == null || typeof c !== 'object') {
        return { name: String(c) };
      }
      return {
        name: c.name != null ? String(c.name) : 'unknown',
        version: c.version != null ? String(c.version) : null,
        digest:
          c.digest != null && String(c.digest).trim() !== ''
            ? String(c.digest).trim()
            : null
      };
    });
  }
  return {
    artifactId,
    sbomDigest,
    packagePath,
    bindDigest,
    linkDigest,
    components
  };
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalArtifactAttestationSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    artifactCount:
      fields.artifactCount != null ? Number(fields.artifactCount) : 0,
    artifactsDigest:
      fields.artifactsDigest != null && fields.artifactsDigest !== ''
        ? String(fields.artifactsDigest)
        : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receiptHash over the canonical nine fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashArtifactAttestationReceipt(
  fields,
  hashFn = sha256Canonical
) {
  const body = canonicalArtifactAttestationSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyArtifactAttestationReceipt(
  receipt,
  hashFn = sha256Canonical
) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CN_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CN_RECEIPT_KIND}, got ${receipt.kind}`
    };
  }

  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  if (receipt.fundacionDelta !== 0) {
    return {
      ok: false,
      reason: `fundacionDelta must be 0, got ${receipt.fundacionDelta}`
    };
  }

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CN-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CN-RCPT-' };
  }

  const expectedHash = hashArtifactAttestationReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CN-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildArtifactAttestationReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CN-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  /** @type {Array<object>} */
  const artifacts = [];
  if (Array.isArray(fields.artifacts)) {
    for (const a of fields.artifacts) {
      const normalized = normalizeArtifact(a);
      if (normalized) artifacts.push(normalized);
    }
  }

  const artifactsDigest =
    fields.artifactsDigest != null && fields.artifactsDigest !== ''
      ? String(fields.artifactsDigest)
      : hashFn(artifacts);

  const attestationDigest =
    fields.attestationDigest != null && fields.attestationDigest !== ''
      ? String(fields.attestationDigest)
      : hashFn({
          planId: fields.planId || null,
          artifacts,
          decision: fields.decision || null
        });

  const body = canonicalArtifactAttestationSealBody({
    receiptId,
    operation: fields.operation || 'ATTEST',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    artifactCount:
      fields.artifactCount != null
        ? Number(fields.artifactCount)
        : artifacts.length,
    artifactsDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  return Object.freeze({
    kind: CN_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    artifacts: Object.freeze(
      artifacts.map((a) =>
        Object.freeze({
          ...a,
          components: a.components
            ? Object.freeze(a.components.map((c) => Object.freeze({ ...c })))
            : null
        })
      )
    ),
    reasons: Object.freeze([...reasons]),
    attestationDigest,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      commercialSbomSaas: false,
      sigstoreProduct: false,
      publicPackageRegistry: false,
      slsaCommercialProduct: false,
      ghEnterpriseEnforcement: false,
      fundacionTouch: false,
      productionReady: false
    })
  });
}

export default {
  CN_PRODUCTION_READY,
  CN_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CN_RECEIPT_KIND,
  CN_DECISIONS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  normalizeArtifact,
  canonicalArtifactAttestationSealBody,
  hashArtifactAttestationReceipt,
  verifyArtifactAttestationReceipt,
  buildArtifactAttestationReceipt,
  _resetReceiptSeqForTests
};
