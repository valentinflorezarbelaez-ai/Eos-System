import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ToolDiscoveryRankingEngine {
  constructor() {
    this.dimensions = [
      'CAPABILITY_FIT',
      'CORRECTNESS',
      'RELIABILITY',
      'SECURITY',
      'OBSERVABILITY',
      'PERFORMANCE',
      'COST',
      'MAINTAINABILITY',
      'REVERSIBILITY',
      'EVIDENCE_QUALITY',
      'ECOSYSTEM_HEALTH',
      'USER_VALUE'
    ];
  }

  scoreCandidate(candidate, requiredCapabilities = []) {
    const {
      toolId,
      name,
      capabilities = [],
      securityScore = 8, // 1-10
      performanceScore = 8,
      costScore = 9,
      observabilityScore = 8,
      evidenceStatus = 'SANDBOX_READY',
      epistemicType = 'ASSUMPTION' // 'ASSUMPTION' | 'EMPIRICAL'
    } = candidate;

    // 1. Calculate Capability Fit (Ratio of required capabilities matched)
    let matchedCaps = 0;
    if (requiredCapabilities.length > 0) {
      matchedCaps = requiredCapabilities.filter(c => capabilities.includes(c)).length;
    }
    const capabilityFitScore = requiredCapabilities.length > 0
      ? Number(((matchedCaps / requiredCapabilities.length) * 10).toFixed(1))
      : 8.0;

    // If capability fit is 0, reject immediately
    if (requiredCapabilities.length > 0 && matchedCaps === 0) {
      return {
        toolId,
        name,
        totalScore: 0,
        verdict: 'REJECTED_NO_CAPABILITY_MATCH',
        recommendation: 'DO_NOT_ADOPT',
        epistemicType,
        matchedCapabilities: []
      };
    }

    // 2. Compute 12-dimensional weighted aggregate
    const weights = {
      CAPABILITY_FIT: 0.20,
      SECURITY: 0.15,
      CORRECTNESS: 0.10,
      RELIABILITY: 0.10,
      USER_VALUE: 0.10,
      PERFORMANCE: 0.08,
      OBSERVABILITY: 0.07,
      REVERSIBILITY: 0.05,
      EVIDENCE_QUALITY: 0.05,
      COST: 0.04,
      MAINTAINABILITY: 0.03,
      ECOSYSTEM_HEALTH: 0.03
    };

    const scores = {
      CAPABILITY_FIT: capabilityFitScore,
      SECURITY: securityScore,
      CORRECTNESS: 8.5,
      RELIABILITY: 8.5,
      USER_VALUE: 9.0,
      PERFORMANCE: performanceScore,
      OBSERVABILITY: observabilityScore,
      REVERSIBILITY: 9.0,
      EVIDENCE_QUALITY: evidenceStatus === 'SANDBOX_VERIFIED' || evidenceStatus === 'ADOPTED' ? 9.0 : 6.0,
      COST: costScore,
      MAINTAINABILITY: 8.5,
      ECOSYSTEM_HEALTH: 8.5
    };

    let totalScore = 0;
    this.dimensions.forEach(dim => {
      totalScore += (scores[dim] || 5.0) * (weights[dim] || 0.05);
    });
    totalScore = Number(totalScore.toFixed(2));

    // Hard security circuit breaker: if security < 5.0 or evidenceStatus === 'BLOCKED', force rejection
    if (securityScore < 5.0 || evidenceStatus === 'BLOCKED') {
      totalScore = Math.min(totalScore, 4.0);
    }

    const recommendation = totalScore >= 7.5 ? 'RECOMMEND_ADOPTION' : (totalScore >= 5.0 ? 'SANDBOX_BENCHMARK_REQUIRED' : 'REJECT');

    return {
      toolId,
      name,
      totalScore,
      epistemicType,
      scores,
      matchedCapabilities: capabilities.filter(c => requiredCapabilities.includes(c)),
      recommendation,
      evidenceStatus
    };
  }

  rankCandidates(candidates, requiredCapabilities = []) {
    const evaluated = candidates.map(c => this.scoreCandidate(c, requiredCapabilities));
    return evaluated.sort((a, b) => b.totalScore - a.totalScore);
  }
}
