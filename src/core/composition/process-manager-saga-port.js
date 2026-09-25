/**
 * @module process-manager-saga-port
 * SPEC-0136 / Mission DZ — Sovereign Process Manager / Saga Orchestration Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Coordinates multi-step processes across aggregates without dual-write chaos:
 *   - Validates processInstance (processId + processType + step + triggerEvent)
 *   - Emits cryptographically verifiable DZ-RCPT-* receipts with processDigest
 *   - Maintains verifiable audit trail of sealed process/saga steps
 *   - Fail-closed COMPENSATE / DENY path is hermetic in-memory only
 *   - Explicitly refuses dual-write, outbox mutation, network write, tip-refresh
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin b382d29b (do NOT rewrite tip pins)
 *   Seals chained DZ-RCPT-* receipts with verifiable processDigest
 *   schemas AT_CEILING 35/35
 *   NEVER reopen L30–L33; refuse L34 auto-close
 *
 * PASS = sealed process/saga step receipt ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 */

import {
  DZ_PRODUCTION_READY,
  sha256Canonical,
  buildProcessManagerSagaReceipt,
  verifyProcessManagerSagaReceipt
} from './process-manager-saga-receipt.js';

import {
  ProcessManagerSagaPolicyGate,
  DZ_CODES
} from './process-manager-saga-policy-gate.js';

/** @type {'NO'} */
export const DZ_PORT_PRODUCTION_READY = 'NO';
export const DZ_PORT_KIND = 'eos-process-manager-saga-port';

export class ProcessManagerSagaPort {
  /**
   * @param {object} [opts]
   * @param {ProcessManagerSagaPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new ProcessManagerSagaPolicyGate();
    this.trail = [];
    this.productionReady = DZ_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the process manager / saga ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildProcessManagerSagaReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-34-mission-dz',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        processInstance: input.processInstance || null,
        processDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildProcessManagerSagaReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        processInstance: input.processInstance || null,
        processDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DZ_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    if (gateRes.decision === 'COMPENSATE') {
      const compensateReceipt = buildProcessManagerSagaReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'COMPENSATE',
        ritualMode: 'ACTIVE',
        processInstance: input.processInstance,
        processDigest: sha256Canonical(
          JSON.stringify({
            planId: input.planId,
            mode: 'COMPENSATE',
            processInstance: input.processInstance,
            hermetic: true
          })
        ),
        prevReceiptHash:
          this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64),
        sagaHold: {
          hermeticInMemoryOnly: true,
          compensateFailClosed: true,
          dualWriteDeferred: true,
          networkWriteRefused: true
        }
      });
      this.trail.push(compensateReceipt);
      return {
        ok: true,
        decision: 'COMPENSATE',
        code: DZ_CODES.COMPENSATE,
        reason: gateRes.reason,
        receipt: compensateReceipt
      };
    }

    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      processInstance: input.processInstance,
      timestamp: new Date().toISOString()
    };
    const processDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildProcessManagerSagaReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      processInstance: input.processInstance,
      processDigest,
      prevReceiptHash:
        this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DZ_CODES.OK,
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
      const validRes = verifyProcessManagerSagaReceipt(receipt);
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

void DZ_PRODUCTION_READY;
