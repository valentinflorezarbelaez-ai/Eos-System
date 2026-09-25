/**
 * @module temporal-deadline-ttl-port
 * SPEC-0141 / Mission EE — Temporal Deadline & TTL Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission DZ seals process/saga step receipts but has no deadline/TTL/timer.
 * This port seals hermetic deadline/TTL governance receipts:
 *   - Validates deadline (processId + deadlineAt ISO; optional ttlMs/clockSkewBudgetMs/triggerEvent)
 *   - Emits cryptographically verifiable EE-RCPT-* receipts with deadlineDigest
 *   - Maintains verifiable audit trail of sealed deadline / EXPIRE / DENY steps
 *   - PASS seals hermetic deadline/TTL receipt only — NOT a live setTimeout/setInterval/cron
 *   - EXPIRE when observedExpired true (hermetic clock injection via input, not Date.now authority)
 *   - Explicitly refuses live timers, schema-json add, tip-refresh, PRODUCTION_READY flip
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 9600063c (do NOT rewrite tip pins)
 *   Seals chained EE-RCPT-* receipts with verifiable deadlineDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L34; refuse L35 auto-close
 *
 * PASS = sealed deadline/TTL receipt ≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  EE_PRODUCTION_READY,
  sha256Canonical,
  buildTemporalDeadlineTtlReceipt,
  verifyTemporalDeadlineTtlReceipt
} from './temporal-deadline-ttl-receipt.js';

import {
  TemporalDeadlineTtlPolicyGate,
  EE_CODES
} from './temporal-deadline-ttl-policy-gate.js';

/** @type {'NO'} */
export const EE_PORT_PRODUCTION_READY = 'NO';
export const EE_PORT_KIND = 'eos-temporal-deadline-ttl-port';

export class TemporalDeadlineTtlPort {
  /**
   * @param {object} [opts]
   * @param {TemporalDeadlineTtlPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new TemporalDeadlineTtlPolicyGate();
    this.trail = [];
    this.productionReady = EE_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the temporal deadline / TTL ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildTemporalDeadlineTtlReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-35-mission-ee',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        deadline: input.deadline || null,
        deadlineDigest: sha256Canonical(
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
      const holdReceipt = buildTemporalDeadlineTtlReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        deadline: input.deadline || null,
        deadlineDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EE_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    if (gateRes.decision === 'EXPIRE') {
      const expirePayload = {
        planId: input.planId,
        changeId: input.changeId,
        deadline: input.deadline,
        observedExpired: true,
        timestamp: new Date().toISOString()
      };
      const deadlineDigest = sha256Canonical(JSON.stringify(expirePayload));
      const expireReceipt = buildTemporalDeadlineTtlReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'EXPIRE',
        ritualMode: input.ritualMode || 'ACTIVE',
        deadline: input.deadline,
        deadlineDigest,
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
        temporalHold: {
          hermeticInMemoryOnly: true,
          liveTimerRefused: true,
          wallClockSchedulerRefused: true,
          tipRewriteRefused: true,
          schemaJsonAddRefused: true,
          governedSealOnly: true
        }
      });
      this.trail.push(expireReceipt);
      return {
        ok: false,
        decision: 'EXPIRE',
        code: EE_CODES.EXPIRE,
        reason:
          'Fail-closed EXPIRE sealed (hermetic observedExpired via input — ≠ Date.now authority ≠ live timer).',
        receipt: expireReceipt
      };
    }

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      deadline: input.deadline,
      timestamp: new Date().toISOString()
    };
    const deadlineDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildTemporalDeadlineTtlReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      deadline: input.deadline,
      deadlineDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      temporalHold: {
        hermeticInMemoryOnly: true,
        liveTimerRefused: true,
        wallClockSchedulerRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EE_CODES.OK,
      reason:
        'Hermetic deadline/TTL governance receipt sealed (≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyTemporalDeadlineTtlReceipt(receipt);
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

void EE_PRODUCTION_READY;
