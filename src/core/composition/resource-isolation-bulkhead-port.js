/**
 * @module resource-isolation-bulkhead-port
 * SPEC-0148 / Mission EL — Resource Isolation / Bulkhead Boundary Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Mission EJ seals admission/work-intake quotas (maxConcurrent/maxQueueDepth).
 * Mission EK seals backpressure/load-shed (pressureThreshold/observedPressure).
 * Mission DX seals circuit-breaker trip/fallback (failureThreshold/cooldown).
 * None provides bulkhead / isolation boundaries so failure or overload in one
 * pool cannot cascade into another. This port seals hermetic bulkhead receipts:
 *   - Validates bulkhead (bulkheadId + poolId; optional capacity;
 *     optional observedOccupancy / crossBulkheadTouch injected hermetically)
 *   - Emits cryptographically verifiable EL-RCPT-* receipts with bulkheadDigest
 *   - Maintains verifiable audit trail of PASS / ISOLATE / DENY / HOLD seals
 *   - Fail-closed ISOLATE when hermetic cross-bulkhead breach or occupancy exceed
 *   - PASS seals hermetic isolation receipt only — NOT live threads,
 *     NOT real process isolation, NOT wall-clock authority, NOT EJ quota,
 *     NOT EK shed, NOT DX trip
 *   - Explicitly refuses tip-refresh, PRODUCTION_READY flip, L30–L35 reopen,
 *     L36 auto-close, schema-json add
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 72697dd5 (do NOT rewrite tip pins)
 *   Seals chained EL-RCPT-* receipts with verifiable bulkheadDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L35; refuse L36 auto-close (EM–EN pending)
 *
 * PASS = sealed bulkhead/isolation receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live threads ≠ real process isolation ≠ EJ quota ≠ EK shed ≠ DX trip
 * ISOLATE = fail-closed isolation when cross-bulkhead breach or occupancy exceed
 */

import {
  EL_PRODUCTION_READY,
  sha256Canonical,
  buildResourceIsolationBulkheadReceipt,
  verifyResourceIsolationBulkheadReceipt
} from './resource-isolation-bulkhead-receipt.js';

import {
  ResourceIsolationBulkheadPolicyGate,
  EL_CODES
} from './resource-isolation-bulkhead-policy-gate.js';

/** @type {'NO'} */
export const EL_PORT_PRODUCTION_READY = 'NO';
export const EL_PORT_KIND = 'eos-resource-isolation-bulkhead-port';

export class ResourceIsolationBulkheadPort {
  /**
   * @param {object} [opts]
   * @param {ResourceIsolationBulkheadPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ResourceIsolationBulkheadPolicyGate();
    this.trail = [];
    this.productionReady = EL_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the resource-isolation / bulkhead ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const isIsolate =
        gateRes.decision === 'ISOLATE' ||
        gateRes.code === EL_CODES.CROSS_BULKHEAD_BREACH ||
        gateRes.code === EL_CODES.OCCUPANCY_EXCEEDED ||
        gateRes.code === EL_CODES.ISOLATION_BREACH;
      const decision = isIsolate ? 'ISOLATE' : 'DENY';
      const deniedReceipt = buildResourceIsolationBulkheadReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-36-mission-el',
        decision,
        ritualMode: input.ritualMode || 'ACTIVE',
        bulkhead: input.bulkhead
          ? {
              ...input.bulkhead,
              isolated: isIsolate,
              passed: false,
              status: isIsolate ? 'ISOLATED' : 'GATE_DENIED'
            }
          : null,
        bulkheadDigest: sha256Canonical(
          JSON.stringify({
            planId: input.planId,
            denied: !isIsolate,
            isolated: isIsolate,
            code: gateRes.code
          })
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
      const holdReceipt = buildResourceIsolationBulkheadReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        bulkhead: input.bulkhead
          ? { ...input.bulkhead, isolated: false, passed: false, status: 'HELD' }
          : null,
        bulkheadDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: EL_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    const sealedBulkhead = {
      ...input.bulkhead,
      isolated: false,
      passed: true,
      status: 'PASSED',
      failClosed: true,
      hermeticInjectedOccupancy: true,
      distinctFromEjAdmissionQuota: true,
      distinctFromEkLoadShed: true,
      distinctFromDxCircuitBreaker: true
    };

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      bulkhead: sealedBulkhead,
      timestamp: new Date().toISOString()
    };
    const bulkheadDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildResourceIsolationBulkheadReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      bulkhead: sealedBulkhead,
      bulkheadDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
      bulkheadHold: {
        hermeticInMemoryOnly: true,
        failClosed: true,
        liveThreadRefused: true,
        realProcessIsolationRefused: true,
        wallClockAuthorityRefused: true,
        tipRewriteRefused: true,
        schemaJsonAddRefused: true,
        governedSealOnly: true,
        distinctFromEjAdmissionQuota: true,
        distinctFromEkLoadShed: true,
        distinctFromDxCircuitBreaker: true
      }
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: EL_CODES.OK,
      reason:
        'Hermetic resource-isolation/bulkhead receipt sealed (≠ EJ quota ≠ EK shed ≠ DX trip ≠ live threads ≠ tip-refresh ≠ PRODUCTION_READY).',
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
      const validRes = verifyResourceIsolationBulkheadReceipt(receipt);
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

void EL_PRODUCTION_READY;
