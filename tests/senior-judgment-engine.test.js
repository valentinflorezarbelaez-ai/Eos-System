import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SeniorJudgmentEngine } from '../src/core/judgment/senior-judgment-engine.js';

describe('SeniorJudgmentEngine', () => {
  it('should initialize correctly', () => {
    const engine = new SeniorJudgmentEngine();
    assert.deepEqual(engine.history, []);
  });

  it('should require a title for the proposal', () => {
    const engine = new SeniorJudgmentEngine();
    assert.throws(() => engine.evaluateProposal({}), { message: 'Proposal must provide a title' });
    assert.throws(() => engine.evaluateProposal(null), { message: 'Proposal must provide a title' });
  });

  it('should approve a simple, compliant proposal', () => {
    const engine = new SeniorJudgmentEngine();
    const proposal = {
      title: 'Simple feature',
      solves_real_problem: true,
      layer_count: 1,
      agent_count: 1,
      is_decomplected: true,
      preserves_conceptual_integrity: true,
      reduces_future_change_cost: true
    };

    const result = engine.evaluateProposal(proposal);
    assert.equal(result.verdict, 'APPROVED_SIMPLE');
    assert.equal(result.seniority_score, 1.0);
    assert.deepEqual(result.criticisms, []);
    assert.ok(result.sha256);
    assert.ok(result.timestamp);
    assert.equal(engine.history.length, 1);
  });

  it('should reject architecture theater (Dan North)', () => {
    const engine = new SeniorJudgmentEngine();
    const proposal = {
      title: 'Complex architecture for no reason',
      solves_real_problem: false,
      layer_count: 5
    };

    const result = engine.evaluateProposal(proposal);
    assert.equal(result.verdict, 'REJECTED_ARCHITECTURE_THEATER');
    assert.ok(result.criticisms.some(c => c.includes('without a real, demonstrable underlying problem')));
    assert.equal(result.seniority_score, 0.3); // 1.0 - 0.2 (layers) - 0.5 (solvesReal) = 0.3
  });

  it('should reject coordination bloat (Jeff Dean)', () => {
    const engine = new SeniorJudgmentEngine();
    const proposal = {
      title: 'Too many agents',
      solves_real_problem: true,
      layer_count: 1,
      agent_count: 5
    };

    const result = engine.evaluateProposal(proposal);
    assert.equal(result.verdict, 'REJECTED_COORDINATION_BLOAT');
    assert.ok(result.criticisms.some(c => c.includes('Too many agents requested')));
    assert.equal(result.seniority_score, 0.85); // 1.0 - 0.15 (agents)
  });

  it('should reject complected design (Rich Hickey)', () => {
    const engine = new SeniorJudgmentEngine();
    const proposal = {
      title: 'Tangled components',
      solves_real_problem: true,
      layer_count: 1,
      agent_count: 1,
      is_decomplected: false
    };

    const result = engine.evaluateProposal(proposal);
    assert.equal(result.verdict, 'REJECTED_COMPLECTED_DESIGN');
    assert.ok(result.criticisms.some(c => c.includes('tightly entangled')));
    assert.equal(result.seniority_score, 0.7); // 1.0 - 0.3 (decomplected)
  });

  it('should reject conceptual drift (Fred Brooks)', () => {
    const engine = new SeniorJudgmentEngine();
    const proposal = {
      title: 'Inconsistent naming',
      solves_real_problem: true,
      layer_count: 1,
      agent_count: 1,
      is_decomplected: true,
      preserves_conceptual_integrity: false
    };

    const result = engine.evaluateProposal(proposal);
    assert.equal(result.verdict, 'REJECTED_CONCEPTUAL_DRIFT');
    assert.ok(result.criticisms.some(c => c.includes('Violates system-wide naming')));
    assert.equal(result.seniority_score, 0.8); // 1.0 - 0.2 (conceptualIntegrity)
  });

  it('should calculate score correctly for multiple violations', () => {
    const engine = new SeniorJudgmentEngine();
    const proposal = {
      title: 'Terrible proposal',
      solves_real_problem: false, // -0.5
      layer_count: 5, // -0.2
      agent_count: 3, // -0.15
      is_decomplected: false, // -0.3
      preserves_conceptual_integrity: false, // -0.2
      reduces_future_change_cost: false // -0.2
    };

    const result = engine.evaluateProposal(proposal);
    // Score floor is 0.0
    assert.equal(result.seniority_score, 0.0);
  });
});
