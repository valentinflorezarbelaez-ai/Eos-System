/**
 * @module webhook-authenticity-registry-port
 * SPEC-0162 / Mission EZ — Sovereign Webhook Authenticity / Signature-Verify Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 39 axis: Sovereign External-Event-Ingress & Secret-Zero Governance Fabric.
 * Existing Mission EZ secret surfaces (src/core/composition/*domain-event* (L33 outbound)) are outbound domain-event
 * oriented — not a receipted Layer-0 composition credential-handle governance port.
 * This port seals hermetic webhook authenticity verify receipts:
 *   - Validates verify (handleId opaque + authenticityClass + desiredVerdict AUTHENTIC|INAUTHENTIC|HOLD;
 *     optional observedVerdict injected hermetically; authorized must be true)
 *   - Emits cryptographically verifiable EZ-RCPT-* receipts with authenticityDigest
 *     (sha256 of opaque ingress metadata only — never secret bytes)
 *   - Maintains verifiable audit trail of verify PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic verify receipt only — NOT a live signature verify endpoint,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT ET/EU/EY/AU/FA ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L38 reopen,
 *     L39 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; webhookSecretMaterialRefused / authenticitySecretZeroHeld
 *   Freeze soft-observe: pin cc9161f9 (do NOT rewrite tip pins)
 *   Seals chained EZ-RCPT-* receipts with verifiable authenticityDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L38; refuse L39 auto-close (FA–FC pending)
 *
 * PASS = sealed webhook-authenticity verify ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live signature verify endpoint ≠ wall-clock authority ≠ ET/EU/EY/AU/FA
 */

import {
  EZ_PRODUCTION_READY,
  sha256Canonical,
  computeAuthenticityDigest,
  buildWebhookAuthenticityReceipt,
  verifyWebhookAuthenticityReceipt
} from './webhook-authenticity-receipt.js';

import {
  WebhookAuthenticityPolicyGate,
  EZ_CODES
} from './webhook-authenticity-policy-gate.js';

/** @type {'NO'} */
export const EZ_PORT_PRODUCTION_READY = 'NO';
export const EZ_PORT_KIND = 'eos-webhook-authenticity-port';

export class WebhookAuthenticityPort {
  /**
   * @param {object} [opts]
   * @param {WebhookAuthenticityPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new WebhookAuthenticityPolicyGate();
    this.trail = [];
    this.productionReady = EZ_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the webhook authenticity verify ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === EZ_CODES.VERIFY_UNAUTHORIZED) status = 'VERIFY_UNAUTHORIZED';
      else if (gateRes.code === EZ_CODES.INVALID_VERDICT_CLAIM) status = 'INVALID_VERDICT_CLAIM';
      else if (
        gateRes.code === EZ_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === EZ_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === EZ_CODES.RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'WEBHOOK_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildWebhookAuthenticityReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-39-mission-ez',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        verify: input.verify
          ? {
              handleId: input.verify.handleId,
              sourceId: input.verify.sourceId,
              authenticityClass: input.verify.authenticityClass,
              verifyClass: input.verify.verifyClass,
              desiredVerdict: input.verify.desiredVerdict,
              observedVerdict: input.verify.observedVerdict,
              authorized: input.verify.authorized,
              evaluated: false,
              status
            }
          : null,
        authenticityDigest: sha256Canonical(
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
      const holdReceipt = buildWebhookAuthenticityReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        verify: input.verify
          ? {
              handleId: input.verify.handleId,
              sourceId: input.verify.sourceId,
              authenticityClass: input.verify.authenticityClass,
              verifyClass: input.verify.verifyClass,
              desiredVerdict: input.verify.desiredVerdict,
              observedVerdict: input.verify.observedVerdict,
              authorized: input.verify.authorized,
              evaluated: false,
              status: 'HELD'
            }
          : null,
        authenticityDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EZ_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedVerify = {
      handleId: input.verify.handleId,
      sourceId: input.verify.sourceId,
      authenticityClass: input.verify.authenticityClass,
      verifyClass: input.verify.verifyClass || 'webhook-authenticity',
      desiredVerdict: input.verify.desiredVerdict,
      observedVerdict: input.verify.observedVerdict,
      authorized: true,
      evaluated: true,
      status: 'AUTHENTIC_EVALUATED',
      failClosed: true,
      hermeticInjectedAuthenticityVerify: true,
      distinctFromEtCredentialHandle: true,
      distinctFromL33DomainEventOutbound: true,
      distinctFromEyIngressRegistry: true
    };

    const authenticityDigest = computeAuthenticityDigest(sealedVerify);

    const passReceipt = buildWebhookAuthenticityReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      verify: sealedVerify,
      authenticityDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      authenticityHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveSignatureVerifyEndpointRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawWebhookSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        webhookSecretMaterialRefused: true,
        authenticitySecretZeroHeld: true,
        distinctFromEtCredentialHandle: true,
        distinctFromL33DomainEventOutbound: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEwCredentialHonesty: true,
        distinctFromEyIngressRegistry: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EZ_CODES.OK,
      reason:
        'Hermetic webhook-authenticity-registry governance receipt sealed (≠ ET/EU/EY/AU/FA ≠ live signature verify endpoint ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyWebhookAuthenticityReceipt(receipt);
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

void EZ_PRODUCTION_READY;
