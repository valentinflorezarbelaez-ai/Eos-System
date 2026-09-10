/**
 * @module EvidenceCustody
 * @description ROI4 I3 — tamper-evident evidence custody over the canonical HashChainedLedger (ADR-0009).
 * Does NOT invent a parallel ledger. Seals verify receipts / mission-loop advances / EVD writes
 * into an append-only SHA-256 chain (previous_hash → event_hash). Fail-closed verify.
 *
 * Fundacion / external target paths are never used as custody storage.
 */

import path from 'node:path';
import fs from 'node:fs';
import {
  HashChainedLedger,
  GENESIS_PREVIOUS_HASH,
  calculateSha256,
  canonicalJson
} from './epistemic-evidence-engine.js';
import { isFundacionPath } from '../write-barrier/paths.js';
import { assertBuilderVerifierDisjunction } from '../governance/builder-verifier-custody.js';

export const CUSTODY_CHAIN_ID = 'CP-EVIDENCE';

export const CUSTODY_EVENT_TYPES = Object.freeze({
  EVD_SEALED: 'EVD_SEALED',
  VERIFY_RECEIPT: 'VERIFY_RECEIPT',
  MISSION_LOOP_ADVANCE: 'MISSION_LOOP_ADVANCE',
  MISSION_LOOP_RECEIPT: 'MISSION_LOOP_RECEIPT'
});

export class EvidenceCustodyError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = 'CUSTODY_DENIED', details = null) {
    super(message);
    this.name = 'EvidenceCustodyError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Resolve custody base directory under the control plane (.eos/custody).
 * Rejects Fundacion paths fail-closed.
 * @param {string} controlPlaneRoot
 * @param {string} [override]
 */
export function resolveCustodyBaseDir(controlPlaneRoot, override) {
  const base = override
    ? path.resolve(override)
    : path.join(path.resolve(controlPlaneRoot || process.cwd()), '.eos', 'custody');

  if (isFundacionPath(base)) {
    throw new EvidenceCustodyError(
      `CUSTODY_FUNDACION_DENY: custody baseDir must not target Fundacion (${base})`,
      'CUSTODY_FUNDACION_DENY'
    );
  }
  return base;
}

/**
 * Thin custody facade — delegates persistence/integrity to HashChainedLedger.
 */
export class EvidenceCustody {
  /**
   * @param {object} [options]
   * @param {string} [options.controlPlaneRoot]
   * @param {string} [options.baseDir]
   * @param {string} [options.chainId]
   * @param {HashChainedLedger} [options.ledger]
   * @param {boolean} [options.enabled=true]
   */
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || process.cwd();
    this.baseDir = resolveCustodyBaseDir(this.controlPlaneRoot, options.baseDir);
    this.chainId = options.chainId || CUSTODY_CHAIN_ID;
    this.enabled = options.enabled !== false;
    this.ledger =
      options.ledger ||
      new HashChainedLedger({
        baseDir: this.baseDir,
        lockTimeoutMs: options.lockTimeoutMs || 3000,
        staleLockMs: options.staleLockMs || 5000
      });
  }

  getLogPath() {
    return this.ledger.getLogPath(this.chainId);
  }

  /**
   * Append one custody record. Payload is hashed via canonical ledger rules.
   * @param {string} eventType
   * @param {object} payload
   * @returns {object|null} ledger event or null if disabled
   */
  append(eventType, payload = {}) {
    if (!this.enabled) return null;

    if (isFundacionPath(this.baseDir)) {
      throw new EvidenceCustodyError(
        'CUSTODY_FUNDACION_DENY: refusing to write custody under Fundacion',
        'CUSTODY_FUNDACION_DENY'
      );
    }

    const type = eventType || CUSTODY_EVENT_TYPES.VERIFY_RECEIPT;
    if (!Object.values(CUSTODY_EVENT_TYPES).includes(type)) {
      throw new EvidenceCustodyError(
        `CUSTODY_EVENT_TYPE_INVALID: ${type}`,
        'CUSTODY_EVENT_TYPE_INVALID'
      );
    }

    const sealedPayload = {
      ...payload,
      custody_kind: type,
      control_plane_root_hint: path.basename(this.controlPlaneRoot)
    };

    return this.ledger.appendEvent(this.chainId, type, sealedPayload);
  }

  /**
   * Seal an EVD write / ContractEvidenceSealer result into the chain.
   */
  sealEvdRecord(record = {}) {
    return this.append(CUSTODY_EVENT_TYPES.EVD_SEALED, {
      evidence_id: record.evidence_id || record.id || null,
      seal_hash: record.seal_hash || record.sha256 || record.digest || null,
      related_spec: record.related_spec || record.record?.related_spec || null,
      related_project: record.related_project || record.record?.related_project || null,
      status: record.status || record.record?.status || null,
      dry_run: record.dry_run === true
    });
  }

  /**
   * Seal an independent / verify receipt.
   */
  sealVerifyReceipt(receipt = {}) {
    if (receipt.builder_id || receipt.verifier_id) {
      assertBuilderVerifierDisjunction({
        builder_id: receipt.builder_id,
        verifier_id: receipt.verifier_id
      });
    }

    return this.append(CUSTODY_EVENT_TYPES.VERIFY_RECEIPT, {
      receipt_id: receipt.receipt_id || receipt.evidence_id || null,
      receipt_hash: receipt.receipt_hash || receipt.sha256 || null,
      mission_id: receipt.mission_id || null,
      status: receipt.status || null,
      builder_id: receipt.builder_id || null,
      verifier_id: receipt.verifier_id || null
    });
  }

  /**
   * Seal a mission-loop stage advance.
   */
  sealMissionLoopAdvance(advance = {}) {
    return this.append(CUSTODY_EVENT_TYPES.MISSION_LOOP_ADVANCE, {
      mission_id: advance.mission_id || advance.missionId || null,
      from: advance.from || null,
      to: advance.to || advance.stage || null,
      ok: advance.ok !== false
    });
  }

  /**
   * Seal a mission-loop receipt append (non-advance).
   */
  sealMissionLoopReceipt(receipt = {}) {
    return this.append(CUSTODY_EVENT_TYPES.MISSION_LOOP_RECEIPT, {
      mission_id: receipt.mission_id || receipt.missionId || null,
      kind: receipt.kind || null,
      receipt_hash: receipt.receipt_hash || calculateSha256(receipt)
    });
  }

  /**
   * Fail-closed chain verification.
   * Empty chain (genesis / no writes yet) is VALID with count 0.
   * Broken chain / missing prev → DENY (valid:false, verdict DENY|FAIL).
   * @param {object} [options]
   * @param {boolean} [options.failClosed=true]
   * @returns {{ valid: boolean, verdict: string, count: number, error?: string, lastHash?: string, details?: object }}
   */
  verify(options = {}) {
    const failClosed = options.failClosed !== false;
    const integrity = this.ledger.verifyChainIntegrity(this.chainId);

    if (integrity.valid) {
      return {
        valid: true,
        verdict: integrity.count === 0 ? 'PASS_EMPTY_GENESIS' : 'PASS',
        count: integrity.count || 0,
        lastHash: integrity.lastHash || GENESIS_PREVIOUS_HASH,
        chain_id: this.chainId,
        base_dir: this.baseDir,
        genesis_previous_hash: GENESIS_PREVIOUS_HASH
      };
    }

    const result = {
      valid: false,
      verdict: failClosed ? 'DENY' : 'FAIL',
      count: 0,
      error: integrity.error || 'TAMPER_DETECTED',
      chain_id: this.chainId,
      base_dir: this.baseDir,
      details: integrity
    };

    if (failClosed) {
      throw new EvidenceCustodyError(
        `CUSTODY_CHAIN_BROKEN [${result.error}]: fail-closed DENY at sequence ${integrity.brokenSequence}`,
        'CUSTODY_CHAIN_BROKEN',
        result
      );
    }

    return result;
  }

  /**
   * Soft verify that never throws (for audit reports).
   */
  audit() {
    try {
      return this.verify({ failClosed: false });
    } catch (err) {
      return {
        valid: false,
        verdict: 'DENY',
        error: err.code || err.message,
        details: err.details || null
      };
    }
  }

  listEvents() {
    return this.ledger.getEvents(this.chainId);
  }
}

export { GENESIS_PREVIOUS_HASH, calculateSha256, canonicalJson, HashChainedLedger };
