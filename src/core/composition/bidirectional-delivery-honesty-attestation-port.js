/**
 * @module bidirectional-delivery-honesty-attestation-port
 * SPEC-0174 / Mission FL — Bidirectional Delivery Honesty & Integrity Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Consumes the opaque FI correlation binding, the FJ round-trip verdict and the FK
 * quarantine/deny decision, then seals a fail-closed honesty/integrity attestation.
 * Attestation is a decision record only: it never copies, moves, quarantines or seals
 * request/reply payload bytes.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; attestationSecretMaterialRefused / attestationSecretZeroHeld
 *   Freeze soft-observe: pin e1a17e9b (do NOT rewrite tip pins)
 *   PASS only on explicit CONSISTENT claim + ATTEST_INTEGRITY|ATTEST_HONESTY + authorized
 *   CONTRADICTED => fail-closed DENY (never attest a contradicted claim)
 *   UNVERIFIED / HOLD claim => no-op HOLD (never a false attestation)
 *   Seals chained FL-RCPT-* receipts with verifiable attestationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L40; refuse L41 auto-close (FM pending)
 *
 * PASS = sealed honesty & integrity attestation ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ FI/FJ/FK/Canary
 */

import {
  FL_PRODUCTION_READY,
  sha256Canonical,
  computeAttestationDigest,
  buildBidirectionalDeliveryHonestyAttestationReceipt,
  verifyBidirectionalDeliveryHonestyAttestationReceipt
} from './bidirectional-delivery-honesty-attestation-receipt.js';

import {
  BidirectionalDeliveryHonestyAttestationPolicyGate,
  FL_CODES
} from './bidirectional-delivery-honesty-attestation-policy-gate.js';

/** @type {'NO'} */
export const FL_PORT_PRODUCTION_READY = 'NO';
export const FL_PORT_KIND = 'eos-bidirectional-delivery-honesty-attestation-port';

export class BidirectionalDeliveryHonestyAttestationPort {
  /**
   * @param {object} [opts]
   * @param {BidirectionalDeliveryHonestyAttestationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new BidirectionalDeliveryHonestyAttestationPolicyGate();
    this.trail = [];
    this.productionReady = FL_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the honesty/integrity attestation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FL_CODES.ATTESTATION_UNAUTHORIZED) status = 'ATTESTATION_UNAUTHORIZED';
      else if (gateRes.code === FL_CODES.CLAIM_CONTRADICTED) status = 'CLAIM_CONTRADICTED_DENIED';
      else if (
        gateRes.code === FL_CODES.CLAIM_UNVERIFIED ||
        gateRes.code === FL_CODES.INVALID_ATTESTATION_CLAIM
      ) {
        status = 'CLAIM_INCONSISTENT';
      } else if (
        gateRes.code === FL_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FL_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FL_CODES.RAW_ATTESTATION_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'ATTESTATION_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildBidirectionalDeliveryHonestyAttestationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fl',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        attestation: input.attestation
          ? {
              correlationId: input.attestation.correlationId,
              bindingId: input.attestation.bindingId,
              roundTripId: input.attestation.roundTripId,
              requestId: input.attestation.requestId,
              replyId: input.attestation.replyId,
              quarantineDecisionId: input.attestation.quarantineDecisionId,
              requestDigest: input.attestation.requestDigest,
              replyDigest: input.attestation.replyDigest,
              mismatchDigest: input.attestation.mismatchDigest,
              attestationClass: input.attestation.attestationClass,
              desiredAttestation: input.attestation.desiredAttestation,
              observedClaim: input.attestation.observedClaim,
              authorized: input.attestation.authorized,
              evaluated: false,
              status
            }
          : null,
        attestationDigest: sha256Canonical(
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
      const holdReceipt = buildBidirectionalDeliveryHonestyAttestationReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        attestation: input.attestation
          ? {
              correlationId: input.attestation.correlationId,
              bindingId: input.attestation.bindingId,
              roundTripId: input.attestation.roundTripId,
              requestId: input.attestation.requestId,
              replyId: input.attestation.replyId,
              quarantineDecisionId: input.attestation.quarantineDecisionId,
              requestDigest: input.attestation.requestDigest,
              replyDigest: input.attestation.replyDigest,
              mismatchDigest: input.attestation.mismatchDigest,
              attestationClass: input.attestation.attestationClass,
              desiredAttestation: input.attestation.desiredAttestation,
              observedClaim: input.attestation.observedClaim,
              authorized: input.attestation.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        attestationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FL_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedAttestation = {
      correlationId: input.attestation.correlationId,
      bindingId: input.attestation.bindingId,
      roundTripId: input.attestation.roundTripId,
      requestId: input.attestation.requestId,
      replyId: input.attestation.replyId,
      quarantineDecisionId: input.attestation.quarantineDecisionId,
      requestDigest: input.attestation.requestDigest.toLowerCase(),
      replyDigest: input.attestation.replyDigest.toLowerCase(),
      mismatchDigest: input.attestation.mismatchDigest.toLowerCase(),
      attestationClass: input.attestation.attestationClass || 'bidirectional-delivery-honesty-claim',
      desiredAttestation: input.attestation.desiredAttestation,
      observedClaim: input.attestation.observedClaim,
      authorized: true,
      evaluated: true,
      status: 'ATTESTATION_SEALED',
      failClosed: true,
      hermeticInjectedAttestation: true,
      attestOnly: true,
      noPayloadCopy: true,
      consumesFiCorrelationBinding: true,
      consumesFjRoundTripVerdict: true,
      consumesFkQuarantineDecision: true,
      distinctFromFiCorrelationRegistry: true,
      distinctFromFjRoundTripIntegrity: true,
      distinctFromFkMismatchQuarantine: true
    };

    const attestationDigest = computeAttestationDigest(sealedAttestation);

    const passReceipt = buildBidirectionalDeliveryHonestyAttestationReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      attestation: sealedAttestation,
      attestationDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      attestationHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveHttpEgressRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawAttestationSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        attestationSecretMaterialRefused: true,
        attestationSecretZeroHeld: true,
        attestOnly: true,
        noPayloadCopy: true,
        consumesFiCorrelationBinding: true,
        consumesFjRoundTripVerdict: true,
        consumesFkQuarantineDecision: true,
        distinctFromFiCorrelationRegistry: true,
        distinctFromFjRoundTripIntegrity: true,
        distinctFromFkMismatchQuarantine: true,
        distinctFromCanaryDeliveryDispatcher: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FL_CODES.OK,
      reason:
        'Hermetic honesty & integrity attestation receipt sealed (≠ FI/FJ/FK/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyBidirectionalDeliveryHonestyAttestationReceipt(receipt);
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

void FL_PRODUCTION_READY;
