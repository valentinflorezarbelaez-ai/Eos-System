import { EpistemicState } from '../types.js';

export interface AttestationSubject {
  readonly name: string;
  readonly sha256Digest: string;
}

export interface AttestationSignature {
  readonly keyId: string;
  readonly algorithm: 'Ed25519' | 'ECDSA-P256' | 'RSA-PSS';
  readonly signatureHex: string;
  readonly timestamp: string;
}

export interface TrustPolicy {
  readonly minimumSignatures: number;
  readonly trustedKeyIds: readonly string[];
  readonly allowedAlgorithms: readonly string[];
  readonly enforceExpiry: boolean;
  readonly maxAgeSeconds: number;
}

/**
 * AttestationRecord Entity (Pure Domain)
 * Enforces Law III: Evidence Over Claims with Asymmetric Non-Repudiation.
 * Pure business logic with 0 framework or network dependencies.
 */
export class AttestationRecord {
  readonly id: string;
  readonly subject: AttestationSubject;
  readonly predicateType: string;
  readonly epistemicState: EpistemicState;
  readonly signatures: readonly AttestationSignature[];
  readonly issuedAt: string;
  readonly expiresAt?: string | undefined;

  constructor(
    id: string,
    subject: AttestationSubject,
    predicateType: string,
    epistemicState: EpistemicState,
    signatures: readonly AttestationSignature[] = [],
    issuedAt: string,
    expiresAt?: string
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('AttestationRecord ID cannot be empty');
    }
    if (!subject || !subject.name || !subject.sha256Digest) {
      throw new Error('AttestationRecord subject must contain name and sha256Digest');
    }
    if (!predicateType || predicateType.trim().length === 0) {
      throw new Error('AttestationRecord predicateType cannot be empty');
    }
    if (
      (epistemicState === 'VERIFIED' || epistemicState === 'PRODUCTION_READY') &&
      signatures.length === 0
    ) {
      throw new Error(
        `Invariant violation: Cannot declare ${epistemicState} without valid cryptographic signatures`
      );
    }

    this.id = id.trim();
    this.subject = Object.freeze({ ...subject });
    this.predicateType = predicateType.trim();
    this.epistemicState = epistemicState;
    this.signatures = Object.freeze([...signatures]);
    this.issuedAt = issuedAt;
    this.expiresAt = expiresAt;
    Object.freeze(this);
  }

  isAttested(): boolean {
    return this.signatures.length > 0;
  }

  meetsPolicy(policy: TrustPolicy, currentTimestampIso?: string): {
    readonly isSatisfied: boolean;
    readonly reasons: readonly string[];
  } {
    const reasons: string[] = [];
    const trustedKeySet = new Set(policy.trustedKeyIds);
    const validSigs = this.signatures.filter(
      (s) =>
        trustedKeySet.has(s.keyId) &&
        policy.allowedAlgorithms.includes(s.algorithm)
    );

    if (validSigs.length < policy.minimumSignatures) {
      reasons.push(
        `Insufficient trusted signatures: found ${validSigs.length}, required ${policy.minimumSignatures}`
      );
    }

    if (policy.enforceExpiry && this.expiresAt) {
      const now = new Date(currentTimestampIso ?? new Date().toISOString()).getTime();
      const expiry = new Date(this.expiresAt).getTime();
      if (now > expiry) {
        reasons.push(`Attestation expired at ${this.expiresAt}`);
      }
    }

    return {
      isSatisfied: reasons.length === 0,
      reasons: Object.freeze(reasons)
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      subject: this.subject,
      predicateType: this.predicateType,
      epistemicState: this.epistemicState,
      signatures: this.signatures,
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      isAttested: this.isAttested()
    };
  }
}
