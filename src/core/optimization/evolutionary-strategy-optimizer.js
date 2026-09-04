/**
 * @module EvolutionaryStrategyOptimizer
 * @description Multi-objective Pareto strategy optimizer for architecture decisions.
 * Evaluates candidate strategies across Latency, Memory, Bloat Index, and Reversibility.
 */

import { createHash, randomBytes } from 'node:crypto';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class EvolutionaryStrategyOptimizer {
  constructor(options = {}) {
    this.decisionHistory = [];
  }

  /**
   * Evaluates and ranks candidate architectural strategies using a Pareto multi-objective fitness function
   * @param {Array<object>} candidates Array of { id, name, estimatedLatencyMs, memoryBytes, bloatIndex, reversibilityScore }
   * @param {object} [weights] Custom weighting { latency, memory, bloat, reversibility }
   * @returns {object} StrategyDecisionRecord with winner and detailed rationale
   */
  evaluateCandidates(candidates = [], weights = {}) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error('OPTIMIZER_ERROR: candidates must be a non-empty array');
    }

    const wLatency = weights.latency ?? 0.25;
    const wMemory = weights.memory ?? 0.20;
    const wBloat = weights.bloat ?? 0.30;
    const wReversibility = weights.reversibility ?? 0.25;

    // Find min and max for normalization
    const minLat = Math.min(...candidates.map(c => c.estimatedLatencyMs || 100));
    const maxLat = Math.max(...candidates.map(c => c.estimatedLatencyMs || 100));
    const minMem = Math.min(...candidates.map(c => c.memoryBytes || 1024));
    const maxMem = Math.max(...candidates.map(c => c.memoryBytes || 1024));

    const scoredCandidates = candidates.map(c => {
      const latScore = maxLat === minLat ? 1.0 : 1.0 - ((c.estimatedLatencyMs - minLat) / (maxLat - minLat));
      const memScore = maxMem === minMem ? 1.0 : 1.0 - ((c.memoryBytes - minMem) / (maxMem - minMem));
      const bloatScore = Math.max(0, 1.0 - ((c.bloatIndex || 0) / 10.0));
      const revScore = Math.min(1.0, Math.max(0, c.reversibilityScore ?? 0.5));

      const compositeScore =
        latScore * wLatency +
        memScore * wMemory +
        bloatScore * wBloat +
        revScore * wReversibility;

      return {
        ...c,
        fitness_score: Math.round(compositeScore * 1000) / 1000,
        subscores: {
          latency_score: Math.round(latScore * 100) / 100,
          memory_score: Math.round(memScore * 100) / 100,
          bloat_score: Math.round(bloatScore * 100) / 100,
          reversibility_score: Math.round(revScore * 100) / 100
        }
      };
    });

    // Sort descending by fitness score
    scoredCandidates.sort((a, b) => b.fitness_score - a.fitness_score);
    const winner = scoredCandidates[0];

    const decisionRecord = {
      decision_id: `STRAT-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      selected_candidate: winner.id,
      selected_name: winner.name,
      winner_fitness_score: winner.fitness_score,
      why_selected: `Highest composite fitness score (${winner.fitness_score}/1.0). Optimal balance of low bloat index (${winner.bloatIndex || 0}) and high reversibility (${winner.reversibilityScore ?? 1.0}).`,
      candidates_comparison: scoredCandidates.map(c => ({
        id: c.id,
        name: c.name,
        fitness_score: c.fitness_score,
        verdict: c.id === winner.id ? 'SELECTED_PARETO_OPTIMAL' : 'REJECTED_SUBOPTIMAL',
        rejection_reason: c.id === winner.id ? null : `Suboptimal fitness score (${c.fitness_score} vs ${winner.fitness_score})`
      })),
      timestamp: new Date().toISOString()
    };

    decisionRecord.sha256 = calculateSha256(JSON.stringify(decisionRecord));
    this.decisionHistory.push(decisionRecord);
    return decisionRecord;
  }
}
