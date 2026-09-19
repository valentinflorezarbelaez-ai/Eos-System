/**
 * @module spec-code-traceability-port
 * SPEC-0095 / Mission CL — Spec↔Code Traceability Graph Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic Spec↔Code binding port:
 *   - Validates link plan via policy gate
 *   - Binds SPEC ids to codePath / moduleId (+ optional evidenceDigest)
 *   - Decision: PASS | DENY
 *   - Seals CL-RCPT-* receipts with nodes
 *   - No network / no GH API
 *
 * NON-CLAIM:
 *   Spec↔Code Traceability Graph Port ≠ full LSP/IDE product /
 *   ≠ GitHub code search /
 *   ≠ claims GH Enterprise enforcement /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L25 CLOSED never reopen;
 *   L26 OPEN (Audit MEASURED · CL in progress · CM–CP pending);
 *   Axis: Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/traceability.
 *
 * PRODUCTION_READY: NO
 */

import {
  CL_PRODUCTION_READY,
  CL_RECEIPT_KIND,
  sha256Canonical,
  buildSpecCodeTraceabilityReceipt,
  verifySpecCodeTraceabilityReceipt
} from './spec-code-traceability-receipt.js';

import {
  SpecCodeTraceabilityPolicyGate,
  CL_CODES
} from './spec-code-traceability-policy-gate.js';

/** @type {'NO'} */
export const CL_PORT_PRODUCTION_READY = 'NO';

export const CL_PORT_KIND = 'eos-spec-code-traceability-port';

/**
 * Spec↔Code Traceability Graph Port — hermetic SPEC↔code binding.
 */
export class SpecCodeTraceabilityPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxNodes]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new SpecCodeTraceabilityPolicyGate({
      maxNodes: options.maxNodes,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.graphs = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._linkSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildSpecCodeTraceabilityReceipt(
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
    const nodes = Array.isArray(plan?.nodes)
      ? plan.nodes.map((n) => ({
          specId: n?.specId != null ? String(n.specId) : 'unknown',
          codePath:
            n?.codePath != null && String(n.codePath).trim() !== ''
              ? String(n.codePath)
              : null,
          moduleId:
            n?.moduleId != null && String(n.moduleId).trim() !== ''
              ? String(n.moduleId)
              : null,
          evidenceDigest:
            n?.evidenceDigest != null && String(n.evidenceDigest).trim() !== ''
              ? String(n.evidenceDigest)
              : null
        }))
      : [];
    const receipt = this._sealReceipt({
      operation: 'LINK',
      planId: plan?.planId != null ? String(plan.planId) : null,
      decision: 'DENY',
      nodeCount: nodes.length,
      nodes,
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      reasons,
      nodes,
      receipt
    };
  }

  /**
   * Link a Spec↔Code plan → PASS | DENY + sealed CL receipt.
   * Hermetic: no network, no GH API; binds SPEC ids to code surfaces.
   *
   * @param {object} plan
   * @returns {object}
   */
  link(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._linkSeq += 1;
    const { planId, nodes, reasons: planReasons } = evaluation;

    const sealedNodes = nodes.map((n) => ({
      specId: n.specId,
      codePath: n.codePath,
      moduleId: n.moduleId,
      evidenceDigest: n.evidenceDigest
    }));

    const reasons = [
      ...(planReasons || []),
      `spec↔code link PASS: nodes=${sealedNodes.length} planId=${planId}`
    ];

    const graphDigest = this.hashFn({
      planId,
      nodes: sealedNodes,
      decision: 'PASS'
    });

    const record = Object.freeze({
      planId,
      nodes: Object.freeze(sealedNodes.map((n) => Object.freeze({ ...n }))),
      decision: 'PASS',
      reasons: Object.freeze([...reasons]),
      graphDigest,
      linkedAt: new Date().toISOString()
    });

    this.graphs.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'LINK',
      planId,
      decision: 'PASS',
      nodeCount: sealedNodes.length,
      nodes: sealedNodes,
      reasons,
      graphDigest,
      meta: {
        code: CL_CODES.LINK_PASS,
        reasons,
        graphDigest
      }
    });

    return {
      ok: true,
      code: CL_CODES.LINK_PASS,
      decision: 'PASS',
      planId,
      nodes: sealedNodes,
      reasons,
      graphDigest,
      receipt
    };
  }

  /**
   * Alias for link() — Spec↔Code trace operation.
   * @param {object} plan
   * @returns {object}
   */
  trace(plan) {
    return this.link(plan);
  }

  /**
   * Retrieve a stored graph record by planId.
   * @param {string} planId
   * @returns {object|null}
   */
  getGraph(planId) {
    const record = this.graphs.get(planId);
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
      const verifyRes = verifySpecCodeTraceabilityReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CL_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CL_CODES.TRAIL_BREAK,
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
      code: CL_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CL_PORT_PRODUCTION_READY,
  CL_PORT_KIND,
  CL_PRODUCTION_READY,
  CL_RECEIPT_KIND,
  CL_CODES,
  SpecCodeTraceabilityPort
};
