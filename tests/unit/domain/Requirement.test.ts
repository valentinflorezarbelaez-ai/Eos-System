import { describe, it, expect } from 'vitest';
import { Requirement } from '../../../src/core/domain/models/Requirement.js';
import type { EARSPattern, BDDScenario } from '../../../src/core/domain/types.js';

describe('Requirement', () => {
  // --- Valid Construction ---

  it('creates a valid EVENT_DRIVEN requirement', () => {
    const req = new Requirement(
      'FR-001',
      'User Login',
      'WHEN the user submits credentials, THE SYSTEM SHALL authenticate the session',
      'EVENT_DRIVEN'
    );
    expect(req.id).toBe('FR-001');
    expect(req.title).toBe('User Login');
    expect(req.pattern).toBe('EVENT_DRIVEN');
    expect(req.scenarios).toEqual([]);
  });

  it('creates a valid STATE_DRIVEN requirement', () => {
    const req = new Requirement(
      'FR-002',
      'Monitoring',
      'WHILE the system is in degraded mode, THE SYSTEM SHALL reduce non-critical operations',
      'STATE_DRIVEN'
    );
    expect(req.pattern).toBe('STATE_DRIVEN');
  });

  it('creates a valid ERROR_DRIVEN requirement', () => {
    const req = new Requirement(
      'FR-003',
      'Error Handling',
      'IF the database connection fails, THEN THE SYSTEM SHALL retry with exponential backoff',
      'ERROR_DRIVEN'
    );
    expect(req.pattern).toBe('ERROR_DRIVEN');
  });

  it('creates a valid UBIQUITOUS requirement', () => {
    const req = new Requirement(
      'FR-004',
      'Logging',
      'THE SYSTEM SHALL log all state transitions with ISO timestamps',
      'UBIQUITOUS'
    );
    expect(req.pattern).toBe('UBIQUITOUS');
  });

  it('trims whitespace from id, title, and rawText', () => {
    const req = new Requirement(
      '  FR-005  ',
      '  Trimmed Title  ',
      '  THE SYSTEM SHALL enforce trimming  ',
      'UBIQUITOUS'
    );
    expect(req.id).toBe('FR-005');
    expect(req.title).toBe('Trimmed Title');
    expect(req.rawText).toBe('THE SYSTEM SHALL enforce trimming');
  });

  it('freezes scenarios array and the instance itself', () => {
    const scenarios: BDDScenario[] = [
      { id: 'SC-001', name: 'Test', given: 'G', when: 'W', then: 'T' }
    ];
    const req = new Requirement(
      'FR-006',
      'Frozen',
      'THE SYSTEM SHALL be immutable',
      'UBIQUITOUS',
      scenarios
    );
    expect(Object.isFrozen(req)).toBe(true);
    expect(Object.isFrozen(req.scenarios)).toBe(true);
    expect(req.scenarios).toHaveLength(1);
  });

  // --- Invalid Construction ---

  it('throws on empty id', () => {
    expect(() => new Requirement('', 'Title', 'THE SYSTEM SHALL work', 'UBIQUITOUS'))
      .toThrow('Requirement ID cannot be empty');
  });

  it('throws on whitespace-only id', () => {
    expect(() => new Requirement('   ', 'Title', 'THE SYSTEM SHALL work', 'UBIQUITOUS'))
      .toThrow('Requirement ID cannot be empty');
  });

  it('throws on empty title', () => {
    expect(() => new Requirement('FR-X', '', 'THE SYSTEM SHALL work', 'UBIQUITOUS'))
      .toThrow('Requirement title cannot be empty');
  });

  it('throws on empty rawText', () => {
    expect(() => new Requirement('FR-X', 'Title', '', 'UBIQUITOUS'))
      .toThrow('Requirement rawText cannot be empty');
  });

  it('throws on invalid EVENT_DRIVEN syntax', () => {
    expect(() => new Requirement('FR-X', 'Title', 'This does not match', 'EVENT_DRIVEN'))
      .toThrow('Invalid EVENT_DRIVEN EARS syntax');
  });

  it('throws on invalid STATE_DRIVEN syntax', () => {
    expect(() => new Requirement('FR-X', 'Title', 'WHEN something happens, THE SYSTEM SHALL respond', 'STATE_DRIVEN'))
      .toThrow('Invalid STATE_DRIVEN EARS syntax');
  });

  it('throws on invalid ERROR_DRIVEN syntax', () => {
    expect(() => new Requirement('FR-X', 'Title', 'THE SYSTEM SHALL do something', 'ERROR_DRIVEN'))
      .toThrow('Invalid ERROR_DRIVEN EARS syntax');
  });

  it('throws on invalid UBIQUITOUS syntax', () => {
    expect(() => new Requirement('FR-X', 'Title', 'WHILE active, THE SYSTEM SHALL respond', 'UBIQUITOUS'))
      .toThrow('Invalid UBIQUITOUS EARS syntax');
  });

  // --- Serialization ---

  it('serializes to JSON correctly', () => {
    const req = new Requirement(
      'FR-JSON',
      'Serialization',
      'THE SYSTEM SHALL serialize correctly',
      'UBIQUITOUS'
    );
    const json = req.toJSON();
    expect(json).toHaveProperty('id', 'FR-JSON');
    expect(json).toHaveProperty('title', 'Serialization');
    expect(json).toHaveProperty('rawText');
    expect(json).toHaveProperty('pattern', 'UBIQUITOUS');
    expect(json).toHaveProperty('scenarios');
  });

  it('throws on unsupported EARS pattern', () => {
    expect(() => new Requirement('FR-ERR', 'Title', 'THE SYSTEM SHALL do something', 'UNKNOWN_PATTERN' as any))
      .toThrow('Unsupported EARS pattern');
  });
});
