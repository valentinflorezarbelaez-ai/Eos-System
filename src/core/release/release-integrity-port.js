/**
 * @module release-integrity-port
 * SPEC-0098 / Mission CO — Release Integrity & Progressive Honesty Governor Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic release-integrity / progressive-honesty governor:
 *   - Validates govern plan via policy gate
 *   - Binds releaseId → integrityDigest (or claim set) with optional
 *     prior CN attestDigest / CM bindDigest / CL linkDigest
 *   - honestyMode: HOLD | PROMOTE | ROLLBACK_HINT (hermetic labels — NOT real deploy)
 *   - Decision: PASS | DENY | HOLD
 *   - Seals CO-RCPT-* receipts
 *   - No network / no GH API / no real canary / no Argo/Flagger / no GHE
 *
 * NON-CLAIM:
 *   Release Integrity & Progressive Honesty Governor Port ≠ Argo/Flagger /
 *   ≠ real canary / ≠ progressive-delivery SaaS /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L25 CLOSED never reopen;
 *   L26 OPEN (Audit + CL + CM + CN MEASURED · CO in progress · CP pending);
 *   Axis: Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/release.
 *
 * PRODUCTION_READY: NO
 */

import {
  CO_PRODUCTION_READY,
  CO_RECEIPT_KIND,
  sha256Canonical,
  buildReleaseIntegrityReceipt,
  verifyReleaseIntegrityReceipt
} from './release-integrity-receipt.js';

import {
  ReleaseIntegrityPolicyGate,
  CO_CODES
} from './release-integrity-policy-gate.js';

/** @type {'NO'} */
export const CO_PORT_PRODUCTION_READY = 'NO';

export const CO_PORT_KIND = 'eos-release-integrity-port';

/**
 * Map validated honestyMode → decision for a gate-valid plan.
 * PROMOTE → PASS (hermetic candidacy — NOT real deploy)
 * HOLD → HOLD
 * ROLLBACK_HINT → HOLD (rollback hint is non-promote progressive honesty)
 * @param {string} honestyMode
 * @returns {'PASS'|'HOLD'}
 */
export function decisionForHonestyMode(honestyMode) {
  if (honestyMode === 'PROMOTE') return 'PASS';
  return 'HOLD';
}

/**
 * Release Integrity & Progressive Honesty Governor Port — hermetic.
 */
export class ReleaseIntegrityPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxClaims]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new ReleaseIntegrityPolicyGate({
      maxClaims: options.maxClaims,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.decisions = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._governSeq = 0;
  }

  /**
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildReleaseIntegrityReceipt(
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
    const claims = Array.isArray(plan?.claims)
      ? plan.claims.map((c) => ({
          claimId:
            c?.claimId != null
              ? String(c.claimId)
              : c?.id != null
                ? String(c.id)
                : 'unknown',
          claimType:
            c?.claimType != null
              ? String(c.claimType)
              : c?.type != null
                ? String(c.type)
                : null,
          digest:
            c?.digest != null && String(c.digest).trim() !== ''
              ? String(c.digest)
              : null
        }))
      : [];
    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId: plan?.planId != null ? String(plan.planId) : null,
      releaseId: plan?.releaseId != null ? String(plan.releaseId) : null,
      decision: 'DENY',
      honestyMode:
        plan?.honestyMode != null ? String(plan.honestyMode) : null,
      integrityDigest:
        plan?.integrityDigest != null &&
        String(plan.integrityDigest).trim() !== ''
          ? String(plan.integrityDigest)
          : this.hashFn({ deny: true, planId: plan?.planId || null }),
      attestDigest: plan?.attestDigest || null,
      bindDigest: plan?.bindDigest || null,
      linkDigest: plan?.linkDigest || null,
      claims,
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      releaseId:
        plan?.releaseId != null ? String(plan.releaseId) : undefined,
      honestyMode:
        plan?.honestyMode != null ? String(plan.honestyMode) : undefined,
      reasons,
      claims,
      receipt
    };
  }

  /**
   * Govern a release-integrity plan → PASS | DENY | HOLD + sealed CO receipt.
   * Hermetic: no network, no GH API, no real canary/deploy; digests + labels only.
   *
   * @param {object} plan
   * @returns {object}
   */
  govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._governSeq += 1;
    const {
      planId,
      releaseId,
      integrityDigest,
      honestyMode,
      attestDigest,
      bindDigest,
      linkDigest,
      claims,
      reasons: planReasons
    } = evaluation;

    const decision = decisionForHonestyMode(honestyMode);
    const code =
      decision === 'PASS' ? CO_CODES.GOVERN_PASS : CO_CODES.GOVERN_HOLD;

    const reasons = [
      ...(planReasons || []),
      `release-integrity govern ${decision}: releaseId=${releaseId} honestyMode=${honestyMode} planId=${planId}`
    ];

    const integrityPlanDigest = this.hashFn({
      planId,
      releaseId,
      integrityDigest,
      honestyMode,
      decision,
      claims
    });

    const record = Object.freeze({
      planId,
      releaseId,
      integrityDigest,
      honestyMode,
      decision,
      attestDigest,
      bindDigest,
      linkDigest,
      claims: Object.freeze(claims.map((c) => Object.freeze({ ...c }))),
      reasons: Object.freeze([...reasons]),
      integrityPlanDigest,
      governedAt: new Date().toISOString()
    });

    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'GOVERN',
      planId,
      releaseId,
      decision,
      honestyMode,
      integrityDigest,
      attestDigest,
      bindDigest,
      linkDigest,
      claims,
      reasons,
      integrityPlanDigest,
      meta: {
        code,
        reasons,
        integrityPlanDigest,
        honestyMode
      }
    });

    return {
      ok: true,
      code,
      decision,
      planId,
      releaseId,
      honestyMode,
      integrityDigest,
      attestDigest,
      bindDigest,
      linkDigest,
      claims,
      reasons,
      integrityPlanDigest,
      receipt
    };
  }

  /**
   * Alias for govern() — evaluate(plan) → PASS|DENY|HOLD.
   * @param {object} plan
   * @returns {object}
   */
  evaluate(plan) {
    return this.govern(plan);
  }

  /**
   * Retrieve a stored govern record by planId.
   * @param {string} planId
   * @returns {object|null}
   */
  getDecision(planId) {
    const record = this.decisions.get(planId);
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
      const verifyRes = verifyReleaseIntegrityReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CO_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CO_CODES.TRAIL_BREAK,
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
      code: CO_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CO_PORT_PRODUCTION_READY,
  CO_PORT_KIND,
  CO_PRODUCTION_READY,
  CO_RECEIPT_KIND,
  CO_CODES,
  decisionForHonestyMode,
  ReleaseIntegrityPort
};
