/**
 * @file tests/eos-br-sovereign-intent-parser-port.test.js
 * SPEC-0075 / Mission BR — Sovereign Intent Parser & Atomic Task DAG Decomposer Port Test Suite.
 *
 * 100% hermetic: node:test + node:assert/strict. Zero network, zero external dependencies.
 * Verifies:
 * - Intent parsing & goal normalization
 * - Atomic task DAG decomposition (default heuristic & custom nodes)
 * - Kahn's algorithm cycle detection (self-cycle, 2-node cycle, 3-node cycle)
 * - Missing prerequisite & duplicate node ID policy gates
 * - Fundacion ALWAYS_DENY write barrier
 * - Sealed BR-RCPT-* receipts & cryptographic trail verification
 * - Non-claim bounds and Law VI compliance
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSovereignIntentParserPort,
  buildIntentDecompositionReceipt,
  verifyIntentDecompositionReceipt,
  validateGraphTopology,
  validateIntentPayload,
  isFundacionTarget,
  BR_PRODUCTION_READY,
  BR_RECEIPT_KIND,
  BR_CODES,
  _resetReceiptSeqForTests
} from '../src/core/orchestration/sovereign-intent-parser-port.js';

describe('SPEC-0075 Mission BR — Sovereign Intent Parser & DAG Decomposer Port', () => {
  let port;
  let simulatedTime;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    simulatedTime = 1773532800000; // 2026-03-15T00:00:00.000Z
    port = createSovereignIntentParserPort({
      now: () => new Date(simulatedTime).toISOString()
    });
  });

  describe('1. Governance & Invariant Baseline', () => {
    test('PRODUCTION_READY must be strictly NO', () => {
      assert.equal(BR_PRODUCTION_READY, 'NO');
      assert.equal(port.productionReady, 'NO');
    });

    test('Fundacion targets are strictly identified and rejected', () => {
      assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/app.js'), true);
      assert.equal(isFundacionTarget('documents/fundacion'), true);
      assert.equal(isFundacionTarget('src/core/orchestration'), false);
    });
  });

  describe('2. Intent Parsing & Normalization', () => {
    test('parses clean valid intent and extracts tags', () => {
      const res = port.parseIntent('Build and verify the authentication service');
      assert.equal(res.ok, true);
      assert.equal(res.code, BR_CODES.PARSE_OK);
      assert.equal(res.parsedGoal, 'Build and verify the authentication service');
      assert.ok(res.rawIntentHash.length === 64);
      assert.ok(res.tags.includes('implementation'));
      assert.ok(res.tags.includes('verification'));
      assert.equal(res.fundacionDelta, 0);
    });

    test('rejects empty or blank intents (AMBIGUOUS_INTENT_DENY)', () => {
      const res1 = port.parseIntent('');
      assert.equal(res1.ok, false);
      assert.equal(res1.code, BR_CODES.AMBIGUOUS_INTENT_DENY);

      const res2 = port.parseIntent('   ');
      assert.equal(res2.ok, false);
      assert.equal(res2.code, BR_CODES.AMBIGUOUS_INTENT_DENY);

      const res3 = port.parseIntent(null);
      assert.equal(res3.ok, false);
      assert.equal(res3.code, BR_CODES.AMBIGUOUS_INTENT_DENY);
    });

    test('rejects intents exceeding maximum character bound (SCOPE_LIMIT_EXCEEDED)', () => {
      const longIntent = 'A'.repeat(4001);
      const res = port.parseIntent(longIntent);
      assert.equal(res.ok, false);
      assert.equal(res.code, BR_CODES.SCOPE_LIMIT_EXCEEDED);
    });

    test('triggers FUNDACION_ALWAYS_DENY on forbidden target in goal', () => {
      const res = port.parseIntent('Deploy database changes to Documents/Fundacion repository');
      assert.equal(res.ok, false);
      assert.equal(res.code, BR_CODES.FUNDACION_ALWAYS_DENY);
      assert.equal(res.fundacionDelta, 0);
    });
  });

  describe('3. Default Heuristic Task DAG Decomposition', () => {
    test('decomposes intent into 4 sequential atomic nodes with zero cycles', () => {
      const decomp = port.decomposeTaskDag('Implement user profile caching layer');
      assert.equal(decomp.ok, true);
      assert.equal(decomp.code, BR_CODES.DECOMPOSED_OK);
      assert.ok(decomp.dag);
      assert.equal(decomp.dag.nodeCount, 4);
      assert.equal(decomp.dag.edgeCount, 3);
      assert.equal(decomp.dag.sortedOrder.length, 4);

      // Verify Kahn topological sequence
      const order = decomp.dag.sortedOrder;
      assert.ok(order[0].endsWith('task-01-intake'));
      assert.ok(order[1].endsWith('task-02-domain-execution'));
      assert.ok(order[2].endsWith('task-03-verification-audit'));
      assert.ok(order[3].endsWith('task-04-evidence-custody'));

      // Verify receipt
      assert.ok(decomp.receipt);
      assert.equal(decomp.receipt.kind, BR_RECEIPT_KIND);
      assert.ok(decomp.receipt.receiptId.startsWith('BR-RCPT-'));
      assert.equal(decomp.receipt.status, BR_CODES.DECOMPOSED_OK);
      assert.equal(decomp.receipt.nodeCount, 4);
      assert.equal(decomp.receipt.fundacionDelta, 0);
      assert.equal(decomp.receipt.nonClaims.generalAgiPlanner, false);

      const v = verifyIntentDecompositionReceipt(decomp.receipt);
      assert.equal(v.ok, true);
    });
  });

  describe('4. Custom Nodes & Topological Cycle Detection (Kahn)', () => {
    test('validates valid custom DAG with branching and merging', () => {
      const customNodes = [
        { id: 'step-1', name: 'Intake', dependsOn: [] },
        { id: 'step-2a', name: 'Frontend', dependsOn: ['step-1'] },
        { id: 'step-2b', name: 'Backend', dependsOn: ['step-1'] },
        { id: 'step-3', name: 'E2E Verification', dependsOn: ['step-2a', 'step-2b'] }
      ];

      const decomp = port.decomposeTaskDag('Fullstack feature build', { customNodes });
      assert.equal(decomp.ok, true);
      assert.equal(decomp.dag.nodeCount, 4);
      assert.equal(decomp.dag.edgeCount, 4);
      assert.equal(decomp.dag.sortedOrder[0], 'step-1');
      assert.equal(decomp.dag.sortedOrder[3], 'step-3');
    });

    test('detects and rejects immediate self-cycle (A -> A)', () => {
      const customNodes = [
        { id: 'task-A', name: 'Infinite Self Loop', dependsOn: ['task-A'] }
      ];

      const decomp = port.decomposeTaskDag('Cyclic intent', { customNodes });
      assert.equal(decomp.ok, false);
      assert.equal(decomp.code, BR_CODES.CYCLICAL_DEPENDENCY_DENY);
      assert.ok(decomp.receipt);
      assert.equal(decomp.receipt.status, BR_CODES.CYCLICAL_DEPENDENCY_DENY);
    });

    test('detects and rejects 2-node circular cycle (A -> B -> A)', () => {
      const customNodes = [
        { id: 'node-A', name: 'A', dependsOn: ['node-B'] },
        { id: 'node-B', name: 'B', dependsOn: ['node-A'] }
      ];

      const decomp = port.decomposeTaskDag('Two-node cycle', { customNodes });
      assert.equal(decomp.ok, false);
      assert.equal(decomp.code, BR_CODES.CYCLICAL_DEPENDENCY_DENY);
      assert.ok(decomp.cycleNodes.includes('node-A'));
      assert.ok(decomp.cycleNodes.includes('node-B'));
    });

    test('detects and rejects 3-node transitive cycle (A -> B -> C -> A)', () => {
      const customNodes = [
        { id: 'node-1', name: '1', dependsOn: ['node-3'] },
        { id: 'node-2', name: '2', dependsOn: ['node-1'] },
        { id: 'node-3', name: '3', dependsOn: ['node-2'] }
      ];

      const decomp = port.decomposeTaskDag('Three-node cycle', { customNodes });
      assert.equal(decomp.ok, false);
      assert.equal(decomp.code, BR_CODES.CYCLICAL_DEPENDENCY_DENY);
      assert.equal(decomp.cycleNodes.length, 3);
    });

    test('rejects missing prerequisite reference (MISSING_PREREQUISITE_DENY)', () => {
      const customNodes = [
        { id: 'task-A', name: 'A', dependsOn: ['task-GHOST'] }
      ];

      const decomp = port.decomposeTaskDag('Missing dep', { customNodes });
      assert.equal(decomp.ok, false);
      assert.equal(decomp.code, BR_CODES.MISSING_PREREQUISITE_DENY);
      assert.ok(decomp.reason.includes('task-GHOST'));
    });

    test('rejects duplicate task node IDs (DUPLICATE_NODE_ID_DENY)', () => {
      const customNodes = [
        { id: 'task-dup', name: 'First', dependsOn: [] },
        { id: 'task-dup', name: 'Second', dependsOn: [] }
      ];

      const decomp = port.decomposeTaskDag('Duplicate node', { customNodes });
      assert.equal(decomp.ok, false);
      assert.equal(decomp.code, BR_CODES.DUPLICATE_NODE_ID_DENY);
    });
  });

  describe('5. Cryptographic Receipts & Trail Custody', () => {
    test('validates intact receipt chain of 3 decomposition steps', () => {
      const r1 = port.decomposeTaskDag('Phase 1: Setup');
      assert.equal(r1.ok, true);

      simulatedTime += 1000;
      const r2 = port.decomposeTaskDag('Phase 2: Core implementation', {
        prevReceiptHash: r1.receipt.receiptHash
      });
      assert.equal(r2.ok, true);

      simulatedTime += 1000;
      const r3 = port.decomposeTaskDag('Phase 3: Integration verification', {
        prevReceiptHash: r2.receipt.receiptHash
      });
      assert.equal(r3.ok, true);

      const trail = port.verifyDecompositionTrail([
        r1.receipt,
        r2.receipt,
        r3.receipt
      ]);
      assert.equal(trail.ok, true);
      assert.equal(trail.code, BR_CODES.TRAIL_OK);
      assert.equal(trail.verifiedCount, 3);
    });

    test('fails trail verification on tampered receipt payload', () => {
      const r1 = port.decomposeTaskDag('Clean goal');
      const tampered = { ...r1.receipt, parsedGoal: 'Tampered goal content' };

      const trail = port.verifyDecompositionTrail([tampered]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BR_CODES.TRAIL_BREAK);
      assert.ok(trail.reason.includes('receipt validation failed'));
    });

    test('fails trail verification on sequence broken prevReceiptHash', () => {
      const r1 = port.decomposeTaskDag('Step 1');
      const r2 = port.decomposeTaskDag('Step 2', {
        prevReceiptHash: 'forged_fake_hash_00000000000000000000000000000000000000000000000000000000'
      });

      const trail = port.verifyDecompositionTrail([r1.receipt, r2.receipt]);
      assert.equal(trail.ok, false);
      assert.equal(trail.code, BR_CODES.TRAIL_BREAK);
      assert.ok(trail.reason.includes('hash chain broken'));
    });
  });
});
