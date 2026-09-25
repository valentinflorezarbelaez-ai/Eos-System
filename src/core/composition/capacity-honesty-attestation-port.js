/**
 * @module capacity-honesty-attestation-port
 * SPEC-0149 / Mission EM — Capacity Honesty & Admission Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission EJ seals hermetic admission/intake quota receipts, Mission EK seals
 * load-shed receipts, and Mission EL seals bulkhead/isolation receipts. This port attests
 * that those capacity/admission claims remain honest
 * (soft-observe freeze, no live-metrics claims, PRODUCTION_READY=NO, schemas at ceiling).
 * Soft-observe of freeze pins alone is NOT capacity truth (mirror EH vs soft-observe):
 * Distinct from EJ / EK / EL / EH.
 *   - Validates attestation (subjectKind + honestyClaims; optional subjectReceiptId)
 *   - Emits cryptographically verifiable EM-RCPT-* receipts with attestationDigest
 *   - Maintains verifiable audit trail of sealed PASS / HOLD / DENY steps
 *   - PASS seals hermetic honesty attestation only — NOT wall-clock capacity authority
 *   - Explicitly refuses live-metrics honesty lies, schema-json add, tip-refresh,
 *     PRODUCTION_READY flip
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 933f32ae (do NOT rewrite tip pins)
 *   Seals chained EM-RCPT-* receipts with verifiable attestationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L35; refuse L36 auto-close (EN pending)
 *
 * PASS = hermetic capacity/admission honesty attestation ≠ live metrics ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  EM_PRODUCTION_READY,
  sha256Canonical,
  buildCapacityHonestyAttestationReceipt,
  verifyCapacityHonestyAttestationReceipt
} from './capacity-honesty-attestation-receipt.js';

import {
  CapacityHonestyAttestationPolicyGate,
  EM_CODES
} from './capacity-honesty-attestation-policy-gate.js';

/** @type {'NO'} */
export const EM_PORT_PRODUCTION_READY = 'NO';
export const EM_PORT_KIND = 'eos-capacity-honesty-attestation-port';

export class CapacityHonestyAttestationPort {
  /**
   * @param {object} [opts]
   * @param {CapacityHonestyAttestationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new CapacityHonestyAttestationPolicyGate();
    this.trail = [];
    this.productionReady = EM_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the capacity honesty attestation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildCapacityHonestyAttestationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-36-mission-em',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        attestation: input.attestation || null,
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
      const holdReceipt = buildCapacityHonestyAttestationReceipt({
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
        code: EM_CODES.HOLD,
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

    const passReceipt = buildCapacityHonestyAttestationReceipt({
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
        liveMetricsClaimRefused: true,
        wallClockCapacityAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        productionReadyFlipRefused: true,
        governedSealOnly: true,
        distinctFromEjAdmissionQuota: true,
        distinctFromEkLoadShed: true,
        distinctFromElBulkhead: true,
        distinctFromEhTemporalHonesty: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EM_CODES.OK,
      reason:
        'Hermetic capacity/admission honesty attestation sealed (≠ live metrics ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ/EK/EL/EH).',
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
      const validRes = verifyCapacityHonestyAttestationReceipt(receipt);
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

void EM_PRODUCTION_READY;
