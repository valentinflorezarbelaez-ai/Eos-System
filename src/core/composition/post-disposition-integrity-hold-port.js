/**
 * @module post-disposition-integrity-hold-port
 * SPEC-0118 / Mission DI — Post-Disposition Integrity & Docs SSOT Hold Ritual Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Verifies post-quarantine deterministic integrity suites and enforces documentation
 * SSOT consistency without mutating tip pins or closing Ladder 30.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 3d0c2e0b
 *   Seals chained DI-RCPT-* receipts with verifiable integrityDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DI_PRODUCTION_READY,
  sha256Canonical,
  buildPostDispositionIntegrityHoldReceipt,
  verifyPostDispositionIntegrityHoldReceipt
} from './post-disposition-integrity-hold-receipt.js';

import {
  PostDispositionIntegrityHoldPolicyGate,
  DI_CODES
} from './post-disposition-integrity-hold-policy-gate.js';

/** @type {'NO'} */
export const DI_PORT_PRODUCTION_READY = 'NO';
export const DI_PORT_KIND = 'eos-post-disposition-integrity-hold-port';

export class PostDispositionIntegrityHoldPort {
  /**
   * @param {object} [opts]
   * @param {PostDispositionIntegrityHoldPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new PostDispositionIntegrityHoldPolicyGate();
    this.trail = [];
    this.productionReady = DI_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the post-disposition integrity hold ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildPostDispositionIntegrityHoldReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-30-mission-di',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        dhReceiptLink: input.dhReceipt ? input.dhReceipt.receiptId : null,
        integrityDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildPostDispositionIntegrityHoldReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        dhReceiptLink: input.dhReceipt ? input.dhReceipt.receiptId : null,
        integrityDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DI_CODES.OK,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize integrity and docs SSOT hold
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      dhReceiptLink: input.dhReceipt.receiptId,
      integrity: input.integrity || {},
      timestamp: new Date().toISOString()
    };
    const integrityDigest = sha256Canonical(JSON.stringify(payload));

    const receipt = buildPostDispositionIntegrityHoldReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      dhReceiptLink: input.dhReceipt.receiptId,
      integrityDigest,
      docsSsotHold: {
        docsConsistent: input.integrity?.docsConsistent !== false,
        inventoryReflected: input.integrity?.inventoryReflected !== false
      },
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(receipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DI_CODES.OK,
      receipt
    };
  }

  /**
   * Verifies the cryptographic integrity and hash chaining of the receipt trail
   * @returns {{ ok: boolean, count: number, code: string, reason?: string }}
   */
  verifyTrail() {
    if (this.trail.length === 0) {
      return { ok: true, count: 0, code: DI_CODES.TRAIL_OK };
    }

    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const verifyRes = verifyPostDispositionIntegrityHoldReceipt(receipt);
      if (!verifyRes.ok) {
        return {
          ok: false,
          count: this.trail.length,
          code: DI_CODES.TRAIL_BREAK,
          reason: `Receipt at index ${i} verification failed: ${verifyRes.reason}`
        };
      }

      if (i > 0) {
        const prev = this.trail[i - 1];
        if (receipt.prevReceiptHash !== prev.receiptHash) {
          return {
            ok: false,
            count: this.trail.length,
            code: DI_CODES.TRAIL_BREAK,
            reason: `Chaining mismatch at index ${i}`
          };
        }
      }
    }

    return { ok: true, count: this.trail.length, code: DI_CODES.TRAIL_OK };
  }
}
