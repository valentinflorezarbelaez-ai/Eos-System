/**
 * @module circuit-breaker-port
 * SPEC-0134 / Mission DX — Sovereign Circuit Breaker & Resilient Fallback Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Fault-tolerant boundary protection and fail-closed state machines:
 *   - CLOSED → failures accumulate; trip to OPEN at failureThreshold
 *   - OPEN → reject primary; apply resilient fallback; after cooldown → HALF_OPEN
 *   - HALF_OPEN → allow probe; success → CLOSED; failure → OPEN
 *   - Soft-imports DW consumer observe when present (optional compose)
 *   - Optionally soft-observes DV outbox / DU publisher
 *   - Seals cryptographically verifiable DX-RCPT-* receipts with breakerDigest
 *   - Maintains verifiable audit trail of govern + trip + fallback + reset seals
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin d667c6b5 (do NOT rewrite tip pins)
 *   Seals chained DX-RCPT-* receipts with verifiable breakerDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L32; refuse L33 auto-close
 *
 * PASS = circuit breaker + resilient fallback seal ≠ PRODUCTION_READY ≠ tip rewrite ≠ L33 auto-close
 */

import {
  DX_PRODUCTION_READY,
  sha256Canonical,
  buildCircuitBreakerReceipt,
  verifyCircuitBreakerReceipt
} from './circuit-breaker-receipt.js';

import {
  CircuitBreakerPolicyGate,
  DX_CODES
} from './circuit-breaker-policy-gate.js';

/** @type {'NO'} */
export const DX_PORT_PRODUCTION_READY = 'NO';
export const DX_PORT_KIND = 'eos-circuit-breaker-port';

export const DEFAULT_FAILURE_THRESHOLD = 3;
export const DEFAULT_COOLDOWN_MS = 30_000;

/**
 * Soft-import DW consumer observe when present (optional compose).
 * Never throws; never rewrites tip pins.
 * Soft-fail safe when absent (hermetic) AND when present (host).
 * @returns {{ observed: boolean, pinShort?: string|null, kind?: string|null }}
 */
export async function softObserveDwConsumer() {
  try {
    const mod = await import('./idempotent-message-consumer-receipt.js');
    return {
      observed: true,
      pinShort: mod.DW_FREEZE_PIN_SHORT || null,
      kind: mod.DW_RECEIPT_KIND || null
    };
  } catch {
    return { observed: false };
  }
}

/**
 * Soft-import DV outbox observe when present (optional compose).
 * Never throws; never rewrites tip pins.
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

function nowMs(input) {
  if (typeof input.nowMs === 'number' && Number.isFinite(input.nowMs)) return input.nowMs;
  return Date.now();
}

export class CircuitBreakerPort {
  /**
   * @param {object} [opts]
   * @param {CircuitBreakerPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new CircuitBreakerPolicyGate();
    this.trail = [];
    /** @type {Map<string, object>} breakerId → breaker state record */
    this.breakers = new Map();
    this.productionReady = DX_PORT_PRODUCTION_READY;
  }

  /**
   * @param {string} breakerId
   * @param {object} input
   */
  ensureBreaker(breakerId, input = {}) {
    let rec = this.breakers.get(breakerId);
    if (!rec) {
      rec = {
        breakerId,
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        failureThreshold: input.failureThreshold || DEFAULT_FAILURE_THRESHOLD,
        cooldownMs: input.cooldownMs !== undefined ? input.cooldownMs : DEFAULT_COOLDOWN_MS,
        openedAt: null,
        lastTransitionAt: null,
        lastOutcome: null,
        failClosed: true,
        fallbackSealed: true,
        stateMachineSealed: true
      };
      this.breakers.set(breakerId, rec);
    }
    if (input.failureThreshold !== undefined && input.failureThreshold !== null) {
      rec.failureThreshold = input.failureThreshold;
    }
    if (input.cooldownMs !== undefined && input.cooldownMs !== null) {
      rec.cooldownMs = input.cooldownMs;
    }
    return rec;
  }

  /**
   * Advance OPEN → HALF_OPEN when cooldown elapsed.
   * @param {object} rec
   * @param {number} t
   */
  maybeAdvanceOpen(rec, t) {
    if (rec.state === 'OPEN' && rec.openedAt != null && t - rec.openedAt >= rec.cooldownMs) {
      rec.state = 'HALF_OPEN';
      rec.lastTransitionAt = t;
      rec.lastOutcome = 'COOLDOWN_ELAPSED_HALF_OPEN';
    }
  }

  /**
   * Governs the circuit breaker ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const dwObserve = await softObserveDwConsumer();
    const dvObserve = await softObserveDvOutbox();
    const duObserve = await softObserveDuPublisher();

    const composeOpts = {
      dwComposeObserve: { consumerObserved: dwObserve.observed },
      dvComposeObserve: { outboxObserved: dvObserve.observed },
      duComposeObserve: { publisherObserved: duObserve.observed }
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildCircuitBreakerReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-33-mission-dx',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        operation: input.operation || 'BREAKER_GOVERN',
        breakerRecord: input.breakerId
          ? { breakerId: input.breakerId, state: 'DENIED', status: 'GATE_DENIED' }
          : null,
        fallbackRecord: input.fallback || null,
        messageRecord: input.messageRecord || null,
        domainEvent: input.domainEvent || null,
        outboxRecord: input.outboxRecord || null,
        breakerDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildCircuitBreakerReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        operation: 'BREAKER_GOVERN',
        breakerRecord: input.breakerId
          ? { breakerId: input.breakerId, state: 'HOLD', status: 'HELD' }
          : null,
        fallbackRecord: input.fallback || null,
        messageRecord: input.messageRecord || null,
        domainEvent: input.domainEvent || null,
        outboxRecord: input.outboxRecord || null,
        breakerDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        ...composeOpts,
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DX_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const t = nowMs(input);
    const rec = this.ensureBreaker(input.breakerId, input);
    this.maybeAdvanceOpen(rec, t);

    const outcome = input.outcome; // 'SUCCESS' | 'FAILURE' | undefined
    const forceFallback = input.forceFallback === true;
    let operation = 'BREAKER_ALLOW';
    let decision = 'PASS';
    let code = DX_CODES.OK;
    let reason = 'Circuit breaker allowed primary path (CLOSED).';
    let fallbackRecord = null;
    let ok = true;

    // Explicit reset request (only from OPEN/HALF_OPEN with human intent via outcome SUCCESS probe or reset flag)
    if (input.reset === true && (rec.state === 'OPEN' || rec.state === 'HALF_OPEN')) {
      rec.state = 'CLOSED';
      rec.failureCount = 0;
      rec.successCount = (rec.successCount || 0) + 1;
      rec.openedAt = null;
      rec.lastTransitionAt = t;
      rec.lastOutcome = 'RESET';
      operation = 'BREAKER_RESET';
      reason = 'Circuit breaker reset to CLOSED.';
    } else if (rec.state === 'OPEN') {
      // Fail-closed: primary denied; resilient fallback sealed
      operation = 'BREAKER_FALLBACK';
      decision = 'PASS';
      code = DX_CODES.FALLBACK_APPLIED;
      reason = 'Breaker OPEN — primary denied; resilient fallback applied (fail-closed).';
      fallbackRecord = {
        breakerId: rec.breakerId,
        applied: true,
        strategy: (input.fallback && input.fallback.strategy) || 'RESILIENT_DEFAULT',
        protectedOperation: input.protectedOperation,
        sealedAt: new Date().toISOString(),
        ...(input.fallback || {})
      };
      rec.lastOutcome = 'FALLBACK';
    } else if (rec.state === 'HALF_OPEN') {
      if (outcome === 'FAILURE' || forceFallback) {
        rec.state = 'OPEN';
        rec.openedAt = t;
        rec.lastTransitionAt = t;
        rec.failureCount += 1;
        rec.lastOutcome = 'PROBE_FAILED';
        operation = 'BREAKER_TRIP';
        code = DX_CODES.BREAKER_TRIPPED;
        reason = 'HALF_OPEN probe failed — re-tripped to OPEN; fallback sealed.';
        fallbackRecord = {
          breakerId: rec.breakerId,
          applied: true,
          strategy: (input.fallback && input.fallback.strategy) || 'RESILIENT_DEFAULT',
          protectedOperation: input.protectedOperation,
          sealedAt: new Date().toISOString(),
          ...(input.fallback || {})
        };
      } else if (outcome === 'SUCCESS' || outcome === undefined) {
        // Successful probe (or allow without explicit failure) → CLOSED
        rec.state = 'CLOSED';
        rec.failureCount = 0;
        rec.successCount = (rec.successCount || 0) + 1;
        rec.openedAt = null;
        rec.lastTransitionAt = t;
        rec.lastOutcome = 'PROBE_SUCCESS';
        operation = 'BREAKER_HALF_OPEN_PROBE';
        reason = 'HALF_OPEN probe succeeded — reset to CLOSED.';
      }
    } else {
      // CLOSED
      if (outcome === 'FAILURE') {
        rec.failureCount += 1;
        rec.lastOutcome = 'FAILURE';
        if (rec.failureCount >= rec.failureThreshold) {
          rec.state = 'OPEN';
          rec.openedAt = t;
          rec.lastTransitionAt = t;
          operation = 'BREAKER_TRIP';
          code = DX_CODES.BREAKER_TRIPPED;
          reason = `Failure threshold ${rec.failureThreshold} reached — tripped to OPEN; fallback sealed.`;
          fallbackRecord = {
            breakerId: rec.breakerId,
            applied: true,
            strategy: (input.fallback && input.fallback.strategy) || 'RESILIENT_DEFAULT',
            protectedOperation: input.protectedOperation,
            sealedAt: new Date().toISOString(),
            ...(input.fallback || {})
          };
        } else {
          operation = 'BREAKER_ALLOW';
          reason = `Failure recorded (${rec.failureCount}/${rec.failureThreshold}); breaker remains CLOSED.`;
        }
      } else {
        // SUCCESS or unspecified allow
        if (outcome === 'SUCCESS') {
          rec.failureCount = 0;
          rec.successCount = (rec.successCount || 0) + 1;
          rec.lastOutcome = 'SUCCESS';
        }
        operation = 'BREAKER_ALLOW';
        reason = 'Circuit breaker allowed primary path (CLOSED).';
      }
    }

    const breakerRecord = {
      breakerId: rec.breakerId,
      state: rec.state,
      failureCount: rec.failureCount,
      successCount: rec.successCount,
      failureThreshold: rec.failureThreshold,
      cooldownMs: rec.cooldownMs,
      openedAt: rec.openedAt,
      lastTransitionAt: rec.lastTransitionAt,
      lastOutcome: rec.lastOutcome,
      protectedOperation: input.protectedOperation,
      failClosed: true,
      fallbackSealed: Boolean(fallbackRecord) || rec.fallbackSealed,
      stateMachineSealed: true,
      status: rec.state === 'OPEN' ? 'OPEN_FAIL_CLOSED' : rec.state
    };

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      breakerRecord,
      fallbackRecord,
      timestamp: new Date().toISOString()
    };
    const breakerDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildCircuitBreakerReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision,
      ritualMode: 'ACTIVE',
      operation,
      breakerRecord,
      fallbackRecord,
      messageRecord: input.messageRecord || null,
      domainEvent: input.domainEvent || null,
      outboxRecord: input.outboxRecord || null,
      breakerDigest,
      ...composeOpts,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok,
      decision,
      code,
      reason,
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
      const validRes = verifyCircuitBreakerReceipt(receipt);
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

void DX_PRODUCTION_READY;
