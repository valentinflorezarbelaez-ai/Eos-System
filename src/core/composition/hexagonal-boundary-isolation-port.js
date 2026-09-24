/**
 * @module hexagonal-boundary-isolation-port
 * SPEC-0123 / Mission DM — Hexagonal Architecture Boundary Isolation Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Verifies that pure Domain / Core (Layer 0) modules maintain ZERO framework or
 * infrastructure dependencies (NODE_BUILTINS_ONLY) and adapter implementations
 * remain strictly behind abstract interfaces/ports.
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin f367a1cf
 *   Seals chained DM-RCPT-* receipts with verifiable boundaryDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DM_PRODUCTION_READY,
  sha256Canonical,
  buildHexagonalBoundaryIsolationReceipt,
  verifyHexagonalBoundaryIsolationReceipt
} from './hexagonal-boundary-isolation-receipt.js';

import {
  HexagonalBoundaryIsolationPolicyGate,
  DM_CODES
} from './hexagonal-boundary-isolation-policy-gate.js';

/** @type {'NO'} */
export const DM_PORT_PRODUCTION_READY = 'NO';
export const DM_PORT_KIND = 'eos-hexagonal-boundary-isolation-port';

export class HexagonalBoundaryIsolationPort {
  /**
   * @param {object} [opts]
   * @param {HexagonalBoundaryIsolationPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new HexagonalBoundaryIsolationPolicyGate();
    this.trail = [];
    this.productionReady = DM_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the hexagonal boundary isolation ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildHexagonalBoundaryIsolationReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-31-mission-dm',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        boundaryReport: input.boundaryReport || null,
        boundaryDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
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

    if (input.ritualMode === 'HOLD') {
      const holdReceipt = buildHexagonalBoundaryIsolationReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        boundaryReport: input.boundaryReport,
        boundaryDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DM_CODES.OK,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize boundary isolation verification
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      boundaryReport: input.boundaryReport,
      timestamp: new Date().toISOString()
    };
    const boundaryDigest = sha256Canonical(JSON.stringify(payload));

    const receipt = buildHexagonalBoundaryIsolationReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      boundaryReport: input.boundaryReport,
      boundaryDigest,
      boundaryHold: {
        layer0Pure: Number(input.boundaryReport.nonBuiltinImportsCount || 0) === 0,
        zeroBoundaryViolations: Number(input.boundaryReport.violationsCount || 0) === 0
      },
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(receipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DM_CODES.OK,
      receipt
    };
  }

  /**
   * Verifies the cryptographic integrity and hash chaining of the receipt trail
   * @returns {{ ok: boolean, count: number, code: string, reason?: string }}
   */
  verifyTrail() {
    if (this.trail.length === 0) {
      return { ok: true, count: 0, code: DM_CODES.TRAIL_OK };
    }

    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      const verifyRes = verifyHexagonalBoundaryIsolationReceipt(receipt);
      if (!verifyRes.ok) {
        return {
          ok: false,
          count: this.trail.length,
          code: DM_CODES.TRAIL_BREAK,
          reason: `Receipt at index ${i} verification failed: ${verifyRes.reason}`
        };
      }

      if (i > 0) {
        const prev = this.trail[i - 1];
        if (receipt.prevReceiptHash !== prev.receiptHash) {
          return {
            ok: false,
            count: this.trail.length,
            code: DM_CODES.TRAIL_BREAK,
            reason: `Chaining mismatch at index ${i}`
          };
        }
      }
    }

    return { ok: true, count: this.trail.length, code: DM_CODES.TRAIL_OK };
  }
}
