/**
 * @module operator-reality-console-port
 * SPEC-0088 / Mission CE — Sovereign Operator Reality Console Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic console port:
 *   - Validates epistemic console snapshot plan via policy gate
 *   - Decision: VIEW | DENY
 *   - Aggregates MEASURED / UNKNOWN / BLOCKED counts
 *   - Seals CE-RCPT-* receipts for operator reality surfaces
 *
 * NON-CLAIM:
 *   Operator reality console ≠ full SIEM/APM /
 *   ≠ production ops center /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L23 CLOSED never reopen;
 *   L24 OPEN (Audit + CB+CC+CD MEASURED · CE in progress · CF pending);
 *   Axis: Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/observability.
 *
 * Does NOT call network/SIEM/APM; does NOT touch Fundacion trees.
 *
 * PRODUCTION_READY: NO
 */

import {
  CE_PRODUCTION_READY,
  CE_RECEIPT_KIND,
  sha256Canonical,
  aggregateStatusCounts,
  buildOperatorRealityConsoleReceipt,
  verifyOperatorRealityConsoleReceipt
} from './operator-reality-console-receipt.js';

import {
  OperatorRealityConsolePolicyGate,
  CE_CODES
} from './operator-reality-console-policy-gate.js';

/** @type {'NO'} */
export const CE_PORT_PRODUCTION_READY = 'NO';

export const CE_PORT_KIND = 'eos-operator-reality-console-port';

/**
 * Operator Reality Console Port — aggregates ladder epistemic statuses.
 */
export class OperatorRealityConsolePort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxEntries]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new OperatorRealityConsolePolicyGate({
      maxEntries: options.maxEntries,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.snapshots = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._snapSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildOperatorRealityConsoleReceipt(
      {
        ...fields,
        prevReceiptHash: this._lastReceiptHash
      },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * Snapshot an epistemic console plan → decision + sealed CE receipt.
   * Hermetic: does not call network/SIEM/APM; does not touch Fundacion.
   *
   * @param {object} plan
   * @returns {{ ok: boolean, code: string, decision?: string, consoleId?: string, entries?: object[], summary?: object, reasons?: string[], rootDigest?: string, receipt: object, reason?: string }}
   */
  snapshot(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      /** @type {object[]} */
      const deniedEntries = [];
      const raw = plan?.entries ?? plan?.console ?? null;
      if (Array.isArray(raw)) {
        for (const entry of raw) {
          if (entry != null && typeof entry === 'object' && !Array.isArray(entry)) {
            deniedEntries.push({
              ladder: entry.ladder != null ? String(entry.ladder) : '',
              satellite:
                entry.satellite != null ? String(entry.satellite) : null,
              status: entry.status != null ? String(entry.status) : '',
              evidenceRef:
                entry.evidenceRef != null ? String(entry.evidenceRef) : null
            });
          }
        }
      }

      const summary = aggregateStatusCounts(deniedEntries);
      const reasons = [evaluation.reason];
      const receipt = this._sealReceipt({
        operation: 'SNAPSHOT',
        consoleId: plan?.consoleId != null ? String(plan.consoleId) : null,
        decision: 'DENY',
        snapshotAt:
          plan?.snapshotAt != null
            ? String(plan.snapshotAt)
            : new Date().toISOString(),
        entries: [],
        summary: { measured: 0, unknown: 0, blocked: 0, total: 0 },
        reasons,
        entryCount: 0,
        meta: { code: evaluation.code, reason: evaluation.reason, reasons }
      });
      return {
        ok: false,
        code: evaluation.code,
        decision: 'DENY',
        consoleId:
          plan?.consoleId != null ? String(plan.consoleId) : undefined,
        entries: [],
        summary: receipt.summary,
        reason: evaluation.reason,
        reasons,
        receipt
      };
    }

    this._snapSeq += 1;
    const { consoleId, entries, snapshotAt } = evaluation;
    const summary = aggregateStatusCounts(entries);

    const rootDigest = this.hashFn({
      consoleId,
      snapshotAt,
      entries,
      summary,
      decision: 'VIEW'
    });

    const reasons = [
      `operator reality console VIEW: measured=${summary.measured} unknown=${summary.unknown} blocked=${summary.blocked}`
    ];

    const record = Object.freeze({
      consoleId,
      snapshotAt,
      entries: Object.freeze(entries.map((e) => Object.freeze({ ...e }))),
      summary: Object.freeze({ ...summary }),
      decision: 'VIEW',
      reasons: Object.freeze([...reasons]),
      rootDigest,
      snappedAt: new Date().toISOString()
    });

    this.snapshots.set(consoleId, record);

    const receipt = this._sealReceipt({
      operation: 'SNAPSHOT',
      consoleId,
      decision: 'VIEW',
      snapshotAt,
      entries,
      summary,
      reasons,
      entryCount: entries.length,
      meta: {
        code: CE_CODES.SNAPSHOT_VIEW,
        reasons,
        rootDigest
      }
    });

    return {
      ok: true,
      code: CE_CODES.SNAPSHOT_VIEW,
      decision: 'VIEW',
      consoleId,
      entries,
      summary,
      reasons,
      rootDigest,
      receipt
    };
  }

  /**
   * Retrieve a stored snapshot by console id.
   * @param {string} consoleId
   * @returns {object|null}
   */
  getSnapshot(consoleId) {
    const record = this.snapshots.get(consoleId);
    return record ? record : null;
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifyTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifyOperatorRealityConsoleReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CE_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CE_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      prevHash = receipt.receiptHash;
    }

    return {
      valid: true,
      code: CE_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CE_PORT_PRODUCTION_READY,
  CE_PORT_KIND,
  CE_PRODUCTION_READY,
  CE_RECEIPT_KIND,
  CE_CODES,
  OperatorRealityConsolePort
};
