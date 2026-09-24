/**
 * @module vertical-slice-port
 * SPEC-0126 / Mission DP — Sovereign Vertical Slice & Screaming Architecture Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Enforces vertical slice boundaries and screaming architecture patterns:
 *   - Use cases and domain capabilities are primary architectural citizens
 *   - Direct private imports across feature slices are rejected fail-closed
 *   - Cross-slice communication must pass through formal public ports
 *   - Layer-0 domain slices maintain strict purity (NODE_BUILTINS_ONLY)
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 8bbdd522
 *   Seals chained DP-RCPT-* receipts with verifiable sliceDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DP_PRODUCTION_READY,
  sha256Canonical,
  buildVerticalSliceReceipt,
  verifyVerticalSliceReceipt
} from './vertical-slice-receipt.js';

import {
  VerticalSlicePolicyGate,
  DP_CODES
} from './vertical-slice-policy-gate.js';

/** @type {'NO'} */
export const DP_PORT_PRODUCTION_READY = 'NO';
export const DP_PORT_KIND = 'eos-vertical-slice-port';

export class VerticalSlicePort {
  /**
   * @param {object} [opts]
   * @param {VerticalSlicePolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new VerticalSlicePolicyGate();
    this.trail = [];
    this.productionReady = DP_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the vertical slice ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildVerticalSliceReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-32-mission-dp',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        sliceReport: input.sliceReport || null,
        sliceDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildVerticalSliceReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        sliceReport: input.sliceReport,
        sliceDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DP_CODES.OK,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize vertical slice cohesion verification
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      sliceReport: input.sliceReport,
      timestamp: new Date().toISOString()
    };
    const sliceDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildVerticalSliceReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      sliceReport: input.sliceReport,
      sliceDigest,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DP_CODES.OK,
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
      const validRes = verifyVerticalSliceReceipt(receipt);
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
