/**
 * @module merkle-ledger-policy-gate
 * SPEC-0083 / Mission BZ — Policy Gate for Continuous Cryptographic Ledger Merkle Notarization.
 * Fail-closed validation for leaf batches, Law VI secret screening, and Fundacion write barrier.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 *
 * NON-CLAIM: Merkle ledger ≠ public blockchain / ≠ cryptocurrency.
 */

import { sha256Canonical } from './merkle-ledger-receipt.js';

/** @type {'NO'} */
export const BZ_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BZ_POLICY_GATE_KIND = 'eos-merkle-ledger-policy-gate';

/** Default maximum leaves per notarization batch. */
export const BZ_MAX_BATCH_SIZE = 4096;

export const BZ_CODES = Object.freeze({
  BATCH_VALID_OK: 'BATCH_VALID_OK',
  NOTARIZE_OK: 'NOTARIZE_OK',
  INCLUSION_OK: 'INCLUSION_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  EMPTY_BATCH_DENY: 'EMPTY_BATCH_DENY',
  OVERSIZED_BATCH_DENY: 'OVERSIZED_BATCH_DENY',
  MALFORMED_LEAF_DENY: 'MALFORMED_LEAF_DENY',
  SECRET_DETECTED_DENY: 'SECRET_DETECTED_DENY',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  DENY: 'DENY'
});

const FORBIDDEN_SECRET_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{30,}/i
];

/**
 * Check if a string, object, or property contains secret patterns (Law VI).
 * @param {unknown} value
 * @returns {boolean} True if a secret pattern is detected
 */
export function scanForSecrets(value) {
  if (value == null) return false;

  if (typeof value === 'string') {
    for (const pat of FORBIDDEN_SECRET_PATTERNS) {
      if (pat.test(value)) return true;
    }
    return false;
  }

  if (typeof value === 'object') {
    try {
      const serialized = JSON.stringify(value);
      for (const pat of FORBIDDEN_SECRET_PATTERNS) {
        if (pat.test(serialized)) return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Check if a target string touches the forbidden Fundacion directory.
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  const s = String(target).toLowerCase().replace(/\\/g, '/');
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion')
  );
}

/**
 * Normalize a leaf into a digest string, or null if malformed.
 * Accepts: string digest, { digest }, { payload }, or plain payload object/string.
 * @param {unknown} leaf
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, digest?: string, reason?: string }}
 */
export function normalizeLeafDigest(leaf, hashFn = sha256Canonical) {
  if (leaf == null) {
    return { ok: false, reason: 'leaf is null or undefined' };
  }

  if (typeof leaf === 'string') {
    const trimmed = leaf.trim();
    if (!trimmed) return { ok: false, reason: 'leaf digest string is empty' };
    // Hex digest (64) or arbitrary string hashed to digest
    if (/^[a-f0-9]{64}$/i.test(trimmed)) {
      return { ok: true, digest: trimmed.toLowerCase() };
    }
    return { ok: true, digest: hashFn(trimmed) };
  }

  if (typeof leaf === 'object') {
    if (leaf.digest != null && String(leaf.digest).trim() !== '') {
      const d = String(leaf.digest).trim();
      if (/^[a-f0-9]{64}$/i.test(d)) {
        return { ok: true, digest: d.toLowerCase() };
      }
      return { ok: true, digest: hashFn(d) };
    }
    if (Object.prototype.hasOwnProperty.call(leaf, 'payload')) {
      if (leaf.payload == null) {
        return { ok: false, reason: 'leaf.payload is null' };
      }
      return { ok: true, digest: hashFn(leaf.payload) };
    }
    // Treat whole object as payload
    return { ok: true, digest: hashFn(leaf) };
  }

  return { ok: false, reason: 'leaf must be a string or object with digest/payload' };
}

/**
 * Policy Gate validator for Merkle ledger notarization batches.
 */
export class MerkleLedgerPolicyGate {
  /**
   * @param {object} [options]
   * @param {number} [options.maxBatchSize]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxBatchSize =
      options.maxBatchSize != null ? Number(options.maxBatchSize) : BZ_MAX_BATCH_SIZE;
    this.hashFn = options.hashFn || sha256Canonical;
  }

  /**
   * Evaluate a batch of leaf events/receipts before Merkle notarization.
   * @param {unknown} leaves
   * @param {object} [context]
   * @param {unknown} [context.target]
   * @param {unknown} [context.targetPath]
   * @returns {{ valid: boolean, code: string, digests?: string[], reason?: string }}
   */
  evaluateBatch(leaves, context = {}) {
    if (isFundacionTarget(context.target) || isFundacionTarget(context.targetPath)) {
      return {
        valid: false,
        code: BZ_CODES.FUNDACION_ALWAYS_DENY,
        reason: 'Batch targets Fundacion directory (Fundacion Δ=0 invariant)'
      };
    }

    if (!Array.isArray(leaves)) {
      return {
        valid: false,
        code: BZ_CODES.EMPTY_BATCH_DENY,
        reason: 'Leaves must be a non-empty array'
      };
    }

    if (leaves.length === 0) {
      return {
        valid: false,
        code: BZ_CODES.EMPTY_BATCH_DENY,
        reason: 'Empty tree / empty leaf batch is rejected fail-closed'
      };
    }

    if (leaves.length > this.maxBatchSize) {
      return {
        valid: false,
        code: BZ_CODES.OVERSIZED_BATCH_DENY,
        reason: `Batch size ${leaves.length} exceeds max ${this.maxBatchSize}`
      };
    }

    if (scanForSecrets(leaves) || scanForSecrets(context)) {
      return {
        valid: false,
        code: BZ_CODES.SECRET_DETECTED_DENY,
        reason: 'Leaf payload contains plain secrets or credentials (Law VI)'
      };
    }

    /** @type {string[]} */
    const digests = [];
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      if (isFundacionTarget(leaf?.target) || isFundacionTarget(leaf?.path)) {
        return {
          valid: false,
          code: BZ_CODES.FUNDACION_ALWAYS_DENY,
          reason: `Leaf at index ${i} targets Fundacion (Fundacion Δ=0 invariant)`
        };
      }
      if (scanForSecrets(leaf)) {
        return {
          valid: false,
          code: BZ_CODES.SECRET_DETECTED_DENY,
          reason: `Leaf at index ${i} contains plain secrets (Law VI)`
        };
      }
      const norm = normalizeLeafDigest(leaf, this.hashFn);
      if (!norm.ok) {
        return {
          valid: false,
          code: BZ_CODES.MALFORMED_LEAF_DENY,
          reason: `Leaf at index ${i}: ${norm.reason}`
        };
      }
      digests.push(norm.digest);
    }

    return {
      valid: true,
      code: BZ_CODES.BATCH_VALID_OK,
      digests
    };
  }
}
