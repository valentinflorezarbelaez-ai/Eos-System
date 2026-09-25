/**
 * @module cqrs-read-model-projection-port
 * SPEC-0137 / Mission EA — CQRS Read-Model Projection Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Query models derived from domain events must be rebuildable from the event stream.
 * Projections stay disposable and reconstructable — not a second source of truth:
 *   - Validates projection (projectionId + projectionType + sourceEvent)
 *   - Emits cryptographically verifiable EA-RCPT-* receipts with projectionDigest
 *   - Maintains verifiable audit trail of sealed projection apply/rebuild steps
 *   - rebuildFromStream seals hermetic in-memory rebuild receipt (≠ live DB)
 *   - Explicitly refuses second SoT, dual-write, network write, tip-refresh
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 1f2234cf (do NOT rewrite tip pins)
 *   Seals chained EA-RCPT-* receipts with verifiable projectionDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L33; refuse L34 auto-close
 *
 * PASS = sealed projection receipt ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ second SoT
 */

import {
  EA_PRODUCTION_READY,
  sha256Canonical,
  buildCqrsReadModelProjectionReceipt,
  verifyCqrsReadModelProjectionReceipt
} from './cqrs-read-model-projection-receipt.js';

import {
  CqrsReadModelProjectionPolicyGate,
  EA_CODES
} from './cqrs-read-model-projection-policy-gate.js';

/** @type {'NO'} */
export const EA_PORT_PRODUCTION_READY = 'NO';
export const EA_PORT_KIND = 'eos-cqrs-read-model-projection-port';

export class CqrsReadModelProjectionPort {
  /**
   * @param {object} [opts]
   * @param {CqrsReadModelProjectionPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new CqrsReadModelProjectionPolicyGate();
    this.trail = [];
    this.productionReady = EA_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the CQRS read-model projection ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildCqrsReadModelProjectionReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-34-mission-ea',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        projection: input.projection || null,
        projectionDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildCqrsReadModelProjectionReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        projection: input.projection || null,
        projectionDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EA_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const isRebuild =
      input.projection &&
      (input.projection.rebuildFromStream === true || input.rebuildFromStream === true);

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      projection: input.projection,
      rebuildFromStream: !!isRebuild,
      checkpoint: input.projection?.checkpoint || input.checkpoint || null,
      timestamp: new Date().toISOString()
    };
    const projectionDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildCqrsReadModelProjectionReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      projection: input.projection,
      projectionDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      projectionHold: isRebuild
        ? {
            projectionDisposable: true,
            secondSourceOfTruthRefused: true,
            hermeticInMemoryOnly: true,
            networkWriteRefused: true,
            rebuildFromStreamOnly: true
          }
        : undefined
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EA_CODES.OK,
      reason: isRebuild
        ? 'Hermetic in-memory rebuildFromStream sealed (≠ live DB ≠ second SoT).'
        : undefined,
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
      const validRes = verifyCqrsReadModelProjectionReceipt(receipt);
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

void EA_PRODUCTION_READY;