/**
 * @module ladder32-seam-port
 * SPEC-0130 / Mission DT — Ladder 32 CI Seam-Pack Consolidation & Closeout Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Governs the end-to-end integration and closeout of Ladder 32:
 *   Mission DP (SPEC-0126): Sovereign Vertical Slice & Screaming Architecture Port (DP-RCPT-*)
 *   Mission DQ (SPEC-0127): Autonomous Property-Based Generative Fuzzing Port (DQ-RCPT-*)
 *   Mission DR (SPEC-0128): Deterministic Autonomous Execution Loop Controller Port (DR-RCPT-*)
 *   Mission DS (SPEC-0129): Contract-First Formal Data Contract Notary Port (DS-RCPT-*)
 *   Mission DT (SPEC-0130): Ladder 32 CI Seam-Pack Consolidation & Closeout (DT-RCPT-*)
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin fce84743
 *   Seals chained DT-RCPT-* receipts with verifiable upstreamDigest
 *   L17–L31 CLOSED never reopen; after DT, L32 CLOSED_FOR_LOCAL_GOVERNED_USE
 *   CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES
 *   schemas AT_CEILING 35/35
 */

import {
  DT_PRODUCTION_READY,
  sha256Canonical,
  buildLadder32SeamReceipt,
  verifyLadder32SeamReceipt
} from './ladder32-seam-receipt.js';

import {
  validateLadder32SeamPlan,
  DT_CODES
} from './ladder32-seam-policy-gate.js';

/** @type {'NO'} */
export const DT_PORT_PRODUCTION_READY = 'NO';
export const DT_PORT_KIND = 'eos-ladder32-seam-port';

export class Ladder32SeamPort {
  /**
   * @param {object} [opts]
   */
  constructor(opts = {}) {
    this.trail = [];
    this.productionReady = DT_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the Ladder 32 seam-pack consolidation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = validateLadder32SeamPlan(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder32SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-32-mission-dt',
        decision: 'DENY',
        seamMode: input.seamMode || 'ACTIVE',
        dpReceiptLink: input.dpReceipt?.receiptId || null,
        dqReceiptLink: input.dqReceipt?.receiptId || null,
        drReceiptLink: input.drReceipt?.receiptId || null,
        dsReceiptLink: input.dsReceipt?.receiptId || null,
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
      const holdReceipt = buildLadder32SeamReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        seamMode: 'HOLD',
        dpReceiptLink: input.dpReceipt?.receiptId || null,
        dqReceiptLink: input.dqReceipt?.receiptId || null,
        drReceiptLink: input.drReceipt?.receiptId || null,
        dsReceiptLink: input.dsReceipt?.receiptId || null,
        upstreamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DT_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize upstream satellites into consolidated receipt
    const dpReceiptLink = input.dpReceipt?.receiptId || input.dpReceiptLink || null;
    const dqReceiptLink = input.dqReceipt?.receiptId || input.dqReceiptLink || null;
    const drReceiptLink = input.drReceipt?.receiptId || input.drReceiptLink || null;
    const dsReceiptLink = input.dsReceipt?.receiptId || input.dsReceiptLink || null;

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      dpReceiptLink,
      dqReceiptLink,
      drReceiptLink,
      dsReceiptLink,
      timestamp: new Date().toISOString()
    };
    const upstreamDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildLadder32SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      seamMode: 'ACTIVE',
      dpReceiptLink,
      dqReceiptLink,
      drReceiptLink,
      dsReceiptLink,
      upstreamDigest,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DT_CODES.OK,
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
      const validRes = verifyLadder32SeamReceipt(receipt);
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
