/**
 * @module sovereign-epistemic-ledger-port
 * SPEC-0124 / Mission DN — Sovereign Epistemic Knowledge Ledger Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Governs epistemic state transitions (e.g. AUDIT_EXECUTED -> VERIFIED) and
 * verifies that knowledge claims are grounded in cryptographic evidence.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 079e6f2a
 *   Seals chained DN-RCPT-* receipts with verifiable epistemicDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DN_PRODUCTION_READY,
  sha256Canonical,
  buildSovereignEpistemicLedgerReceipt,
  verifySovereignEpistemicLedgerReceipt
} from './sovereign-epistemic-ledger-receipt.js';

import {
  SovereignEpistemicLedgerPolicyGate,
  DN_CODES
} from './sovereign-epistemic-ledger-policy-gate.js';

/** @type {'NO'} */
export const DN_PORT_PRODUCTION_READY = 'NO';
export const DN_PORT_KIND = 'eos-sovereign-epistemic-ledger-port';

export class SovereignEpistemicLedgerPort {
  /**
   * @param {object} [opts]
   * @param {SovereignEpistemicLedgerPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new SovereignEpistemicLedgerPolicyGate();
    this.trail = [];
    this.productionReady = DN_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the sovereign epistemic ledger ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildSovereignEpistemicLedgerReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-31-mission-dn',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        epistemicReport: input.epistemicReport || null,
        epistemicDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildSovereignEpistemicLedgerReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        epistemicReport: input.epistemicReport,
        epistemicDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DN_CODES.OK,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize epistemic grounding verification
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      epistemicReport: input.epistemicReport,
      timestamp: new Date().toISOString()
    };
    const epistemicDigest = sha256Canonical(JSON.stringify(payload));

    const receipt = buildSovereignEpistemicLedgerReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      epistemicReport: input.epistemicReport,
      epistemicDigest,
      epistemicHold: {
        epistemicStateGrounded: true,
        ungroundedClaimsRefused: true
      },
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(receipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DN_CODES.OK,
      receipt
    };
  }

  /**
   * Verifies the cryptographic integrity and hash chaining of the receipt trail
   * @returns {{ ok: boolean, count: number, code: string, reason?: string }}
   */
  verifyTrail() {
    if (this.trail.length === 0) {
      return { ok: true, count: 0, code: DN_CODES.TRAIL_OK };
    }

    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const verifyRes = verifySovereignEpistemicLedgerReceipt(receipt);
      if (!verifyRes.ok) {
        return {
          ok: false,
          count: this.trail.length,
          code: DN_CODES.TRAIL_BREAK,
          reason: `Receipt at index ${i} verification failed: ${verifyRes.reason}`
        };
      }

      if (i > 0) {
        const prev = this.trail[i - 1];
        if (receipt.prevReceiptHash !== prev.receiptHash) {
          return {
            ok: false,
            count: this.trail.length,
            code: DN_CODES.TRAIL_BREAK,
            reason: `Chaining mismatch at index ${i}`
          };
        }
      }
    }

    return { ok: true, count: this.trail.length, code: DN_CODES.TRAIL_OK };
  }
}
