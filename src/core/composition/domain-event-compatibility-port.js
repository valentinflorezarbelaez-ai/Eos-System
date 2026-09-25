/**
 * @module domain-event-compatibility-port
 * SPEC-0139 / Mission EC — Domain Event Compatibility & Evolution Gate Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Event evolution must be gated without adding schema JSON files. A compatibility
 * and evolution gate port records allow/deny receipts against existing event contracts only:
 *   - Validates evolution (eventType + changeKind; optional fromVersion/toVersion/contractDigest)
 *   - Emits cryptographically verifiable EC-RCPT-* receipts with compatibilityDigest
 *   - Maintains verifiable audit trail of sealed compatibility / deny steps
 *   - PASS only for COMPATIBLE / ADD_OPTIONAL_FIELD (hermetic)
 *   - DENY for BREAKING / RENAME_FORBIDDEN with sealed deny receipt
 *   - Explicitly refuses schema-json add, network write, tip-refresh, PRODUCTION_READY flip
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 19b353d8 (do NOT rewrite tip pins)
 *   Seals chained EC-RCPT-* receipts with verifiable compatibilityDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L33; refuse L34 auto-close
 *
 * PASS = sealed compatibility receipt ≠ new schema JSON ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  EC_PRODUCTION_READY,
  sha256Canonical,
  buildDomainEventCompatibilityReceipt,
  verifyDomainEventCompatibilityReceipt
} from './domain-event-compatibility-receipt.js';

import {
  DomainEventCompatibilityPolicyGate,
  EC_CODES
} from './domain-event-compatibility-policy-gate.js';

/** @type {'NO'} */
export const EC_PORT_PRODUCTION_READY = 'NO';
export const EC_PORT_KIND = 'eos-domain-event-compatibility-port';

export class DomainEventCompatibilityPort {
  /**
   * @param {object} [opts]
   * @param {DomainEventCompatibilityPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new DomainEventCompatibilityPolicyGate();
    this.trail = [];
    this.productionReady = EC_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the domain-event compatibility ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildDomainEventCompatibilityReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-34-mission-ec',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        evolution: input.evolution || null,
        compatibilityDigest: sha256Canonical(
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
      const holdReceipt = buildDomainEventCompatibilityReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        evolution: input.evolution || null,
        compatibilityDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EC_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      evolution: input.evolution,
      timestamp: new Date().toISOString()
    };
    const compatibilityDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildDomainEventCompatibilityReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      evolution: input.evolution,
      compatibilityDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      compatibilityHold: {
        hermeticInMemoryOnly: true,
        networkWriteRefused: true,
        schemaJsonAddRefused: true,
        tipRewriteRefused: true,
        breakingWithoutDenyRefused: true,
        governedSealOnly: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EC_CODES.OK,
      reason:
        'Hermetic compatible evolution receipt sealed (≠ schema JSON ≠ network write ≠ tip-refresh).',
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
      const validRes = verifyDomainEventCompatibilityReceipt(receipt);
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

void EC_PRODUCTION_READY;
