/**
 * @module bidirectional-delivery-correlation-registry-port
 * SPEC-0171 / Mission FI — Bidirectional Delivery Correlation Registry & Binding Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 41 axis: Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric.
 * Soft-observes opaque L39 ingress refs + L40 outbound refs and joins them into a
 * bidirectional correlation binding — without reopening L39/L40.
 * This port seals hermetic bidirectional-delivery-correlation registry binding receipts:
 *   - Validates binding (correlationId + ingressId/sourceId L39 + targetId/deliveryId L40
 *     + correlationClass + desiredBinding BOUND|UNBOUND|HOLD;
 *     optional observedBinding injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable FI-RCPT-* receipts with correlationDigest
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
 *   Law VI: zero secret leakage; synthetic tokens in tests; correlationSecretMaterialRefused / correlationSecretZeroHeld
 *   Freeze soft-observe: pin 78141c3d (do NOT rewrite tip pins)
 *   Seals chained FI-RCPT-* receipts with verifiable correlationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L40; refuse L41 auto-close (FJ–FM pending)
 *
 * PASS = sealed bidirectional-delivery-correlation binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live HTTP egress ≠ wall-clock authority ≠ EY/FD/FJ/Canary
 */

import {
  FI_PRODUCTION_READY,
  sha256Canonical,
  computeCorrelationDigest,
  buildBidirectionalDeliveryCorrelationRegistryReceipt,
  verifyBidirectionalDeliveryCorrelationRegistryReceipt
} from './bidirectional-delivery-correlation-registry-receipt.js';

import {
  BidirectionalDeliveryCorrelationRegistryPolicyGate,
  FI_CODES
} from './bidirectional-delivery-correlation-registry-policy-gate.js';

/** @type {'NO'} */
export const FI_PORT_PRODUCTION_READY = 'NO';
export const FI_PORT_KIND = 'eos-bidirectional-delivery-correlation-registry-port';

export class BidirectionalDeliveryCorrelationRegistryPort {
  /**
   * @param {object} [opts]
   * @param {BidirectionalDeliveryCorrelationRegistryPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new BidirectionalDeliveryCorrelationRegistryPolicyGate();
    this.trail = [];
    this.productionReady = FI_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the bidirectional-delivery-correlation registry binding ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FI_CODES.BINDING_UNAUTHORIZED) status = 'BINDING_UNAUTHORIZED';
      else if (gateRes.code === FI_CODES.INVALID_BINDING_CLAIM) status = 'INVALID_BINDING_CLAIM';
      else if (
        gateRes.code === FI_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FI_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FI_CODES.RAW_CORRELATION_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'CORRELATION_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildBidirectionalDeliveryCorrelationRegistryReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fi',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        binding: input.binding
          ? {
              correlationId: input.binding.correlationId,
              bindingId: input.binding.bindingId,
              ingressId: input.binding.ingressId,
              sourceId: input.binding.sourceId,
              targetId: input.binding.targetId,
              deliveryId: input.binding.deliveryId,
              correlationClass: input.binding.correlationClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status
            }
          : null,
        correlationDigest: sha256Canonical(
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
      const holdReceipt = buildBidirectionalDeliveryCorrelationRegistryReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        binding: input.binding
          ? {
              correlationId: input.binding.correlationId,
              bindingId: input.binding.bindingId,
              ingressId: input.binding.ingressId,
              sourceId: input.binding.sourceId,
              targetId: input.binding.targetId,
              deliveryId: input.binding.deliveryId,
              correlationClass: input.binding.correlationClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        correlationDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FI_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedBinding = {
      correlationId: input.binding.correlationId,
      bindingId: input.binding.bindingId || input.binding.correlationId,
      ingressId: input.binding.ingressId,
      sourceId: input.binding.sourceId,
      targetId: input.binding.targetId,
      deliveryId: input.binding.deliveryId,
      correlationClass: input.binding.correlationClass || 'bidirectional-delivery-correlation',
      bindingClass: input.binding.bindingClass || 'bidirectional-delivery-correlation',
      desiredBinding: input.binding.desiredBinding,
      observedBinding: input.binding.observedBinding,
      authorized: true,
      evaluated: true,
      status: 'BOUND_EVALUATED',
      failClosed: true,
      hermeticInjectedCorrelationBinding: true,
      softObserveL39IngressRefsOnly: true,
      softObserveL40OutboundRefsOnly: true,
      distinctFromEyIngressRegistry: true,
      distinctFromFdOutboundRegistry: true,
      distinctFromFjRoundTripIntegrity: true
    };

    const correlationDigest = computeCorrelationDigest(sealedBinding);

    const passReceipt = buildBidirectionalDeliveryCorrelationRegistryReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      binding: sealedBinding,
      correlationDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      correlationHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveHttpEgressRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawCorrelationSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        correlationSecretMaterialRefused: true,
        correlationSecretZeroHeld: true,
        softObserveL39IngressRefsOnly: true,
        softObserveL40OutboundRefsOnly: true,
        distinctFromEyIngressRegistry: true,
        distinctFromFdOutboundRegistry: true,
        distinctFromFjRoundTripIntegrity: true,
        distinctFromCanaryDeliveryDispatcher: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FI_CODES.OK,
      reason:
        'Hermetic bidirectional-delivery-correlation-registry governance receipt sealed (≠ EY/FD/FJ/Canary ≠ live HTTP egress ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyBidirectionalDeliveryCorrelationRegistryReceipt(receipt);
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

void FI_PRODUCTION_READY;
