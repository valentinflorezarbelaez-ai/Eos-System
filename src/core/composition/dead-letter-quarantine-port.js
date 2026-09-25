/**
 * @module dead-letter-quarantine-port
 * SPEC-0138 / Mission EB — Dead-Letter Quarantine & Poison-Message Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Messages that exhaust idempotent consumption or circuit-breaker fallback must be
 * quarantined fail-closed, with governed poison-message disposition:
 *   - Validates quarantine (messageId + poisonReason + sourceConsumer + attemptCount)
 *   - Emits cryptographically verifiable EB-RCPT-* receipts with quarantineDigest
 *   - Maintains verifiable audit trail of sealed quarantine / disposition steps
 *   - Disposition seals hermetic in-memory quarantine receipt (≠ live broker)
 *   - Explicitly refuses silent drop, unsupervised retry, network write, tip-refresh
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 037f9578 (do NOT rewrite tip pins)
 *   Seals chained EB-RCPT-* receipts with verifiable quarantineDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L33; refuse L34 auto-close
 *
 * PASS = sealed quarantine receipt ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY ≠ silent drop
 */

import {
  EB_PRODUCTION_READY,
  sha256Canonical,
  buildDeadLetterQuarantineReceipt,
  verifyDeadLetterQuarantineReceipt
} from './dead-letter-quarantine-receipt.js';

import {
  DeadLetterQuarantinePolicyGate,
  EB_CODES
} from './dead-letter-quarantine-policy-gate.js';

/** @type {'NO'} */
export const EB_PORT_PRODUCTION_READY = 'NO';
export const EB_PORT_KIND = 'eos-dead-letter-quarantine-port';

export class DeadLetterQuarantinePort {
  /**
   * @param {object} [opts]
   * @param {DeadLetterQuarantinePolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new DeadLetterQuarantinePolicyGate();
    this.trail = [];
    this.productionReady = EB_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the dead-letter quarantine ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildDeadLetterQuarantineReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-34-mission-eb',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        quarantine: input.quarantine || null,
        quarantineDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildDeadLetterQuarantineReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        quarantine: input.quarantine || null,
        quarantineDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EB_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const hasDisposition =
      input.quarantine &&
      input.quarantine.disposition &&
      typeof input.quarantine.disposition === 'string' &&
      input.quarantine.disposition.trim().length > 0;

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      quarantine: input.quarantine,
      disposition: hasDisposition ? input.quarantine.disposition : null,
      timestamp: new Date().toISOString()
    };
    const quarantineDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildDeadLetterQuarantineReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      quarantine: input.quarantine,
      quarantineDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      quarantineHold: hasDisposition
        ? {
            hermeticInMemoryOnly: true,
            networkWriteRefused: true,
            liveBrokerWriteRefused: true,
            silentDropRefused: true,
            unsupervisedRetryRefused: true,
            governedSealOnly: true
          }
        : undefined
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EB_CODES.OK,
      reason: hasDisposition
        ? 'Hermetic in-memory governed quarantine disposition sealed (≠ live broker ≠ silent drop).'
        : undefined,
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
      const validRes = verifyDeadLetterQuarantineReceipt(receipt);
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

void EB_PRODUCTION_READY;
