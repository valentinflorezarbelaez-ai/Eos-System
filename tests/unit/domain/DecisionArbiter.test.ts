import { describe, it, expect } from 'vitest';
import { DecisionArbiter } from '../../../src/core/domain/models/DecisionArbiter.js';
import type { AgentVote, ArbiterRole } from '../../../src/core/domain/models/DecisionArbiter.js';

describe('DecisionArbiter', () => {
  describe('Council Profiles', () => {
    it('defines 4 council profiles with specified weights and veto powers', () => {
      const profiles = DecisionArbiter.COUNCIL_PROFILES;

      expect(profiles.ARCHITECT.weight).toBe(1.0);
      expect(profiles.ARCHITECT.hasVetoPower).toBe(true);

      expect(profiles.SECURITY_AUDITOR.weight).toBe(1.2);
      expect(profiles.SECURITY_AUDITOR.hasVetoPower).toBe(true);

      expect(profiles.PERFORMANCE_ENGINEER.weight).toBe(0.9);
      expect(profiles.PERFORMANCE_ENGINEER.hasVetoPower).toBe(false);

      expect(profiles.PRODUCT_ESTIMATOR.weight).toBe(0.8);
      expect(profiles.PRODUCT_ESTIMATOR.hasVetoPower).toBe(false);
    });
  });

  describe('calculateConsensus', () => {
    const makeVote = (
      role: ArbiterRole,
      score: number,
      approved: boolean = true,
      vetoRaised: boolean = false,
      vetoReason?: string
    ): AgentVote => ({
      role,
      personaName: DecisionArbiter.COUNCIL_PROFILES[role]?.personaName || role,
      score,
      approved,
      vetoRaised,
      vetoReason,
      keyTradeoffs: [],
      recommendations: []
    });

    it('returns REJECTED_REMEDIATION_REQUIRED for empty vote list', () => {
      const result = DecisionArbiter.calculateConsensus([]);
      expect(result.compositeScore).toBe(0.0);
      expect(result.verdict).toBe('REJECTED_REMEDIATION_REQUIRED');
      expect(result.approvalPercentage).toBe(0);
      expect(result.vetoes).toEqual([]);
      expect(result.dissentCount).toBe(0);
    });

    it('returns UNANIMOUS_APPROVAL when all agents approve with high score (>= 0.85)', () => {
      const votes: AgentVote[] = [
        makeVote('ARCHITECT', 0.95),
        makeVote('SECURITY_AUDITOR', 0.90),
        makeVote('PERFORMANCE_ENGINEER', 0.88),
        makeVote('PRODUCT_ESTIMATOR', 0.85)
      ];

      const result = DecisionArbiter.calculateConsensus(votes);
      expect(result.verdict).toBe('UNANIMOUS_APPROVAL');
      expect(result.approvalPercentage).toBe(100);
      expect(result.dissentCount).toBe(0);
      expect(result.compositeScore).toBeGreaterThanOrEqual(0.85);
      expect(result.vetoes).toHaveLength(0);
    });

    it('returns MAJORITY_CONCURRENCE when approval >= 75% and score >= 0.70', () => {
      const votes: AgentVote[] = [
        makeVote('ARCHITECT', 0.85, true),
        makeVote('SECURITY_AUDITOR', 0.80, true),
        makeVote('PERFORMANCE_ENGINEER', 0.75, true),
        makeVote('PRODUCT_ESTIMATOR', 0.50, false) // 1 dissenter out of 4 (75% approval)
      ];

      const result = DecisionArbiter.calculateConsensus(votes);
      expect(result.verdict).toBe('MAJORITY_CONCURRENCE');
      expect(result.approvalPercentage).toBe(75);
      expect(result.dissentCount).toBe(1);
      expect(result.compositeScore).toBeGreaterThanOrEqual(0.70);
    });

    it('triggers VETO_REJECTED when an authorized agent raises a veto', () => {
      const votes: AgentVote[] = [
        makeVote('ARCHITECT', 0.95, true),
        makeVote('SECURITY_AUDITOR', 0.0, false, true, 'Plain text token found in config'),
        makeVote('PERFORMANCE_ENGINEER', 0.90, true),
        makeVote('PRODUCT_ESTIMATOR', 0.85, true)
      ];

      const result = DecisionArbiter.calculateConsensus(votes);
      expect(result.verdict).toBe('VETO_REJECTED');
      expect(result.compositeScore).toBe(0.0);
      expect(result.vetoes).toHaveLength(1);
      expect(result.vetoes[0]?.role).toBe('SECURITY_AUDITOR');
      expect(result.vetoes[0]?.reason).toBe('Plain text token found in config');
      expect(result.dissentCount).toBe(1);
    });

    it('uses default veto reason when none is provided', () => {
      const votes: AgentVote[] = [
        makeVote('ARCHITECT', 0.0, false, true) // no reason provided
      ];

      const result = DecisionArbiter.calculateConsensus(votes);
      expect(result.verdict).toBe('VETO_REJECTED');
      expect(result.vetoes[0]?.reason).toBe('Constitutional Invariant Violation Detected');
    });

    it('does NOT trigger VETO_REJECTED if an agent without veto power raises a veto', () => {
      const votes: AgentVote[] = [
        makeVote('ARCHITECT', 0.85, true),
        makeVote('SECURITY_AUDITOR', 0.80, true),
        makeVote('PERFORMANCE_ENGINEER', 0.20, false, true, 'Latency exceeds 50ms budget'),
        makeVote('PRODUCT_ESTIMATOR', 0.80, true)
      ];

      const result = DecisionArbiter.calculateConsensus(votes);
      // Performance engineer does not have veto power, so vetoes array is empty
      expect(result.vetoes).toHaveLength(0);
      expect(result.verdict).not.toBe('VETO_REJECTED');
      expect(result.approvalPercentage).toBe(75);
    });

    it('returns REJECTED_REMEDIATION_REQUIRED when approval is below 75% or score below 0.70', () => {
      const votes: AgentVote[] = [
        makeVote('ARCHITECT', 0.60, true),
        makeVote('SECURITY_AUDITOR', 0.50, false),
        makeVote('PERFORMANCE_ENGINEER', 0.60, true),
        makeVote('PRODUCT_ESTIMATOR', 0.40, false)
      ];

      const result = DecisionArbiter.calculateConsensus(votes);
      expect(result.verdict).toBe('REJECTED_REMEDIATION_REQUIRED');
      expect(result.approvalPercentage).toBe(50);
      expect(result.dissentCount).toBe(2);
    });

    it('uses fallback weight 1.0 if unknown role vote is presented', () => {
      const votes: AgentVote[] = [
        makeVote('CUSTOM_ROLE' as ArbiterRole, 0.90, true)
      ];

      const result = DecisionArbiter.calculateConsensus(votes);
      expect(result.compositeScore).toBe(0.90);
    });
  });
});
