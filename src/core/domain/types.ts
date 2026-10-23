/**
 * EOS Core Domain Types
 * Strict, pure domain types with 0 external dependencies.
 */

export type EpistemicState =
  | 'NOT_INITIALIZED'
  | 'AUDIT_EXECUTED'
  | 'FINDINGS_IDENTIFIED'
  | 'REMEDIATION_REQUIRED'
  | 'REMEDIATION_IN_PROGRESS'
  | 'REVALIDATION_REQUIRED'
  | 'VERIFIED'
  | 'PRODUCTION_READY_WITHIN_TESTED_SCOPE'
  | 'PRODUCTION_READY';

export type EARSPattern =
  | 'EVENT_DRIVEN'
  | 'STATE_DRIVEN'
  | 'ERROR_DRIVEN'
  | 'UBIQUITOUS';

export type TrackType = 'FAST_TRACK' | 'HEAVY_TRACK';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BDDScenario {
  readonly id: string;
  readonly name: string;
  readonly given: string;
  readonly when: string;
  readonly then: string;
  readonly and?: string;
}

export interface FileChecksum {
  readonly relativePath: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}
