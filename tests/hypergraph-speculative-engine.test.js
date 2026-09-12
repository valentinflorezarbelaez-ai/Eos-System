import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HyperGraphSpeculativeEngine } from '../src/core/orchestration/hypergraph-speculative-engine.js';

describe('HyperGraphSpeculativeEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new HyperGraphSpeculativeEngine();
  });

  describe('createSpeculativeHyperGraph', () => {
    it('should create a speculative hypergraph session with valid parameters', () => {
      const params = {
        missionId: 'MISSION-123',
        baseState: { counter: 0 },
        candidateBranches: [
          { branchId: 'B1', name: 'Branch 1', hypothesis: 'Hyp 1' },
          { branchId: 'B2', name: 'Branch 2' }
        ]
      };

      const session = engine.createSpeculativeHyperGraph(params);

      assert.ok(session.hypergraph_id.startsWith('HG-'));
      assert.equal(session.mission_id, 'MISSION-123');
      assert.equal(session.status, 'BRANCHED_IN_EPHEMERAL_MEMORY');
      assert.equal(session.branches.length, 2);
      assert.equal(session.branches[0].branch_id, 'B1');
      assert.equal(session.branches[0].hypothesis, 'Hyp 1');
      assert.equal(session.branches[1].branch_id, 'B2');
      assert.equal(session.branches[1].hypothesis, 'Unspecified hypothesis');

      // Verify stored in active map
      const storedSession = engine.activeHyperGraphs.get(session.hypergraph_id);
      assert.deepEqual(storedSession, session);
    });

    it('should throw an error if missionId is missing', () => {
      const params = {
        candidateBranches: [{ branchId: 'B1' }]
      };

      assert.throws(() => {
        engine.createSpeculativeHyperGraph(params);
      }, /HYPERGRAPH_ERROR: missionId is required/);
    });

    it('should throw an error if candidateBranches is empty or not an array', () => {
      assert.throws(() => {
        engine.createSpeculativeHyperGraph({ missionId: 'M1', candidateBranches: [] });
      }, /HYPERGRAPH_ERROR: candidateBranches must be a non-empty array/);

      assert.throws(() => {
        engine.createSpeculativeHyperGraph({ missionId: 'M1' });
      }, /HYPERGRAPH_ERROR: candidateBranches must be a non-empty array/);
    });
  });

  describe('evaluateAndCollapse', () => {
    let activeSessionId;

    beforeEach(() => {
      const session = engine.createSpeculativeHyperGraph({
        missionId: 'M1',
        candidateBranches: [
          { branchId: 'B1' },
          { branchId: 'B2' }
        ]
      });
      activeSessionId = session.hypergraph_id;
    });

    it('should collapse to the most optimal viable branch', () => {
      const evaluations = [
        {
          branchId: 'B1',
          testResults: { passed: 5, failed: 0 },
          latencyMs: 100,
          complexityScore: 2
        },
        {
          branchId: 'B2',
          testResults: { passed: 3, failed: 0 },
          latencyMs: 800,
          complexityScore: 8
        }
      ];

      const receipt = engine.evaluateAndCollapse({ hyperGraphId: activeSessionId, evaluations });

      assert.equal(receipt.verdict, 'SPECULATIVE_COLLAPSE_SUCCESS');
      assert.equal(receipt.collapsed_to, 'B1'); // B1 should have better fitness (lower latency/complexity, perfect pass rate)
      assert.ok(receipt.winner_fitness_score > 0);
      assert.equal(receipt.evaluated_branches.length, 2);

      const b1Status = receipt.evaluated_branches.find(b => b.branch_id === 'B1').status;
      const b2Status = receipt.evaluated_branches.find(b => b.branch_id === 'B2').status;

      assert.equal(b1Status, 'COLLAPSED_WINNER');
      assert.equal(b2Status, 'PRUNED_EPHEMERAL');

      // Verify removed from active map and added to history
      assert.ok(!engine.activeHyperGraphs.has(activeSessionId));
      assert.equal(engine.collapseHistory.length, 1);
      assert.deepEqual(engine.collapseHistory[0], receipt);
    });

    it('should return failure receipt if no branches are viable', () => {
      const evaluations = [
        {
          branchId: 'B1',
          testResults: { passed: 1, failed: 1 }, // Failed tests make it non-viable
          latencyMs: 100,
          complexityScore: 2
        },
        {
          branchId: 'B2',
          testResults: { passed: 0, failed: 5 },
          latencyMs: 800,
          complexityScore: 8
        }
      ];

      const receipt = engine.evaluateAndCollapse({ hyperGraphId: activeSessionId, evaluations });

      assert.equal(receipt.verdict, 'COLLAPSE_FAILED_ZERO_VIABLE_BRANCHES');
      assert.equal(receipt.collapsed_to, null);

      // Should still be in active map
      assert.ok(engine.activeHyperGraphs.has(activeSessionId));
    });

    it('should throw an error if hyperGraphId is invalid', () => {
      assert.throws(() => {
        engine.evaluateAndCollapse({ hyperGraphId: 'INVALID', evaluations: [{ branchId: 'B1' }] });
      }, /HYPERGRAPH_ERROR: Session not found for ID INVALID/);
    });

    it('should throw an error if evaluations is missing or empty', () => {
      assert.throws(() => {
        engine.evaluateAndCollapse({ hyperGraphId: activeSessionId, evaluations: [] });
      }, /HYPERGRAPH_ERROR: evaluations must be a non-empty array/);

      assert.throws(() => {
        engine.evaluateAndCollapse({ hyperGraphId: activeSessionId });
      }, /HYPERGRAPH_ERROR: evaluations must be a non-empty array/);
    });
  });
});
