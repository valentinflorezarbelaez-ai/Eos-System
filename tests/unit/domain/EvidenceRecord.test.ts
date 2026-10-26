import { describe, it, expect } from 'vitest';
import { EvidenceRecord } from '../../../src/core/domain/models/EvidenceRecord.js';
import type { EpistemicState, FileChecksum } from '../../../src/core/domain/types.js';

describe('EvidenceRecord', () => {
  // --- Valid Construction ---

  it('creates a valid evidence record with AUDIT_EXECUTED state', () => {
    const record = new EvidenceRecord(
      'EVD-001',
      '2026-10-25T00:00:00Z',
      'AUDIT_EXECUTED',
      0,
      'npm run test'
    );
    expect(record.id).toBe('EVD-001');
    expect(record.epistemicState).toBe('AUDIT_EXECUTED');
    expect(record.exitCode).toBe(0);
    expect(record.checksums).toEqual([]);
    expect(record.findingsCount).toBe(0);
  });

  it('creates a VERIFIED record with exit code 0 and 0 findings', () => {
    const record = new EvidenceRecord(
      'EVD-002',
      '2026-10-25T00:00:00Z',
      'VERIFIED',
      0,
      'npm run verify:strict',
      [],
      0
    );
    expect(record.epistemicState).toBe('VERIFIED');
  });

  it('creates a FINDINGS_IDENTIFIED record with non-zero exit code', () => {
    const record = new EvidenceRecord(
      'EVD-003',
      '2026-10-25T00:00:00Z',
      'FINDINGS_IDENTIFIED',
      1,
      'npm run lint',
      [],
      5
    );
    expect(record.exitCode).toBe(1);
    expect(record.findingsCount).toBe(5);
  });

  it('freezes checksums and the instance', () => {
    const checksums: FileChecksum[] = [
      { relativePath: 'src/index.ts', sha256: 'abc123', sizeBytes: 100 }
    ];
    const record = new EvidenceRecord(
      'EVD-004',
      '2026-10-25T00:00:00Z',
      'AUDIT_EXECUTED',
      0,
      'tsc --noEmit',
      checksums
    );
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.checksums)).toBe(true);
  });

  // --- Invariant Violations ---

  it('throws on empty ID', () => {
    expect(() => new EvidenceRecord('', '2026-10-25T00:00:00Z', 'AUDIT_EXECUTED', 0, 'cmd'))
      .toThrow('EvidenceRecord ID cannot be empty');
  });

  it('throws when VERIFIED with non-zero exit code (Law III)', () => {
    expect(() => new EvidenceRecord(
      'EVD-BAD', '2026-10-25T00:00:00Z', 'VERIFIED', 1, 'npm test'
    )).toThrow('Cannot declare status VERIFIED with non-zero exit code');
  });

  it('throws when VERIFIED with unresolved findings (Law III)', () => {
    expect(() => new EvidenceRecord(
      'EVD-BAD', '2026-10-25T00:00:00Z', 'VERIFIED', 0, 'npm test', [], 3
    )).toThrow('Cannot declare status VERIFIED with 3 unresolved findings');
  });

  // --- Business Logic ---

  it('isProductionReady returns true for PRODUCTION_READY with clean state', () => {
    const record = new EvidenceRecord(
      'EVD-PROD', '2026-10-25T00:00:00Z', 'PRODUCTION_READY', 0, 'verify', [], 0
    );
    expect(record.isProductionReady()).toBe(true);
  });

  it('isProductionReady returns true for PRODUCTION_READY_WITHIN_TESTED_SCOPE', () => {
    const record = new EvidenceRecord(
      'EVD-SCOPE', '2026-10-25T00:00:00Z', 'PRODUCTION_READY_WITHIN_TESTED_SCOPE', 0, 'verify', [], 0
    );
    expect(record.isProductionReady()).toBe(true);
  });

  it('isProductionReady returns false for VERIFIED state', () => {
    const record = new EvidenceRecord(
      'EVD-V', '2026-10-25T00:00:00Z', 'VERIFIED', 0, 'verify', [], 0
    );
    expect(record.isProductionReady()).toBe(false);
  });

  it('isProductionReady returns false when exit code is non-zero', () => {
    const record = new EvidenceRecord(
      'EVD-FAIL', '2026-10-25T00:00:00Z', 'PRODUCTION_READY', 1, 'verify', [], 0
    );
    expect(record.isProductionReady()).toBe(false);
  });

  it('isProductionReady returns false when findings exist', () => {
    const record = new EvidenceRecord(
      'EVD-FIND', '2026-10-25T00:00:00Z', 'PRODUCTION_READY', 0, 'verify', [], 2
    );
    expect(record.isProductionReady()).toBe(false);
  });

  // --- Serialization ---

  it('toJSON includes all fields and computed isProductionReady', () => {
    const record = new EvidenceRecord(
      'EVD-JSON', '2026-10-25T00:00:00Z', 'PRODUCTION_READY', 0, 'verify', [], 0
    );
    const json = record.toJSON();
    expect(json).toHaveProperty('id', 'EVD-JSON');
    expect(json).toHaveProperty('epistemicState', 'PRODUCTION_READY');
    expect(json).toHaveProperty('isProductionReady', true);
    expect(json).toHaveProperty('exitCode', 0);
    expect(json).toHaveProperty('findingsCount', 0);
  });
});
