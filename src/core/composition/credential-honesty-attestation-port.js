/**
 * @module credential-honesty-attestation-port
 * SPEC-0159 / Mission EW — Credential Honesty & Handle Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets (Law VI).
 *
 * Mission ET seals opaque handle bind receipts, Mission EU seals secret-zero
 * leak-deny, Mission EV seals handle lifecycle/rotation, and Mission ER seals
 * config/flag honesty. This port attests that credential-handle claims remain
 * honest (soft-observe freeze, no live secret store, PRODUCTION_READY=NO,
 * schemas at ceiling, secretZeroHeld, binding match, digest consistency).
 * Soft-observe of freeze pins alone is NOT handle truth (mirror ER/EM/EH):
 * Distinct from ET / EU / EV / ER / EM / EH / AU.
 *   - Validates attestation (handleId + subjectKind + honestyClaims + authorized;
 *     optional observedClaim; bindingMatch / digestConsistent)
 *   - Emits cryptographically verifiable EW-RCPT-* receipts with attestationDigest
 *   - Maintains verifiable audit trail of sealed PASS / HOLD / DENY steps
 *   - PASS seals hermetic honesty attestation only — NOT live secret store authority
 *   - Explicitly refuses live-secret-store honesty lies, schema-json add, tip-refresh,
 *     PRODUCTION_READY flip; does not bind/rotate/revoke handles or mutate secrets
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests;
 *     seal opaque handleId + attestationDigest + stage/verdict only
 *   Freeze soft-observe: pin 376378be (do NOT rewrite tip pins)
 *   Seals chained EW-RCPT-* receipts with verifiable attestationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L37; refuse L38 auto-close (EX pending)
 *
 * PASS = hermetic credential-handle honesty attestation ≠ live secret store ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  EW_PRODUCTION_READY,
  sha256Canonical,
  computeAttestationDigest,
  buildCredentialHonestyAttestationReceipt,
  verifyCredentialHonestyAttestationReceipt
} from './credential-honesty-attestation-receipt.js';

import {
  CredentialHonestyAttestationPolicyGate,
  EW_CODES
} from './credential-honesty-attestation-policy-gate.js';

/** @type {'NO'} */
export const EW_PORT_PRODUCTION_READY = 'NO';
export const EW_PORT_KIND = 'eos-credential-honesty-attestation-port';

export class CredentialHonestyAttestationPort {
  /**
   * @param {object} [opts]
   * @param {CredentialHonestyAttestationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new CredentialHonestyAttestationPolicyGate();
    this.trail = [];
    this.productionReady = EW_PORT_PRODUCTION_READY;
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
            handleId: input.attestation.handleId || null,
            handleClass: input.attestation.handleClass || null,
            subjectKind: input.attestation.subjectKind || null,
            attestationStage: input.attestation.attestationStage || null,
            bindingMatch: input.attestation.bindingMatch,
            digestConsistent: input.attestation.digestConsistent,
            status: gateRes.code
          }
        : { status: gateRes.code };
      const deniedReceipt = buildCredentialHonestyAttestationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-38-mission-ew',
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
      const holdReceipt = buildCredentialHonestyAttestationReceipt({
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
        code: EW_CODES.HOLD,
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

    const passReceipt = buildCredentialHonestyAttestationReceipt({
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
      code: EW_CODES.OK,
      reason:
        'Hermetic credential-handle honesty attestation sealed (≠ live secret store ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EV/ER/EM/EH/AU). Soft-observe alone ≠ handle truth.',
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
      const validRes = verifyCredentialHonestyAttestationReceipt(receipt);
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

void EW_PRODUCTION_READY;
