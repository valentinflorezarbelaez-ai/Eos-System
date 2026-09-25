/**
 * @module domain-event-publisher-port
 * SPEC-0131 / Mission DU — Sovereign Pure Domain Event Publisher Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Decouples aggregate state changes into immutable domain events:
 *   - Validates domainEvent (eventType + aggregateId + non-empty payload)
 *   - Emits cryptographically verifiable DU-RCPT-* receipts with eventDigest
 *   - Maintains verifiable audit trail of sealed domain-event publishes
 *   - Explicitly refuses outbox dispatch (DV later)
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin b205ce8c (do NOT rewrite tip pins)
 *   Seals chained DU-RCPT-* receipts with verifiable eventDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L32; refuse L33 auto-close
 *
 * PASS = sealed domain event publish receipt ≠ outbox dispatch (DV later) ≠ PRODUCTION_READY
 */

import {
  DU_PRODUCTION_READY,
  sha256Canonical,
  buildDomainEventPublisherReceipt,
  verifyDomainEventPublisherReceipt
} from './domain-event-publisher-receipt.js';

import {
  DomainEventPublisherPolicyGate,
  DU_CODES
} from './domain-event-publisher-policy-gate.js';

/** @type {'NO'} */
export const DU_PORT_PRODUCTION_READY = 'NO';
export const DU_PORT_KIND = 'eos-domain-event-publisher-port';

export class DomainEventPublisherPort {
  /**
   * @param {object} [opts]
   * @param {DomainEventPublisherPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new DomainEventPublisherPolicyGate();
    this.trail = [];
    this.productionReady = DU_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the domain event publish ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildDomainEventPublisherReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-33-mission-du',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        domainEvent: input.domainEvent || null,
        eventDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildDomainEventPublisherReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        domainEvent: input.domainEvent || null,
        eventDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DU_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      domainEvent: input.domainEvent,
      timestamp: new Date().toISOString()
    };
    const eventDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildDomainEventPublisherReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      domainEvent: input.domainEvent,
      eventDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DU_CODES.OK,
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
      const validRes = verifyDomainEventPublisherReceipt(receipt);
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

void DU_PRODUCTION_READY;
