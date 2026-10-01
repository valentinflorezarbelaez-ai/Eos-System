/**
 * @module round-trip-request-reply-integrity-port
 * SPEC-0172 / Mission FJ — Bidirectional Delivery Correlation Registry & Binding Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 41 axis: Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric.
 * Soft-observes opaque L39 ingress refs + L40 outbound refs and joins them into a
 * round-trip request-reply integrity — without reopening L39/L40 or elevating FI.
 * This port seals hermetic round-trip request-reply integrity receipts:
 *   - Validates roundTrip (correlationId + ingressId/sourceId L39 + targetId/deliveryId L40
 *     + integrityClass + desiredVerdict INTACT|BROKEN|HOLD;
 *     optional observedVerdict injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable FJ-RCPT-* receipts with integrityDigest
 *     (sha256 of opaque ingressRef+outboundRef metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of binding PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic binding receipt only — NOT a live HTTP egress,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT EY/FD/FJ/Canary ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L40 reopen,
 *     L41 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; integritySecretMaterialRefused / integritySecretZeroHeld
 *   Freeze soft-observe: pin 78141c3d (do NOT rewrite tip pins)
 *   Seals chained FJ-RCPT-* receipts with verifiable integrityDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 *
 * PASS = sealed round-trip request-reply integrity verify ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FJ/Canary
 */

import {
  FJ_PRODUCTION_READY,
  sha256Canonical,
  computeIntegrityDigest,
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
   * Governs the round-trip request-reply integrity verify ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FJ_CODES.INTEGRITY_UNAUTHORIZED) status = 'INTEGRITY_UNAUTHORIZED';
      else if (gateRes.code === FJ_CODES.INVALID_INTEGRITY_CLAIM) status = 'INVALID_INTEGRITY_CLAIM';
      else if (
        gateRes.code === FJ_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FJ_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FJ_CODES.RAW_INTEGRITY_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'INTEGRITY_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildRoundTripRequestReplyIntegrityReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fj',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        roundTrip: input.roundTrip
          ? {
              correlationId: input.roundTrip.correlationId,
              roundTripId: input.roundTrip.roundTripId,
              requestId: input.roundTrip.requestId,
              replyId: input.roundTrip.replyId,
              ingressId: input.roundTrip.ingressId,
              sourceId: input.roundTrip.sourceId,
              targetId: input.roundTrip.targetId,
              deliveryId: input.roundTrip.deliveryId,
              integrityClass: input.roundTrip.integrityClass,
              desiredVerdict: input.roundTrip.desiredVerdict,
              observedVerdict: input.roundTrip.observedVerdict,
              authorized: input.roundTrip.authorized,
              evaluated: false,
              status
            }
          : null,
        integrityDigest: sha256Canonical(
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
              roundTripId: input.roundTrip.roundTripId,
              requestId: input.roundTrip.requestId,
              replyId: input.roundTrip.replyId,
              ingressId: input.roundTrip.ingressId,
              sourceId: input.roundTrip.sourceId,
              targetId: input.roundTrip.targetId,
              deliveryId: input.roundTrip.deliveryId,
              integrityClass: input.roundTrip.integrityClass,
              desiredVerdict: input.roundTrip.desiredVerdict,
              observedVerdict: input.roundTrip.observedVerdict,
              authorized: input.roundTrip.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        integrityDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
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
      roundTripId: input.roundTrip.roundTripId || input.roundTrip.correlationId,
      requestId: input.roundTrip.requestId,
      replyId: input.roundTrip.replyId,
      ingressId: input.roundTrip.ingressId,
      sourceId: input.roundTrip.sourceId,
      targetId: input.roundTrip.targetId,
      deliveryId: input.roundTrip.deliveryId,
      integrityClass: input.roundTrip.integrityClass || 'round-trip-request-reply-integrity',
      desiredVerdict: input.roundTrip.desiredVerdict,
      observedVerdict: input.roundTrip.observedVerdict,
      authorized: true,
      evaluated: true,
      status: 'INTACT_EVALUATED',
      failClosed: true,
      hermeticInjectedRoundTripIntegrity: true,
      softObserveFiCorrelationAndL39IngressRefsOnly: true,
      softObserveL40OutboundRefsOnly: true,
      distinctFromEyIngressRegistry: true,
      distinctFromFdOutboundRegistry: true,
      distinctFromFiCorrelationRegistry: true
    };

    const integrityDigest = computeIntegrityDigest(sealedRoundTrip);

    const passReceipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      roundTrip: sealedRoundTrip,
      integrityDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      integrityHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveHttpEgressRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawIntegritySecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        integritySecretMaterialRefused: true,
        integritySecretZeroHeld: true,
        softObserveFiCorrelationAndL39IngressRefsOnly: true,
        softObserveL40OutboundRefsOnly: true,
        distinctFromEyIngressRegistry: true,
        distinctFromFdOutboundRegistry: true,
        distinctFromFiCorrelationRegistry: true,
        distinctFromFkQuarantine: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FJ_CODES.OK,
      reason:
        'Hermetic round-trip-request-reply-integrity governance receipt sealed (≠ EY/FD/FJ/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
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
