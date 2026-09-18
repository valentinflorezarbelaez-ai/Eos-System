/**
 * @module external-tool-federation-port
 * SPEC-0090 / Mission CG — External Tool / MCP Federation Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic federation port:
 *   - Validates federation plan via policy gate (allowlist covers tools)
 *   - Decision: ALLOW | DENY
 *   - Seals CG-RCPT-* receipts for external tool / MCP federation
 *   - Does NOT perform live MCP network calls
 *
 * NON-CLAIM:
 *   External tool federation ≠ unrestricted tool proxy /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit MEASURED · CG in progress · CH–CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/federation.
 *
 * PRODUCTION_READY: NO
 */

import {
  CG_PRODUCTION_READY,
  CG_RECEIPT_KIND,
  sha256Canonical,
  buildExternalToolFederationReceipt,
  verifyExternalToolFederationReceipt
} from './external-tool-federation-receipt.js';

import {
  ExternalToolFederationPolicyGate,
  CG_CODES
} from './external-tool-federation-policy-gate.js';

/** @type {'NO'} */
export const CG_PORT_PRODUCTION_READY = 'NO';

export const CG_PORT_KIND = 'eos-external-tool-federation-port';

/**
 * External Tool / MCP Federation Port — allowlisted hermetic federation.
 */
export class ExternalToolFederationPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxTools]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new ExternalToolFederationPolicyGate({
      maxTools: options.maxTools,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.federations = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._fedSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildExternalToolFederationReceipt(
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
   * Federate an external-tool / MCP plan → decision + sealed CG receipt.
   * Hermetic: does not call live MCP network; does not touch Fundacion.
   *
   * @param {object} plan
   * @returns {{ ok: boolean, code: string, decision?: string, federationId?: string, toolIds?: string[], allowlist?: string[], reasons?: string[], toolCallDigest?: string|null, receipt: object, reason?: string }}
   */
  federate(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      /** @type {string[]} */
      const deniedTools = [];
      const raw = plan?.toolIds ?? plan?.tools ?? null;
      if (Array.isArray(raw)) {
        for (const t of raw) {
          if (t != null && String(t).trim()) deniedTools.push(String(t).trim());
        }
      }
      /** @type {string[]} */
      const deniedAllow = [];
      const allowRaw = plan?.allowlist ?? plan?.allowedTools ?? null;
      if (Array.isArray(allowRaw)) {
        for (const t of allowRaw) {
          if (t != null && String(t).trim()) deniedAllow.push(String(t).trim());
        }
      }

      const reasons = [evaluation.reason];
      const receipt = this._sealReceipt({
        operation: 'FEDERATE',
        federationId:
          plan?.federationId != null ? String(plan.federationId) : null,
        decision: 'DENY',
        toolIds: [],
        allowlist: [],
        reasons,
        toolCount: 0,
        toolCallDigest: null,
        meta: { code: evaluation.code, reason: evaluation.reason, reasons }
      });
      return {
        ok: false,
        code: evaluation.code,
        decision: 'DENY',
        federationId:
          plan?.federationId != null ? String(plan.federationId) : undefined,
        toolIds: [],
        allowlist: [],
        reason: evaluation.reason,
        reasons,
        toolCallDigest: null,
        receipt
      };
    }

    this._fedSeq += 1;
    const { federationId, toolIds, allowlist } = evaluation;

    const toolCallDigest = this.hashFn({
      federationId,
      toolIds,
      allowlist,
      decision: 'ALLOW'
    });

    const reasons = [
      `external tool federation ALLOW: tools=${toolIds.length} allowlist=${allowlist.length}`
    ];

    const record = Object.freeze({
      federationId,
      toolIds: Object.freeze([...toolIds]),
      allowlist: Object.freeze([...allowlist]),
      decision: 'ALLOW',
      reasons: Object.freeze([...reasons]),
      toolCallDigest,
      federatedAt: new Date().toISOString()
    });

    this.federations.set(federationId, record);

    const receipt = this._sealReceipt({
      operation: 'FEDERATE',
      federationId,
      decision: 'ALLOW',
      toolIds,
      allowlist,
      reasons,
      toolCount: toolIds.length,
      toolCallDigest,
      meta: {
        code: CG_CODES.FEDERATE_ALLOW,
        reasons,
        toolCallDigest
      }
    });

    return {
      ok: true,
      code: CG_CODES.FEDERATE_ALLOW,
      decision: 'ALLOW',
      federationId,
      toolIds,
      allowlist,
      reasons,
      toolCallDigest,
      receipt
    };
  }

  /**
   * Retrieve a stored federation record by federation id.
   * @param {string} federationId
   * @returns {object|null}
   */
  getFederation(federationId) {
    const record = this.federations.get(federationId);
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
      const verifyRes = verifyExternalToolFederationReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CG_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CG_CODES.TRAIL_BREAK,
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
      code: CG_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CG_PORT_PRODUCTION_READY,
  CG_PORT_KIND,
  CG_PRODUCTION_READY,
  CG_RECEIPT_KIND,
  CG_CODES,
  ExternalToolFederationPort
};
