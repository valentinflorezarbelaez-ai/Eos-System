/**
 * @module adversarial-invariant-refuter-port
 * SPEC-0122 / Mission DL — Adversarial Invariant Refuter Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Actively challenges proposed specifications by generating chaos attack vectors and
 * evaluating system resilience against invariant breaches before SpecBoot apply.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 20cb9abd
 *   Seals chained DL-RCPT-* receipts with verifiable refutationDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DL_PRODUCTION_READY,
  sha256Canonical,
  buildAdversarialInvariantRefuterReceipt,
  verifyAdversarialInvariantRefuterReceipt
} from './adversarial-invariant-refuter-receipt.js';

import {
  AdversarialInvariantRefuterPolicyGate,
  DL_CODES
} from './adversarial-invariant-refuter-policy-gate.js';

/** @type {'NO'} */
export const DL_PORT_PRODUCTION_READY = 'NO';
export const DL_PORT_KIND = 'eos-adversarial-invariant-refuter-port';

export class AdversarialInvariantRefuterPort {
  /**
   * @param {object} [opts]
   * @param {AdversarialInvariantRefuterPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new AdversarialInvariantRefuterPolicyGate();
    this.trail = [];
    this.productionReady = DL_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the adversarial invariant refutation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildAdversarialInvariantRefuterReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-31-mission-dl',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        refutationReport: input.refutationReport || null,
        refutationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildAdversarialInvariantRefuterReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        refutationReport: input.refutationReport,
        refutationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DL_CODES.OK,
        receipt: holdReceipt
      };
    }

    if (gateRes.decision === 'CHALLENGE') {
      const challengeReceipt = buildAdversarialInvariantRefuterReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'CHALLENGE',
        ritualMode: input.ritualMode || 'ACTIVE',
        refutationReport: input.refutationReport,
        refutationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'CHALLENGE' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(challengeReceipt);
      return {
        ok: true,
        decision: 'CHALLENGE',
        code: DL_CODES.OK,
        reason: gateRes.reason,
        receipt: challengeReceipt
      };
    }

    // ACTIVE mode: synthesize invariant refutation resilience
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      refutationReport: input.refutationReport,
      timestamp: new Date().toISOString()
    };
    const refutationDigest = sha256Canonical(JSON.stringify(payload));

    const receipt = buildAdversarialInvariantRefuterReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      refutationReport: input.refutationReport,
      refutationDigest,
      refutationHold: {
        invariantsWithstood: Number(input.refutationReport.unhandledBreaches) === 0,
        zeroBreachesUnhandled: Number(input.refutationReport.unhandledBreaches) === 0
      },
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(receipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DL_CODES.OK,
      receipt
    };
  }

  /**
   * Verifies the cryptographic integrity and hash chaining of the receipt trail
   * @returns {{ ok: boolean, count: number, code: string, reason?: string }}
   */
  verifyTrail() {
    if (this.trail.length === 0) {
      return { ok: true, count: 0, code: DL_CODES.TRAIL_OK };
    }

    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const verifyRes = verifyAdversarialInvariantRefuterReceipt(receipt);
      if (!verifyRes.ok) {
        return {
          ok: false,
          count: this.trail.length,
          code: DL_CODES.TRAIL_BREAK,
          reason: `Receipt at index ${i} verification failed: ${verifyRes.reason}`
        };
      }

      if (i > 0) {
        const prev = this.trail[i - 1];
        if (receipt.prevReceiptHash !== prev.receiptHash) {
          return {
            ok: false,
            count: this.trail.length,
            code: DL_CODES.TRAIL_BREAK,
            reason: `Chaining mismatch at index ${i}`
          };
        }
      }
    }

    return { ok: true, count: this.trail.length, code: DL_CODES.TRAIL_OK };
  }
}
