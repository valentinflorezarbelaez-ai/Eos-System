/**
 * @module round-trip-request-reply-integrity-port
 * SPEC-0172 / Mission FJ — Round-Trip Request-Reply Integrity Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 41 axis: Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric.
 * Soft-observes opaque L39 request ingress refs + L40 reply outbound refs and evaluates
 * round-trip request-reply payload integrity, SLA bounds, and authorization — without reopening L39/L40.
 *
 * This port seals hermetic round-trip request-reply integrity receipts:
 *   - Validates claim (correlationId + requestId/ingressId L39 + replyId/deliveryId L40
 *     + requestDigest + replyDigest + desiredIntegrity MATCH|MISMATCH|HOLD;
 *     optional observedIntegrity injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable FJ-RCPT-* receipts with roundTripDigest
 *     (sha256 of opaque request/reply correlation metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of PASS / unauthorized DENY / MISMATCH DENY / TIMEOUT DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present OR SLA breached
 *   - PASS seals hermetic integrity receipt only — NOT a live HTTP egress,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT EY/FD/FI/Canary ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L40 reopen,
 *     L41 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; rawRoundTripSecretMaterialRefused / roundTripSecretZeroHeld
 *   Freeze soft-observe: pin 78141c3d (do NOT rewrite tip pins)
 *   Seals chained FJ-RCPT-* receipts with verifiable roundTripDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L40; refuse L41 auto-close (FK–FM pending)
 *
 * PASS = sealed round-trip request-reply integrity receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FI/Canary
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
   * Governs the round-trip request-reply integrity ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    const bindingInput = input.requestReplyBinding || input.binding;

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FJ_CODES.ROUND_TRIP_UNAUTHORIZED) status = 'ROUND_TRIP_UNAUTHORIZED';
      else if (gateRes.code === FJ_CODES.ROUND_TRIP_MISMATCH) status = 'ROUND_TRIP_MISMATCH';
      else if (gateRes.code === FJ_CODES.ROUND_TRIP_TIMED_OUT) status = 'ROUND_TRIP_TIMED_OUT';
      else if (gateRes.code === FJ_CODES.LATENCY_EXCEEDED) status = 'LATENCY_EXCEEDED';
      else if (gateRes.code === FJ_CODES.INVALID_ROUND_TRIP_CLAIM) status = 'INVALID_ROUND_TRIP_CLAIM';
      else if (
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
        requestReplyBinding: bindingInput
          ? {
              correlationId: bindingInput.correlationId,
              requestId: bindingInput.requestId || bindingInput.ingressId,
              replyId: bindingInput.replyId || bindingInput.deliveryId,
              requestDigest: bindingInput.requestDigest,
              replyDigest: bindingInput.replyDigest,
              desiredIntegrity: bindingInput.desiredIntegrity || 'MATCH',
              observedIntegrity: bindingInput.observedIntegrity || 'MISMATCH',
              roundTripLatencyMs: bindingInput.roundTripLatencyMs || 0,
              maxAllowedLatencyMs: bindingInput.maxAllowedLatencyMs || 0,
              authorized: Boolean(bindingInput.authorized),
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

    const decision = input.decision === 'HOLD' ? 'HOLD' : 'PASS';
    const status = decision === 'HOLD' ? 'HOLD' : 'BOUND_MATCH';

    const requestReplyBinding = {
      correlationId: bindingInput.correlationId,
      requestId: bindingInput.requestId || bindingInput.ingressId,
      replyId: bindingInput.replyId || bindingInput.deliveryId,
      requestDigest: bindingInput.requestDigest,
      replyDigest: bindingInput.replyDigest,
      desiredIntegrity: bindingInput.desiredIntegrity || 'MATCH',
      observedIntegrity: bindingInput.observedIntegrity || 'MATCH',
      roundTripLatencyMs: Number(bindingInput.roundTripLatencyMs || 0),
      maxAllowedLatencyMs: Number(bindingInput.maxAllowedLatencyMs || 0),
      authorized: true,
      evaluated: true,
      status
    };

    const roundTripDigest = computeRoundTripDigest(requestReplyBinding);
    const prevReceiptHash =
      this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64);

    const receipt = buildRoundTripRequestReplyIntegrityReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision,
      ritualMode: input.ritualMode || 'ACTIVE',
      requestReplyBinding,
      roundTripDigest,
      prevReceiptHash
    });

    this.trail.push(receipt);

    return {
      ok: decision === 'PASS',
      decision,
      code: FJ_CODES.OK,
      reason: 'Round-trip request-reply integrity ritual successfully executed',
      receipt
    };
  }

  /**
   * Verifies the cryptographic chain integrity of the receipt audit trail
   * @returns {{ valid: boolean, count: number, reason?: string }}
   */
  verifyChain() {
    for (let i = 0; i < this.trail.length; i++) {
      const current = this.trail[i];
      const verifyRes = verifyRoundTripRequestReplyIntegrityReceipt(current);
      if (!verifyRes.valid) {
        return { valid: false, count: this.trail.length, reason: `Receipt ${i} invalid: ${verifyRes.reason}` };
      }

      const expectedPrev = i === 0 ? '0'.repeat(64) : this.trail[i - 1].receiptHash;
      if (current.prevReceiptHash !== expectedPrev) {
        return {
          valid: false,
          count: this.trail.length,
          reason: `Receipt ${i} prevReceiptHash mismatch: expected ${expectedPrev}, got ${current.prevReceiptHash}`
        };
      }
    }

    return { valid: true, count: this.trail.length };
  }
}
