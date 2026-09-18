/**
 * @module mission-archive-replay-port
 * SPEC-0091 / Mission CH — Long-Horizon Mission Archive & Replay Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Hermetic archive/replay port:
 *   - Validates archive/replay plans via policy gate
 *   - Decision: ARCHIVE | REPLAY | DENY
 *   - Seals CH-RCPT-* receipts for multi-mission trail archive & replay
 *   - Hermetic in-memory trail only — no disk lake / no SIEM
 *
 * NON-CLAIM:
 *   Long-horizon mission archive & replay ≠ production data lake /
 *   ≠ SIEM retention SaaS /
 *   ≠ Fundacion writes (Δ=0) /
 *   ≠ PRODUCTION_READY=YES.
 *   L17–L24 CLOSED never reopen;
 *   L25 OPEN (Audit + CG MEASURED · CH in progress · CI–CK pending);
 *   Axis: Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/archive.
 *
 * PRODUCTION_READY: NO
 */

import {
  CH_PRODUCTION_READY,
  CH_RECEIPT_KIND,
  sha256Canonical,
  buildMissionArchiveReplayReceipt,
  verifyMissionArchiveReplayReceipt
} from './mission-archive-replay-receipt.js';

import {
  MissionArchiveReplayPolicyGate,
  CH_CODES
} from './mission-archive-replay-policy-gate.js';

/** @type {'NO'} */
export const CH_PORT_PRODUCTION_READY = 'NO';

export const CH_PORT_KIND = 'eos-mission-archive-replay-port';

/**
 * Long-Horizon Mission Archive & Replay Port — hermetic in-memory trail.
 */
export class MissionArchiveReplayPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxEntries]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new MissionArchiveReplayPolicyGate({
      maxEntries: options.maxEntries,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.archives = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._archiveSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildMissionArchiveReplayReceipt(
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
   * Seal a DENY outcome for archive or replay.
   * @private
   */
  _deny(operation, plan, evaluation) {
    const reasons = [evaluation.reason];
    const receipt = this._sealReceipt({
      operation,
      archiveId: plan?.archiveId != null ? String(plan.archiveId) : null,
      decision: 'DENY',
      trailEntries: [],
      reasons,
      entryCount: 0,
      trailDigest: null,
      replayCursor: null,
      meta: { code: evaluation.code, reason: evaluation.reason, reasons }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      archiveId:
        plan?.archiveId != null ? String(plan.archiveId) : undefined,
      trailEntries: [],
      reason: evaluation.reason,
      reasons,
      trailDigest: null,
      replayCursor: null,
      receipt
    };
  }

  /**
   * Archive a multi-mission trail plan → ARCHIVE + sealed CH receipt.
   * Hermetic: in-memory only; no disk lake; no SIEM; no Fundacion touch.
   *
   * @param {object} plan
   * @returns {object}
   */
  archive(plan) {
    const evaluation = this.gate.evaluateArchivePlan(plan);

    if (!evaluation.valid) {
      return this._deny('ARCHIVE', plan, evaluation);
    }

    this._archiveSeq += 1;
    const { archiveId, trailEntries } = evaluation;

    const trailDigest = this.hashFn({
      archiveId,
      trailEntries,
      decision: 'ARCHIVE'
    });

    const reasons = [
      `mission archive ARCHIVE: entries=${trailEntries.length} archiveId=${archiveId}`
    ];

    const record = Object.freeze({
      archiveId,
      trailEntries: Object.freeze(
        trailEntries.map((e) => Object.freeze({ ...e }))
      ),
      decision: 'ARCHIVE',
      reasons: Object.freeze([...reasons]),
      trailDigest,
      archivedAt: new Date().toISOString()
    });

    this.archives.set(archiveId, record);

    const receipt = this._sealReceipt({
      operation: 'ARCHIVE',
      archiveId,
      decision: 'ARCHIVE',
      trailEntries,
      reasons,
      entryCount: trailEntries.length,
      trailDigest,
      meta: {
        code: CH_CODES.ARCHIVE_ALLOW,
        reasons,
        trailDigest
      }
    });

    return {
      ok: true,
      code: CH_CODES.ARCHIVE_ALLOW,
      decision: 'ARCHIVE',
      archiveId,
      trailEntries,
      reasons,
      trailDigest,
      receipt
    };
  }

  /**
   * Replay a sealed in-memory archive → REPLAY + sealed CH receipt.
   * Hermetic: resolves from in-memory store; optional inline trailEntries
   * for sealed-trail verification; optional replayCursor.
   *
   * @param {object} plan
   * @returns {object}
   */
  replay(plan) {
    const evaluation = this.gate.evaluateReplayPlan(plan);

    if (!evaluation.valid) {
      return this._deny('REPLAY', plan, evaluation);
    }

    const { archiveId, replayCursor } = evaluation;
    let trailEntries = evaluation.trailEntries;

    const stored = this.archives.get(archiveId);
    if (trailEntries == null) {
      if (!stored) {
        return this._deny('REPLAY', plan, {
          valid: false,
          code: CH_CODES.ARCHIVE_NOT_FOUND_DENY,
          reason: `No sealed in-memory archive found for archiveId '${archiveId}'`
        });
      }
      trailEntries = [...stored.trailEntries];
    }

    const trailDigest = this.hashFn({
      archiveId,
      trailEntries,
      decision: 'REPLAY',
      replayCursor: replayCursor || null
    });

    const cursor =
      replayCursor != null
        ? replayCursor
        : `0/${trailEntries.length}`;

    const reasons = [
      `mission archive REPLAY: entries=${trailEntries.length} archiveId=${archiveId} cursor=${cursor}`
    ];

    const receipt = this._sealReceipt({
      operation: 'REPLAY',
      archiveId,
      decision: 'REPLAY',
      trailEntries,
      reasons,
      entryCount: trailEntries.length,
      trailDigest,
      replayCursor: cursor,
      meta: {
        code: CH_CODES.REPLAY_ALLOW,
        reasons,
        trailDigest,
        replayCursor: cursor
      }
    });

    return {
      ok: true,
      code: CH_CODES.REPLAY_ALLOW,
      decision: 'REPLAY',
      archiveId,
      trailEntries,
      reasons,
      trailDigest,
      replayCursor: cursor,
      receipt
    };
  }

  /**
   * Retrieve a stored archive record by archive id.
   * @param {string} archiveId
   * @returns {object|null}
   */
  getArchive(archiveId) {
    const record = this.archives.get(archiveId);
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
      const verifyRes = verifyMissionArchiveReplayReceipt(
        receipt,
        this.hashFn
      );
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CH_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CH_CODES.TRAIL_BREAK,
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
      code: CH_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CH_PORT_PRODUCTION_READY,
  CH_PORT_KIND,
  CH_PRODUCTION_READY,
  CH_RECEIPT_KIND,
  CH_CODES,
  MissionArchiveReplayPort
};
