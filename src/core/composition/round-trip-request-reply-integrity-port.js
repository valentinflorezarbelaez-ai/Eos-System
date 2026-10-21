/**
 * @module round-trip-request-reply-integrity-port
 * SPEC-0172 / Mission FJ — Round-Trip / Request-Reply Integrity Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 41 axis: Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric.
 * Consumes the opaque FI correlation binding (correlationId/bindingId + L39 ingress refs +
 * L40 outbound refs) and verifies request/reply integrity — without reopening FI/L39/L40.
 * This port seals hermetic round-trip integrity receipts:
 *   - Validates roundTrip (correlationId + bindingId + requestId + replyId + requestDigest +
 *     replyDigest + correlationClass + integrityClass + desiredIntegrity VERIFIED|MISMATCH|HOLD;
 *     optional observedIntegrity injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable FJ-RCPT-* receipts with roundTripDigest
 *     (sha256 of opaque FI correlation + request/reply metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized/mismatched OR secret-looking fields
 *   - PASS seals hermetic integrity receipt only — NOT a live HTTP request/reply,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT FI/FK/Canary ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L40 reopen,
 *     L41 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; roundTripSecretMaterialRefused / roundTripSecretZeroHeld
 *   Freeze soft-observe: pin 8903b57 (do NOT rewrite tip pins)
 *   Seals chained FJ-RCPT-* receipts with verifiable roundTripDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 *
 * PASS = sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FK/Canary
 */

import {
  FJ_PRODUCTION_READY,
  sha256Canonical,
  computeRoundTripDigest,
  buildRoundTripRequestReplyIntegrityReceipt,
  verifyRoundTripRequestReplyIntegrityReceipt
} from './round-trip-request-reply-integrity-receipt.js';

import {
  RoundTripRequestReplyIntegrityPolicyGate,
  FJ_CODES
} from './round-trip-request-reply-integrity-policy-gate.js';

/** @type {'NO'} */
export const FJ_PORT_PRODUCTION_READY = 'NO';
export const FJ_PORT_KIND = 'eos-round-trip-request-reply-integrity-port';

export class RoundTripRequestReplyIntegrityPort {
  /**
   * @param {object} [opts]
   * @param {RoundTripRequestReplyIntegrityPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new RoundTripRequestReplyIntegrityPolicyGate();
    this.trail = [];
    this.productionReady = FJ_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the round-trip / request-reply integrity ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FJ_CODES.ROUND_TRIP_UNAUTHORIZED) status = 'ROUND_TRIP_UNAUTHORIZED';
      else if (
        gateRes.code === FJ_CODES.INTEGRITY_MISMATCH ||
        gateRes.code === FJ_CODES.INTEGRITY_CHAIN_MISMATCH
      ) {
        status = 'INTEGRITY_MISMATCH';
      } else if (
        gateRes.code === FJ_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FJ_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FJ_CODES.RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'ROUND_TRIP_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildRoundTripRequestReplyIntegrityReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fj',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        roundTrip: input.roundTrip
          ? {
              correlationId: input.roundTrip.correlationId,
              bindingId: input.roundTrip.bindingId,
              requestId: input.roundTrip.requestId,
              replyId: input.roundTrip.replyId,
              requestDigest: input.roundTrip.requestDigest,
              replyDigest: input.roundTrip.replyDigest,
              correlationClass: input.roundTrip.correlationClass,
              integrityClass: input.roundTrip.integrityClass,
              desiredIntegrity: input.roundTrip.desiredIntegrity,
              observedIntegrity: input.roundTrip.observedIntegrity,
              authorized: input.roundTrip.authorized,
              evaluated: false,
              status
            }
          : null,
        roundTripDigest: sha256Canonical(
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
      const holdReceipt = buildRoundTripRequestReplyIntegrityReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        roundTrip: input.roundTrip
          ? {
              correlationId: input.roundTrip.correlationId,
              bindingId: input.roundTrip.bindingId,
              requestId: input.roundTrip.requestId,
              replyId: input.roundTrip.replyId,
              requestDigest: input.roundTrip.requestDigest,
              replyDigest: input.roundTrip.replyDigest,
              correlationClass: input.roundTrip.correlationClass,
              integrityClass: input.roundTrip.integrityClass,
              desiredIntegrity: input.roundTrip.desiredIntegrity,
              observedIntegrity: input.roundTrip.observedIntegrity,
              authorized: input.roundTrip.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        roundTripDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FJ_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedRoundTrip = {
      correlationId: input.roundTrip.correlationId,
      bindingId: input.roundTrip.bindingId,
      requestId: input.roundTrip.requestId,
      replyId: input.roundTrip.replyId,
      requestDigest: input.roundTrip.requestDigest.toLowerCase(),
      replyDigest: input.roundTrip.replyDigest.toLowerCase(),
      correlationClass: input.roundTrip.correlationClass || 'bidirectional-delivery-correlation',
      integrityClass: input.roundTrip.integrityClass || 'round-trip-request-reply-integrity',
      desiredIntegrity: input.roundTrip.desiredIntegrity,
      observedIntegrity: input.roundTrip.observedIntegrity,
      authorized: true,
      evaluated: true,
      status: 'ROUND_TRIP_VERIFIED',
      failClosed: true,
      hermeticInjectedRoundTrip: true,
      consumesFiCorrelationBinding: true,
      softObserveL39IngressRefsOnly: true,
      softObserveL40OutboundRefsOnly: true,
      distinctFromFiCorrelationRegistry: true,
      distinctFromFkMismatchQuarantine: true
    };

    const roundTripDigest = computeRoundTripDigest(sealedRoundTrip);

    const passReceipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      roundTrip: sealedRoundTrip,
      roundTripDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      roundTripHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveHttpEgressRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawRoundTripSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        roundTripSecretMaterialRefused: true,
        roundTripSecretZeroHeld: true,
        consumesFiCorrelationBinding: true,
        softObserveL39IngressRefsOnly: true,
        softObserveL40OutboundRefsOnly: true,
        distinctFromFiCorrelationRegistry: true,
        distinctFromFkMismatchQuarantine: true,
        distinctFromCanaryDeliveryDispatcher: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FJ_CODES.OK,
      reason:
        'Hermetic round-trip / request-reply integrity governance receipt sealed (≠ FI/FK/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyRoundTripRequestReplyIntegrityReceipt(receipt);
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

void FJ_PRODUCTION_READY;

