/**
 * @module config-honesty-attestation-port
 * SPEC-0154 / Mission ER — Config Honesty & Flag Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission EO seals feature-flag/runtime toggle receipts, Mission EP seals
 * policy-pack binding receipts, and Mission EQ seals staged-activation receipts.
 * This port attests that those config/flag claims remain honest
 * (soft-observe freeze, no live flag store, PRODUCTION_READY=NO, schemas at ceiling).
 * Soft-observe of freeze pins alone is NOT config truth (mirror EM/EH vs soft-observe):
 * Distinct from EO / EP / EQ / EM / EH.
 *   - Validates attestation (subjectKind + honestyClaims + authorized; optional observedClaim)
 *   - Emits cryptographically verifiable ER-RCPT-* receipts with attestationDigest
 *   - Maintains verifiable audit trail of sealed PASS / HOLD / DENY steps
 *   - PASS seals hermetic honesty attestation only — NOT live flag store authority
 *   - Explicitly refuses live-flag-store honesty lies, schema-json add, tip-refresh,
 *     PRODUCTION_READY flip; does not flip flags or activate config
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 7ee4bd49 (do NOT rewrite tip pins)
 *   Seals chained ER-RCPT-* receipts with verifiable attestationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L36; refuse L37 auto-close (ES pending)
 *
 * PASS = hermetic config/flag honesty attestation ≠ live flag store ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  ER_PRODUCTION_READY,
  sha256Canonical,
  buildConfigHonestyAttestationReceipt,
  verifyConfigHonestyAttestationReceipt
} from './config-honesty-attestation-receipt.js';

import {
  ConfigHonestyAttestationPolicyGate,
  ER_CODES
} from './config-honesty-attestation-policy-gate.js';

/** @type {'NO'} */
export const ER_PORT_PRODUCTION_READY = 'NO';
export const ER_PORT_KIND = 'eos-config-honesty-attestation-port';

export class ConfigHonestyAttestationPort {
  /**
   * @param {object} [opts]
   * @param {ConfigHonestyAttestationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ConfigHonestyAttestationPolicyGate();
    this.trail = [];
    this.productionReady = ER_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the config honesty attestation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildConfigHonestyAttestationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-37-mission-er',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        attestation: input.attestation
          ? { ...input.attestation, status: gateRes.code }
          : { status: gateRes.code },
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
      const holdReceipt = buildConfigHonestyAttestationReceipt({
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
        code: ER_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      attestation: input.attestation,
      timestamp: new Date().toISOString()
    };
    const attestationDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildConfigHonestyAttestationReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      attestation: input.attestation,
      attestationDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      attestationHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveFlagStoreClaimRefused: true,
        wallClockAuthorityRefused: true,
        liveUnsupervisedMutationRefused: true,
        tipRefreshAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        productionReadyFlipRefused: true,
        governedSealOnly: true,
        softObserveAloneNotConfigTruth: true,
        distinctFromEoFeatureFlag: true,
        distinctFromEpPolicyPackBinding: true,
        distinctFromEqStagedActivation: true,
        distinctFromEmCapacityHonesty: true,
        distinctFromEhTemporalHonesty: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: ER_CODES.OK,
      reason:
        'Hermetic config/flag honesty attestation sealed (≠ live flag store ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO/EP/EQ/EM/EH). Soft-observe alone ≠ config truth.',
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
      const validRes = verifyConfigHonestyAttestationReceipt(receipt);
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

void ER_PRODUCTION_READY;
