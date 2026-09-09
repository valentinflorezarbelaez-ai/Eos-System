/**
 * @module engram-contract
 * @description ROI6 SSOT: single local Engram storage root + envelope schema.
 * External MCP `engram` (PATH binary via config/mcp/eos-mcp.ssot.json) remains Golden Path for real FTS5/SQLite.
 * This module governs LOCAL JSONL persistence only — no fake FTS5.
 */

import path from 'node:path';
import crypto from 'node:crypto';
import { isFundacionPath, normalizeBarrierPath, resolveRepoRoot } from '../write-barrier/paths.js';

export const ENGRAM_SCHEMA_ID = 'eos.engram.envelope/v1';
export const ENGRAM_RELATIVE_ROOT = path.join('.eos', 'engram');
export const ENGRAM_RELATIVE_STORAGE = path.join('.eos', 'engram', 'memory.jsonl');
export const LEGACY_AKASHA_RELATIVE = path.join('docs', 'intelligence', 'akasha_memory.jsonl');

/** Allowed relative roots for local governed Engram storage (fail-closed elsewhere). */
export const ENGRAM_ALLOWED_RELATIVE_PREFIXES = [
  path.join('.eos', 'engram')
];

/**
 * Resolve canonical default storage path under repo root.
 * @param {string} [repoRoot]
 * @returns {string}
 */
export function resolveDefaultEngramStoragePath(repoRoot = resolveRepoRoot()) {
  return path.resolve(repoRoot, ENGRAM_RELATIVE_STORAGE);
}

/**
 * Resolve Engram directory root.
 * @param {string} [repoRoot]
 * @returns {string}
 */
export function resolveEngramRoot(repoRoot = resolveRepoRoot()) {
  return path.resolve(repoRoot, ENGRAM_RELATIVE_ROOT);
}

/**
 * True when candidate is under an allowed Engram prefix (relative to repoRoot).
 * @param {string} candidate
 * @param {string} [repoRoot]
 * @returns {boolean}
 */
export function isAllowedEngramPath(candidate, repoRoot = resolveRepoRoot()) {
  if (!candidate || typeof candidate !== 'string') return false;
  const abs = path.resolve(candidate);
  const root = path.resolve(repoRoot);
  const normAbs = normalizeBarrierPath(abs);
  const normRoot = normalizeBarrierPath(root).replace(/\/$/, '');
  if (!(normAbs === normRoot || normAbs.startsWith(`${normRoot}/`))) {
    return false;
  }
  const rel = normalizeBarrierPath(path.relative(root, abs));
  if (!rel || rel.startsWith('..')) return false;
  return ENGRAM_ALLOWED_RELATIVE_PREFIXES.some((prefix) => {
    const p = normalizeBarrierPath(prefix);
    return rel === p || rel.startsWith(`${p}/`) || rel === normalizeBarrierPath(ENGRAM_RELATIVE_STORAGE);
  });
}

/**
 * Fail-closed path assert for local Engram storage.
 * DENY: Fundacion, legacy akasha path (drift), random paths outside .eos/engram/.
 * @param {string} candidate
 * @param {{ repoRoot?: string, allowLegacyRedirect?: boolean }} [options]
 * @returns {{ ok: true, path: string, legacyRedirect?: boolean }}
 */
export function assertEngramPath(candidate, options = {}) {
  const repoRoot = options.repoRoot || resolveRepoRoot();
  if (!candidate || typeof candidate !== 'string') {
    const err = new Error('ENGRAM_PATH_DENY: missing storage path');
    err.code = 'ENGRAM_PATH_DENY';
    throw err;
  }
  const abs = path.resolve(candidate);
  if (isFundacionPath(abs, candidate)) {
    const err = new Error('ENGRAM_PATH_DENY: Fundacion paths are forbidden for Engram storage');
    err.code = 'ENGRAM_PATH_DENY';
    err.deny_code = 'FUNDACION';
    throw err;
  }
  const legacyAbs = path.resolve(repoRoot, LEGACY_AKASHA_RELATIVE);
  const normAbs = normalizeBarrierPath(abs);
  const normLegacy = normalizeBarrierPath(legacyAbs);
  if (normAbs === normLegacy || normAbs.endsWith('/docs/intelligence/akasha_memory.jsonl')) {
    if (options.allowLegacyRedirect === true) {
      const redirected = resolveDefaultEngramStoragePath(repoRoot);
      return { ok: true, path: redirected, legacyRedirect: true };
    }
    const err = new Error(
      'ENGRAM_PATH_DENY: legacy docs/intelligence/akasha_memory.jsonl is retired; use .eos/engram/memory.jsonl (ROI6 SSOT)'
    );
    err.code = 'ENGRAM_PATH_DENY';
    err.deny_code = 'LEGACY_AKASHA';
    throw err;
  }
  if (!isAllowedEngramPath(abs, repoRoot)) {
    const err = new Error(
      `ENGRAM_PATH_DENY: storage must resolve under .eos/engram/ (got: ${abs})`
    );
    err.code = 'ENGRAM_PATH_DENY';
    err.deny_code = 'OUTSIDE_SSOT';
    throw err;
  }
  return { ok: true, path: abs };
}

/**
 * Compute seal matching EosMemory historical algorithm.
 * @param {{ id: string, key: string, content: string, epistemicState?: string }} data
 * @returns {string}
 */
export function computeEngramSeal(data) {
  const raw = `${data.id}:${data.key}:${data.content}:${data.epistemicState || 'VERIFIED'}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * Build unified envelope aligning Gentleman mem_save fields + EosMemory seal fields.
 * @param {object} input
 * @returns {object}
 */
export function buildEngramEnvelope(input = {}) {
  const now = input.createdAt || new Date().toISOString();
  const id = input.id || `MEM-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const key = input.key || input.topic_key || input.monadMemoryKey || 'untitled';
  const title = input.title || key;
  const type = input.type || 'architecture';
  const scope = input.scope || 'project';
  const topic_key = input.topic_key || key;
  const content = input.content || input.contentPayload || '';
  const epistemicState = input.epistemicState || 'VERIFIED';
  const tags = Array.isArray(input.tags) ? input.tags : [];
  const capture_prompt = input.capture_prompt === true;

  const sealedCore = { id, key, content, epistemicState };
  const sha256Seal = input.sha256Seal || computeEngramSeal(sealedCore);

  return {
    schema: ENGRAM_SCHEMA_ID,
    // Gentleman mem_save-aligned
    title,
    type,
    scope,
    topic_key,
    capture_prompt,
    content,
    // EosMemory seal-aligned
    id,
    key,
    epistemicState,
    tags,
    createdAt: now,
    sha256Seal,
    // Honest backend marker (local JSONL — not FTS5)
    backend: 'eos-memory-jsonl',
    fts5: false
  };
}

/**
 * Validate envelope shape + seal; fail-closed on drift.
 * @param {object} envelope
 * @returns {{ ok: true, envelope: object }}
 */
export function assertEngramEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    const err = new Error('ENGRAM_ENVELOPE_DENY: envelope must be object');
    err.code = 'ENGRAM_ENVELOPE_DENY';
    throw err;
  }
  if (envelope.schema !== ENGRAM_SCHEMA_ID) {
    const err = new Error(`ENGRAM_ENVELOPE_DENY: schema must be ${ENGRAM_SCHEMA_ID}`);
    err.code = 'ENGRAM_ENVELOPE_DENY';
    throw err;
  }
  for (const field of ['id', 'key', 'content', 'title', 'topic_key', 'sha256Seal', 'createdAt']) {
    if (typeof envelope[field] !== 'string' || !envelope[field]) {
      const err = new Error(`ENGRAM_ENVELOPE_DENY: missing field ${field}`);
      err.code = 'ENGRAM_ENVELOPE_DENY';
      throw err;
    }
  }
  if (envelope.fts5 === true) {
    const err = new Error(
      'ENGRAM_ENVELOPE_DENY: local envelope must not claim fts5=true (use external engram MCP)'
    );
    err.code = 'ENGRAM_ENVELOPE_DENY';
    err.deny_code = 'FAKE_FTS5';
    throw err;
  }
  const expected = computeEngramSeal(envelope);
  if (envelope.sha256Seal !== expected) {
    const err = new Error('ENGRAM_ENVELOPE_DENY: sha256Seal mismatch');
    err.code = 'ENGRAM_ENVELOPE_DENY';
    err.deny_code = 'SEAL_MISMATCH';
    throw err;
  }
  return { ok: true, envelope };
}

/**
 * Round-trip helper for verify:strict / engram:verify.
 * @param {string} [repoRoot]
 * @returns {{ ok: true, storagePath: string, schema: string, relative: string, externalMcp: string, fts5Local: boolean }}
 */
export function verifyEngramContract(repoRoot = resolveRepoRoot()) {
  const storagePath = resolveDefaultEngramStoragePath(repoRoot);
  const asserted = assertEngramPath(storagePath, { repoRoot });
  const sample = buildEngramEnvelope({
    key: 'roi6/verify',
    title: 'ROI6 verify',
    content: 'What: contract round-trip\nWhy: fail-closed SSOT'
  });
  assertEngramEnvelope(sample);
  return {
    ok: true,
    storagePath: asserted.path,
    schema: ENGRAM_SCHEMA_ID,
    relative: ENGRAM_RELATIVE_STORAGE.split(path.sep).join('/'),
    externalMcp: 'engram (PATH) via config/mcp/eos-mcp.ssot.json',
    fts5Local: false
  };
}
