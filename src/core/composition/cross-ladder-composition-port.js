/**
 * @module cross-ladder-composition-port
 * SPEC-0085 / Mission CB — Cross-Ladder Composition Orchestrator Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic simulation of L22×L23 composition:
 *   - Validates plan via policy gate
 *   - Does NOT invoke full BR–BZ runtimes (isolation / no heavy deps)
 *   - Emits STAGE-SEAL-<satellite>-<sha16> stub seals per stage
 *   - Chains digests and seals CB-RCPT-* linking stage seals
 *
 * NON-CLAIM:
 *   Cross-ladder composition ≠ Airflow/Temporal enterprise orchestrator /
 *   ≠ general AGI planner /
 *   ≠ PRODUCTION_READY=YES composition system.
 *   L22 CLOSED never reopen; L23 CLOSED never reopen; L17–L21 CLOSED never reopen;
 *   L24 OPEN (Mission CB in progress);
 *   Axis: Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/composition.
 *
 * Does NOT rewrite Ladder AS composition-receipt.js (AS-RCPT lineage intact).
 *
 * PRODUCTION_READY: NO
 */

import {
  CB_PRODUCTION_READY,
  CB_RECEIPT_KIND,
  sha256Canonical,
  buildCrossLadderCompositionReceipt,
  verifyCrossLadderCompositionReceipt
} from './cross-ladder-composition-receipt.js';

import {
  CrossLadderCompositionPolicyGate,
  CB_CODES
} from './cross-ladder-composition-policy-gate.js';

/** @type {'NO'} */
export const CB_PORT_PRODUCTION_READY = 'NO';

export const CB_PORT_KIND = 'eos-cross-ladder-composition-port';

/**
 * Build a hermetic stage seal stub: STAGE-SEAL-<satellite>-<sha16>
 * @param {object} stage — normalized stage from policy gate
 * @param {string|null} prevDigest — prior stage seal digest for chaining
 * @param {(payload: unknown) => string} hashFn
 * @returns {{ sealId: string, digest: string, satellite: string, ladder: string, stageId: string, prevDigest: string|null }}
 */
export function buildStageSealStub(stage, prevDigest, hashFn = sha256Canonical) {
  const material = {
    stageId: stage.id,
    ladder: stage.ladder,
    satellite: stage.satellite,
    inputDigest: stage.inputDigest || null,
    payload: stage.payload != null ? stage.payload : null,
    prevDigest: prevDigest || null
  };
  const digest = hashFn(material);
  const sha16 = digest.slice(0, 16);
  const sealId = `STAGE-SEAL-${stage.satellite}-${sha16}`;
  return {
    sealId,
    digest,
    satellite: stage.satellite,
    ladder: stage.ladder,
    stageId: stage.id,
    prevDigest: prevDigest || null
  };
}

/**
 * Cross-Ladder Composition Orchestrator Port.
 */
export class CrossLadderCompositionPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxStages]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new CrossLadderCompositionPolicyGate({
      maxStages: options.maxStages,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.compositions = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._composeSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildCrossLadderCompositionReceipt(
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
   * Compose an ordered cross-ladder plan into hermetic stage seals + CB receipt.
   * @param {object} plan
   * @returns {{ ok: boolean, code: string, compositionId?: string, rootDigest?: string, stageSeals?: object[], receipt: object, reason?: string }}
   */
  compose(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      const receipt = this._sealReceipt({
        operation: 'COMPOSE',
        compositionId: plan?.compositionId != null ? String(plan.compositionId) : null,
        rootDigest: null,
        status: 'DENIED',
        stageCount: Array.isArray(plan?.stages) ? plan.stages.length : 0,
        meta: { code: evaluation.code, reason: evaluation.reason }
      });
      return {
        ok: false,
        code: evaluation.code,
        reason: evaluation.reason,
        receipt
      };
    }

    const stages = evaluation.stages;
    this._composeSeq += 1;
    const compositionId =
      plan.compositionId != null && String(plan.compositionId).trim() !== ''
        ? String(plan.compositionId).trim()
        : `CB-COMP-${String(this._composeSeq).padStart(4, '0')}`;

    /** @type {object[]} */
    const stageSeals = [];
    let prevDigest = null;

    for (const stage of stages) {
      const seal = buildStageSealStub(stage, prevDigest, this.hashFn);
      stageSeals.push(Object.freeze({ ...seal }));
      prevDigest = seal.digest;
    }

    const rootDigest = this.hashFn({
      compositionId,
      stageSeals: stageSeals.map((s) => ({
        sealId: s.sealId,
        digest: s.digest,
        satellite: s.satellite,
        ladder: s.ladder,
        stageId: s.stageId
      }))
    });

    const record = Object.freeze({
      compositionId,
      rootDigest,
      stageSeals,
      stageCount: stageSeals.length,
      ladders: Object.freeze([
        ...new Set(stageSeals.map((s) => s.ladder))
      ]),
      satellites: Object.freeze(stageSeals.map((s) => s.satellite)),
      composedAt: new Date().toISOString()
    });

    this.compositions.set(compositionId, record);

    const receipt = this._sealReceipt({
      operation: 'COMPOSE',
      compositionId,
      rootDigest,
      status: 'OK',
      stageCount: stageSeals.length,
      meta: {
        sealIds: stageSeals.map((s) => s.sealId),
        ladders: record.ladders,
        satellites: record.satellites
      }
    });

    return {
      ok: true,
      code: CB_CODES.COMPOSE_OK,
      compositionId,
      rootDigest,
      stageSeals,
      receipt
    };
  }

  /**
   * Retrieve a stored composition by id.
   * @param {string} compositionId
   * @returns {object|null}
   */
  getComposition(compositionId) {
    const record = this.compositions.get(compositionId);
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
      const verifyRes = verifyCrossLadderCompositionReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CB_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CB_CODES.TRAIL_BREAK,
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
      code: CB_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CB_PORT_PRODUCTION_READY,
  CB_PORT_KIND,
  CB_PRODUCTION_READY,
  CB_RECEIPT_KIND,
  CB_CODES,
  buildStageSealStub,
  CrossLadderCompositionPort
};
