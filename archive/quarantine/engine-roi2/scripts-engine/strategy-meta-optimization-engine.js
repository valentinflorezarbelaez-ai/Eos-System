import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class StrategyMetaOptimizationEngine {
  constructor() {
    this.strategyMemory = new Map();
  }

  evaluateStrategyCandidates(problemClass, candidateStrategies = []) {
    if (!candidateStrategies || candidateStrategies.length === 0) {
      throw new Error('INVALID_STRATEGIES: candidateStrategies array is required');
    }

    const scoredStrategies = candidateStrategies.map(strat => {
      const {
        strategyId,
        name,
        workflowSteps = [],
        observedQuality = 8.5,
        observedUserValue = 8.5,
        latencyMinutes = 30,
        costScore = 8.0,
        riskScore = 9.0,
        reworkRate = 0.05
      } = strat;

      // 7-Dimensional Strategy Scoring:
      // User Value (0.25), Quality (0.25), Low Rework (0.15), Risk Containment (0.15), Cost (0.10), Speed (0.10)
      const reworkPenalty = (1 - reworkRate) * 10;
      const speedScore = Math.max(0, 10 - (latencyMinutes / 10));

      const totalScore = Number((
        observedUserValue * 0.25 +
        observedQuality * 0.25 +
        reworkPenalty * 0.15 +
        riskScore * 0.15 +
        costScore * 0.10 +
        speedScore * 0.10
      ).toFixed(2));

      return {
        strategyId,
        name,
        workflowSteps,
        totalScore,
        observedUserValue,
        observedQuality,
        reworkRate
      };
    });

    // Sort descending
    scoredStrategies.sort((a, b) => b.totalScore - a.totalScore);
    const bestStrategy = scoredStrategies[0];

    // Persist into Strategy Memory as Best Known Method (BKM)
    const bkmRecord = {
      problemClass,
      bestKnownMethodId: bestStrategy.strategyId,
      name: bestStrategy.name,
      workflowSteps: bestStrategy.workflowSteps,
      benchmarkScore: bestStrategy.totalScore,
      updatedAt: new Date().toISOString()
    };
    this.strategyMemory.set(problemClass, bkmRecord);

    return {
      problemClass,
      selectedBkm: bkmRecord,
      evaluatedStrategies: scoredStrategies,
      learningVerdict: `Strategy ${bestStrategy.name} established as Best Known Method for ${problemClass}`
    };
  }

  getBestKnownMethod(problemClass) {
    return this.strategyMemory.get(problemClass) || null;
  }
}
