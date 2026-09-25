/**
 * @module process-timeout-compensation-port
 * SPEC-0143 / Mission EG — Long-Running Process Timeout Compensation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission EE seals hermetic deadline/TTL receipts and Mission EF seals deferred-wake
 * receipts, but neither exposes a timeout-compensation surface for long-running
 * processes. This port seals fail-closed compensation receipts when deadline/TTL
 * expires on a long-running process (ties to EE deadline + DZ saga compensation):
 *   - Validates compensation (processId + timeoutReason + compensationPlan;
 *     optional relatedDeadlineReceiptId / observedTimedOut)
 *   - Emits cryptographically verifiable EG-RCPT-* receipts with compensationDigest
 *   - Maintains verifiable audit trail of sealed PASS / HOLD / COMPENSATE / DENY steps
 *   - COMPENSATE seals fail-closed hermetic in-memory only — NOT a live saga rewrite
 *   - PASS seals hermetic timeout-compensation receipt only — NOT unsupervised compensate
 *   - Explicitly refuses unsupervised compensate, live saga rewrite, network write,
 *     schema-json add, tip-refresh, PRODUCTION_READY flip
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 73252208 (do NOT rewrite tip pins)
 *   Seals chained EG-RCPT-* receipts with verifiable compensationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L34; refuse L35 auto-close
 *
 * COMPENSATE = fail-closed hermetic in-memory only ≠ live saga rewrite ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 * PASS = hermetic timeout-compensation receipt ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  EG_PRODUCTION_READY,
  sha256Canonical,
  buildProcessTimeoutCompensationReceipt,
  verifyProcessTimeoutCompensationReceipt
} from './process-timeout-compensation-receipt.js';

import {
  ProcessTimeoutCompensationPolicyGate,
  EG_CODES
} from './process-timeout-compensation-policy-gate.js';

/** @type {'NO'} */
export const EG_PORT_PRODUCTION_READY = 'NO';
export const EG_PORT_KIND = 'eos-process-timeout-compensation-port';

export class ProcessTimeoutCompensationPort {
  /**
   * @param {object} [opts]
   * @param {ProcessTimeoutCompensationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ProcessTimeoutCompensationPolicyGate();
    this.trail = [];
    this.productionReady = EG_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the process timeout compensation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildProcessTimeoutCompensationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-35-mission-eg',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        compensation: input.compensation || null,
        compensationDigest: sha256Canonical(
          JSON.stringify({ planId: input.planId, denied: true, code: gateRes.code })
        ),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
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

    if (input.ritualMode === 'HOLD' || gateRes.decision === 'HOLD') {
      const holdReceipt = buildProcessTimeoutCompensationReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        compensation: input.compensation || null,
        compensationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EG_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    if (gateRes.decision === 'COMPENSATE') {
      const compensatePayload = {
        planId: input.planId,
        changeId: input.changeId,
        compensation: input.compensation,
        mode: 'COMPENSATE',
        hermetic: true,
        timestamp: new Date().toISOString()
      };
      const compensationDigest = sha256Canonical(JSON.stringify(compensatePayload));
      const compensateReceipt = buildProcessTimeoutCompensationReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'COMPENSATE',
        ritualMode: 'ACTIVE',
        compensation: input.compensation,
        compensationDigest,
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
        compensationHold: {
          hermeticInMemoryOnly: true,
          unsupervisedCompensateRefused: true,
          liveSagaRewriteRefused: true,
          networkWriteRefused: true,
          tipRewriteRefused: true,
          schemaJsonAddRefused: true,
          compensateFailClosed: true,
          governedSealOnly: true
        }
      });
      this.trail.push(compensateReceipt);
      return {
        ok: true,
        decision: 'COMPENSATE',
        code: EG_CODES.COMPENSATE,
        reason:
          'Fail-closed COMPENSATE sealed (hermetic in-memory only — ≠ live saga rewrite ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY).',
        receipt: compensateReceipt
      };
    }

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      compensation: input.compensation,
      timestamp: new Date().toISOString()
    };
    const compensationDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildProcessTimeoutCompensationReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      compensation: input.compensation,
      compensationDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      compensationHold: {
        hermeticInMemoryOnly: true,
        unsupervisedCompensateRefused: true,
        liveSagaRewriteRefused: true,
        networkWriteRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        compensateFailClosed: true,
        governedSealOnly: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EG_CODES.OK,
      reason:
        'Hermetic timeout-compensation receipt sealed (≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyProcessTimeoutCompensationReceipt(receipt);
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

void EG_PRODUCTION_READY;
