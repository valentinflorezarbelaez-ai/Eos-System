/**
 * @module specboot-mutation-gatekeeper-port
 * SPEC-0121 / Mission DK — SpecBoot Mutation Testing Gatekeeper Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Verifies mathematical mutation resilience and enforces zero surviving mutants
 * before allowing task certification without mutating tip pins or closing Ladder 31.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 2cead226
 *   Seals chained DK-RCPT-* receipts with verifiable mutationDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DK_PRODUCTION_READY,
  sha256Canonical,
  buildSpecbootMutationGatekeeperReceipt,
  verifySpecbootMutationGatekeeperReceipt
} from './specboot-mutation-gatekeeper-receipt.js';

import {
  SpecbootMutationGatekeeperPolicyGate,
  DK_CODES
} from './specboot-mutation-gatekeeper-policy-gate.js';

/** @type {'NO'} */
export const DK_PORT_PRODUCTION_READY = 'NO';
export const DK_PORT_KIND = 'eos-specboot-mutation-gatekeeper-port';

export class SpecbootMutationGatekeeperPort {
  /**
   * @param {object} [opts]
   * @param {SpecbootMutationGatekeeperPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new SpecbootMutationGatekeeperPolicyGate();
    this.trail = [];
    this.productionReady = DK_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the mutation testing gatekeeper ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildSpecbootMutationGatekeeperReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-31-mission-dk',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        mutationReport: input.mutationReport || null,
        mutationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildSpecbootMutationGatekeeperReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        mutationReport: input.mutationReport,
        mutationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DK_CODES.OK,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize mutation resilience verification
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      mutationReport: input.mutationReport,
      timestamp: new Date().toISOString()
    };
    const mutationDigest = sha256Canonical(JSON.stringify(payload));

    const receipt = buildSpecbootMutationGatekeeperReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      mutationReport: input.mutationReport,
      mutationDigest,
      mutationHold: {
        zeroMutantsSurvived: Number(input.mutationReport.survivedMutants) === 0,
        resilienceVerified: input.mutationReport.status === 'VERIFIED'
      },
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(receipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DK_CODES.OK,
      receipt
    };
  }

  /**
   * Verifies the cryptographic integrity and hash chaining of the receipt trail
   * @returns {{ ok: boolean, count: number, code: string, reason?: string }}
   */
  verifyTrail() {
    if (this.trail.length === 0) {
      return { ok: true, count: 0, code: DK_CODES.TRAIL_OK };
    }

    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const verifyRes = verifySpecbootMutationGatekeeperReceipt(receipt);
      if (!verifyRes.ok) {
        return {
          ok: false,
          count: this.trail.length,
          code: DK_CODES.TRAIL_BREAK,
          reason: `Receipt at index ${i} verification failed: ${verifyRes.reason}`
        };
      }

      if (i > 0) {
        const prev = this.trail[i - 1];
        if (receipt.prevReceiptHash !== prev.receiptHash) {
          return {
            ok: false,
            count: this.trail.length,
            code: DK_CODES.TRAIL_BREAK,
            reason: `Chaining mismatch at index ${i}`
          };
        }
      }
    }

    return { ok: true, count: this.trail.length, code: DK_CODES.TRAIL_OK };
  }
}
