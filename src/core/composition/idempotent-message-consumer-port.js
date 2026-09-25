/**
 * @module idempotent-message-consumer-port
 * SPEC-0133 / Mission DW — Autonomous Idempotent Message Consumer Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Idempotent message consumption, deduplication, and replay protection:
 *   - Consumes messages keyed by (consumerId, messageId) / idempotencyKey
 *   - Soft-imports DV outbox observe when present (optional compose)
 *   - Optionally soft-observes DU publisher
 *   - Seals cryptographically verifiable DW-RCPT-* receipts with consumeDigest
 *   - Maintains verifiable audit trail of consume + dedupe + replay-protect seals
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin b485ae0b (do NOT rewrite tip pins)
 *   Seals chained DW-RCPT-* receipts with verifiable consumeDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L32; refuse L33 auto-close
 *
 * PASS = idempotent consume/dedupe/replay seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close
 */

import {
  DW_PRODUCTION_READY,
  sha256Canonical,
  buildIdempotentMessageConsumerReceipt,
  verifyIdempotentMessageConsumerReceipt
} from './idempotent-message-consumer-receipt.js';

import {
  IdempotentMessageConsumerPolicyGate,
  DW_CODES
} from './idempotent-message-consumer-policy-gate.js';

/** @type {'NO'} */
export const DW_PORT_PRODUCTION_READY = 'NO';
export const DW_PORT_KIND = 'eos-idempotent-message-consumer-port';

/**
 * Soft-import DV outbox observe when present (optional compose).
 * Never throws; never rewrites tip pins.
 * Soft-fail safe when absent (hermetic) AND when present (host).
 * @returns {{ observed: boolean, pinShort?: string|null, kind?: string|null }}
 */
export async function softObserveDvOutbox() {
  try {
    const mod = await import('./transactional-outbox-receipt.js');
    return {
      observed: true,
      pinShort: mod.DV_FREEZE_PIN_SHORT || null,
      kind: mod.DV_RECEIPT_KIND || null
    };
  } catch {
    return { observed: false };
  }
}

/**
 * Soft-import DU publisher observe when present (optional compose).
 * Never throws; never rewrites tip pins.
 * @returns {{ observed: boolean, pinShort?: string|null, kind?: string|null }}
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

function makeIdempotencyKey(consumerId, messageId) {
  return `${consumerId}::${messageId}`;
}

export class IdempotentMessageConsumerPort {
  /**
   * @param {object} [opts]
   * @param {IdempotentMessageConsumerPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new IdempotentMessageConsumerPolicyGate();
    this.trail = [];
    /** @type {Map<string, object>} idempotencyKey → consumed record */
    this.store = new Map();
    this.productionReady = DW_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the idempotent message consumer ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const dvObserve = await softObserveDvOutbox();
    const duObserve = await softObserveDuPublisher();

    const composeOpts = {
      dvComposeObserve: { outboxObserved: dvObserve.observed },
      duComposeObserve: { publisherObserved: duObserve.observed }
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildIdempotentMessageConsumerReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-33-mission-dw',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        operation: input.operation || 'MESSAGE_CONSUME_DEDUPE_REPLAY',
        messageRecord: input.message || null,
        domainEvent: input.domainEvent || null,
        outboxRecord: input.outboxRecord || null,
        consumeDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
        ...composeOpts,
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
      const holdReceipt = buildIdempotentMessageConsumerReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        operation: 'MESSAGE_CONSUME',
        messageRecord: input.message || null,
        domainEvent: input.domainEvent || null,
        outboxRecord: input.outboxRecord || null,
        consumeDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        ...composeOpts,
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DW_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const messageId = input.message.messageId;
    const consumerId = input.consumerId;
    const idempotencyKey =
      input.idempotencyKey || makeIdempotencyKey(consumerId, messageId);
    const payloadDigest =
      input.message.payloadDigest || sha256Canonical(JSON.stringify(input.message.payload));

    const existing = this.store.get(idempotencyKey);

    // Replay protection: same key, different digest → DENY
    if (existing && existing.payloadDigest !== payloadDigest) {
      const replayDenied = buildIdempotentMessageConsumerReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'DENY',
        ritualMode: 'ACTIVE',
        operation: 'MESSAGE_REPLAY_PROTECT',
        messageRecord: {
          messageId,
          consumerId,
          idempotencyKey,
          payloadDigest,
          status: 'REPLAY_REJECTED',
          priorDigest: existing.payloadDigest
        },
        domainEvent: input.domainEvent || null,
        outboxRecord: input.outboxRecord || null,
        consumeDigest: sha256Canonical(
          JSON.stringify({ planId: input.planId, replayRejected: true, idempotencyKey })
        ),
        ...composeOpts,
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(replayDenied);
      return {
        ok: false,
        decision: 'DENY',
        code: DW_CODES.REPLAY_REJECTED,
        reason: 'Replay rejected: idempotencyKey already consumed with a different payloadDigest.',
        receipt: replayDenied
      };
    }

    // Idempotent consume: same key + same digest → dedupe PASS (no double-apply side effect)
    const isDedupe = Boolean(existing && existing.payloadDigest === payloadDigest);
    const consumed = {
      messageId,
      consumerId,
      idempotencyKey,
      payloadDigest,
      domainEvent: input.domainEvent || null,
      outboxRecord: input.outboxRecord || null,
      status: isDedupe ? 'DEDUPLICATED' : 'CONSUMED',
      attempts: (existing?.attempts || 0) + 1,
      replayProtected: true,
      dedupeSealed: true,
      consumeSealed: true,
      consumedAt: existing?.consumedAt || new Date().toISOString(),
      lastSeenAt: new Date().toISOString()
    };
    this.store.set(idempotencyKey, consumed);

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      messageRecord: consumed,
      domainEvent: input.domainEvent || null,
      outboxRecord: input.outboxRecord || null,
      timestamp: new Date().toISOString()
    };
    const consumeDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildIdempotentMessageConsumerReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: isDedupe ? 'MESSAGE_DEDUPE' : 'MESSAGE_CONSUME_DEDUPE_REPLAY',
      messageRecord: consumed,
      domainEvent: input.domainEvent || null,
      outboxRecord: input.outboxRecord || null,
      consumeDigest,
      ...composeOpts,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DW_CODES.OK,
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
      const validRes = verifyIdempotentMessageConsumerReceipt(receipt);
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

void DW_PRODUCTION_READY;
