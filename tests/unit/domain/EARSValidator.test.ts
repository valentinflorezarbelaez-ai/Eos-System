import { describe, it, expect } from 'vitest';
import { EARSValidator } from '../../../src/core/domain/models/EARSValidator.js';
import type { BDDScenario } from '../../../src/core/domain/types.js';

describe('EARSValidator', () => {
  // --- Pattern Detection ---

  describe('detectPattern', () => {
    it('detects EVENT_DRIVEN pattern', () => {
      expect(EARSValidator.detectPattern('WHEN the user clicks, THE SYSTEM SHALL respond'))
        .toBe('EVENT_DRIVEN');
    });

    it('detects STATE_DRIVEN pattern', () => {
      expect(EARSValidator.detectPattern('WHILE the system is active, THE SYSTEM SHALL monitor'))
        .toBe('STATE_DRIVEN');
    });

    it('detects ERROR_DRIVEN pattern', () => {
      expect(EARSValidator.detectPattern('IF the connection fails, THEN THE SYSTEM SHALL retry'))
        .toBe('ERROR_DRIVEN');
    });

    it('detects UBIQUITOUS pattern', () => {
      expect(EARSValidator.detectPattern('THE SYSTEM SHALL log all events'))
        .toBe('UBIQUITOUS');
    });

    it('returns undefined for non-matching text', () => {
      expect(EARSValidator.detectPattern('Some random text')).toBeUndefined();
    });

    it('is case-insensitive', () => {
      expect(EARSValidator.detectPattern('when something occurs, the system shall act'))
        .toBe('EVENT_DRIVEN');
    });

    it('handles leading/trailing whitespace', () => {
      expect(EARSValidator.detectPattern('  THE SYSTEM SHALL work  '))
        .toBe('UBIQUITOUS');
    });
  });

  // --- Validate ---

  describe('validate', () => {
    it('returns valid for correct EVENT_DRIVEN with matching expected', () => {
      const result = EARSValidator.validate(
        'WHEN the user logs in, THE SYSTEM SHALL create a session',
        'EVENT_DRIVEN'
      );
      expect(result.isValid).toBe(true);
      expect(result.detectedPattern).toBe('EVENT_DRIVEN');
      expect(result.errors).toHaveLength(0);
    });

    it('returns valid for correct pattern without expected (auto-detect)', () => {
      const result = EARSValidator.validate('THE SYSTEM SHALL enforce constraints');
      expect(result.isValid).toBe(true);
      expect(result.detectedPattern).toBe('UBIQUITOUS');
    });

    it('returns invalid for empty text', () => {
      const result = EARSValidator.validate('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Requirement text cannot be empty');
    });

    it('returns invalid for null-ish text', () => {
      const result = EARSValidator.validate(undefined as unknown as string);
      expect(result.isValid).toBe(false);
    });

    it('returns invalid for non-matching text', () => {
      const result = EARSValidator.validate('Just some description');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('does not match any valid EARS pattern');
      expect(result.recommendations).toHaveLength(1);
    });

    it('returns invalid for pattern mismatch', () => {
      const result = EARSValidator.validate(
        'THE SYSTEM SHALL do something',
        'EVENT_DRIVEN' // actual is UBIQUITOUS
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Pattern mismatch');
      expect(result.detectedPattern).toBe('UBIQUITOUS');
    });
  });

  // --- BDD Validation ---

  describe('validateBDD', () => {
    it('validates a complete BDD scenario', () => {
      const scenario: BDDScenario = {
        id: 'SC-001',
        name: 'Login Success',
        given: 'valid credentials',
        when: 'user submits form',
        then: 'session is created'
      };
      const result = EARSValidator.validateBDD(scenario);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects scenario with missing id', () => {
      const scenario = { id: '', name: 'Test', given: 'G', when: 'W', then: 'T' } as BDDScenario;
      const result = EARSValidator.validateBDD(scenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BDD Scenario ID is required');
    });

    it('rejects scenario with missing name', () => {
      const scenario = { id: 'SC-X', name: '', given: 'G', when: 'W', then: 'T' } as BDDScenario;
      const result = EARSValidator.validateBDD(scenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BDD Scenario name is required');
    });

    it('rejects scenario with missing given', () => {
      const scenario = { id: 'SC-X', name: 'Test', given: '', when: 'W', then: 'T' } as BDDScenario;
      const result = EARSValidator.validateBDD(scenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BDD Scenario requires a GIVEN precondition');
    });

    it('rejects scenario with missing when', () => {
      const scenario = { id: 'SC-X', name: 'Test', given: 'G', when: '', then: 'T' } as BDDScenario;
      const result = EARSValidator.validateBDD(scenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BDD Scenario requires a WHEN trigger action');
    });

    it('rejects scenario with missing then', () => {
      const scenario = { id: 'SC-X', name: 'Test', given: 'G', when: 'W', then: '' } as BDDScenario;
      const result = EARSValidator.validateBDD(scenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('BDD Scenario requires a THEN verifiable outcome');
    });

    it('collects multiple errors for scenario with all fields missing', () => {
      const scenario = { id: '', name: '', given: '', when: '', then: '' } as BDDScenario;
      const result = EARSValidator.validateBDD(scenario);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(5);
    });
  });
});
