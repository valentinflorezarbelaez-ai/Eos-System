/**
 * @module backpressure-load-shed-port
 * SPEC-0147 / Mission EK — Backpressure & Load-Shed Governance Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission EJ seals admission/work-intake quotas (maxConcurrent/maxQueueDepth).
 * Mission DX seals circuit-breaker trip/fallback (failureThreshold/cooldown).
 * Neither provides downstream load-shed / backpressure when admitted work still
 * overwhelms capacity. This port seals hermetic backpressure/load-shed receipts:
 *   - Validates load (loadId + resourceClass; optional pressureThreshold;
 *     optional observedPressure injected hermetically)
 *   - Emits cryptographically verifiable EK-RCPT-* receipts with loadDigest
 *   - Maintains verifiable audit trail of PASS / SHED / DENY / HOLD seals
 *   - Fail-closed SHED when hermetic observed pressure exceeds threshold
 *   - PASS seals hermetic backpressure receipt only — NOT live timers,
 *     NOT real network shedding, NOT wall-clock authority, NOT EJ quota, NOT DX trip
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L35 reopen,
 *     L36 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 5e5af281 (do NOT rewrite tip pins)
 *   Seals chained EK-RCPT-* receipts with verifiable loadDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L35; refuse L36 auto-close (EL–EN pending)
 *
 * PASS = sealed backpressure/load-shed receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live timers ≠ network shedding ≠ EJ quota ≠ DX circuit-breaker trip
 * SHED = fail-closed load-shed when pressure exceeds threshold
 */

import {
  EK_PRODUCTION_READY,
  sha256Canonical,
  buildBackpressureLoadShedReceipt,
  verifyBackpressureLoadShedReceipt
} from './backpressure-load-shed-receipt.js';

import {
  BackpressureLoadShedPolicyGate,
  EK_CODES
} from './backpressure-load-shed-policy-gate.js';

/** @type {'NO'} */
export const EK_PORT_PRODUCTION_READY = 'NO';
export const EK_PORT_KIND = 'eos-backpressure-load-shed-port';

export class BackpressureLoadShedPort {
  /**
   * @param {object} [opts]
   * @param {BackpressureLoadShedPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new BackpressureLoadShedPolicyGate();
    this.trail = [];
    this.productionReady = EK_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the backpressure / load-shed ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const isShed = gateRes.decision === 'SHED' || gateRes.code === EK_CODES.PRESSURE_EXCEEDED;
      const decision = isShed ? 'SHED' : 'DENY';
      const deniedReceipt = buildBackpressureLoadShedReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-36-mission-ek',
        decision,
        ritualMode: input.ritualMode || 'ACTIVE',
        load: input.load
          ? {
              ...input.load,
              shed: isShed,
              passed: false,
              status: isShed ? 'SHED' : 'GATE_DENIED'
            }
          : null,
        loadDigest: sha256Canonical(
          JSON.stringify({ planId: input.planId, denied: !isShed, shed: isShed, code: gateRes.code })
        ),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(deniedReceipt);
      return {
        ok: false,
        decision,
        code: gateRes.code,
        reason: gateRes.reason,
        receipt: deniedReceipt
      };
    }

    if (input.ritualMode === 'HOLD' || gateRes.decision === 'HOLD') {
      const holdReceipt = buildBackpressureLoadShedReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        load: input.load
          ? { ...input.load, shed: false, passed: false, status: 'HELD' }
          : null,
        loadDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EK_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedLoad = {
      ...input.load,
      shed: false,
      passed: true,
      status: 'PASSED',
      failClosed: true,
      hermeticInjectedPressure: true,
      distinctFromEjAdmissionQuota: true,
      distinctFromDxCircuitBreaker: true
    };

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      load: sealedLoad,
      timestamp: new Date().toISOString()
    };
    const loadDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildBackpressureLoadShedReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      load: sealedLoad,
      loadDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      loadShedHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveTimerRefused: true,
        networkSheddingRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        distinctFromEjAdmissionQuota: true,
        distinctFromDxCircuitBreaker: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EK_CODES.OK,
      reason:
        'Hermetic backpressure/load-shed receipt sealed (≠ EJ quota ≠ DX trip ≠ live timers ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyBackpressureLoadShedReceipt(receipt);
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

void EK_PRODUCTION_READY;
