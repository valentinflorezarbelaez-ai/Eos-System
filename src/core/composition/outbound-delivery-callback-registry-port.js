/**
 * @module outbound-delivery-callback-registry-port
 * SPEC-0166 / Mission FD — Sovereign External Event Outbound Registry & Binding Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 40 axis: Sovereign Outbound Delivery & Callback Authenticity Governance Fabric.
 * Existing Mission EZ secret surfaces (src/core/composition/*domain-event* (L33 outbound)) are outbound domain-event
 * oriented — not a receipted Layer-0 composition credential-handle governance port.
 * This port seals hermetic outbound-delivery-callback registry binding receipts:
 *   - Validates binding (targetId opaque + targetClass + desiredBinding BOUND|UNBOUND|HOLD;
 *     optional observedBinding injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable FD-RCPT-* receipts with deliveryDigest
 *     (sha256 of opaque outbound metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of binding PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic binding receipt only — NOT a live HTTP egress,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT EY/ET/L33/Canary/FE ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L39 reopen,
 *     L40 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; callbackSecretMaterialRefused / outboundSecretZeroHeld
 *   Freeze soft-observe: pin f9a14e16 (do NOT rewrite tip pins)
 *   Seals chained FD-RCPT-* receipts with verifiable deliveryDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L39; refuse L40 auto-close (FE–FH pending)
 *
 * PASS = sealed credential-outbound binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/ET/L33/Canary/FE
 */

import {
  FD_PRODUCTION_READY,
  sha256Canonical,
  computeDeliveryDigest,
  buildOutboundDeliveryCallbackRegistryReceipt,
  verifyOutboundDeliveryCallbackRegistryReceipt
} from './outbound-delivery-callback-registry-receipt.js';

import {
  OutboundDeliveryCallbackRegistryPolicyGate,
  FD_CODES
} from './outbound-delivery-callback-registry-policy-gate.js';

/** @type {'NO'} */
export const FD_PORT_PRODUCTION_READY = 'NO';
export const FD_PORT_KIND = 'eos-outbound-delivery-callback-registry-port';

export class OutboundDeliveryCallbackRegistryPort {
  /**
   * @param {object} [opts]
   * @param {OutboundDeliveryCallbackRegistryPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new OutboundDeliveryCallbackRegistryPolicyGate();
    this.trail = [];
    this.productionReady = FD_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the outbound-delivery-callback registry binding ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FD_CODES.BINDING_UNAUTHORIZED) status = 'BINDING_UNAUTHORIZED';
      else if (gateRes.code === FD_CODES.INVALID_BINDING_CLAIM) status = 'INVALID_BINDING_CLAIM';
      else if (
        gateRes.code === FD_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FD_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FD_CODES.RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'CALLBACK_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildOutboundDeliveryCallbackRegistryReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-40-mission-fd',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        binding: input.binding
          ? {
              targetId: input.binding.targetId,
              deliveryId: input.binding.deliveryId,
              targetClass: input.binding.targetClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status
            }
          : null,
        deliveryDigest: sha256Canonical(
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
      const holdReceipt = buildOutboundDeliveryCallbackRegistryReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        binding: input.binding
          ? {
              targetId: input.binding.targetId,
              deliveryId: input.binding.deliveryId,
              targetClass: input.binding.targetClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        deliveryDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FD_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedBinding = {
      targetId: input.binding.targetId,
      deliveryId: input.binding.deliveryId,
      targetClass: input.binding.targetClass,
      bindingClass: input.binding.bindingClass || 'outbound-delivery-callback',
      desiredBinding: input.binding.desiredBinding,
      observedBinding: input.binding.observedBinding,
      authorized: true,
      evaluated: true,
      status: 'BOUND_EVALUATED',
      failClosed: true,
      hermeticInjectedOutboundBinding: true,
      distinctFromEtCredentialHandle: true,
      distinctFromL33DomainEventOutbound: true,
      distinctFromFeSignatureSign: true
    };

    const deliveryDigest = computeDeliveryDigest(sealedBinding);

    const passReceipt = buildOutboundDeliveryCallbackRegistryReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      binding: sealedBinding,
      deliveryDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      deliveryHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveHttpEgressRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawCallbackSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        callbackSecretMaterialRefused: true,
        outboundSecretZeroHeld: true,
        distinctFromEtCredentialHandle: true,
        distinctFromL33DomainEventOutbound: true,
        distinctFromEyIngressRegistry: true,
        distinctFromCanaryDeliveryDispatcher: true,
        distinctFromFeSignatureSign: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FD_CODES.OK,
      reason:
        'Hermetic outbound-delivery-callback-registry governance receipt sealed (≠ EY/ET/L33/Canary/FE ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyOutboundDeliveryCallbackRegistryReceipt(receipt);
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

void FD_PRODUCTION_READY;
