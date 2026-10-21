/**
 * @module bidirectional-mismatch-quarantine-deny-port
 * SPEC-0173 / Mission FK — Bidirectional Mismatch Quarantine / Deny Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Consumes the opaque FI correlation binding + FJ round-trip verdict and seals a
 * fail-closed quarantine/deny decision. Quarantine is a decision record only: it never
 * copies, moves, or seals request/reply payload bytes.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; quarantineSecretMaterialRefused / quarantineSecretZeroHeld
 *   Freeze soft-observe: pin 038a9a4 (do NOT rewrite tip pins)
 *   PASS only on explicit MISMATCH + QUARANTINE|DENY + authorized
 *   VERIFIED / HOLD verdict => no-op HOLD (never a false quarantine)
 *   Seals chained FK-RCPT-* receipts with verifiable mismatchDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L40; refuse L41 auto-close (FL–FM pending)
 *
 * PASS = sealed mismatch quarantine/deny decision ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FJ/FL/Canary
 */

import {
  FK_PRODUCTION_READY,
  sha256Canonical,
  computeMismatchDigest,
  buildBidirectionalMismatchQuarantineDenyReceipt,
  verifyBidirectionalMismatchQuarantineDenyReceipt
} from './bidirectional-mismatch-quarantine-deny-receipt.js';

import {
  BidirectionalMismatchQuarantineDenyPolicyGate,
  FK_CODES
} from './bidirectional-mismatch-quarantine-deny-policy-gate.js';

/** @type {'NO'} */
export const FK_PORT_PRODUCTION_READY = 'NO';
export const FK_PORT_KIND = 'eos-bidirectional-mismatch-quarantine-deny-port';

export class BidirectionalMismatchQuarantineDenyPort {
  /**
   * @param {object} [opts]
   * @param {BidirectionalMismatchQuarantineDenyPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new BidirectionalMismatchQuarantineDenyPolicyGate();
    this.trail = [];
    this.productionReady = FK_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the mismatch quarantine/deny ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FK_CODES.MISMATCH_UNAUTHORIZED) status = 'MISMATCH_UNAUTHORIZED';
      else if (
        gateRes.code === FK_CODES.VERDICT_INCONSISTENT ||
        gateRes.code === FK_CODES.INVALID_MISMATCH_CLAIM
      ) {
        status = 'VERDICT_INCONSISTENT';
      } else if (
        gateRes.code === FK_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FK_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FK_CODES.RAW_MISMATCH_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'MISMATCH_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildBidirectionalMismatchQuarantineDenyReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fk',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        mismatch: input.mismatch
          ? {
              correlationId: input.mismatch.correlationId,
              bindingId: input.mismatch.bindingId,
              roundTripId: input.mismatch.roundTripId,
              requestId: input.mismatch.requestId,
              replyId: input.mismatch.replyId,
              requestDigest: input.mismatch.requestDigest,
              replyDigest: input.mismatch.replyDigest,
              mismatchClass: input.mismatch.mismatchClass,
              desiredDisposition: input.mismatch.desiredDisposition,
              observedVerdict: input.mismatch.observedVerdict,
              authorized: input.mismatch.authorized,
              evaluated: false,
              status
            }
          : null,
        mismatchDigest: sha256Canonical(
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
      const holdReceipt = buildBidirectionalMismatchQuarantineDenyReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        mismatch: input.mismatch
          ? {
              correlationId: input.mismatch.correlationId,
              bindingId: input.mismatch.bindingId,
              roundTripId: input.mismatch.roundTripId,
              requestId: input.mismatch.requestId,
              replyId: input.mismatch.replyId,
              requestDigest: input.mismatch.requestDigest,
              replyDigest: input.mismatch.replyDigest,
              mismatchClass: input.mismatch.mismatchClass,
              desiredDisposition: input.mismatch.desiredDisposition,
              observedVerdict: input.mismatch.observedVerdict,
              authorized: input.mismatch.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        mismatchDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FK_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedMismatch = {
      correlationId: input.mismatch.correlationId,
      bindingId: input.mismatch.bindingId,
      roundTripId: input.mismatch.roundTripId,
      requestId: input.mismatch.requestId,
      replyId: input.mismatch.replyId,
      requestDigest: input.mismatch.requestDigest.toLowerCase(),
      replyDigest: input.mismatch.replyDigest.toLowerCase(),
      mismatchClass: input.mismatch.mismatchClass || 'round-trip-integrity-mismatch',
      desiredDisposition: input.mismatch.desiredDisposition,
      observedVerdict: input.mismatch.observedVerdict,
      authorized: true,
      evaluated: true,
      status: 'MISMATCH_QUARANTINED',
      failClosed: true,
      hermeticInjectedMismatch: true,
      decisionRecordOnly: true,
      noPayloadCopy: true,
      consumesFiCorrelationBinding: true,
      consumesFjRoundTripVerdict: true,
      distinctFromFiCorrelationRegistry: true,
      distinctFromFjRoundTripIntegrity: true,
      distinctFromFlHonestyAttestation: true
    };

    const mismatchDigest = computeMismatchDigest(sealedMismatch);

    const passReceipt = buildBidirectionalMismatchQuarantineDenyReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      mismatch: sealedMismatch,
      mismatchDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      quarantineHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveHttpEgressRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawMismatchSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        mismatchSecretMaterialRefused: true,
        mismatchSecretZeroHeld: true,
        decisionRecordOnly: true,
        noPayloadCopy: true,
        consumesFiCorrelationBinding: true,
        consumesFjRoundTripVerdict: true,
        distinctFromFiCorrelationRegistry: true,
        distinctFromFjRoundTripIntegrity: true,
        distinctFromFlHonestyAttestation: true,
        distinctFromCanaryDeliveryDispatcher: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FK_CODES.OK,
      reason:
        'Hermetic mismatch quarantine/deny decision receipt sealed (≠ FI/FJ/FL/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyBidirectionalMismatchQuarantineDenyReceipt(receipt);
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

void FK_PRODUCTION_READY;

