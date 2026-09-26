/**
 * @module ingress-quarantine-replay-deny-port
 * SPEC-0163 / Mission FA — External Event Ingress Quarantine & Replay-Deny Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Ladder 39 axis: Sovereign External Event Ingress & Webhook Authenticity Governance Fabric.
 * Existing EY registry / EZ authenticity / EB dead-letter / L36 admission surfaces are distinct —
 * this port seals hermetic ingress quarantine / replay-deny staged receipts:
 *   - Validates quarantine (ingressId opaque + quarantineClass + desiredStage
 *     QUARANTINE|HOLD|REPLAY_DENY|RELEASE_HOLD|ADMIT; optional observedStage injected hermetically;
 *     authorized must be true)
 *   - Emits cryptographically verifiable FA-RCPT-* receipts with quarantineDigest + replayDenyDigest
 *     (sha256 of opaque ingress metadata only — never secret/raw payload bytes)
 *   - Maintains verifiable audit trail of quarantine PASS / unauthorized DENY / HOLD seals
 *   - Fail-closed DENY when hermetic claim invalid/unauthorized OR secret-looking fields present
 *   - PASS seals hermetic quarantine receipt only — NOT a live ingress mutation,
 *     NOT wall-clock authority, NOT tip-refresh authority, NOT EY/EZ/EB/L36/FB ports
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L38 reopen,
 *     L39 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests; webhookSecretMaterialRefused / quarantineSecretZeroHeld
 *   Freeze soft-observe: pin 3cbb32dc (do NOT rewrite tip pins)
 *   Seals chained FA-RCPT-* receipts with verifiable quarantineDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L38; refuse L39 auto-close (FB–FC pending)
 *
 * PASS = sealed ingress quarantine/replay-deny ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live ingress mutation ≠ wall-clock authority ≠ EY/EZ/EB/L36/FB
 */

import {
  FA_PRODUCTION_READY,
  sha256Canonical,
  computeQuarantineDigest,
  computeReplayDenyDigest,
  buildIngressQuarantineReplayDenyReceipt,
  verifyIngressQuarantineReplayDenyReceipt
} from './ingress-quarantine-replay-deny-receipt.js';

import {
  IngressQuarantineReplayDenyPolicyGate,
  FA_CODES
} from './ingress-quarantine-replay-deny-policy-gate.js';

/** @type {'NO'} */
export const FA_PORT_PRODUCTION_READY = 'NO';
export const FA_PORT_KIND = 'eos-ingress-quarantine-replay-deny-port';

export class IngressQuarantineReplayDenyPort {
  /**
   * @param {object} [opts]
   * @param {IngressQuarantineReplayDenyPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new IngressQuarantineReplayDenyPolicyGate();
    this.trail = [];
    this.productionReady = FA_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the ingress quarantine / replay-deny ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      let status = 'GATE_DENIED';
      if (gateRes.code === FA_CODES.QUARANTINE_UNAUTHORIZED) status = 'QUARANTINE_UNAUTHORIZED';
      else if (gateRes.code === FA_CODES.INVALID_STAGE_CLAIM) status = 'INVALID_STAGE_CLAIM';
      else if (
        gateRes.code === FA_CODES.SECRET_FIELD_FORBIDDEN ||
        gateRes.code === FA_CODES.SECRET_LEAK_FORBIDDEN ||
        gateRes.code === FA_CODES.RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN ||
        gateRes.code === FA_CODES.RAW_PAYLOAD_MATERIAL_FORBIDDEN
      ) {
        status = 'WEBHOOK_SECRET_MATERIAL_REFUSED';
      }

      const deniedReceipt = buildIngressQuarantineReplayDenyReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-39-mission-fa',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        quarantine: input.quarantine
          ? {
              ingressId: input.quarantine.ingressId,
              sourceId: input.quarantine.sourceId,
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
      const holdReceipt = buildIngressQuarantineReplayDenyReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        quarantine: input.quarantine
          ? {
              ingressId: input.quarantine.ingressId,
              sourceId: input.quarantine.sourceId,
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
        code: FA_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedQuarantine = {
      ingressId: input.quarantine.ingressId,
      sourceId: input.quarantine.sourceId,
      authenticityRef: input.quarantine.authenticityRef,
      quarantineClass: input.quarantine.quarantineClass || 'ingress-quarantine',
      desiredStage: input.quarantine.desiredStage,
      observedStage: input.quarantine.observedStage,
      authorized: true,
      evaluated: true,
      status: 'QUARANTINE_EVALUATED',
      failClosed: true,
      hermeticInjectedQuarantineStage: true,
      distinctFromEyIngressRegistry: true,
      distinctFromEzWebhookAuthenticity: true,
      distinctFromEbDeadLetterQuarantine: true,
      distinctFromL36AdmissionBackpressure: true
    };

    const quarantineDigest = computeQuarantineDigest(sealedQuarantine);
    const replayDenyDigest = computeReplayDenyDigest(sealedQuarantine);

    const passReceipt = buildIngressQuarantineReplayDenyReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      quarantine: sealedQuarantine,
      quarantineDigest,
      replayDenyDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      quarantineHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveIngressMutationRefused: true,
        liveWebhookIngressEndpointRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        tipRefreshAuthorityRefused: true,
        rawWebhookSecretMaterialRefused: true,
        rawPayloadMaterialRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        webhookSecretMaterialRefused: true,
        quarantineSecretZeroHeld: true,
        distinctFromEyIngressRegistry: true,
        distinctFromEzWebhookAuthenticity: true,
        distinctFromEbDeadLetterQuarantine: true,
        distinctFromL36AdmissionBackpressure: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEvHandleLifecycle: true,
        distinctFromFbIngressHonesty: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FA_CODES.OK,
      reason:
        'Hermetic ingress-quarantine-replay-deny governance receipt sealed (≠ EY/EZ/EB/L36/FB ≠ live ingress mutation ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyIngressQuarantineReplayDenyReceipt(receipt);
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

void FA_PRODUCTION_READY;
