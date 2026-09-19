/**
 * @module evidence-binding-port
 * SPEC-0096 / Mission CM — Evidence Binding & Claim Custody Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic claim↔evidence custody port:
 *   - Validates bind plan via policy gate
 *   - Binds claimId → evidenceDigest (sha256) with optional prior CL linkDigest
 *   - Decision: PASS | DENY
 *   - Seals CM-RCPT-* receipts with claims
 *   - No network / no GH API
 *
 * NON-CLAIM:
 *   Evidence Binding & Claim Custody Port ≠ WORM SaaS /
 *   ≠ external audit product /
 *   ≠ SIEM retention SaaS / ≠ production data lake /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L25 CLOSED never reopen;
 *   L26 OPEN (Audit + CL MEASURED · CM in progress · CN–CP pending);
 *   Axis: Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/evidence.
 *
 * PRODUCTION_READY: NO
 */

import {
  CM_PRODUCTION_READY,
  CM_RECEIPT_KIND,
  sha256Canonical,
  buildEvidenceBindingReceipt,
  verifyEvidenceBindingReceipt
} from './evidence-binding-receipt.js';

import {
  EvidenceBindingPolicyGate,
  CM_CODES
} from './evidence-binding-policy-gate.js';

/** @type {'NO'} */
export const CM_PORT_PRODUCTION_READY = 'NO';

export const CM_PORT_KIND = 'eos-evidence-binding-port';

/**
 * Evidence Binding & Claim Custody Port — hermetic claim↔evidence binding.
 */
export class EvidenceBindingPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxClaims]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new EvidenceBindingPolicyGate({
      maxClaims: options.maxClaims,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.bindings = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._bindSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildEvidenceBindingReceipt(
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
   * Seal a DENY / gate-reject outcome.
   * @private
   */
  _deny(plan, evaluation) {
    const reasons = [evaluation.reason];
    const claims = Array.isArray(plan?.claims)
      ? plan.claims.map((c) => ({
          claimId: c?.claimId != null ? String(c.claimId) : 'unknown',
          evidenceDigest:
            c?.evidenceDigest != null && String(c.evidenceDigest).trim() !== ''
              ? String(c.evidenceDigest)
              : '',
          linkDigest:
            c?.linkDigest != null && String(c.linkDigest).trim() !== ''
              ? String(c.linkDigest)
              : null,
          specId:
            c?.specId != null && String(c.specId).trim() !== ''
              ? String(c.specId)
              : null,
          codePath:
            c?.codePath != null && String(c.codePath).trim() !== ''
              ? String(c.codePath)
              : null
        }))
      : [];
    const receipt = this._sealReceipt({
      operation: 'BIND',
      planId: plan?.planId != null ? String(plan.planId) : null,
      decision: 'DENY',
      claimCount: claims.length,
      claims,
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      reasons,
      claims,
      receipt
    };
  }

  /**
   * Bind a claim↔evidence plan → PASS | DENY + sealed CM receipt.
   * Hermetic: no network, no GH API; binds claimId → evidenceDigest
   * with optional prior CL linkDigest.
   *
   * @param {object} plan
   * @returns {object}
   */
  bind(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._bindSeq += 1;
    const { planId, claims, reasons: planReasons } = evaluation;

    const sealedClaims = claims.map((c) => ({
      claimId: c.claimId,
      evidenceDigest: c.evidenceDigest,
      linkDigest: c.linkDigest,
      specId: c.specId,
      codePath: c.codePath
    }));

    const reasons = [
      ...(planReasons || []),
      `claim↔evidence bind PASS: claims=${sealedClaims.length} planId=${planId}`
    ];

    const bindingDigest = this.hashFn({
      planId,
      claims: sealedClaims,
      decision: 'PASS'
    });

    const record = Object.freeze({
      planId,
      claims: Object.freeze(sealedClaims.map((c) => Object.freeze({ ...c }))),
      decision: 'PASS',
      reasons: Object.freeze([...reasons]),
      bindingDigest,
      boundAt: new Date().toISOString()
    });

    this.bindings.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'BIND',
      planId,
      decision: 'PASS',
      claimCount: sealedClaims.length,
      claims: sealedClaims,
      reasons,
      bindingDigest,
      meta: {
        code: CM_CODES.BIND_PASS,
        reasons,
        bindingDigest
      }
    });

    return {
      ok: true,
      code: CM_CODES.BIND_PASS,
      decision: 'PASS',
      planId,
      claims: sealedClaims,
      reasons,
      bindingDigest,
      receipt
    };
  }

  /**
   * Alias for bind() — claim custody operation.
   * @param {object} plan
   * @returns {object}
   */
  claim(plan) {
    return this.bind(plan);
  }

  /**
   * Retrieve a stored binding record by planId.
   * @param {string} planId
   * @returns {object|null}
   */
  getBinding(planId) {
    const record = this.bindings.get(planId);
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
      const verifyRes = verifyEvidenceBindingReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CM_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CM_CODES.TRAIL_BREAK,
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
      code: CM_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CM_PORT_PRODUCTION_READY,
  CM_PORT_KIND,
  CM_PRODUCTION_READY,
  CM_RECEIPT_KIND,
  CM_CODES,
  EvidenceBindingPort
};
