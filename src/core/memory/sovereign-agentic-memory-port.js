/**
 * @module sovereign-agentic-memory-port
 * SPEC-0080 / Mission BW — Sovereign Agentic Knowledge Graph & Associative Memory Port.
 *
 * Facade: createSovereignAgenticMemoryPort({ now, hash, policyGate })
 *   .storeNode(nodePayload, opts)
 *   .getNode(nodeId)
 *   .linkEdge(edgePayload, opts)
 *   .queryAssociative(queryParams, opts)
 *   .deleteNode(nodeId, opts)
 *   .getGraphMetrics()
 *   .verifyMemoryTrail(receipts)
 *   ._resetForTests()
 *
 * Pure Layer-0 hermetic associative knowledge graph indexing and memory retrieval.
 * Emits cryptographically sealed BW-RCPT-* receipts via node:crypto.
 *
 * Fail-closed:
 *   Fundacion ALWAYS_DENY; malformed nodes/edges; secrets detected (Law VI);
 *   traversal limits exceeded; cycle protection.
 *
 * NON-CLAIM:
 *   agentic memory port ≠ vector database SaaS /
 *   ≠ Pinecone / Neo4j /
 *   ≠ PRODUCTION_READY=YES knowledge engine.
 *   L22 CLOSED never reopen; L17–L21 CLOSED never reopen;
 *   L23 OPEN (Mission BW);
 *   Axis: Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * PRODUCTION_READY: NO
 */

import {
  BW_PRODUCTION_READY as BW_RECEIPT_PR,
  BW_RECEIPT_KIND,
  stableStringify,
  sha256Canonical,
  defaultHash,
  hashAgenticMemoryReceipt,
  verifyAgenticMemoryReceipt,
  buildAgenticMemoryReceipt,
  _resetReceiptSeqForTests
} from './agentic-memory-receipt.js';

import {
  BW_POLICY_GATE_KIND,
  BW_CODES,
  validateNodePayload,
  validateEdgePayload,
  validateQueryPayload,
  isFundacionTarget,
  scanForSecrets
} from './agentic-memory-policy-gate.js';

/** @type {'NO'} */
export const BW_PRODUCTION_READY = 'NO';
export const BW_KIND = 'eos-sovereign-agentic-memory-port';

/**
 * Factory for creating the Sovereign Agentic Memory Port.
 * @param {object} [opts]
 * @param {() => string} [opts.now] Injectable timestamp supplier
 * @param {(payload: unknown) => string} [opts.hash] Injectable hash supplier
 * @param {object} [opts.policyGate] Injectable policy gate
 * @returns {object} Port instance
 */
export function createSovereignAgenticMemoryPort(opts = {}) {
  const nowFn = opts.now || (() => new Date().toISOString());
  const hashFn = opts.hash || defaultHash;

  /** @type {Map<string, object>} */
  const nodes = new Map();

  /** @type {Map<string, Set<object>>} */
  const adjacency = new Map();

  /** @type {object[]} */
  const receipts = [];

  let lastReceiptHash = null;

  /**
   * Helper to append receipt and advance hash chain.
   */
  function _appendReceipt(fields) {
    const rcpt = buildAgenticMemoryReceipt(
      {
        ...fields,
        prevReceiptHash: lastReceiptHash
      },
      { now: nowFn, hash: hashFn }
    );
    receipts.push(rcpt);
    lastReceiptHash = rcpt.receiptHash;
    return rcpt;
  }

  /**
   * Store or update an entity node in the knowledge graph.
   * @param {object} nodePayload
   * @param {object} [callOpts]
   * @returns {{ ok: boolean, code: string, node?: object, receipt?: object, reason?: string, fundacionDelta: 0 }}
   */
  function storeNode(nodePayload, callOpts = {}) {
    const check = validateNodePayload(nodePayload);
    if (!check.ok) {
      const receipt = _appendReceipt({
        operation: 'NODE_INGEST_DENIED',
        entityId: nodePayload && nodePayload.id ? String(nodePayload.id) : null,
        status: check.code,
        digestHash: null
      });
      return {
        ok: false,
        code: check.code,
        reason: check.reason,
        receipt,
        fundacionDelta: 0
      };
    }

    const { cleanNode } = check;
    const now = nowFn();

    const existing = nodes.get(cleanNode.id);
    const nodeRecord = {
      ...cleanNode,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: existing ? existing.accessCount + 1 : 1
    };

    nodes.set(cleanNode.id, nodeRecord);
    if (!adjacency.has(cleanNode.id)) {
      adjacency.set(cleanNode.id, new Set());
    }

    const digestHash = hashFn(nodeRecord);
    const receipt = _appendReceipt({
      operation: 'NODE_INGEST',
      entityId: cleanNode.id,
      status: BW_CODES.NODE_INGEST_OK,
      digestHash,
      meta: { entityType: cleanNode.entityType, label: cleanNode.label }
    });

    return {
      ok: true,
      code: BW_CODES.NODE_INGEST_OK,
      node: Object.freeze({ ...nodeRecord }),
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Get an entity node by ID and increment its access count.
   * @param {string} nodeId
   * @returns {{ ok: boolean, code: string, node?: object, reason?: string }}
   */
  function getNode(nodeId) {
    if (typeof nodeId !== 'string' || !nodes.has(nodeId.trim())) {
      return {
        ok: false,
        code: BW_CODES.NODE_NOT_FOUND_DENY,
        reason: `node '${nodeId}' not found`
      };
    }

    const node = nodes.get(nodeId.trim());
    node.accessCount += 1;
    node.lastAccessedAt = nowFn();

    return {
      ok: true,
      code: BW_CODES.NODE_INGEST_OK,
      node: Object.freeze({ ...node })
    };
  }

  /**
   * Link two entity nodes with a relationship edge.
   * @param {object} edgePayload
   * @param {object} [callOpts]
   * @returns {{ ok: boolean, code: string, edge?: object, receipt?: object, reason?: string, fundacionDelta: 0 }}
   */
  function linkEdge(edgePayload, callOpts = {}) {
    const existingIds = new Set(nodes.keys());
    const check = validateEdgePayload(edgePayload, existingIds);

    if (!check.ok) {
      const receipt = _appendReceipt({
        operation: 'EDGE_LINK_DENIED',
        entityId: edgePayload && edgePayload.sourceId ? String(edgePayload.sourceId) : null,
        targetId: edgePayload && edgePayload.targetId ? String(edgePayload.targetId) : null,
        status: check.code,
        digestHash: null
      });
      return {
        ok: false,
        code: check.code,
        reason: check.reason,
        receipt,
        fundacionDelta: 0
      };
    }

    const { cleanEdge } = check;
    adjacency.get(cleanEdge.sourceId).add(cleanEdge);

    if (cleanEdge.bidirectional) {
      adjacency.get(cleanEdge.targetId).add({
        sourceId: cleanEdge.targetId,
        targetId: cleanEdge.sourceId,
        relationType: cleanEdge.relationType,
        weight: cleanEdge.weight,
        bidirectional: true
      });
    }

    const digestHash = hashFn(cleanEdge);
    const receipt = _appendReceipt({
      operation: 'EDGE_LINK',
      entityId: cleanEdge.sourceId,
      targetId: cleanEdge.targetId,
      status: BW_CODES.EDGE_LINK_OK,
      digestHash,
      meta: { relationType: cleanEdge.relationType, weight: cleanEdge.weight }
    });

    return {
      ok: true,
      code: BW_CODES.EDGE_LINK_OK,
      edge: Object.freeze({ ...cleanEdge }),
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Execute an associative contextual query starting from a seed node.
   * Performs a bounded Breadth-First Search (BFS) with visited deduplication and decay scoring.
   * @param {object} queryParams
   * @param {object} [callOpts]
   * @returns {{ ok: boolean, code: string, results?: object[], receipt?: object, reason?: string, fundacionDelta: 0 }}
   */
  function queryAssociative(queryParams, callOpts = {}) {
    const existingIds = new Set(nodes.keys());
    const check = validateQueryPayload(queryParams, existingIds);

    if (!check.ok) {
      const receipt = _appendReceipt({
        operation: 'QUERY_DENIED',
        entityId: queryParams && queryParams.seedNodeId ? String(queryParams.seedNodeId) : null,
        status: check.code,
        digestHash: null
      });
      return {
        ok: false,
        code: check.code,
        reason: check.reason,
        receipt,
        fundacionDelta: 0
      };
    }

    const { seedNodeId, maxDepth, minRelevance } = check.cleanQuery;
    const seedNode = nodes.get(seedNodeId);
    seedNode.accessCount += 1;
    seedNode.lastAccessedAt = nowFn();

    const visited = new Set([seedNodeId]);
    const queue = [{ nodeId: seedNodeId, depth: 0, accumulatedWeight: 1.0, path: [seedNodeId] }];
    const matches = [];

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.depth > 0) {
        const node = nodes.get(current.nodeId);
        if (node) {
          // Decay-weighted relevance score:
          // base = accumulatedWeight / (1 + current.depth * 0.5)
          // recency / frequency bonus = 1 + 0.1 * Math.log1p(node.accessCount)
          const decay = 1 / (1 + current.depth * 0.5);
          const frequencyBonus = 1 + 0.1 * Math.log1p(node.accessCount);
          const relevanceScore = current.accumulatedWeight * decay * frequencyBonus;

          if (relevanceScore >= minRelevance) {
            matches.push({
              node: Object.freeze({ ...node }),
              depth: current.depth,
              relevanceScore: Number(relevanceScore.toFixed(4)),
              path: [...current.path]
            });
          }
        }
      }

      if (current.depth < maxDepth) {
        const edges = adjacency.get(current.nodeId) || new Set();
        for (const edge of edges) {
          if (!visited.has(edge.targetId)) {
            visited.add(edge.targetId);
            queue.push({
              nodeId: edge.targetId,
              depth: current.depth + 1,
              accumulatedWeight: current.accumulatedWeight * edge.weight,
              path: [...current.path, edge.targetId]
            });
          }
        }
      }
    }

    // Sort matches by relevance score descending
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const digestHash = hashFn({ seedNodeId, matchCount: matches.length, topIds: matches.map(m => m.node.id) });
    const receipt = _appendReceipt({
      operation: 'ASSOCIATIVE_QUERY',
      entityId: seedNodeId,
      status: BW_CODES.QUERY_OK,
      digestHash,
      meta: { maxDepth, matchCount: matches.length }
    });

    return {
      ok: true,
      code: BW_CODES.QUERY_OK,
      seedNodeId,
      matchCount: matches.length,
      results: Object.freeze(matches),
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Delete an entity node and prune associated edges.
   * @param {string} nodeId
   * @param {object} [callOpts]
   * @returns {{ ok: boolean, code: string, receipt?: object, reason?: string, fundacionDelta: 0 }}
   */
  function deleteNode(nodeId, callOpts = {}) {
    if (typeof nodeId !== 'string' || !nodes.has(nodeId.trim())) {
      return {
        ok: false,
        code: BW_CODES.NODE_NOT_FOUND_DENY,
        reason: `node '${nodeId}' not found`,
        fundacionDelta: 0
      };
    }

    const cleanId = nodeId.trim();
    nodes.delete(cleanId);
    adjacency.delete(cleanId);

    // Prune edges pointing to deleted node
    for (const [srcId, edgeSet] of adjacency.entries()) {
      for (const edge of [...edgeSet]) {
        if (edge.targetId === cleanId) {
          edgeSet.delete(edge);
        }
      }
    }

    const receipt = _appendReceipt({
      operation: 'NODE_DELETE',
      entityId: cleanId,
      status: BW_CODES.NODE_DELETE_OK,
      digestHash: null
    });

    return {
      ok: true,
      code: BW_CODES.NODE_DELETE_OK,
      deletedNodeId: cleanId,
      receipt,
      fundacionDelta: 0
    };
  }

  /**
   * Get graph structural metrics.
   * @returns {{ totalNodes: number, totalEdges: number, density: number }}
   */
  function getGraphMetrics() {
    const totalNodes = nodes.size;
    let totalEdges = 0;
    for (const edges of adjacency.values()) {
      totalEdges += edges.size;
    }

    const maxEdgesPossible = totalNodes > 1 ? totalNodes * (totalNodes - 1) : 0;
    const density = maxEdgesPossible > 0 ? Number((totalEdges / maxEdgesPossible).toFixed(4)) : 0;

    return {
      totalNodes,
      totalEdges,
      density
    };
  }

  /**
   * Verify an array of memory receipts for cryptographic chain custody.
   * @param {object[]} receiptList
   * @returns {{ ok: boolean, code: string, verifiedCount: number, error?: string }}
   */
  function verifyMemoryTrail(receiptList) {
    if (!Array.isArray(receiptList) || receiptList.length === 0) {
      return {
        ok: false,
        code: BW_CODES.TRAIL_BREAK,
        verifiedCount: 0,
        error: 'receiptList must be a non-empty array'
      };
    }

    let prevHash = null;
    let count = 0;

    for (let i = 0; i < receiptList.length; i++) {
      const rcpt = receiptList[i];
      const verifyRes = verifyAgenticMemoryReceipt(rcpt, hashFn);

      if (!verifyRes.ok) {
        return {
          ok: false,
          code: BW_CODES.TRAIL_BREAK,
          verifiedCount: count,
          error: `receipt verification failed at index ${i}: ${verifyRes.reason}`
        };
      }

      if (i > 0 && rcpt.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          code: BW_CODES.TRAIL_BREAK,
          verifiedCount: count,
          error: `hash chain broken at index ${i}: expected prevReceiptHash '${prevHash}', got '${rcpt.prevReceiptHash}'`
        };
      }

      prevHash = rcpt.receiptHash;
      count += 1;
    }

    return {
      ok: true,
      code: BW_CODES.TRAIL_OK,
      verifiedCount: count
    };
  }

  /**
   * Reset in-memory state for testing.
   */
  function _resetForTests() {
    nodes.clear();
    adjacency.clear();
    receipts.length = 0;
    lastReceiptHash = null;
    _resetReceiptSeqForTests();
  }

  return Object.freeze({
    kind: BW_KIND,
    productionReady: BW_PRODUCTION_READY,
    storeNode,
    getNode,
    linkEdge,
    queryAssociative,
    deleteNode,
    getGraphMetrics,
    verifyMemoryTrail,
    _resetForTests
  });
}
