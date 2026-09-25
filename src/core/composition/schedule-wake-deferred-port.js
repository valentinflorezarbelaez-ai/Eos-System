/**
 * @module schedule-wake-deferred-port
 * SPEC-0142 / Mission EF — Schedule Wake & Deferred Trigger Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission EE seals hermetic deadline/TTL receipts but has no schedule wake /
 * deferred trigger surface. This port seals hermetic deferred-wake receipts:
 *   - Validates schedule (scheduleId + wakeAt ISO; triggerKind ONCE|DEFERRED;
 *     optional deferredFromProcessId / payloadDigest)
 *   - Emits cryptographically verifiable EF-RCPT-* receipts with scheduleDigest
 *   - Maintains verifiable audit trail of sealed wake / HOLD / DENY steps
 *   - PASS seals hermetic deferred-wake receipt only — NOT a live setInterval/cron daemon
 *   - Explicitly refuses live cron, OS scheduler, network wake, schema-json add,
 *     tip-refresh, PRODUCTION_READY flip
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 0a286ad8 (do NOT rewrite tip pins)
 *   Seals chained EF-RCPT-* receipts with verifiable scheduleDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L34; refuse L35 auto-close
 *
 * PASS = hermetic deferred-wake receipt ≠ setInterval/cron daemon ≠ network wake ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  EF_PRODUCTION_READY,
  sha256Canonical,
  buildScheduleWakeDeferredReceipt,
  verifyScheduleWakeDeferredReceipt
} from './schedule-wake-deferred-receipt.js';

import {
  ScheduleWakeDeferredPolicyGate,
  EF_CODES
} from './schedule-wake-deferred-policy-gate.js';

/** @type {'NO'} */
export const EF_PORT_PRODUCTION_READY = 'NO';
export const EF_PORT_KIND = 'eos-schedule-wake-deferred-port';

export class ScheduleWakeDeferredPort {
  /**
   * @param {object} [opts]
   * @param {ScheduleWakeDeferredPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ScheduleWakeDeferredPolicyGate();
    this.trail = [];
    this.productionReady = EF_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the schedule wake / deferred trigger ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildScheduleWakeDeferredReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-35-mission-ef',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        schedule: input.schedule || null,
        scheduleDigest: sha256Canonical(
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
      const holdReceipt = buildScheduleWakeDeferredReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        schedule: input.schedule || null,
        scheduleDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EF_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      schedule: input.schedule,
      timestamp: new Date().toISOString()
    };
    const scheduleDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildScheduleWakeDeferredReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      schedule: input.schedule,
      scheduleDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      scheduleHold: {
        hermeticInMemoryOnly: true,
        liveCronRefused: true,
        osSchedulerRefused: true,
        networkWakeRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EF_CODES.OK,
      reason:
        'Hermetic deferred-wake receipt sealed (≠ live cron ≠ network wake ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyScheduleWakeDeferredReceipt(receipt);
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

void EF_PRODUCTION_READY;
