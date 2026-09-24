/**
 * @module data-contract-notary-port
 * SPEC-0129 / Mission DS — Contract-First Formal Data Contract Notary Port.
 * Pure Layer-0 Node.js (node:crypto). Never seal secrets.
 *
 * Enforces contract-first data contract validation and notarization:
 *   - Verifies payloads against strict schema contracts
 *   - Rejects schema drift, missing contract reports, uncontracted field injection
 *   - Emits cryptographically verifiable DS-RCPT-* receipts with contractDigest
 *   - Maintains verifiable audit trail of notarized data contracts
 *
 * Invariants:
 *   PRODUCTION_READY: NO
 *   Fundacion Δ=0 (FUNDACION_ALWAYS_DENY)
 *   Law VI: zero secret leakage; synthetic tokens in tests
 *   Freeze soft-observe: pin 2ff91794
 *   Seals chained DS-RCPT-* receipts with verifiable contractDigest
 *   schemas AT_CEILING 35/35
 */

import {
  DS_PRODUCTION_READY,
  sha256Canonical,
  buildDataContractNotaryReceipt,
  verifyDataContractNotaryReceipt
} from './data-contract-notary-receipt.js';

import {
  DataContractNotaryPolicyGate,
  DS_CODES
} from './data-contract-notary-policy-gate.js';

/** @type {'NO'} */
export const DS_PORT_PRODUCTION_READY = 'NO';
export const DS_PORT_KIND = 'eos-data-contract-notary-port';

export class DataContractNotaryPort {
  /**
   * @param {object} [opts]
   * @param {DataContractNotaryPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new DataContractNotaryPolicyGate();
    this.trail = [];
    this.productionReady = DS_PORT_PRODUCTION_READY;
  }

  /**
   * Governs the data contract notary ritual under policy gating
   * @param {object} input
   * @returns {Promise<{ ok: boolean, decision: string, code?: string, reason?: string, receipt: object }>}
   */
  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);

    if (!gateRes.ok) {
      const deniedReceipt = buildDataContractNotaryReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-32-mission-ds',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        contractReport: input.contractReport || null,
        contractDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
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
      const holdReceipt = buildDataContractNotaryReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        contractReport: input.contractReport,
        contractDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: DS_CODES.HOLD,
        receipt: holdReceipt
      };
    }

    // ACTIVE mode: synthesize data contract notary verification
    const payload = {
      planId: input.planId,
      changeId: input.changeId,
      contractReport: input.contractReport,
      timestamp: new Date().toISOString()
    };
    const contractDigest = sha256Canonical(JSON.stringify(payload));

    const passReceipt = buildDataContractNotaryReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      contractReport: input.contractReport,
      contractDigest,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: DS_CODES.OK,
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
      const validRes = verifyDataContractNotaryReceipt(receipt);
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
