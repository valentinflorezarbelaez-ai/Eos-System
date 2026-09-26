/**
 * @module ingress-honesty-attestation-port
 * SPEC-0164 / Mission FB — External Event Ingress Honesty & Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Mission EY seals opaque ingress registry receipts, Mission EZ seals webhook authenticity,
 * Mission FA seals ingress quarantine/replay-deny, and Mission EW seals credential-handle honesty.
 * This port attests that external-event-ingress claims remain honest (soft-observe freeze,
 * no live ingress mutation, PRODUCTION_READY=NO, schemas at ceiling, secretZeroHeld,
 * binding match, digest consistency). Soft-observe of freeze pins alone is NOT ingress honesty truth.
 * Soft-observe EY/EZ/FA opaque ingressId/sourceId/handleId refs only.
 * Distinct from EY / EZ / FA / EW / ER / EH / EM / EU / EV / AU.
 *   - Validates attestation (ingressId + subjectKind + honestyClaims + authorized;
 *     optional observedClaim; bindingMatch / digestConsistent)
 *   - Emits cryptographically verifiable FB-RCPT-* receipts with attestationDigest
 *   - Maintains verifiable audit trail of sealed PASS / HOLD / DENY steps
 *   - PASS seals hermetic honesty attestation only — NOT live ingress mutation authority
 *   - Explicitly refuses live-ingress honesty lies, schema-json add, tip-refresh,
 *     PRODUCTION_READY flip; does not bind/verify/quarantine ingress
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests;
 *     seal opaque ingressId/sourceId/handleId + attestationDigest + stage/verdict only
 *   Freeze soft-observe: pin 57edb92e (do NOT rewrite tip pins)
 *   Seals chained FB-RCPT-* receipts with verifiable attestationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L38; refuse L39 auto-close (FC pending)
 *
 * PASS = hermetic ingress honesty attestation ≠ live ingress mutation ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/FA ≠ EW/ER/EH/EM
 */

import {
  FB_PRODUCTION_READY,
  sha256Canonical,
  computeAttestationDigest,
  buildIngressHonestyAttestationReceipt,
  verifyIngressHonestyAttestationReceipt
} from './ingress-honesty-attestation-receipt.js';

import {
  IngressHonestyAttestationPolicyGate,
  FB_CODES
} from './ingress-honesty-attestation-policy-gate.js';

/** @type {'NO'} */
export const FB_PORT_PRODUCTION_READY = 'NO';
export const FB_PORT_KIND = 'eos-ingress-honesty-attestation-port';

export class IngressHonestyAttestationPort {
  /**
   * @param {object} [opts]
   * @param {IngressHonestyAttestationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new IngressHonestyAttestationPolicyGate();
    this.trail = [];
    this.productionReady = FB_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the credential honesty attestation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedAttestation = input.attestation
        ? {
            ingressId: input.attestation.ingressId || null,
            sourceId: input.attestation.sourceId || null,
            handleId: input.attestation.handleId || null,
            subjectKind: input.attestation.subjectKind || null,
            attestationStage: input.attestation.attestationStage || null,
            bindingMatch: input.attestation.bindingMatch,
            digestConsistent: input.attestation.digestConsistent,
            status: gateRes.code
          }
        : { status: gateRes.code };
      const deniedReceipt = buildIngressHonestyAttestationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-39-mission-fb',
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
      const holdReceipt = buildIngressHonestyAttestationReceipt({
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
        code: FB_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const evaluated = {
      handleId: input.attestation.handleId,
      handleClass: input.attestation.handleClass || 'credential-handle',
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

    const passReceipt = buildIngressHonestyAttestationReceipt({
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
        liveSecretStoreClaimRefused: true,
        wallClockAuthorityRefused: true,
        liveUnsupervisedMutationRefused: true,
        tipRefreshAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        productionReadyFlipRefused: true,
        governedSealOnly: true,
        softObserveAloneNotHandleTruth: true,
        secretMaterialRefused: true,
        secretZeroHeld: true,
        vaultKmsRefused: true,
        rawSecretMaterialRefused: true,
        distinctFromEtCredentialHandleRegistry: true,
        distinctFromEuSecretZeroLeakDeny: true,
        distinctFromEvCredentialHandleLifecycle: true,
        distinctFromErConfigHonesty: true,
        distinctFromEmCapacityHonesty: true,
        distinctFromEhTemporalHonesty: true,
        distinctFromAuSecretRuntimeBroker: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FB_CODES.OK,
      reason:
        'Hermetic ingress honesty attestation sealed (≠ live ingress mutation ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/FA/EW/ER/EH/EM). Soft-observe alone ≠ ingress honesty truth.',
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
      const validRes = verifyIngressHonestyAttestationReceipt(receipt);
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

void FB_PRODUCTION_READY;
