import { describe, it, expect } from 'vitest';
import { AttestationRecord } from '../../../src/core/domain/models/AttestationRecord.js';
import type {
  AttestationSubject,
  AttestationSignature,
  TrustPolicy
} from '../../../src/core/domain/models/AttestationRecord.js';

describe('AttestationRecord', () => {
  const validSubject: AttestationSubject = {
    name: 'src/index.ts',
    sha256Digest: 'abc123def456'
  };

  const validSignature: AttestationSignature = {
    keyId: 'key-001',
    algorithm: 'Ed25519',
    signatureHex: 'deadbeef',
    timestamp: '2026-10-25T00:00:00Z'
  };

  // --- Valid Construction ---

  it('creates a valid attestation record in AUDIT_EXECUTED state', () => {
    const record = new AttestationRecord(
      'ATT-001', validSubject, 'build-verification', 'AUDIT_EXECUTED', [], '2026-10-25T00:00:00Z'
    );
    expect(record.id).toBe('ATT-001');
    expect(record.subject.name).toBe('src/index.ts');
    expect(record.predicateType).toBe('build-verification');
    expect(record.signatures).toEqual([]);
    expect(record.isAttested()).toBe(false);
  });

  it('creates a VERIFIED record with signatures', () => {
    const record = new AttestationRecord(
      'ATT-002', validSubject, 'type-check', 'VERIFIED',
      [validSignature], '2026-10-25T00:00:00Z'
    );
    expect(record.isAttested()).toBe(true);
    expect(record.signatures).toHaveLength(1);
  });

  it('sets expiresAt when provided', () => {
    const record = new AttestationRecord(
      'ATT-003', validSubject, 'test', 'AUDIT_EXECUTED', [],
      '2026-10-25T00:00:00Z', '2026-12-31T23:59:59Z'
    );
    expect(record.expiresAt).toBe('2026-12-31T23:59:59Z');
  });

  it('freezes subject, signatures, and instance', () => {
    const record = new AttestationRecord(
      'ATT-004', validSubject, 'test', 'AUDIT_EXECUTED', [validSignature], '2026-10-25T00:00:00Z'
    );
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.subject)).toBe(true);
    expect(Object.isFrozen(record.signatures)).toBe(true);
  });

  // --- Invalid Construction ---

  it('throws on empty ID', () => {
    expect(() => new AttestationRecord(
      '', validSubject, 'test', 'AUDIT_EXECUTED', [], '2026-10-25T00:00:00Z'
    )).toThrow('AttestationRecord ID cannot be empty');
  });

  it('throws on missing subject name', () => {
    expect(() => new AttestationRecord(
      'ATT-X', { name: '', sha256Digest: 'abc' } as AttestationSubject, 'test', 'AUDIT_EXECUTED', [], '2026-10-25T00:00:00Z'
    )).toThrow('subject must contain name and sha256Digest');
  });

  it('throws on empty predicateType', () => {
    expect(() => new AttestationRecord(
      'ATT-X', validSubject, '', 'AUDIT_EXECUTED', [], '2026-10-25T00:00:00Z'
    )).toThrow('predicateType cannot be empty');
  });

  it('throws when VERIFIED without signatures (Law III)', () => {
    expect(() => new AttestationRecord(
      'ATT-X', validSubject, 'test', 'VERIFIED', [], '2026-10-25T00:00:00Z'
    )).toThrow('Cannot declare VERIFIED without valid cryptographic signatures');
  });

  it('throws when PRODUCTION_READY without signatures (Law III)', () => {
    expect(() => new AttestationRecord(
      'ATT-X', validSubject, 'test', 'PRODUCTION_READY', [], '2026-10-25T00:00:00Z'
    )).toThrow('Cannot declare PRODUCTION_READY without valid cryptographic signatures');
  });

  // --- meetsPolicy ---

  it('satisfies a policy with sufficient trusted signatures', () => {
    const policy: TrustPolicy = {
      minimumSignatures: 1,
      trustedKeyIds: ['key-001'],
      allowedAlgorithms: ['Ed25519'],
      enforceExpiry: false,
      maxAgeSeconds: 0
    };
    const record = new AttestationRecord(
      'ATT-POL', validSubject, 'test', 'VERIFIED', [validSignature], '2026-10-25T00:00:00Z'
    );
    const result = record.meetsPolicy(policy);
    expect(result.isSatisfied).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('fails policy with insufficient trusted signatures', () => {
    const policy: TrustPolicy = {
      minimumSignatures: 2,
      trustedKeyIds: ['key-001'],
      allowedAlgorithms: ['Ed25519'],
      enforceExpiry: false,
      maxAgeSeconds: 0
    };
    const record = new AttestationRecord(
      'ATT-FAIL', validSubject, 'test', 'VERIFIED', [validSignature], '2026-10-25T00:00:00Z'
    );
    const result = record.meetsPolicy(policy);
    expect(result.isSatisfied).toBe(false);
    expect(result.reasons[0]).toContain('Insufficient trusted signatures');
  });

  it('fails policy when key is not trusted', () => {
    const policy: TrustPolicy = {
      minimumSignatures: 1,
      trustedKeyIds: ['other-key'],
      allowedAlgorithms: ['Ed25519'],
      enforceExpiry: false,
      maxAgeSeconds: 0
    };
    const record = new AttestationRecord(
      'ATT-UNTRUST', validSubject, 'test', 'VERIFIED', [validSignature], '2026-10-25T00:00:00Z'
    );
    const result = record.meetsPolicy(policy);
    expect(result.isSatisfied).toBe(false);
  });

  it('fails policy when algorithm is not allowed', () => {
    const policy: TrustPolicy = {
      minimumSignatures: 1,
      trustedKeyIds: ['key-001'],
      allowedAlgorithms: ['RSA-PSS'],
      enforceExpiry: false,
      maxAgeSeconds: 0
    };
    const record = new AttestationRecord(
      'ATT-ALG', validSubject, 'test', 'VERIFIED', [validSignature], '2026-10-25T00:00:00Z'
    );
    const result = record.meetsPolicy(policy);
    expect(result.isSatisfied).toBe(false);
  });

  it('detects expiry when enforceExpiry is true and attestation is expired', () => {
    const policy: TrustPolicy = {
      minimumSignatures: 1,
      trustedKeyIds: ['key-001'],
      allowedAlgorithms: ['Ed25519'],
      enforceExpiry: true,
      maxAgeSeconds: 3600
    };
    const record = new AttestationRecord(
      'ATT-EXP', validSubject, 'test', 'VERIFIED', [validSignature],
      '2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z' // expired
    );
    const result = record.meetsPolicy(policy, '2026-10-25T00:00:00Z');
    expect(result.isSatisfied).toBe(false);
    expect(result.reasons.some(r => r.includes('expired'))).toBe(true);

    // Also verify default timestamp fallback when currentTimestampIso is omitted
    const defaultTimeResult = record.meetsPolicy(policy);
    expect(defaultTimeResult.isSatisfied).toBe(false);
  });

  it('passes expiry check when attestation is not expired', () => {
    const policy: TrustPolicy = {
      minimumSignatures: 1,
      trustedKeyIds: ['key-001'],
      allowedAlgorithms: ['Ed25519'],
      enforceExpiry: true,
      maxAgeSeconds: 3600
    };
    const record = new AttestationRecord(
      'ATT-VALID', validSubject, 'test', 'VERIFIED', [validSignature],
      '2026-10-25T00:00:00Z', '2027-12-31T23:59:59Z'
    );
    const result = record.meetsPolicy(policy, '2026-10-25T12:00:00Z');
    expect(result.isSatisfied).toBe(true);
  });

  // --- Serialization ---

  it('toJSON includes all fields and computed isAttested', () => {
    const record = new AttestationRecord(
      'ATT-JSON', validSubject, 'test', 'VERIFIED', [validSignature],
      '2026-10-25T00:00:00Z', '2027-01-01T00:00:00Z'
    );
    const json = record.toJSON();
    expect(json).toHaveProperty('id', 'ATT-JSON');
    expect(json).toHaveProperty('isAttested', true);
    expect(json).toHaveProperty('expiresAt', '2027-01-01T00:00:00Z');
  });
});
