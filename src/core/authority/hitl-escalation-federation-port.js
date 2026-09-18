/**
 * @module hitl-escalation-federation-port
 * SPEC-0092 / Mission CI — Human Authority Escalation Federation Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic escalation federation port:
 *   - Validates escalation plan via policy gate
 *   - Decision: ESCALATE | HOLD | DENY
 *   - Seals CI-RCPT-* receipts binding operator decisions to mission gates
 *   - Does NOT auto-approve irreversible actions — human remains authority
 *
 * NON-CLAIM:
 *   Human Authority Escalation Federation ≠ autonomous approval of irreversible actions /
 *   human remains authority /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit + CG + CH MEASURED · CI in progress · CJ–CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/authority.
 *
 * PRODUCTION_READY: NO
 */

import {
  CI_PRODUCTION_READY,
  CI_RECEIPT_KIND,
  sha256Canonical,
  buildHitlEscalationFederationReceipt,
  verifyHitlEscalationFederationReceipt
} from './hitl-escalation-federation-receipt.js';

import {
  HitlEscalationFederationPolicyGate,
  CI_CODES
} from './hitl-escalation-federation-policy-gate.js';

/** @type {'NO'} */
export const CI_PORT_PRODUCTION_READY = 'NO';

export const CI_PORT_KIND = 'eos-hitl-escalation-federation-port';

/**
 * Human Authority Escalation Federation Port — hermetic HITL binding.
 */
export class HitlEscalationFederationPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxReasons]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new HitlEscalationFederationPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.escalations = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._escSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildHitlEscalationFederationReceipt(
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
    const receipt = this._sealReceipt({
      operation: 'ESCALATE',
      escalationId:
        plan?.escalationId != null ? String(plan.escalationId) : null,
      projectId: plan?.projectId != null ? String(plan.projectId) : null,
      missionId: plan?.missionId != null ? String(plan.missionId) : null,
      operatorDecision:
        plan?.operatorDecision != null
          ? String(plan.operatorDecision).toUpperCase()
          : null,
      irreversibilityClass:
        plan?.irreversibilityClass != null
          ? String(plan.irreversibilityClass).toUpperCase()
          : null,
      decision: 'DENY',
      reasons,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      escalationId:
        plan?.escalationId != null ? String(plan.escalationId) : undefined,
      projectId:
        plan?.projectId != null ? String(plan.projectId) : undefined,
      missionId:
        plan?.missionId != null ? String(plan.missionId) : undefined,
      reason: evaluation.reason,
      reasons,
      receipt
    };
  }

  /**
   * Escalate a HITL plan → ESCALATE | HOLD | DENY + sealed CI receipt.
   * Hermetic: does NOT auto-approve irreversible; human remains authority;
   * no Fundacion touch.
   *
   * @param {object} plan
   * @returns {object}
   */
  escalate(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._escSeq += 1;
    const {
      escalationId,
      projectId,
      missionId,
      operatorDecision,
      irreversibilityClass,
      mappedDecision,
      reasons: planReasons
    } = evaluation;

    const decision = mappedDecision;

    // Gate-valid REJECT maps to DENY outcome (ok:false) with sealed receipt
    if (decision === 'DENY') {
      const reasons = [
        ...(planReasons || []),
        `hitl escalation DENY: human REJECT escalationId=${escalationId}`
      ];
      const escalationDigest = this.hashFn({
        escalationId,
        projectId,
        missionId,
        operatorDecision,
        irreversibilityClass,
        decision
      });
      const receipt = this._sealReceipt({
        operation: 'ESCALATE',
        escalationId,
        projectId,
        missionId,
        operatorDecision,
        irreversibilityClass,
        decision: 'DENY',
        reasons,
        escalationDigest,
        meta: {
          code: CI_CODES.ESCALATE_DENY,
          reasons,
          escalationDigest
        }
      });
      return {
        ok: false,
        code: CI_CODES.ESCALATE_DENY,
        decision: 'DENY',
        escalationId,
        projectId,
        missionId,
        operatorDecision,
        irreversibilityClass,
        reasons,
        escalationDigest,
        receipt
      };
    }

    const code =
      decision === 'ESCALATE'
        ? CI_CODES.ESCALATE_ALLOW
        : CI_CODES.HOLD_ALLOW;

    const reasons = [
      ...(planReasons || []),
      `hitl escalation ${decision}: class=${irreversibilityClass} operator=${operatorDecision || 'none'} escalationId=${escalationId}`
    ];

    const escalationDigest = this.hashFn({
      escalationId,
      projectId,
      missionId,
      operatorDecision,
      irreversibilityClass,
      decision
    });

    const record = Object.freeze({
      escalationId,
      projectId,
      missionId,
      operatorDecision,
      irreversibilityClass,
      decision,
      reasons: Object.freeze([...reasons]),
      escalationDigest,
      escalatedAt: new Date().toISOString()
    });

    this.escalations.set(escalationId, record);

    const receipt = this._sealReceipt({
      operation: 'ESCALATE',
      escalationId,
      projectId,
      missionId,
      operatorDecision,
      irreversibilityClass,
      decision,
      reasons,
      escalationDigest,
      meta: {
        code,
        reasons,
        escalationDigest
      }
    });

    return {
      ok: true,
      code,
      decision,
      escalationId,
      projectId,
      missionId,
      operatorDecision,
      irreversibilityClass,
      reasons,
      escalationDigest,
      receipt
    };
  }

  /**
   * Retrieve a stored escalation record by id.
   * @param {string} escalationId
   * @returns {object|null}
   */
  getEscalation(escalationId) {
    const record = this.escalations.get(escalationId);
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
      const verifyRes = verifyHitlEscalationFederationReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CI_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CI_CODES.TRAIL_BREAK,
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
      code: CI_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CI_PORT_PRODUCTION_READY,
  CI_PORT_KIND,
  CI_PRODUCTION_READY,
  CI_RECEIPT_KIND,
  CI_CODES,
  HitlEscalationFederationPort
};
