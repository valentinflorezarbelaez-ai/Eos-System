/**
 * @module artifact-attestation-port
 * SPEC-0097 / Mission CN — Governed Artifact / SBOM Attestation Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic artifact/SBOM attestation port:
 *   - Validates attest plan via policy gate
 *   - Attests artifactId → sbomDigest (sha256) with optional packagePath,
 *     prior CM bindDigest, prior CL linkDigest
 *   - Decision: PASS | DENY
 *   - Seals CN-RCPT-* receipts with artifacts
 *   - No network / no GH API / no real tarball I/O (digest strings only)
 *
 * NON-CLAIM:
 *   Governed Artifact / SBOM Attestation Port ≠ commercial SBOM SaaS /
 *   ≠ Sigstore product / ≠ public package registry /
 *   ≠ SLSA commercial product /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ Fundacion writes (Δ=0) /
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

import {
  CN_PRODUCTION_READY,
  CN_RECEIPT_KIND,
  sha256Canonical,
  buildArtifactAttestationReceipt,
  verifyArtifactAttestationReceipt
} from './artifact-attestation-receipt.js';

import {
  ArtifactAttestationPolicyGate,
  CN_CODES
} from './artifact-attestation-policy-gate.js';

/** @type {'NO'} */
export const CN_PORT_PRODUCTION_READY = 'NO';

export const CN_PORT_KIND = 'eos-artifact-attestation-port';

/**
 * Governed Artifact / SBOM Attestation Port — hermetic digest attestation.
 */
export class ArtifactAttestationPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxArtifacts]
   * @param {number} [options.maxComponents]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new ArtifactAttestationPolicyGate({
      maxArtifacts: options.maxArtifacts,
      maxComponents: options.maxComponents,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.attestations = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._attestSeq = 0;
  }

  /**
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildArtifactAttestationReceipt(
      {
        ...fields,
        prevReceiptHash: this._lastReceiptHash
      },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * @private
   */
  _deny(plan, evaluation) {
    const reasons = [evaluation.reason];
    const artifacts = Array.isArray(plan?.artifacts)
      ? plan.artifacts.map((a) => ({
          artifactId:
            a?.artifactId != null ? String(a.artifactId) : 'unknown',
          sbomDigest:
            a?.sbomDigest != null && String(a.sbomDigest).trim() !== ''
              ? String(a.sbomDigest)
              : '',
          packagePath:
            a?.packagePath != null && String(a.packagePath).trim() !== ''
              ? String(a.packagePath)
              : null,
          bindDigest:
            a?.bindDigest != null && String(a.bindDigest).trim() !== ''
              ? String(a.bindDigest)
              : null,
          linkDigest:
            a?.linkDigest != null && String(a.linkDigest).trim() !== ''
              ? String(a.linkDigest)
              : null,
          components: Array.isArray(a?.components) ? a.components : null
        }))
      : [];
    const receipt = this._sealReceipt({
      operation: 'ATTEST',
      planId: plan?.planId != null ? String(plan.planId) : null,
      decision: 'DENY',
      artifactCount: artifacts.length,
      artifacts,
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      reasons,
      artifacts,
      receipt
    };
  }

  /**
   * Attest an artifact/SBOM plan → PASS | DENY + sealed CN receipt.
   * Hermetic: no network, no GH API, no real tarball I/O; digests only.
   *
   * @param {object} plan
   * @returns {object}
   */
  attest(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._attestSeq += 1;
    const { planId, artifacts, reasons: planReasons } = evaluation;

    const sealedArtifacts = artifacts.map((a) => ({
      artifactId: a.artifactId,
      sbomDigest: a.sbomDigest,
      packagePath: a.packagePath,
      bindDigest: a.bindDigest,
      linkDigest: a.linkDigest,
      components: a.components
    }));

    const reasons = [
      ...(planReasons || []),
      `artifact/SBOM attest PASS: artifacts=${sealedArtifacts.length} planId=${planId}`
    ];

    const attestationDigest = this.hashFn({
      planId,
      artifacts: sealedArtifacts,
      decision: 'PASS'
    });

    const record = Object.freeze({
      planId,
      artifacts: Object.freeze(
        sealedArtifacts.map((a) => Object.freeze({ ...a }))
      ),
      decision: 'PASS',
      reasons: Object.freeze([...reasons]),
      attestationDigest,
      attestedAt: new Date().toISOString()
    });

    this.attestations.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'ATTEST',
      planId,
      decision: 'PASS',
      artifactCount: sealedArtifacts.length,
      artifacts: sealedArtifacts,
      reasons,
      attestationDigest,
      meta: {
        code: CN_CODES.ATTEST_PASS,
        reasons,
        attestationDigest
      }
    });

    return {
      ok: true,
      code: CN_CODES.ATTEST_PASS,
      decision: 'PASS',
      planId,
      artifacts: sealedArtifacts,
      reasons,
      attestationDigest,
      receipt
    };
  }

  /**
   * Retrieve a stored attestation record by planId.
   * @param {string} planId
   * @returns {object|null}
   */
  getAttestation(planId) {
    const record = this.attestations.get(planId);
    return record ? record : null;
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifyTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifyArtifactAttestationReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CN_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CN_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      prevHash = receipt.receiptHash;
    }

    return {
      valid: true,
      code: CN_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CN_PORT_PRODUCTION_READY,
  CN_PORT_KIND,
  CN_PRODUCTION_READY,
  CN_RECEIPT_KIND,
  CN_CODES,
  ArtifactAttestationPort
};
