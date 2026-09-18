/**
 * @module fleet-activation-port
 * SPEC-0087 / Mission CD — Fleet Project Registry & Governed Activation Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic activation port:
 *   - Validates project SSOT → mission allowlist plan via policy gate
 *   - Decision: ALLOW | DENY
 *   - Seals CD-RCPT-* receipts linking project SSOT digest → allowed mission ids
 *
 * NON-CLAIM:
 *   Fleet activation ≠ Kubernetes multi-cluster control plane /
 *   ≠ touches Fundacion (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L23 CLOSED never reopen;
 *   L24 OPEN (Audit + CB + CC MEASURED · CD in progress · CE–CF pending);
 *   Axis: Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/projects.
 *
 * Does NOT call k8s/cloud; does NOT touch Fundacion trees.
 *
 * PRODUCTION_READY: NO
 */

import {
  CD_PRODUCTION_READY,
  CD_RECEIPT_KIND,
  sha256Canonical,
  buildFleetActivationReceipt,
  verifyFleetActivationReceipt
} from './fleet-activation-receipt.js';

import {
  FleetActivationPolicyGate,
  CD_CODES
} from './fleet-activation-policy-gate.js';

/** @type {'NO'} */
export const CD_PORT_PRODUCTION_READY = 'NO';

export const CD_PORT_KIND = 'eos-fleet-activation-port';

/**
 * Fleet Activation Port — binds project SSOT digests to mission allowlists.
 */
export class FleetActivationPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxMissions]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new FleetActivationPolicyGate({
      maxMissions: options.maxMissions,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.activations = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._actSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildFleetActivationReceipt(
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
   * Activate a project SSOT → mission allowlist plan → decision + sealed CD receipt.
   * Hermetic: does not call k8s/cloud; does not touch Fundacion.
   *
   * @param {object} plan
   * @returns {{ ok: boolean, code: string, decision?: string, projectId?: string, projectSsotDigest?: string, allowedMissions?: string[], deniedMissions?: string[], reasons?: string[], rootDigest?: string, receipt: object, reason?: string }}
   */
  activate(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      /** @type {string[]} */
      const deniedFromPlan = [];
      const raw =
        plan?.allowlist ?? plan?.missionAllowlist ?? plan?.missions ?? null;
      if (Array.isArray(raw)) {
        for (const entry of raw) {
          if (entry != null && typeof entry === 'object' && !Array.isArray(entry)) {
            if (entry.missionId != null) deniedFromPlan.push(String(entry.missionId));
          } else if (entry != null) {
            deniedFromPlan.push(String(entry));
          }
        }
      }

      const reasons = [evaluation.reason];
      const receipt = this._sealReceipt({
        operation: 'ACTIVATE',
        projectId: plan?.projectId != null ? String(plan.projectId) : null,
        decision: 'DENY',
        projectSsotDigest:
          plan?.projectSsotDigest != null
            ? String(plan.projectSsotDigest)
            : plan?.ssotDigest != null
              ? String(plan.ssotDigest)
              : null,
        allowedMissions: [],
        deniedMissions: deniedFromPlan,
        reasons,
        allowedMissionCount: 0,
        meta: { code: evaluation.code, reason: evaluation.reason, reasons }
      });
      return {
        ok: false,
        code: evaluation.code,
        decision: 'DENY',
        projectId: plan?.projectId != null ? String(plan.projectId) : undefined,
        allowedMissions: [],
        deniedMissions: deniedFromPlan,
        reason: evaluation.reason,
        reasons,
        receipt
      };
    }

    this._actSeq += 1;
    const { projectId, projectSsotDigest, allowlist } = evaluation;

    const rootDigest = this.hashFn({
      projectId,
      projectSsotDigest,
      allowedMissions: allowlist,
      decision: 'ALLOW'
    });

    const reasons = [
      'project SSOT digest bound to mission allowlist (governed activation ALLOW)'
    ];

    const record = Object.freeze({
      projectId,
      projectSsotDigest,
      allowedMissions: Object.freeze([...allowlist]),
      deniedMissions: Object.freeze([]),
      decision: 'ALLOW',
      reasons: Object.freeze([...reasons]),
      rootDigest,
      activatedAt: new Date().toISOString()
    });

    this.activations.set(projectId, record);

    const receipt = this._sealReceipt({
      operation: 'ACTIVATE',
      projectId,
      decision: 'ALLOW',
      projectSsotDigest,
      allowedMissions: allowlist,
      deniedMissions: [],
      reasons,
      allowedMissionCount: allowlist.length,
      meta: {
        code: CD_CODES.ACTIVATE_ALLOW,
        reasons,
        rootDigest
      }
    });

    return {
      ok: true,
      code: CD_CODES.ACTIVATE_ALLOW,
      decision: 'ALLOW',
      projectId,
      projectSsotDigest,
      allowedMissions: allowlist,
      deniedMissions: [],
      reasons,
      rootDigest,
      receipt
    };
  }

  /**
   * Retrieve a stored activation by project id.
   * @param {string} projectId
   * @returns {object|null}
   */
  getActivation(projectId) {
    const record = this.activations.get(projectId);
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
      const verifyRes = verifyFleetActivationReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CD_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CD_CODES.TRAIL_BREAK,
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
      code: CD_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CD_PORT_PRODUCTION_READY,
  CD_PORT_KIND,
  CD_PRODUCTION_READY,
  CD_RECEIPT_KIND,
  CD_CODES,
  FleetActivationPort
};
