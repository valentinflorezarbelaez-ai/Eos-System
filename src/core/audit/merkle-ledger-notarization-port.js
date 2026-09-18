/**
 * @module merkle-ledger-notarization-port
 * SPEC-0083 / Mission BZ — Continuous Cryptographic Ledger Merkle Notarization Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * Merkle construction (documented):
 *   Binary Merkle tree over ordered leaf digests (SHA-256).
 *   Odd-node rule: Bitcoin-style — when a level has an odd count, the last
 *   node is duplicated and hashed with itself before ascending.
 *   This yields O(log N) inclusion proofs with sibling hashes + directions.
 *
 * NON-CLAIM:
 *   Merkle ledger ≠ public blockchain /
 *   ≠ cryptocurrency /
 *   ≠ PRODUCTION_READY=YES notarization system.
 *   L22 CLOSED never reopen; L17–L21 CLOSED never reopen;
 *   L23 OPEN (Mission BZ in progress);
 *   Axis: Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/audit.
 *
 * PRODUCTION_READY: NO
 */

import {
  BZ_PRODUCTION_READY,
  BZ_RECEIPT_KIND,
  sha256Canonical,
  hashPair,
  buildMerkleLedgerReceipt,
  verifyMerkleLedgerReceipt
} from './merkle-ledger-receipt.js';

import {
  MerkleLedgerPolicyGate,
  BZ_CODES
} from './merkle-ledger-policy-gate.js';

/** @type {'NO'} */
export const BZ_PORT_PRODUCTION_READY = 'NO';

export const BZ_PORT_KIND = 'eos-merkle-ledger-notarization-port';

/** Odd-node padding strategy identifier (Bitcoin-style duplicate-last). */
export const BZ_ODD_NODE_STRATEGY = 'BITCOIN_DUPLICATE_LAST';

/**
 * Build a binary Merkle tree from ordered leaf digests.
 * Odd levels: duplicate the last node (Bitcoin-style).
 * @param {string[]} leafDigests
 * @returns {{ root: string, levels: string[][], leafCount: number, strategy: string }}
 */
export function buildMerkleTree(leafDigests) {
  if (!Array.isArray(leafDigests) || leafDigests.length === 0) {
    throw new Error('buildMerkleTree requires a non-empty leafDigests array');
  }

  const levels = [leafDigests.map((d) => String(d).toLowerCase())];
  let current = levels[0];

  while (current.length > 1) {
    /** @type {string[]} */
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(hashPair(current[i], current[i + 1]));
      } else {
        // Bitcoin-style: duplicate last leaf/node
        next.push(hashPair(current[i], current[i]));
      }
    }
    levels.push(next);
    current = next;
  }

  return {
    root: current[0],
    levels,
    leafCount: leafDigests.length,
    strategy: BZ_ODD_NODE_STRATEGY
  };
}

/**
 * Generate an inclusion proof for leafIndex against a built tree.
 * @param {{ levels: string[][], leafCount: number }} tree
 * @param {number} leafIndex
 * @returns {{ leafIndex: number, leafDigest: string, siblings: Array<{ hash: string, position: 'left'|'right' }>, root: string } | null}
 */
export function generateInclusionProof(tree, leafIndex) {
  if (!tree || !Array.isArray(tree.levels) || tree.levels.length === 0) {
    return null;
  }
  const leafCount = tree.leafCount;
  if (
    !Number.isInteger(leafIndex) ||
    leafIndex < 0 ||
    leafIndex >= leafCount
  ) {
    return null;
  }

  const siblings = [];
  let idx = leafIndex;

  for (let level = 0; level < tree.levels.length - 1; level++) {
    const nodes = tree.levels[level];
    const isRight = idx % 2 === 1;
    let siblingIdx;
    let position;

    if (isRight) {
      siblingIdx = idx - 1;
      position = 'left';
    } else {
      siblingIdx = idx + 1;
      position = 'right';
      // Odd last node duplicated: sibling is self
      if (siblingIdx >= nodes.length) {
        siblingIdx = idx;
        position = 'right';
      }
    }

    siblings.push({
      hash: nodes[siblingIdx],
      position
    });

    idx = Math.floor(idx / 2);
  }

  const root = tree.levels[tree.levels.length - 1][0];
  return {
    leafIndex,
    leafDigest: tree.levels[0][leafIndex],
    siblings,
    root
  };
}

/**
 * Verify a Merkle inclusion proof against a claimed root.
 * @param {string} leafDigest
 * @param {{ siblings: Array<{ hash: string, position: 'left'|'right' }> }} proof
 * @param {string} root
 * @returns {boolean}
 */
export function verifyInclusion(leafDigest, proof, root) {
  if (
    leafDigest == null ||
    !proof ||
    !Array.isArray(proof.siblings) ||
    root == null ||
    root === ''
  ) {
    return false;
  }

  let current = String(leafDigest).toLowerCase();
  const expectedRoot = String(root).toLowerCase();

  for (const step of proof.siblings) {
    if (!step || !step.hash || (step.position !== 'left' && step.position !== 'right')) {
      return false;
    }
    const sib = String(step.hash).toLowerCase();
    if (step.position === 'left') {
      current = hashPair(sib, current);
    } else {
      current = hashPair(current, sib);
    }
  }

  return current === expectedRoot;
}

/**
 * Continuous Cryptographic Ledger Merkle Notarization Port.
 */
export class MerkleLedgerNotarizationPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxBatchSize]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new MerkleLedgerPolicyGate({
      maxBatchSize: options.maxBatchSize,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.notarizations = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._notarizeSeq = 0;
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildMerkleLedgerReceipt(
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
   * Ingest ordered leaves, build Merkle tree, emit root + sealed BZ receipt.
   * @param {unknown[]} leaves
   * @param {object} [context]
   * @returns {{ ok: boolean, code: string, notarizationId?: string, root?: string, leafCount?: number, receipt: object, reason?: string }}
   */
  notarize(leaves, context = {}) {
    const batchEval = this.gate.evaluateBatch(leaves, context);
    if (!batchEval.valid) {
      const receipt = this._sealReceipt({
        operation: 'MERKLE_NOTARIZE',
        status: 'DENIED',
        leafCount: Array.isArray(leaves) ? leaves.length : 0,
        meta: { code: batchEval.code, reason: batchEval.reason }
      });
      return {
        ok: false,
        code: batchEval.code,
        reason: batchEval.reason,
        receipt
      };
    }

    const digests = batchEval.digests;
    const tree = buildMerkleTree(digests);

    this._notarizeSeq += 1;
    const notarizationId =
      context.notarizationId ||
      `BZ-NOTARY-${String(this._notarizeSeq).padStart(4, '0')}`;

    const record = Object.freeze({
      notarizationId,
      root: tree.root,
      leafDigests: Object.freeze([...digests]),
      leafCount: tree.leafCount,
      strategy: tree.strategy,
      levels: tree.levels.map((lvl) => Object.freeze([...lvl])),
      createdAt: new Date().toISOString()
    });

    this.notarizations.set(notarizationId, record);

    const receipt = this._sealReceipt({
      operation: 'MERKLE_NOTARIZE',
      notarizationId,
      rootHash: tree.root,
      status: 'OK',
      leafCount: tree.leafCount,
      meta: {
        strategy: tree.strategy,
        depth: tree.levels.length
      }
    });

    return {
      ok: true,
      code: BZ_CODES.NOTARIZE_OK,
      notarizationId,
      root: tree.root,
      leafCount: tree.leafCount,
      receipt
    };
  }

  /**
   * Prove inclusion of a leaf by index for a stored notarization.
   * @param {string} notarizationId
   * @param {number} leafIndex
   * @returns {{ ok: boolean, code?: string, proof?: object, reason?: string }}
   */
  proveInclusion(notarizationId, leafIndex) {
    const record = this.notarizations.get(notarizationId);
    if (!record) {
      return {
        ok: false,
        code: BZ_CODES.DENY,
        reason: `Unknown notarizationId: ${notarizationId}`
      };
    }

    const proof = generateInclusionProof(record, leafIndex);
    if (!proof) {
      return {
        ok: false,
        code: BZ_CODES.DENY,
        reason: `Invalid leafIndex ${leafIndex} for notarization ${notarizationId}`
      };
    }

    return {
      ok: true,
      code: BZ_CODES.INCLUSION_OK,
      proof
    };
  }

  /**
   * Verify inclusion proof (delegates to pure verifyInclusion).
   * @param {string} leafDigest
   * @param {object} proof
   * @param {string} root
   * @returns {boolean}
   */
  verifyInclusion(leafDigest, proof, root) {
    return verifyInclusion(leafDigest, proof, root);
  }

  /**
   * Retrieve a stored notarization by id.
   * @param {string} notarizationId
   * @returns {object|null}
   */
  getNotarization(notarizationId) {
    const record = this.notarizations.get(notarizationId);
    if (!record) return null;
    return Object.freeze({
      notarizationId: record.notarizationId,
      root: record.root,
      leafCount: record.leafCount,
      strategy: record.strategy,
      leafDigests: [...record.leafDigests],
      createdAt: record.createdAt
    });
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifyTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifyMerkleLedgerReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: BZ_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: BZ_CODES.TRAIL_BREAK,
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
      code: BZ_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

// Re-export for convenience
export { BZ_PRODUCTION_READY, BZ_RECEIPT_KIND, BZ_CODES };
