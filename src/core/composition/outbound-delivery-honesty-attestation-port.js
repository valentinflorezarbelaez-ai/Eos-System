/**
 * @module outbound-delivery-honesty-attestation-port
 * SPEC-0169 / Mission FG — Outbound Delivery Honesty & Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Mission EY seals opaque outbound delivery registry receipts, Mission EZ seals webhook authenticity,
 * Mission FA seals ingress quarantine/retry-deny, and Mission EW seals outbound delivery honesty.
 * This port attests that external-event-ingress claims remain honest (soft-observe freeze,
 * no live outbound delivery mutation, PRODUCTION_READY=NO, schemas at ceiling, secretZeroHeld,
 * binding match, digest consistency). Soft-observe of freeze pins alone is NOT outbound delivery honesty truth.
 * Soft-observe FD/FE/FF opaque deliveryId/targetId/authenticityRef refs only.
 * Distinct from FD / FE / FF / EW / ER / EH / EM / EU / EV / AU.
 *   - Validates attestation (deliveryId + subjectKind + honestyClaims + authorized;
 *     optional observedClaim; bindingMatch / digestConsistent)
 *   - Emits cryptographically verifiable FG-RCPT-* receipts with attestationDigest
 *   - Maintains verifiable audit trail of sealed PASS / HOLD / DENY steps
 *   - PASS seals hermetic honesty attestation only — NOT live outbound delivery mutation authority
 *   - Explicitly refuses live-outbound delivery honesty lies, schema-json add, tip-refresh,
 *     PRODUCTION_READY flip; does not bind/verify/quarantine ingress
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests;
 *     seal opaque deliveryId/targetId/authenticityRef + attestationDigest + stage/verdict only
 *   Freeze soft-observe: pin a7c7df8f (do NOT rewrite tip pins)
 *   Seals chained FG-RCPT-* receipts with verifiable attestationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L39; refuse L40 auto-close (FH pending)
 *
 * PASS = hermetic outbound delivery honesty attestation ≠ live outbound delivery mutation ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/FF ≠ FB/ER/EH/EM
 */

import {
  FG_PRODUCTION_READY,
  sha256Canonical,
  computeAttestationDigest,
  buildOutboundDeliveryHonestyAttestationReceipt,
  verifyOutboundDeliveryHonestyAttestationReceipt
} from './outbound-delivery-honesty-attestation-receipt.js';

import {
  OutboundDeliveryHonestyAttestationPolicyGate,
  FG_CODES
} from './outbound-delivery-honesty-attestation-policy-gate.js';

/** @type {'NO'} */
export const FG_PORT_PRODUCTION_READY = 'NO';
export const FG_PORT_KIND = 'eos-outbound-delivery-honesty-attestation-port';

export class OutboundDeliveryHonestyAttestationPort {
  /**
   * @param {object} [opts]
   * @param {OutboundDeliveryHonestyAttestationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new OutboundDeliveryHonestyAttestationPolicyGate();
    this.trail = [];
    this.productionReady = FG_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the outbound delivery honesty attestation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedAttestation = input.attestation
        ? {
            deliveryId: input.attestation.deliveryId || null,
            targetId: input.attestation.targetId || null,
            authenticityRef: input.attestation.authenticityRef || null,
            quarantineRef: input.attestation.quarantineRef || null,
            subjectKind: input.attestation.subjectKind || null,
            attestationStage: input.attestation.attestationStage || null,
            bindingMatch: input.attestation.bindingMatch,
            digestConsistent: input.attestation.digestConsistent,
            status: gateRes.code
          }
        : { status: gateRes.code };

      const deniedReceipt = buildOutboundDeliveryHonestyAttestationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-40-mission-fg',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        attestation: deniedAttestation,
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
      const holdReceipt = buildOutboundDeliveryHonestyAttestationReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        attestation: input.attestation || null,
        attestationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FG_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const evaluated = {
      deliveryId: input.attestation.deliveryId,
      targetId: input.attestation.targetId || null,
      authenticityRef: input.attestation.authenticityRef || null,
      quarantineRef: input.attestation.quarantineRef || null,
      deliveryClass: input.attestation.deliveryClass || 'outbound-delivery',
      subjectKind: input.attestation.subjectKind,
      attestationStage: input.attestation.attestationStage || 'BINDING_MATCH',
      bindingMatch: input.attestation.bindingMatch !== false,
      digestConsistent: input.attestation.digestConsistent !== false,
      honestyClaims: input.attestation.honestyClaims,
      observedClaim: input.attestation.observedClaim || null,
      authorized: true,
      evaluated: true,
      status: 'ATTESTATION_EVALUATED'
    };


    const attestationDigest = computeAttestationDigest(evaluated);

    const passReceipt = buildOutboundDeliveryHonestyAttestationReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      attestation: evaluated,
      attestationDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      attestationHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveOutboundDeliveryMutationRefused: true,
        liveHttpEgressEndpointRefused: true,
        wallClockAuthorityRefused: true,
        liveUnsupervisedMutationRefused: true,
        tipRefreshAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        productionReadyFlipRefused: true,
        governedSealOnly: true,
        softObserveAloneNotOutboundDeliveryTruth: true,
        secretMaterialRefused: true,
        secretZeroHeld: true,
        rawCallbackSecretMaterialRefused: true,
        rawPayloadMaterialRefused: true,
        distinctFromFdOutboundDeliveryRegistry: true,
        distinctFromFeOutboundCallbackAuthenticity: true,
        distinctFromFfOutboundDeliveryQuarantine: true,
        distinctFromFbIngressHonesty: true,
        distinctFromEwCredentialHonesty: true,
        distinctFromErConfigHonesty: true,
        distinctFromEmCapacityHonesty: true,
        distinctFromEhTemporalHonesty: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEvHandleLifecycle: true,
        distinctFromAuSecretRuntimeBroker: true

      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FG_CODES.OK,
      reason:
        'Hermetic outbound delivery honesty attestation sealed (≠ live outbound delivery mutation ≠ tip-refresh ≠ PRODUCTION_READY ≠ FD/FE/FF/FB/ER/EH/EM). Soft-observe alone ≠ outbound delivery honesty truth.',
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
      const validRes = verifyOutboundDeliveryHonestyAttestationReceipt(receipt);
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

void FG_PRODUCTION_READY;
