import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousSelfReflectionEngine } from '../src/core/evolution/autonomous-self-reflection-engine.js';

describe('AutonomousSelfReflectionEngine', () => {
  it('should initialize correctly', () => {
    const engine = new AutonomousSelfReflectionEngine();
    assert.deepEqual(engine.reflectionLog, []);
    assert.deepEqual(engine.evolutionProposals, []);
  });

  describe('conductSelfReflection()', () => {
    it('throws error when executionContext is missing', () => {
      const engine = new AutonomousSelfReflectionEngine();
      assert.throws(
        () => engine.conductSelfReflection(),
        /SELF_REFLECTION_ERROR: executionContext must include mission_id/
      );
    });

    it('throws error when executionContext.mission_id is missing', () => {
      const engine = new AutonomousSelfReflectionEngine();
      assert.throws(
        () => engine.conductSelfReflection({}),
        /SELF_REFLECTION_ERROR: executionContext must include mission_id/
      );
    });

    it('processes a flawless execution correctly', () => {
      const engine = new AutonomousSelfReflectionEngine();
      const ctx = {
        mission_id: 'M-123',
        duration_ms: 1000,
        token_usage: 5000,
        tests_executed: 50,
        tests_failed: 0,
        warnings: [],
        friction_points: []
      };

      const result = engine.conductSelfReflection(ctx);

      assert.equal(result.mission_id, 'M-123');
      assert.equal(result.health_score, 1.0);
      assert.equal(result.is_flawless, true);
      assert.equal(result.verdict, 'EVOLUTION_PROGRESS_POSITIVE');

      // Assert self interrogation
      assert.match(result.self_interrogation.q1_what_was_achieved, /Executed mission M-123 with 50 tests passing. Health Score: 1/);
      assert.deepEqual(result.self_interrogation.q2_where_was_friction_or_waste, ['Zero systemic friction detected; execution path was optimal.']);
      assert.deepEqual(result.self_interrogation.q3_what_invariants_were_stressed, ['All architectural boundaries and governance limits remained strictly unbroken.']);

      // Should generate continuous refinement hypothesis
      assert.equal(result.optimization_hypotheses.length, 1);
      assert.equal(result.optimization_hypotheses[0].area, 'CONTINUOUS_REFINEMENT');

      // Should store in log
      assert.equal(engine.reflectionLog.length, 1);
      assert.equal(engine.reflectionLog[0].mission_id, 'M-123');

      // Should calculate sha256
      assert.ok(result.sha256);
    });

    it('generates LATENCY_OPTIMIZATION hypothesis when duration_ms > 5000', () => {
      const engine = new AutonomousSelfReflectionEngine();
      const result = engine.conductSelfReflection({
        mission_id: 'M-456',
        duration_ms: 6000
      });

      assert.equal(result.optimization_hypotheses[0].area, 'LATENCY_OPTIMIZATION');
      assert.equal(result.optimization_hypotheses[0].hypothesis, 'Parallelize independent DAG execution waves to cut execution wall-clock time by ~40%.');
    });

    it('generates TOKEN_COMPRESSION hypothesis when token_usage > 50000', () => {
      const engine = new AutonomousSelfReflectionEngine();
      const result = engine.conductSelfReflection({
        mission_id: 'M-456',
        token_usage: 55000
      });

      assert.equal(result.optimization_hypotheses[0].area, 'TOKEN_COMPRESSION');
    });

    it('generates RESILIENCY_SELF_HEALING hypothesis when friction_points > 0', () => {
      const engine = new AutonomousSelfReflectionEngine();
      const result = engine.conductSelfReflection({
        mission_id: 'M-456',
        friction_points: ['API Timeout']
      });

      assert.equal(result.optimization_hypotheses[0].area, 'RESILIENCY_SELF_HEALING');
      assert.deepEqual(result.self_interrogation.q2_where_was_friction_or_waste, ['API Timeout']);
    });

    it('generates multiple hypotheses if multiple criteria are met', () => {
      const engine = new AutonomousSelfReflectionEngine();
      const result = engine.conductSelfReflection({
        mission_id: 'M-456',
        duration_ms: 5001,
        token_usage: 50001,
        friction_points: ['Rate limit hit']
      });

      assert.equal(result.optimization_hypotheses.length, 3);
      assert.deepEqual(
        result.optimization_hypotheses.map(h => h.area),
        ['LATENCY_OPTIMIZATION', 'TOKEN_COMPRESSION', 'RESILIENCY_SELF_HEALING']
      );
      assert.deepEqual(
        result.self_interrogation.q4_how_to_elevate_to_next_level,
        result.optimization_hypotheses.map(h => h.hypothesis)
      );
    });

    it('calculates executionHealthScore and sets REMEDIATION_REQUIRED when < 0.8', () => {
      const engine = new AutonomousSelfReflectionEngine();
      const result = engine.conductSelfReflection({
        mission_id: 'M-789',
        tests_failed: 2, // 2 * 0.2 = 0.4 penalty
        warnings: ['Deprecation warning'] // 1 * 0.05 = 0.05 penalty
        // Total penalty: 0.45. Score: 0.55
      });

      assert.equal(result.is_flawless, false);
      assert.equal(result.health_score, 0.55);
      assert.equal(result.verdict, 'REMEDIATION_REQUIRED');
      assert.deepEqual(result.self_interrogation.q3_what_invariants_were_stressed, ['Deprecation warning']);
    });

    it('floors executionHealthScore at 0', () => {
      const engine = new AutonomousSelfReflectionEngine();
      const result = engine.conductSelfReflection({
        mission_id: 'M-789',
        tests_failed: 10 // 10 * 0.2 = 2.0 penalty
      });

      assert.equal(result.health_score, 0);
      assert.equal(result.verdict, 'REMEDIATION_REQUIRED');
    });
  });
});
