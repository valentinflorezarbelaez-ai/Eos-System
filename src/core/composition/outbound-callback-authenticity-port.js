/**
 * @module outbound-callback-authenticity-port
 * SPEC-0167 / Mission FE — Sovereign Outbound Callback Authenticity / Signature-Sign Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 40 axis: Sovereign Outbound Delivery & Callback Authenticity Governance Fabric.
 * Mission EZ verifies inbound webhook authenticity; Mission FE signs outbound callbacks
 * using opaque L38 handleIds only (Law VI). FD is registry/binding only — soft-observe
 * opaque FD targetId/deliveryId refs; do NOT elevate FD as the authenticity sign port.
 * This port seals hermetic outbound-callback authenticity sign receipts:
 *   - Validates sign (handleId opaque + authenticityClass + desiredVerdict SIGNED|UNSIGNED|HOLD;
 *     optional observedVerdict injected hermetically; authorized must be true;
 *     optional opaque FD targetId/deliveryId soft-observe)
 *   - Emits cryptographically verifiable FE-RCPT-* receipts with authenticityDigest
 *     (sha256 of opaque outbound metadata only — never secret bytes / raw HMAC)
 *   - Maintains verifiable audit trail of sign PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic sign receipt only — NOT a live signature sign endpoint,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT ET/EZ/FD/AU/FF ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L39 reopen,
 *     L40 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; callbackSecretMaterialRefused / authenticitySecretZeroHeld
 *   Freeze soft-observe: pin 7b47bf8b (do NOT rewrite tip pins)
 *   Seals chained FE-RCPT-* receipts with verifiable authenticityDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L39; refuse L40 auto-close (FF–FH pending)
 *
 * PASS = sealed outbound-callback-authenticity sign ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live signature sign endpoint ≠ wall-clock authority ≠ ET/EZ/FD/AU/FF
 */

import {
  FE_PRODUCTION_READY,
  sha256Canonical,
  computeAuthenticityDigest,
  buildOutboundCallbackAuthenticityReceipt,
  verifyOutboundCallbackAuthenticityReceipt
} from './outbound-callback-authenticity-receipt.js';

import {
  OutboundCallbackAuthenticityPolicyGate,
  FE_CODES
} from './outbound-callback-authenticity-policy-gate.js';

/** @type {'NO'} */
export const FE_PORT_PRODUCTION_READY = 'NO';
export const FE_PORT_KIND = 'eos-outbound-callback-authenticity-port';

export class OutboundCallbackAuthenticityPort {
  /**
   * @param {object} [opts]
   * @param {OutboundCallbackAuthenticityPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new OutboundCallbackAuthenticityPolicyGate();
    this.trail = [];
    this.productionReady = FE_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the outbound-callback authenticity sign ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FE_CODES.SIGN_UNAUTHORIZED) status = 'SIGN_UNAUTHORIZED';
      else if (gateRes.code === FE_CODES.INVALID_VERDICT_CLAIM) status = 'INVALID_VERDICT_CLAIM';
      else if (
        gateRes.code === FE_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FE_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FE_CODES.RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN
      ) {
        status = 'CALLBACK_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildOutboundCallbackAuthenticityReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-40-mission-fe',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        sign: input.sign
          ? {
              handleId: input.sign.handleId,
              targetId: input.sign.targetId,
              deliveryId: input.sign.deliveryId,
              authenticityClass: input.sign.authenticityClass,
              signClass: input.sign.signClass,
              desiredVerdict: input.sign.desiredVerdict,
              observedVerdict: input.sign.observedVerdict,
              authorized: input.sign.authorized,
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
      const holdReceipt = buildOutboundCallbackAuthenticityReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        sign: input.sign
          ? {
              handleId: input.sign.handleId,
              targetId: input.sign.targetId,
              deliveryId: input.sign.deliveryId,
              authenticityClass: input.sign.authenticityClass,
              signClass: input.sign.signClass,
              desiredVerdict: input.sign.desiredVerdict,
              observedVerdict: input.sign.observedVerdict,
              authorized: input.sign.authorized,
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
        code: FE_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedSign = {
      handleId: input.sign.handleId,
      targetId: input.sign.targetId,
      deliveryId: input.sign.deliveryId,
      authenticityClass: input.sign.authenticityClass,
      signClass: input.sign.signClass || 'outbound-callback-authenticity',
      desiredVerdict: input.sign.desiredVerdict,
      observedVerdict: input.sign.observedVerdict,
      authorized: true,
      evaluated: true,
      status: 'SIGNED_EVALUATED',
      failClosed: true,
      hermeticInjectedAuthenticitySign: true,
      distinctFromEtCredentialHandle: true,
      distinctFromL33DomainEventOutbound: true,
      distinctFromEzWebhookAuthenticityVerify: true,
      distinctFromFdOutboundDeliveryRegistry: true
    };

    const authenticityDigest = computeAuthenticityDigest(sealedSign);

    const passReceipt = buildOutboundCallbackAuthenticityReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      sign: sealedSign,
      authenticityDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      authenticityHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveSignatureSignEndpointRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawCallbackSecretMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        callbackSecretMaterialRefused: true,
        authenticitySecretZeroHeld: true,
        distinctFromEtCredentialHandle: true,
        distinctFromL33DomainEventOutbound: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEwCredentialHonesty: true,
        distinctFromEzWebhookAuthenticityVerify: true,
        distinctFromFdOutboundDeliveryRegistry: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FE_CODES.OK,
      reason:
        'Hermetic outbound-callback-authenticity governance receipt sealed (≠ ET/EZ/FD/AU/FF ≠ live signature sign endpoint ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyOutboundCallbackAuthenticityReceipt(receipt);
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

void FE_PRODUCTION_READY;
