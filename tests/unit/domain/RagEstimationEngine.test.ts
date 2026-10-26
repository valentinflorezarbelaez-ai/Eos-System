import { describe, it, expect } from 'vitest';
import { RagEstimationEngine } from '../../../src/core/domain/models/RagEstimationEngine.js';

describe('RagEstimationEngine', () => {
  describe('Constants & Profiles', () => {
    it('provides standard abbreviation expansions', () => {
      expect(RagEstimationEngine.ABBREVIATION_EXPANSIONS.JWT).toContain('JSON Web Token');
      expect(RagEstimationEngine.ABBREVIATION_EXPANSIONS.API).toContain('Application Programming Interface');
      expect(RagEstimationEngine.ABBREVIATION_EXPANSIONS.CRUD).toContain('Create, Read, Update, Delete');
    });

    it('provides canonical technology aliases', () => {
      expect(RagEstimationEngine.TECHNOLOGY_ALIASES.reactjs).toBe('React');
      expect(RagEstimationEngine.TECHNOLOGY_ALIASES.ts).toBe('TypeScript');
      expect(RagEstimationEngine.TECHNOLOGY_ALIASES.k8s).toBe('Kubernetes');
    });

    it('contains 5 standard seniority role profiles summing to 100% allocation', () => {
      const profiles = RagEstimationEngine.DEFAULT_ROLE_PROFILES;
      expect(profiles).toHaveLength(5);

      const totalPercentage = profiles.reduce((sum, p) => sum + p.percentage, 0);
      expect(totalPercentage).toBeCloseTo(1.0, 5);

      for (const p of profiles) {
        expect(p.rateEur).toBeGreaterThan(0);
      }
    });
  });

  describe('calculatePert', () => {
    it('calculates standard PERT beta distribution correctly', () => {
      // o = 10, m = 20, p = 40 => expected = (10 + 80 + 40)/6 = 130/6 = 21.67
      // stdDev = (40 - 10)/6 = 30/6 = 5.0
      const pert = RagEstimationEngine.calculatePert(10, 20, 40);
      expect(pert.optimistic).toBe(10);
      expect(pert.mostLikely).toBe(20);
      expect(pert.pessimistic).toBe(40);
      expect(pert.expectedDuration).toBe(21.67);
      expect(pert.standardDeviation).toBe(5.0);
    });

    it('handles identical optimistic, likely, and pessimistic estimates', () => {
      const pert = RagEstimationEngine.calculatePert(15, 15, 15);
      expect(pert.expectedDuration).toBe(15);
      expect(pert.standardDeviation).toBe(0);
    });

    it('corrects inversion where optimistic > mostLikely or mostLikely > pessimistic', () => {
      const pert = RagEstimationEngine.calculatePert(50, 30, 10);
      // o becomes 50, m becomes max(50, 30)=50, p becomes max(50, 10)=50
      expect(pert.optimistic).toBe(50);
      expect(pert.mostLikely).toBe(50);
      expect(pert.pessimistic).toBe(50);
      expect(pert.expectedDuration).toBe(50);
      expect(pert.standardDeviation).toBe(0);
    });

    it('clamps negative values to zero', () => {
      const pert = RagEstimationEngine.calculatePert(-10, -5, 20);
      expect(pert.optimistic).toBe(0);
      expect(pert.mostLikely).toBe(0);
      expect(pert.pessimistic).toBe(20);
      expect(pert.expectedDuration).toBeCloseTo(3.33, 2);
    });
  });

  describe('calculateConfidence', () => {
    it('computes VERY_HIGH confidence with strong signals', () => {
      // 12 references (> 10 => 1.0), similarity 0.95 (1.0), techMatch 1.0, variance 0.02 (varFactor=0.96)
      const conf = RagEstimationEngine.calculateConfidence(12, 0.95, 1.0, 0.02);
      expect(conf.score).toBeGreaterThanOrEqual(0.80);
      expect(conf.level).toBe('VERY_HIGH');
      expect(conf.factors.referencesCount).toBe(12);
      expect(conf.factors.referencesFactor).toBe(1.0);
    });

    it('computes HIGH confidence with moderate references and good similarity', () => {
      const conf = RagEstimationEngine.calculateConfidence(5, 0.82, 0.80, 0.08);
      expect(conf.level).toBe('HIGH');
      expect(conf.score).toBeGreaterThanOrEqual(0.65);
      expect(conf.score).toBeLessThan(0.80);
    });

    it('computes MEDIUM confidence when signals are intermediate', () => {
      const conf = RagEstimationEngine.calculateConfidence(2, 0.70, 0.50, 0.15);
      expect(conf.level).toBe('MEDIUM');
      expect(conf.score).toBeGreaterThanOrEqual(0.45);
      expect(conf.score).toBeLessThan(0.65);
    });

    it('computes LOW confidence when signals are weak or references missing', () => {
      const conf = RagEstimationEngine.calculateConfidence(0, 0.40, 0.10, 0.40);
      expect(conf.level).toBe('LOW');
      expect(conf.score).toBeLessThan(0.45);
      expect(conf.factors.referencesFactor).toBe(0.0);
      expect(conf.factors.similarityFactor).toBe(0.0);
    });

    it('handles references tier breakpoints (1, 3, 6, 11)', () => {
      expect(RagEstimationEngine.calculateConfidence(1, 0.5, 0.5).factors.referencesFactor).toBe(0.40);
      expect(RagEstimationEngine.calculateConfidence(3, 0.5, 0.5).factors.referencesFactor).toBe(0.65);
      expect(RagEstimationEngine.calculateConfidence(6, 0.5, 0.5).factors.referencesFactor).toBe(0.85);
      expect(RagEstimationEngine.calculateConfidence(11, 0.5, 0.5).factors.referencesFactor).toBe(1.0);
    });
  });

  describe('preprocessQuery', () => {
    it('expands recognized abbreviations into full semantic definitions', () => {
      const input = 'Implement JWT authentication with REST API';
      const output = RagEstimationEngine.preprocessQuery(input);
      expect(output).toContain('JWT (JSON Web Token)');
      expect(output).toContain('REST (Representational State Transfer)');
      expect(output).toContain('API (Application Programming Interface)');
    });

    it('preserves words that are not exact abbreviation matches', () => {
      const input = 'Rapid development of applications';
      const output = RagEstimationEngine.preprocessQuery(input);
      expect(output).toBe('Rapid development of applications');
    });

    it('trims leading and trailing whitespace', () => {
      const input = '   CRUD operations   ';
      const output = RagEstimationEngine.preprocessQuery(input);
      expect(output).toBe('CRUD (Create, Read, Update, Delete) operations');
    });
  });
});
