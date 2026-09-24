/**
 * @module ladder31-seam-port
 * SPEC-0125 / Mission DO — Ladder 31 CI Seam-Pack Consolidation & Closeout Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Governs the end-to-end integration and closeout of Ladder 31:
 *   Mission DK (SPEC-0121): SpecBoot Mutation Testing Gatekeeper Port (DK-RCPT-*)
 *   Mission DL (SPEC-0122): Adversarial Invariant Refuter Port (DL-RCPT-*)
 *   Mission DM (SPEC-0123): Hexagonal Architecture Boundary Isolation Port (DM-RCPT-*)
 *   Mission DN (SPEC-0124): Sovereign Epistemic Knowledge Ledger Port (DN-RCPT-*)
 *   Mission DO (SPEC-0125): Ladder 31 CI Seam-Pack Consolidation & Closeout (DO-RCPT-*)
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 8a4db2c3
 *   Seals chained DO-RCPT-* receipts with verifiable upstreamDigest
 *   L17–L30 CLOSED never reopen; after DO, L31 CLOSED_FOR_LOCAL_GOVERNED_USE
 *   CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 *   schemas AT_CEILING 35/35
 */

import {
  DO_PRODUCTION_READY,
  sha256Canonical,
  buildLadder31SeamReceipt,
  verifyLadder31SeamReceipt
} from './ladder31-seam-receipt.js';

import {
  validateLadder31SeamPlan,
  DO_CODES
} from './ladder31-seam-policy-gate.js';

/** @type {'NO'} */
export const DO_PORT_PRODUCTION_READY = 'NO';
export const DO_PORT_KIND = 'eos-ladder31-seam-port';

export class Ladder31SeamPort {
  /**
   * @param {object} [opts]
   */
  constructor(opts = {}) {
    this.trail = [];
    this.productionReady = DO_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the Ladder 31 seam-pack consolidation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = validateLadder31SeamPlan(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder31SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-31-mission-do',
        decision: 'DENY',
        seamMode: input.seamMode || 'ACTIVE',
        dkReceiptLink: input.dkReceipt?.receiptId || null,
        dlReceiptLink: input.dlReceipt?.receiptId || null,
        dmReceiptLink: input.dmReceipt?.receiptId || null,
        dnReceiptLink: input.dnReceipt?.receiptId || null,
        upstreamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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

    if (input.seamMode === 'HOLD') {
      const holdReceipt = buildLadder31SeamReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        seamMode: 'HOLD',
        dkReceiptLink: input.dkReceipt?.receiptId || null,
        dlReceiptLink: input.dlReceipt?.receiptId || null,
        dmReceiptLink: input.dmReceipt?.receiptId || null,
        dnReceiptLink: input.dnReceipt?.receiptId || null,
        upstreamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DO_CODES.OK,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize upstream satellites into consolidated receipt
    const dkReceiptLink = input.dkReceipt?.receiptId || input.dkReceiptLink || null;
    const dlReceiptLink = input.dlReceipt?.receiptId || input.dlReceiptLink || null;
    const dmReceiptLink = input.dmReceipt?.receiptId || input.dmReceiptLink || null;
    const dnReceiptLink = input.dnReceipt?.receiptId || input.dnReceiptLink || null;

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      dkReceiptLink,
      dlReceiptLink,
      dmReceiptLink,
      dnReceiptLink,
      timestamp: new Date().toISOString()
    };
    const upstreamDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildLadder31SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      seamMode: 'ACTIVE',
      dkReceiptLink,
      dlReceiptLink,
      dmReceiptLink,
      dnReceiptLink,
      upstreamDigest,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DO_CODES.OK,
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
      const validRes = verifyLadder31SeamReceipt(receipt);
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
