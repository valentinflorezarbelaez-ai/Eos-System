/**
 * @module external-event-ingress-registry-port
 * SPEC-0161 / Mission EY — Sovereign External Event Ingress Registry & Binding Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 39 axis: Sovereign External-Event-Ingress & Secret-Zero Governance Fabric.
 * Existing Mission EZ secret surfaces (src/core/composition/*domain-event* (L33 outbound)) are outbound domain-event
 * oriented — not a receipted Layer-0 composition credential-handle governance port.
 * This port seals hermetic external-event-ingress registry binding receipts:
 *   - Validates binding (ingressId opaque + sourceClass + desiredBinding BOUND|UNBOUND|HOLD;
 *     optional observedBinding injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable EY-RCPT-* receipts with ingressDigest
 *     (sha256 of opaque ingress metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of binding PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic binding receipt only — NOT a live webhook endpoint,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT ET/L33/EU/EW/EZ ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L38 reopen,
 *     L39 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; webhookSecretMaterialRefused / ingressSecretZeroHeld
 *   Freeze soft-observe: pin 987702da (do NOT rewrite tip pins)
 *   Seals chained EY-RCPT-* receipts with verifiable ingressDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L38; refuse L39 auto-close (EZ–FC pending)
 *
 * PASS = sealed credential-ingress binding ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live webhook endpoint ≠ wall-clock authority ≠ ET/L33/EU/EW/EZ
 */

import {
  EY_PRODUCTION_READY,
  sha256Canonical,
  computeIngressDigest,
  buildExternalEventIngressRegistryReceipt,
  verifyExternalEventIngressRegistryReceipt
} from './external-event-ingress-registry-receipt.js';

import {
  ExternalEventIngressRegistryPolicyGate,
  EY_CODES
} from './external-event-ingress-registry-policy-gate.js';

/** @type {'NO'} */
export const EY_PORT_PRODUCTION_READY = 'NO';
export const EY_PORT_KIND = 'eos-external-event-ingress-registry-port';

export class ExternalEventIngressRegistryPort {
  /**
   * @param {object} [opts]
   * @param {ExternalEventIngressRegistryPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ExternalEventIngressRegistryPolicyGate();
    this.trail = [];
    this.productionReady = EY_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the external-event-ingress registry binding ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === EY_CODES.BINDING_UNAUTHORIZED) status = 'BINDING_UNAUTHORIZED';
      else if (gateRes.code === EY_CODES.INVALID_BINDING_CLAIM) status = 'INVALID_BINDING_CLAIM';
      else if (
        gateRes.code === EY_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === EY_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === EY_CODES.RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'WEBHOOK_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildExternalEventIngressRegistryReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-39-mission-ey',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        binding: input.binding
          ? {
              ingressId: input.binding.ingressId,
              sourceId: input.binding.sourceId,
              sourceClass: input.binding.sourceClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status
            }
          : null,
        ingressDigest: sha256Canonical(
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
      const holdReceipt = buildExternalEventIngressRegistryReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        binding: input.binding
          ? {
              ingressId: input.binding.ingressId,
              sourceId: input.binding.sourceId,
              sourceClass: input.binding.sourceClass,
              bindingClass: input.binding.bindingClass,
              desiredBinding: input.binding.desiredBinding,
              observedBinding: input.binding.observedBinding,
              authorized: input.binding.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        ingressDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EY_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedBinding = {
      ingressId: input.binding.ingressId,
      sourceId: input.binding.sourceId,
      sourceClass: input.binding.sourceClass,
      bindingClass: input.binding.bindingClass || 'external-event-ingress',
      desiredBinding: input.binding.desiredBinding,
      observedBinding: input.binding.observedBinding,
      authorized: true,
      evaluated: true,
      status: 'BOUND_EVALUATED',
      failClosed: true,
      hermeticInjectedIngressBinding: true,
      distinctFromEtCredentialHandle: true,
      distinctFromL33DomainEventOutbound: true,
      distinctFromEzWebhookAuthenticity: true
    };

    const ingressDigest = computeIngressDigest(sealedBinding);

    const passReceipt = buildExternalEventIngressRegistryReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      binding: sealedBinding,
      ingressDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      ingressHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveWebhookEndpointRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawWebhookSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        webhookSecretMaterialRefused: true,
        ingressSecretZeroHeld: true,
        distinctFromEtCredentialHandle: true,
        distinctFromL33DomainEventOutbound: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEwCredentialHonesty: true,
        distinctFromEzWebhookAuthenticity: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EY_CODES.OK,
      reason:
        'Hermetic external-event-ingress-registry governance receipt sealed (≠ ET/L33/EU/EW/EZ ≠ live webhook endpoint ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyExternalEventIngressRegistryReceipt(receipt);
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

void EY_PRODUCTION_READY;
