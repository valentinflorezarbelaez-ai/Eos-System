/**
 * @file tests/eos-bw-sovereign-agentic-memory-port.test.js
 * SPEC-0080 / Mission BW — Sovereign Agentic Knowledge Graph & Associative Memory Port Test Suite.
 *
 * 100% hermetic: node:test + node:assert/strict. Zero network, zero external dependencies.
 * Verifies:
 * - Entity node ingestion, digest hashing, and access tracking
 * - Relation edge linking and bidirectional connectivity
 * - Associative contextual BFS traversal with decay-weighted scoring
 * - Graph cycle protection and visited deduplication
 * - Node deletion and incident edge pruning
 * - Law VI secret screening and fail-closed denial
 * - Fundacion ALWAYS_DENY write barrier enforcement
 * - Sealed BW-RCPT-* receipts & cryptographic trail custody verification
 * - Non-claim bounds and governance invariants
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSovereignAgenticMemoryPort,
  BW_PRODUCTION_READY,
  BW_KIND
} from '../src/core/memory/sovereign-agentic-memory-port.js';

import {
  buildAgenticMemoryReceipt,
  verifyAgenticMemoryReceipt,
  BW_RECEIPT_KIND,
  _resetReceiptSeqForTests
} from '../src/core/memory/agentic-memory-receipt.js';

import {
  BW_CODES,
  isFundacionTarget,
  scanForSecrets
} from '../src/core/memory/agentic-memory-policy-gate.js';

describe('SPEC-0080 Mission BW — Sovereign Agentic Knowledge Graph & Memory Port', () => {
  let port;
  let simulatedTime;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    simulatedTime = 1773532800000; // 2026-03-15T00:00:00.000Z
    port = createSovereignAgenticMemoryPort({
      now: () => new Date(simulatedTime).toISOString()
    });
  });

  describe('1. Governance & Invariant Baseline', () => {
    test('PRODUCTION_READY must be strictly NO', () => {
      assert.equal(BW_PRODUCTION_READY, 'NO');
      assert.equal(port.productionReady, 'NO');
    });

    test('Fundacion targets are strictly identified and rejected', () => {
      assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/agent.json'), true);
      assert.equal(isFundacionTarget('documents/fundacion'), true);
      assert.equal(isFundacionTarget('src/core/memory'), false);
    });

    test('Law VI secret scanner identifies common credentials', () => {
      const synthOpenAi = String.fromCharCode(115, 107, 45) + '1234567890abcdef1234567890abcdef';
      const synthGoogle = String.fromCharCode(65, 73, 122, 97, 83, 121) + 'D9x8y7w6v5u4t3s2r1q0p9o8n7m6l5k4';
      const synthGithub = String.fromCharCode(103, 104, 112, 95) + '1234567890abcdef1234567890abcdef1234';

      assert.equal(scanForSecrets(synthOpenAi), true);
      assert.equal(scanForSecrets(synthGoogle), true);
      assert.equal(scanForSecrets({ key: synthGithub }), true);
      assert.equal(scanForSecrets('clean operational text'), false);
    });
  });

  describe('2. Entity Node Ingestion & Retrieval (REQ-EARS-BW-01)', () => {
    test('ingests valid entity node and seals BW-RCPT-* receipt', () => {
      const res = port.storeNode({
        id: 'concept:tdd',
        label: 'Test-Driven Development',
        entityType: 'engineering-discipline',
        properties: { rigor: 'strict', cycle: ['red', 'green', 'refactor'] }
      });

      assert.equal(res.ok, true);
      assert.equal(res.code, BW_CODES.NODE_INGEST_OK);
      assert.equal(res.node.id, 'concept:tdd');
      assert.equal(res.node.accessCount, 1);
      assert.ok(res.node.digest.length === 64);
      assert.equal(res.fundacionDelta, 0);

      assert.ok(res.receipt);
      assert.equal(res.receipt.kind, BW_RECEIPT_KIND);
      assert.ok(res.receipt.receiptId.startsWith('BW-RCPT-'));
      assert.equal(res.receipt.status, BW_CODES.NODE_INGEST_OK);
      assert.equal(res.receipt.entityId, 'concept:tdd');

      const v = verifyAgenticMemoryReceipt(res.receipt);
      assert.equal(v.ok, true);
    });

    test('retrieves existing node and updates access frequency count', () => {
      port.storeNode({
        id: 'concept:hexagonal',
        label: 'Hexagonal Architecture',
        entityType: 'architecture-pattern'
      });

      const firstGet = port.getNode('concept:hexagonal');
      assert.equal(firstGet.ok, true);
      assert.equal(firstGet.node.accessCount, 2);

      const secondGet = port.getNode('concept:hexagonal');
      assert.equal(secondGet.ok, true);
      assert.equal(secondGet.node.accessCount, 3);
    });

    test('rejects malformed node payload (MALFORMED_NODE_DENY)', () => {
      const res1 = port.storeNode(null);
      assert.equal(res1.ok, false);
      assert.equal(res1.code, BW_CODES.MALFORMED_NODE_DENY);

      const res2 = port.storeNode({ id: '', label: 'Test', entityType: 'concept' });
      assert.equal(res2.ok, false);
      assert.equal(res2.code, BW_CODES.MALFORMED_NODE_DENY);

      const res3 = port.storeNode({ id: 'valid', label: '', entityType: 'concept' });
      assert.equal(res3.ok, false);
      assert.equal(res3.code, BW_CODES.MALFORMED_NODE_DENY);
    });

    test('triggers FUNDACION_ALWAYS_DENY on node targeting Fundacion', () => {
      const res = port.storeNode({
        id: 'node:fundacion-sync',
        label: 'Fundacion Bridge',
        entityType: 'external-target',
        target: 'C:/Users/valen/Documents/Fundacion/app'
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BW_CODES.FUNDACION_ALWAYS_DENY);
      assert.equal(res.fundacionDelta, 0);
    });

    test('triggers SECRET_DETECTED_DENY on node containing credentials (Law VI)', () => {
      const res = port.storeNode({
        id: 'node:api-config',
        label: 'API Key Config',
        entityType: 'configuration',
        properties: { apiKey: String.fromCharCode(115, 107, 45) + '1234567890abcdef1234567890abcdef' }
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BW_CODES.SECRET_DETECTED_DENY);
    });
  });

  describe('3. Relation Edge Linking (REQ-EARS-BW-02)', () => {
    beforeEach(() => {
      port.storeNode({ id: 'node:agent-architect', label: 'Systems Architect', entityType: 'agent-role' });
      port.storeNode({ id: 'node:specboot', label: 'SpecBoot Harness', entityType: 'framework' });
      port.storeNode({ id: 'node:ears', label: 'EARS Syntax', entityType: 'standard' });
    });

    test('links directional and bidirectional edges with valid weights', () => {
      const edgeRes = port.linkEdge({
        sourceId: 'node:agent-architect',
        targetId: 'node:specboot',
        relationType: 'operates',
        weight: 1.5,
        bidirectional: true
      });

      assert.equal(edgeRes.ok, true);
      assert.equal(edgeRes.code, BW_CODES.EDGE_LINK_OK);
      assert.equal(edgeRes.edge.weight, 1.5);
      assert.ok(edgeRes.receipt.receiptId.startsWith('BW-RCPT-'));
    });

    test('denies edge linking to non-existent node (NODE_NOT_FOUND_DENY)', () => {
      const edgeRes = port.linkEdge({
        sourceId: 'node:agent-architect',
        targetId: 'node:non-existent',
        relationType: 'uses'
      });

      assert.equal(edgeRes.ok, false);
      assert.equal(edgeRes.code, BW_CODES.NODE_NOT_FOUND_DENY);
      assert.ok(edgeRes.receipt);
      assert.equal(edgeRes.receipt.status, BW_CODES.NODE_NOT_FOUND_DENY);
    });

    test('rejects malformed edge payload (MALFORMED_EDGE_DENY)', () => {
      const res1 = port.linkEdge(null);
      assert.equal(res1.ok, false);
      assert.equal(res1.code, BW_CODES.MALFORMED_EDGE_DENY);

      const res2 = port.linkEdge({ sourceId: '', targetId: 'node:specboot', relationType: 'uses' });
      assert.equal(res2.ok, false);
      assert.equal(res2.code, BW_CODES.MALFORMED_EDGE_DENY);
    });
  });

  describe('4. Associative Contextual Traversal & Scoring (REQ-EARS-BW-03)', () => {
    beforeEach(() => {
      // Create graph topology:
      // A (Root) -> B (Weight 1.0) -> C (Weight 0.8)
      // A -> D (Weight 0.5)
      // C -> A (Creates cycle A -> B -> C -> A)
      port.storeNode({ id: 'node:A', label: 'Kernel Core', entityType: 'module' });
      port.storeNode({ id: 'node:B', label: 'Memory Bus', entityType: 'module' });
      port.storeNode({ id: 'node:C', label: 'Cache Line', entityType: 'module' });
      port.storeNode({ id: 'node:D', label: 'Telemetry Probe', entityType: 'module' });

      port.linkEdge({ sourceId: 'node:A', targetId: 'node:B', relationType: 'connects', weight: 1.0 });
      port.linkEdge({ sourceId: 'node:B', targetId: 'node:C', relationType: 'feeds', weight: 0.8 });
      port.linkEdge({ sourceId: 'node:A', targetId: 'node:D', relationType: 'monitors', weight: 0.5 });
      port.linkEdge({ sourceId: 'node:C', targetId: 'node:A', relationType: 'feedback_loop', weight: 0.9 });
    });

    test('executes associative BFS query with decay scoring and cycle prevention', () => {
      const res = port.queryAssociative({
        seedNodeId: 'node:A',
        maxDepth: 3
      });

      assert.equal(res.ok, true);
      assert.equal(res.code, BW_CODES.QUERY_OK);
      assert.equal(res.matchCount, 3); // B, C, D (A is seed, not duplicated)

      // Nodes must be sorted by relevance score descending
      assert.ok(res.results[0].relevanceScore >= res.results[1].relevanceScore);
      assert.ok(res.results[1].relevanceScore >= res.results[2].relevanceScore);

      // Verify receipt emitted
      assert.ok(res.receipt);
      assert.ok(res.receipt.receiptId.startsWith('BW-RCPT-'));
      assert.equal(res.receipt.status, BW_CODES.QUERY_OK);
    });

    test('filters matches below minRelevance threshold', () => {
      const res = port.queryAssociative({
        seedNodeId: 'node:A',
        maxDepth: 2,
        minRelevance: 0.6 // Only high-relevance nodes should pass
      });

      assert.equal(res.ok, true);
      for (const m of res.results) {
        assert.ok(m.relevanceScore >= 0.6);
      }
    });

    test('rejects query exceeding maxDepth bounds (TRAVERSAL_LIMIT_EXCEEDED_DENY)', () => {
      const res = port.queryAssociative({
        seedNodeId: 'node:A',
        maxDepth: 99
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BW_CODES.TRAVERSAL_LIMIT_EXCEEDED_DENY);
    });

    test('rejects query on non-existent seed node (NODE_NOT_FOUND_DENY)', () => {
      const res = port.queryAssociative({
        seedNodeId: 'node:phantom',
        maxDepth: 2
      });

      assert.equal(res.ok, false);
      assert.equal(res.code, BW_CODES.NODE_NOT_FOUND_DENY);
    });
  });

  describe('5. Node Deletion & Graph Structure Maintenance', () => {
    beforeEach(() => {
      port.storeNode({ id: 'node:X', label: 'Node X', entityType: 'test' });
      port.storeNode({ id: 'node:Y', label: 'Node Y', entityType: 'test' });
      port.linkEdge({ sourceId: 'node:X', targetId: 'node:Y', relationType: 'links' });
    });

    test('deletes node and cleans up edges and metrics', () => {
      const metricsBefore = port.getGraphMetrics();
      assert.equal(metricsBefore.totalNodes, 2);
      assert.equal(metricsBefore.totalEdges, 1);

      const delRes = port.deleteNode('node:X');
      assert.equal(delRes.ok, true);
      assert.equal(delRes.code, BW_CODES.NODE_DELETE_OK);
      assert.ok(delRes.receipt.receiptId.startsWith('BW-RCPT-'));

      const metricsAfter = port.getGraphMetrics();
      assert.equal(metricsAfter.totalNodes, 1);
      assert.equal(metricsAfter.totalEdges, 0);
    });

    test('rejects deleting non-existent node', () => {
      const res = port.deleteNode('node:non-existent');
      assert.equal(res.ok, false);
      assert.equal(res.code, BW_CODES.NODE_NOT_FOUND_DENY);
    });
  });

  describe('6. Cryptographic Receipts & Trail Custody (REQ-EARS-BW-05)', () => {
    test('verifies intact sequential receipt trail across operations', () => {
      const r1 = port.storeNode({ id: 'n1', label: 'N1', entityType: 't' }).receipt;
      const r2 = port.storeNode({ id: 'n2', label: 'N2', entityType: 't' }).receipt;
      const r3 = port.linkEdge({ sourceId: 'n1', targetId: 'n2', relationType: 'r' }).receipt;
      const r4 = port.queryAssociative({ seedNodeId: 'n1', maxDepth: 1 }).receipt;

      const trail = port.verifyMemoryTrail([r1, r2, r3, r4]);
      assert.equal(trail.ok, true);
      assert.equal(trail.code, BW_CODES.TRAIL_OK);
      assert.equal(trail.verifiedCount, 4);
    });

    test('fails trail verification when a receipt is tampered with', () => {
      const r1 = port.storeNode({ id: 'n1', label: 'N1', entityType: 't' }).receipt;
      const tampered = { ...r1, status: 'TAMPERED_STATUS' };

      const trail = port.verifyMemoryTrail([tampered]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BW_CODES.TRAIL_BREAK);
    });

    test('fails trail verification on broken prevReceiptHash link', () => {
      const r1 = port.storeNode({ id: 'n1', label: 'N1', entityType: 't' }).receipt;
      const r2 = port.storeNode({ id: 'n2', label: 'N2', entityType: 't' }).receipt;

      // Reverse order breaks hash chain
      const trail = port.verifyMemoryTrail([r2, r1]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BW_CODES.TRAIL_BREAK);
    });
  });
});
