/**
 * @module transactional-outbox-port
 * SPEC-0132 / Mission DV — Transactional Resilient Outbox Pattern Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Reliable persistence and guaranteed at-least-once outbox dispatch:
 *   - Composes DU domain events into outbox records
 *   - Soft-imports DU publisher observe when present (optional)
 *   - Seals cryptographically verifiable DV-RCPT-* receipts with outboxDigest
 *   - Maintains verifiable audit trail of persist + dispatch seals
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin cd1512a9 (do NOT rewrite tip pins)
 *   Seals chained DV-RCPT-* receipts with verifiable outboxDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L32; refuse L33 auto-close
 *
 * PASS = outbox persist/dispatch sealed ≠ PRODUCTION_READY ≠ tip rewrite
 */

import {
  DV_PRODUCTION_READY,
  sha256Canonical,
  buildTransactionalOutboxReceipt,
  verifyTransactionalOutboxReceipt
} from './transactional-outbox-receipt.js';

import {
  TransactionalOutboxPolicyGate,
  DV_CODES
} from './transactional-outbox-policy-gate.js';

/** @type {'NO'} */
export const DV_PORT_PRODUCTION_READY = 'NO';
export const DV_PORT_KIND = 'eos-transactional-outbox-port';

/**
 * Soft-import DU publisher observe when present (optional compose).
 * Never throws; never rewrites tip pins.
 * @returns {{ observed: boolean, pinShort?: string, kind?: string }}
 */
export async function softObserveDuPublisher() {
  try {
    const mod = await import('./domain-event-publisher-receipt.js');
    return {
      observed: true,
      pinShort: mod.DU_FREEZE_PIN_SHORT || null,
      kind: mod.DU_RECEIPT_KIND || null
    };
  } catch {
    return { observed: false };
  }
}

export class TransactionalOutboxPort {
  /**
   * @param {object} [opts]
   * @param {TransactionalOutboxPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new TransactionalOutboxPolicyGate();
    this.trail = [];
    this.store = new Map();
    this.productionReady = DV_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the transactional outbox ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const duObserve = await softObserveDuPublisher();

    if (!gateRes.ok) {
      const deniedReceipt = buildTransactionalOutboxReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-33-mission-dv',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        operation: input.operation || 'OUTBOX_PERSIST_DISPATCH',
        outboxRecord: input.outboxRecord || null,
        domainEvent: input.domainEvent || null,
        outboxDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
        duComposeObserve: { publisherObserved: duObserve.observed },
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
      const holdReceipt = buildTransactionalOutboxReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        operation: 'OUTBOX_PERSIST',
        outboxRecord: input.outboxRecord || null,
        domainEvent: input.domainEvent || null,
        outboxDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        duComposeObserve: { publisherObserved: duObserve.observed },
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DV_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const outboxId = input.outboxRecord.outboxId;
    const payloadDigest =
      input.outboxRecord.payloadDigest ||
      sha256Canonical(JSON.stringify(input.domainEvent));

    // Persist (idempotent by outboxId — at-least-once ready)
    const persisted = {
      outboxId,
      payloadDigest,
      domainEvent: input.domainEvent,
      status: 'PERSISTED',
      attempts: (this.store.get(outboxId)?.attempts || 0) + 1,
      persistedAt: new Date().toISOString()
    };
    this.store.set(outboxId, persisted);

    // At-least-once dispatch seal (hermetic — no network; dispatch status sealed)
    const dispatched = {
      ...persisted,
      status: 'DISPATCHED',
      dispatchedAt: new Date().toISOString(),
      atLeastOnce: true
    };
    this.store.set(outboxId, dispatched);

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      outboxRecord: dispatched,
      domainEvent: input.domainEvent,
      timestamp: new Date().toISOString()
    };
    const outboxDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildTransactionalOutboxReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'OUTBOX_PERSIST_DISPATCH',
      outboxRecord: dispatched,
      domainEvent: input.domainEvent,
      outboxDigest,
      duComposeObserve: { publisherObserved: duObserve.observed },
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DV_CODES.OK,
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
      const validRes = verifyTransactionalOutboxReceipt(receipt);
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

void DV_PRODUCTION_READY;
