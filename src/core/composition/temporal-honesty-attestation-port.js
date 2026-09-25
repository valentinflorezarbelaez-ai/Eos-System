/**
 * @module temporal-honesty-attestation-port
 * SPEC-0144 / Mission EH — Temporal Honesty & Deadline Attestation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission EE seals hermetic deadline/TTL receipts, Mission EF seals deferred-wake
 * receipts, and Mission EG seals timeout-compensation receipts. This port attests
 * that those deadline/TTL/schedule/compensation receipts remain temporally honest
 * (soft-observe freeze, no live-timer claims, PRODUCTION_READY=NO, schemas at ceiling):
 *   - Validates attestation (subjectKind + honestyClaims; optional subjectReceiptId)
 *   - Emits cryptographically verifiable EH-RCPT-* receipts with attestationDigest
 *   - Maintains verifiable audit trail of sealed PASS / HOLD / DENY steps
 *   - PASS seals hermetic honesty attestation only — NOT wall-clock authority
 *   - Explicitly refuses live-timer honesty lies, schema-json add, tip-refresh,
 *     PRODUCTION_READY flip
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin ff4b6d19 (do NOT rewrite tip pins)
 *   Seals chained EH-RCPT-* receipts with verifiable attestationDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L34; refuse L35 auto-close
 *
 * PASS = hermetic honesty attestation ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  EH_PRODUCTION_READY,
  sha256Canonical,
  buildTemporalHonestyAttestationReceipt,
  verifyTemporalHonestyAttestationReceipt
} from './temporal-honesty-attestation-receipt.js';

import {
  TemporalHonestyAttestationPolicyGate,
  EH_CODES
} from './temporal-honesty-attestation-policy-gate.js';

/** @type {'NO'} */
export const EH_PORT_PRODUCTION_READY = 'NO';
export const EH_PORT_KIND = 'eos-temporal-honesty-attestation-port';

export class TemporalHonestyAttestationPort {
  /**
   * @param {object} [opts]
   * @param {TemporalHonestyAttestationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new TemporalHonestyAttestationPolicyGate();
    this.trail = [];
    this.productionReady = EH_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the temporal honesty attestation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildTemporalHonestyAttestationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-35-mission-eh',
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
      const holdReceipt = buildTemporalHonestyAttestationReceipt({
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
        code: EH_CODES.HOLD,
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

    const passReceipt = buildTemporalHonestyAttestationReceipt({
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
        liveTimerClaimRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        productionReadyFlipRefused: true,
        governedSealOnly: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EH_CODES.OK,
      reason:
        'Hermetic honesty attestation sealed (≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyTemporalHonestyAttestationReceipt(receipt);
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

void EH_PRODUCTION_READY;
