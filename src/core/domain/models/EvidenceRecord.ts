import { EpistemicState, FileChecksum } from '../types.js';

/**
 * EvidenceRecord Entity (Pure Domain)
 * Enforces Law III: Evidence Over Claims (Epistemic Taxonomy).
 */
export class EvidenceRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly epistemicState: EpistemicState;
  readonly exitCode: number;
  readonly command: string;
  readonly checksums: readonly FileChecksum[];
  readonly findingsCount: number;

  constructor(
    id: string,
    timestamp: string,
    epistemicState: EpistemicState,
    exitCode: number,
    command: string,
    checksums: readonly FileChecksum[] = [],
    findingsCount: number = 0
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('EvidenceRecord ID cannot be empty');
    }
    if (exitCode !== 0 && epistemicState === 'VERIFIED') {
      throw new Error(
        `Invariant violation: Cannot declare status VERIFIED with non-zero exit code (${exitCode})`
      );
    }
    if (findingsCount > 0 && epistemicState === 'VERIFIED') {
      throw new Error(
        `Invariant violation: Cannot declare status VERIFIED with ${findingsCount} unresolved findings`
      );
    }

    this.id = id.trim();
    this.timestamp = timestamp;
    this.epistemicState = epistemicState;
    this.exitCode = exitCode;
    this.command = command.trim();
    this.checksums = Object.freeze([...checksums]);
    this.findingsCount = findingsCount;
    Object.freeze(this);
  }

  isProductionReady(): boolean {
    return (
      (this.epistemicState === 'PRODUCTION_READY' ||
        this.epistemicState === 'PRODUCTION_READY_WITHIN_TESTED_SCOPE') &&
      this.exitCode === 0 &&
      this.findingsCount === 0
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      timestamp: this.timestamp,
      epistemicState: this.epistemicState,
      exitCode: this.exitCode,
      command: this.command,
      checksums: this.checksums,
      findingsCount: this.findingsCount,
      isProductionReady: this.isProductionReady()
    };
  }
}
