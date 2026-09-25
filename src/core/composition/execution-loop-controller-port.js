/**
 * @module execution-loop-controller-port
 * SPEC-0128 / Mission DR — Deterministic Autonomous Execution Loop Controller Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Enforces deterministic 7-phase execution loop state transitions:
 *   INTAKE -> SPEC_APPROVAL -> TDD_RED -> TDD_GREEN -> QUALITY_AUDIT -> VERIFIED -> SEALED
 *   - Rejects out-of-order execution, skipped phases, and uncontrolled jumps
 *   - Enforces allChecksPassed === true before permitting transition to VERIFIED
 *   - Forbids autonomous auto-seal without human gate verification
 *   - Produces cryptographically verifiable DR-RCPT-* receipts
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 898aa96a
 *   Seals chained DR-RCPT-* receipts with verifiable loopDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DR_PRODUCTION_READY,
  sha256Canonical,
  buildExecutionLoopControllerReceipt,
  verifyExecutionLoopControllerReceipt
} from './execution-loop-controller-receipt.js';

import {
  ExecutionLoopControllerPolicyGate,
  DR_CODES
} from './execution-loop-controller-policy-gate.js';

/** @type {'NO'} */
export const DR_PORT_PRODUCTION_READY = 'NO';
export const DR_PORT_KIND = 'eos-execution-loop-controller-port';

export class ExecutionLoopControllerPort {
  /**
   * @param {object} [opts]
   * @param {ExecutionLoopControllerPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ExecutionLoopControllerPolicyGate();
    this.trail = [];
    this.productionReady = DR_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the execution loop controller ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildExecutionLoopControllerReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-32-mission-dr',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        loopReport: input.loopReport || null,
        loopDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(deniedReceipt);
      return {
        ok: false,
        decision: 'DENY',
        code: gateRes.code,
        reason: gateRes.reason,
        receipt: deniedReceipt
      };
    }

    if (input.ritualMode === 'HOLD') {
      const holdReceipt = buildExecutionLoopControllerReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        loopReport: input.loopReport,
        loopDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DR_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize execution loop controller verification
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      loopReport: input.loopReport,
      timestamp: new Date().toISOString()
    };
    const loopDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildExecutionLoopControllerReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      loopReport: input.loopReport,
      loopDigest,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DR_CODES.OK,
      receipt: passReceipt
    };
  }

  /**
   * Verifies the cryptographic chain integrity of the port's receipt trail
   * @returns {{ ok: boolean, verifiedCount: number, error?: string }}
   */
  verifyTrail() {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const validRes = verifyExecutionLoopControllerReceipt(receipt);
      if (!validRes.ok) {
        return { ok: false, verifiedCount: i, error: `Invalid receipt at ${i}: ${validRes.reason}` };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          verifiedCount: i,
          error: `Chain broken at ${i}: prevHash mismatch. Expected ${prevHash}, got ${receipt.prevReceiptHash}`
        };
      }
      prevHash = receipt.receiptHash;
    }
    return { ok: true, verifiedCount: this.trail.length };
  }
}
