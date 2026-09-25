/**
 * @module admission-control-intake-port
 * SPEC-0146 / Mission EJ — Sovereign Admission Control & Work-Intake Quotas Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission DX seals circuit-breaker trip/fallback (failureThreshold/cooldown) but has
 * no intake-quota / admission-capacity surface. This port seals hermetic work-intake
 * quota governance receipts:
 *   - Validates intake (intakeId + workClass; optional maxConcurrent/maxQueueDepth;
 *     optional observedInflight/observedQueued injected hermetically)
 *   - Emits cryptographically verifiable EJ-RCPT-* receipts with intakeDigest
 *   - Maintains verifiable audit trail of admit PASS / quota DENY / HOLD seals
 *   - Fail-closed DENY when hermetic observed load exceeds quota
 *   - PASS seals hermetic admission receipt only — NOT a live OS scheduler,
 *     NOT a network rate limiter, NOT wall-clock authority, NOT a DX trip
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L35 reopen,
 *     L36 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin d7490fee (do NOT rewrite tip pins)
 *   Seals chained EJ-RCPT-* receipts with verifiable intakeDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L35; refuse L36 auto-close (EK–EN pending)
 *
 * PASS = sealed admission/quota receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live OS scheduler ≠ network rate limiter ≠ DX circuit-breaker trip
 */

import {
  EJ_PRODUCTION_READY,
  sha256Canonical,
  buildAdmissionControlIntakeReceipt,
  verifyAdmissionControlIntakeReceipt
} from './admission-control-intake-receipt.js';

import {
  AdmissionControlIntakePolicyGate,
  EJ_CODES
} from './admission-control-intake-policy-gate.js';

/** @type {'NO'} */
export const EJ_PORT_PRODUCTION_READY = 'NO';
export const EJ_PORT_KIND = 'eos-admission-control-intake-port';

export class AdmissionControlIntakePort {
  /**
   * @param {object} [opts]
   * @param {AdmissionControlIntakePolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new AdmissionControlIntakePolicyGate();
    this.trail = [];
    this.productionReady = EJ_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the admission / work-intake quota ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildAdmissionControlIntakeReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-36-mission-ej',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        intake: input.intake
          ? {
              ...input.intake,
              admitted: false,
              status: gateRes.code === EJ_CODES.QUOTA_EXCEEDED ? 'QUOTA_EXCEEDED' : 'GATE_DENIED'
            }
          : null,
        intakeDigest: sha256Canonical(
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
      const holdReceipt = buildAdmissionControlIntakeReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        intake: input.intake
          ? { ...input.intake, admitted: false, status: 'HELD' }
          : null,
        intakeDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EJ_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedIntake = {
      ...input.intake,
      admitted: true,
      status: 'ADMITTED',
      failClosed: true,
      hermeticInjectedLoad: true,
      distinctFromDxCircuitBreaker: true
    };

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      intake: sealedIntake,
      timestamp: new Date().toISOString()
    };
    const intakeDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildAdmissionControlIntakeReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      intake: sealedIntake,
      intakeDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      admissionHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveOsSchedulerRefused: true,
        networkRateLimiterRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        distinctFromDxCircuitBreaker: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EJ_CODES.OK,
      reason:
        'Hermetic admission/work-intake quota receipt sealed (≠ DX trip ≠ live OS scheduler ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyAdmissionControlIntakeReceipt(receipt);
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

void EJ_PRODUCTION_READY;
