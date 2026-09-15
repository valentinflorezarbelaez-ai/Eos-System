/**
 * @module agentic-memory-policy-gate
 * SPEC-0080 / Mission BW — Policy Gate for Sovereign Agentic Memory.
 * Fail-closed validation for entity nodes, relationship edges, query bounds,
 * Law VI secret screening, and Fundacion write barrier enforcement.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0
 */

import { sha256Canonical } from './agentic-memory-receipt.js';

/** @type {'NO'} */
export const BW_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BW_POLICY_GATE_KIND = 'eos-agentic-memory-policy-gate';

export const BW_CODES = Object.freeze({
  NODE_INGEST_OK: 'NODE_INGEST_OK',
  EDGE_LINK_OK: 'EDGE_LINK_OK',
  QUERY_OK: 'QUERY_OK',
  NODE_DELETE_OK: 'NODE_DELETE_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK',

  MALFORMED_NODE_DENY: 'MALFORMED_NODE_DENY',
  MALFORMED_EDGE_DENY: 'MALFORMED_EDGE_DENY',
  MALFORMED_QUERY_DENY: 'MALFORMED_QUERY_DENY',
  NODE_NOT_FOUND_DENY: 'NODE_NOT_FOUND_DENY',
  DUPLICATE_NODE_DENY: 'DUPLICATE_NODE_DENY',
  TRAVERSAL_LIMIT_EXCEEDED_DENY: 'TRAVERSAL_LIMIT_EXCEEDED_DENY',
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
 * Construct a standardized deny response.
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string, fundacionDelta: 0 }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BW_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyFundacion(reason = 'Fundacion ALWAYS_DENY', extra = {}) {
  return deny(BW_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denySecret(reason = 'Law VI: plain secret pattern detected', extra = {}) {
  return deny(BW_CODES.SECRET_DETECTED_DENY, reason, {
    lawVi: 'VIOLATION_DETECTED',
    fundacionDelta: 0,
    ...extra
  });
}

/**
 * Validate an entity node payload.
 * @param {unknown} node
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanNode?: object }}
 */
export function validateNodePayload(node) {
  if (!node || typeof node !== 'object') {
    return deny(BW_CODES.MALFORMED_NODE_DENY, 'node must be a non-null object');
  }

  const { id, label, entityType, properties, target } = /** @type {any} */ (node);

  if (isFundacionTarget(target) || isFundacionTarget(id) || isFundacionTarget(label)) {
    return denyFundacion('node references forbidden Fundacion path');
  }

  if (scanForSecrets(node)) {
    return denySecret('node properties contain plain secret patterns');
  }

  if (typeof id !== 'string' || id.trim() === '') {
    return deny(BW_CODES.MALFORMED_NODE_DENY, 'node id must be a non-empty string');
  }

  if (typeof label !== 'string' || label.trim() === '') {
    return deny(BW_CODES.MALFORMED_NODE_DENY, 'node label must be a non-empty string');
  }

  if (typeof entityType !== 'string' || entityType.trim() === '') {
    return deny(BW_CODES.MALFORMED_NODE_DENY, 'node entityType must be a non-empty string');
  }

  const cleanNode = {
    id: id.trim(),
    label: label.trim(),
    entityType: entityType.trim(),
    properties: properties && typeof properties === 'object' ? { ...properties } : {},
    digest: sha256Canonical({ id: id.trim(), label: label.trim(), entityType: entityType.trim() })
  };

  return {
    ok: true,
    code: BW_CODES.NODE_INGEST_OK,
    cleanNode,
    fundacionDelta: 0
  };
}

/**
 * Validate a relationship edge payload.
 * @param {unknown} edge
 * @param {Set<string>} existingNodeIds
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanEdge?: object }}
 */
export function validateEdgePayload(edge, existingNodeIds) {
  if (!edge || typeof edge !== 'object') {
    return deny(BW_CODES.MALFORMED_EDGE_DENY, 'edge must be a non-null object');
  }

  const { sourceId, targetId, relationType, weight, bidirectional, target } = /** @type {any} */ (edge);

  if (isFundacionTarget(target) || isFundacionTarget(sourceId) || isFundacionTarget(targetId)) {
    return denyFundacion('edge references forbidden Fundacion path');
  }

  if (scanForSecrets(edge)) {
    return denySecret('edge properties contain plain secret patterns');
  }

  if (typeof sourceId !== 'string' || sourceId.trim() === '') {
    return deny(BW_CODES.MALFORMED_EDGE_DENY, 'edge sourceId must be a non-empty string');
  }

  if (typeof targetId !== 'string' || targetId.trim() === '') {
    return deny(BW_CODES.MALFORMED_EDGE_DENY, 'edge targetId must be a non-empty string');
  }

  if (typeof relationType !== 'string' || relationType.trim() === '') {
    return deny(BW_CODES.MALFORMED_EDGE_DENY, 'edge relationType must be a non-empty string');
  }

  const cleanSource = sourceId.trim();
  const cleanTarget = targetId.trim();

  if (!existingNodeIds.has(cleanSource)) {
    return deny(BW_CODES.NODE_NOT_FOUND_DENY, `source node '${cleanSource}' does not exist in store`);
  }

  if (!existingNodeIds.has(cleanTarget)) {
    return deny(BW_CODES.NODE_NOT_FOUND_DENY, `target node '${cleanTarget}' does not exist in store`);
  }

  const numericWeight = typeof weight === 'number' && Number.isFinite(weight) && weight > 0 ? weight : 1.0;

  const cleanEdge = {
    sourceId: cleanSource,
    targetId: cleanTarget,
    relationType: relationType.trim(),
    weight: numericWeight,
    bidirectional: Boolean(bidirectional)
  };

  return {
    ok: true,
    code: BW_CODES.EDGE_LINK_OK,
    cleanEdge,
    fundacionDelta: 0
  };
}

/**
 * Validate an associative query payload.
 * @param {unknown} query
 * @param {Set<string>} existingNodeIds
 * @returns {{ ok: boolean, code?: string, reason?: string, cleanQuery?: object }}
 */
export function validateQueryPayload(query, existingNodeIds) {
  if (!query || typeof query !== 'object') {
    return deny(BW_CODES.MALFORMED_QUERY_DENY, 'query must be a non-null object');
  }

  const { seedNodeId, maxDepth, minRelevance, target } = /** @type {any} */ (query);

  if (isFundacionTarget(target) || isFundacionTarget(seedNodeId)) {
    return denyFundacion('query references forbidden Fundacion path');
  }

  if (scanForSecrets(query)) {
    return denySecret('query contains plain secret patterns');
  }

  if (typeof seedNodeId !== 'string' || seedNodeId.trim() === '') {
    return deny(BW_CODES.MALFORMED_QUERY_DENY, 'query seedNodeId must be a non-empty string');
  }

  const cleanSeed = seedNodeId.trim();
  if (!existingNodeIds.has(cleanSeed)) {
    return deny(BW_CODES.NODE_NOT_FOUND_DENY, `seed node '${cleanSeed}' does not exist in store`);
  }

  const depth = typeof maxDepth === 'number' && Number.isInteger(maxDepth) ? maxDepth : 2;
  if (depth < 1 || depth > 10) {
    return deny(BW_CODES.TRAVERSAL_LIMIT_EXCEEDED_DENY, `maxDepth must be between 1 and 10, got ${depth}`);
  }

  const threshold = typeof minRelevance === 'number' && Number.isFinite(minRelevance) ? minRelevance : 0.0;

  return {
    ok: true,
    code: BW_CODES.QUERY_OK,
    cleanQuery: {
      seedNodeId: cleanSeed,
      maxDepth: depth,
      minRelevance: threshold
    },
    fundacionDelta: 0
  };
}
