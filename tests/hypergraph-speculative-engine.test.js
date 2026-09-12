import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HyperGraphSpeculativeEngine } from '../src/core/orchestration/hypergraph-speculative-engine.js';

describe('HyperGraphSpeculativeEngine', () => {
  describe('constructor', () => {
    it('should initialize activeHyperGraphs as a Map and collapseHistory as an empty array', () => {
      const engine = new HyperGraphSpeculativeEngine();
      assert.ok(engine.activeHyperGraphs instanceof Map, 'activeHyperGraphs should be a Map');
      assert.equal(engine.activeHyperGraphs.size, 0, 'activeHyperGraphs should be empty');
      assert.ok(Array.isArray(engine.collapseHistory), 'collapseHistory should be an array');
      assert.equal(engine.collapseHistory.length, 0, 'collapseHistory should be empty');
    });
  });

  describe('createSpeculativeHyperGraph', () => {
    it('should throw an error if missionId is not provided', () => {
      const engine = new HyperGraphSpeculativeEngine();
      assert.throws(() => {
        engine.createSpeculativeHyperGraph({
          baseState: {},
          candidateBranches: [{ branchId: 'B1' }]
        });
      }, /HYPERGRAPH_ERROR: missionId is required/);
    });

    it('should throw an error if candidateBranches is missing or empty', () => {
      const engine = new HyperGraphSpeculativeEngine();
      assert.throws(() => {
        engine.createSpeculativeHyperGraph({
          missionId: 'MISSION-1',
          baseState: {}
        });
      }, /HYPERGRAPH_ERROR: candidateBranches must be a non-empty array/);

      assert.throws(() => {
        engine.createSpeculativeHyperGraph({
          missionId: 'MISSION-1',
          baseState: {},
          candidateBranches: []
        });
      }, /HYPERGRAPH_ERROR: candidateBranches must be a non-empty array/);
    });

    it('should successfully create and store a session with valid inputs', () => {
      const engine = new HyperGraphSpeculativeEngine();
      const baseState = { value: 42 };
      const candidateBranches = [
        { branchId: 'B1', name: 'Branch 1', hypothesis: 'Hyp 1' },
        { branchId: 'B2', name: 'Branch 2' }
      ];

      const session = engine.createSpeculativeHyperGraph({
        missionId: 'MISSION-1',
        baseState,
        candidateBranches
      });

      // Verify returned session object
      assert.ok(session.hypergraph_id.startsWith('HG-'), 'hypergraph_id should start with HG-');
      assert.equal(session.mission_id, 'MISSION-1');
      assert.equal(session.status, 'BRANCHED_IN_EPHEMERAL_MEMORY');
      assert.ok(session.created_at, 'created_at should be populated');
      assert.ok(session.sha256, 'sha256 should be calculated');

      // Verify branches
      assert.equal(session.branches.length, 2);
      assert.equal(session.branches[0].branch_id, 'B1');
      assert.equal(session.branches[0].name, 'Branch 1');
      assert.equal(session.branches[0].hypothesis, 'Hyp 1');
      assert.equal(session.branches[0].status, 'SPECULATIVE_ACTIVE');
      assert.deepEqual(session.branches[0].state_snapshot, baseState);

      assert.equal(session.branches[1].branch_id, 'B2');
      assert.equal(session.branches[1].hypothesis, 'Unspecified hypothesis');

      // Verify internal state update
      assert.equal(engine.activeHyperGraphs.size, 1);
      assert.equal(engine.activeHyperGraphs.get(session.hypergraph_id), session);
    });
  });

  describe('evaluateAndCollapse', () => {
    it('should throw an error if session is not found for hyperGraphId', () => {
      const engine = new HyperGraphSpeculativeEngine();
      assert.throws(() => {
        engine.evaluateAndCollapse({
          hyperGraphId: 'INVALID-ID',
          evaluations: [{ branchId: 'B1' }]
        });
      }, /HYPERGRAPH_ERROR: Session not found for ID INVALID-ID/);
    });

    it('should throw an error if evaluations is missing or empty', () => {
      const engine = new HyperGraphSpeculativeEngine();
      const session = engine.createSpeculativeHyperGraph({
        missionId: 'MISSION-1',
        candidateBranches: [{ branchId: 'B1' }]
      });

      assert.throws(() => {
        engine.evaluateAndCollapse({
          hyperGraphId: session.hypergraph_id
        });
      }, /HYPERGRAPH_ERROR: evaluations must be a non-empty array/);

      assert.throws(() => {
        engine.evaluateAndCollapse({
          hyperGraphId: session.hypergraph_id,
          evaluations: []
        });
      }, /HYPERGRAPH_ERROR: evaluations must be a non-empty array/);
    });

    it('should successfully evaluate and collapse onto optimal winning branch', () => {
      const engine = new HyperGraphSpeculativeEngine();
      const session = engine.createSpeculativeHyperGraph({
        missionId: 'MISSION-1',
        candidateBranches: [
          { branchId: 'B1' },
          { branchId: 'B2' },
          { branchId: 'B3' }
        ]
      });

      const evaluations = [
        { branchId: 'B1', testResults: { passed: 5, failed: 0 }, latencyMs: 500, complexityScore: 2 }, // Winner: perfect tests, low latency, low complexity
        { branchId: 'B2', testResults: { passed: 4, failed: 1 }, latencyMs: 200, complexityScore: 1 }, // Loser: failed test (not viable)
        { branchId: 'B3', testResults: { passed: 5, failed: 0 }, latencyMs: 1500, complexityScore: 8 } // Loser: high latency, high complexity
      ];

      const receipt = engine.evaluateAndCollapse({
        hyperGraphId: session.hypergraph_id,
        evaluations
      });

      // Verify receipt
      assert.ok(receipt.receipt_id.startsWith('SCR-'), 'receipt_id should start with SCR-');
      assert.equal(receipt.hypergraph_id, session.hypergraph_id);
      assert.equal(receipt.mission_id, 'MISSION-1');
      assert.equal(receipt.verdict, 'SPECULATIVE_COLLAPSE_SUCCESS');
      assert.equal(receipt.collapsed_to, 'B1');
      assert.ok(receipt.winner_fitness_score > 0, 'winner_fitness_score should be calculated');

      // Verify evaluated branches array
      assert.equal(receipt.evaluated_branches.length, 3);
      const b1 = receipt.evaluated_branches.find(b => b.branch_id === 'B1');
      assert.equal(b1.status, 'COLLAPSED_WINNER');
      assert.equal(b1.is_viable, true);

      const b2 = receipt.evaluated_branches.find(b => b.branch_id === 'B2');
      assert.equal(b2.status, 'PRUNED_EPHEMERAL');
      assert.equal(b2.is_viable, false);

      const b3 = receipt.evaluated_branches.find(b => b.branch_id === 'B3');
      assert.equal(b3.status, 'PRUNED_EPHEMERAL');
      assert.equal(b3.is_viable, true);

      // Verify b1 won over b3
      assert.ok(b1.fitness_score > b3.fitness_score, 'b1 should have higher fitness score than b3');

      assert.ok(receipt.sha256, 'sha256 should be calculated');

      // Verify internal state update
      assert.equal(engine.activeHyperGraphs.has(session.hypergraph_id), false, 'session should be deleted');
      assert.equal(engine.collapseHistory.length, 1, 'receipt should be in history');
      assert.deepEqual(engine.collapseHistory[0], receipt);
    });

    it('should return failure receipt if no branches are viable', () => {
      const engine = new HyperGraphSpeculativeEngine();
      const session = engine.createSpeculativeHyperGraph({
        missionId: 'MISSION-1',
        candidateBranches: [
          { branchId: 'B1' },
          { branchId: 'B2' }
        ]
      });

      const evaluations = [
        { branchId: 'B1', testResults: { passed: 4, failed: 1 } },
        { branchId: 'B2', testResults: { passed: 0, failed: 5 } }
      ];

      const receipt = engine.evaluateAndCollapse({
        hyperGraphId: session.hypergraph_id,
        evaluations
      });

      assert.equal(receipt.hypergraph_id, session.hypergraph_id);
      assert.equal(receipt.mission_id, 'MISSION-1');
      assert.equal(receipt.verdict, 'COLLAPSE_FAILED_ZERO_VIABLE_BRANCHES');
      assert.equal(receipt.collapsed_to, null);
      assert.equal(receipt.evaluated_branches.length, 2);

      // Internal state should remain untouched on failure, wait, let me check the code...
      // Looking at the code: it returns failureReceipt immediately. It does NOT delete the session
      // and does NOT push to collapseHistory.
      assert.equal(engine.activeHyperGraphs.has(session.hypergraph_id), true, 'session should not be deleted on failure');
      assert.equal(engine.collapseHistory.length, 0, 'failure should not be added to collapseHistory');
    });
  });
});
