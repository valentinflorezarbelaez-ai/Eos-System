/**
 * @module outbound-delivery-quarantine-retry-deny-port
 * SPEC-0168 / Mission FF — Outbound Delivery Quarantine & Retry-Deny Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 40 axis: Sovereign Outbound Delivery & Callback Authenticity Governance Fabric.
 * Existing FD registry / FE authenticity / EB dead-letter / L36 admission surfaces are distinct —
 * this port seals hermetic outbound delivery quarantine / retry-deny staged receipts:
 *   - Validates quarantine (deliveryId opaque + quarantineClass + desiredStage
 *     QUARANTINE|HOLD|RETRY_DENY|RELEASE_HOLD|ACK|ADMIT; optional observedStage injected hermetically;
 *     authorized must be true)
 *   - Emits cryptographically verifiable FF-RCPT-* receipts with quarantineDigest + retryDenyDigest
 *     (sha256 of opaque outbound delivery metadata only — never secret/raw payload bytes)
 *   - Maintains verifiable audit trail of quarantine PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic quarantine receipt only — NOT a live outbound delivery mutation,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT FD/FE/EB/L36/FG ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L39 reopen,
 *     L40 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; callbackSecretMaterialRefused / quarantineSecretZeroHeld
 *   Freeze soft-observe: pin 1079bddf (do NOT rewrite tip pins)
 *   Seals chained FF-RCPT-* receipts with verifiable quarantineDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L39; refuse L40 auto-close (FG–FH pending)
 *
 * PASS = sealed outbound delivery quarantine/retry-deny ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live outbound delivery mutation ≠ wall-clock authority ≠ FD/FE/EB/L36/FG
 */

import {
  FF_PRODUCTION_READY,
  sha256Canonical,
  computeQuarantineDigest,
  computeRetryDenyDigest,
  computeAckDigest,
  buildOutboundDeliveryQuarantineRetryDenyReceipt,
  verifyOutboundDeliveryQuarantineRetryDenyReceipt
} from './outbound-delivery-quarantine-retry-deny-receipt.js';

import {
  OutboundDeliveryQuarantineRetryDenyPolicyGate,
  FF_CODES
} from './outbound-delivery-quarantine-retry-deny-policy-gate.js';

/** @type {'NO'} */
export const FF_PORT_PRODUCTION_READY = 'NO';
export const FF_PORT_KIND = 'eos-outbound-delivery-quarantine-retry-deny-port';

export class OutboundDeliveryQuarantineRetryDenyPort {
  /**
   * @param {object} [opts]
   * @param {OutboundDeliveryQuarantineRetryDenyPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new OutboundDeliveryQuarantineRetryDenyPolicyGate();
    this.trail = [];
    this.productionReady = FF_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the outbound delivery quarantine / retry-deny ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FF_CODES.QUARANTINE_UNAUTHORIZED) status = 'QUARANTINE_UNAUTHORIZED';
      else if (gateRes.code === FF_CODES.INVALID_STAGE_CLAIM) status = 'INVALID_STAGE_CLAIM';
      else if (
        gateRes.code === FF_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FF_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FF_CODES.RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN ||
        gateRes.code === FF_CODES.RAW_PAYLOAD_MATERIAL_FORBIDDEN
      ) {
        status = 'WEBHOOK_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildOutboundDeliveryQuarantineRetryDenyReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-40-mission-ff',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        quarantine: input.quarantine
          ? {
              deliveryId: input.quarantine.deliveryId,
              targetId: input.quarantine.targetId,
              authenticityRef: input.quarantine.authenticityRef,
              quarantineClass: input.quarantine.quarantineClass,
              desiredStage: input.quarantine.desiredStage,
              observedStage: input.quarantine.observedStage,
              authorized: input.quarantine.authorized,
              evaluated: false,
              status
            }
          : null,
        quarantineDigest: sha256Canonical(
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
      const holdReceipt = buildOutboundDeliveryQuarantineRetryDenyReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        quarantine: input.quarantine
          ? {
              deliveryId: input.quarantine.deliveryId,
              targetId: input.quarantine.targetId,
              authenticityRef: input.quarantine.authenticityRef,
              quarantineClass: input.quarantine.quarantineClass,
              desiredStage: input.quarantine.desiredStage,
              observedStage: input.quarantine.observedStage,
              authorized: input.quarantine.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        quarantineDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FF_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedQuarantine = {
      deliveryId: input.quarantine.deliveryId,
      targetId: input.quarantine.targetId,
      authenticityRef: input.quarantine.authenticityRef,
      quarantineClass: input.quarantine.quarantineClass || 'ingress-quarantine',
      desiredStage: input.quarantine.desiredStage,
      observedStage: input.quarantine.observedStage,
      authorized: true,
      evaluated: true,
      status: 'QUARANTINE_EVALUATED',
      failClosed: true,
      hermeticInjectedQuarantineStage: true,
      distinctFromFdOutboundDeliveryRegistry: true,
  distinctFromFaIngressQuarantine: true,
      distinctFromFeOutboundCallbackAuthenticity: true,
      distinctFromEbDeadLetterQuarantine: true,
      distinctFromL36AdmissionBackpressure: true
    };

    const quarantineDigest = computeQuarantineDigest(sealedQuarantine);
    const retryDenyDigest = computeRetryDenyDigest(sealedQuarantine);
    const ackDigest = computeAckDigest(sealedQuarantine);

    const passReceipt = buildOutboundDeliveryQuarantineRetryDenyReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      quarantine: sealedQuarantine,
      quarantineDigest,
      retryDenyDigest,
      ackDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      quarantineHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveOutboundDeliveryMutationRefused: true,
        liveHttpEgressEndpointRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawCallbackSecretMaterialRefused: true,
        rawPayloadMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        callbackSecretMaterialRefused: true,
        quarantineSecretZeroHeld: true,
        distinctFromFdOutboundDeliveryRegistry: true,
  distinctFromFaIngressQuarantine: true,
        distinctFromFeOutboundCallbackAuthenticity: true,
        distinctFromEbDeadLetterQuarantine: true,
        distinctFromL36AdmissionBackpressure: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEvHandleLifecycle: true,
        distinctFromFgOutboundHonesty: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FF_CODES.OK,
      reason:
        'Hermetic outbound-delivery-quarantine-retry-deny governance receipt sealed (≠ FD/FE/EB/L36/FG ≠ live outbound delivery mutation ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyOutboundDeliveryQuarantineRetryDenyReceipt(receipt);
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

void FF_PRODUCTION_READY;
