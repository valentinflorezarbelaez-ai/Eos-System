import { EvidenceRecord } from '../domain/models/EvidenceRecord.js';
import { EpistemicState, FileChecksum } from '../domain/types.js';

export interface AuditRunInput {
  readonly evidenceId: string;
  readonly command: string;
  readonly exitCode: number;
  readonly executionDurationMs: number;
  readonly testCount: number;
  readonly passedCount: number;
  readonly findings: readonly string[];
  readonly checksums: readonly FileChecksum[];
}

export interface SerializedEvidenceArtifact {
  readonly evidenceId: string;
  readonly timestamp: string;
  readonly epistemicState: EpistemicState;
  readonly exitCode: number;
  readonly command: string;
  readonly executionDuration: string;
  readonly testsSummary: {
    readonly totalTests: number;
    readonly passed: number;
    readonly failed: number;
    readonly findings: readonly string[];
  };
  readonly checksums: readonly FileChecksum[];
}

/**
 * EvidenceRecorder (Application Service)
 * Orchestrates machine evidence collection, enforcing Commandment III:
 * The Law of Evidence Over Claims.
 */
export class EvidenceRecorder {
  recordAudit(input: AuditRunInput): {
    readonly record: EvidenceRecord;
    readonly artifact: SerializedEvidenceArtifact;
  } {
    const timestamp = new Date().toISOString();
    const findingsCount = input.findings.length;
    const hasPassed = input.exitCode === 0 && findingsCount === 0;

    const epistemicState: EpistemicState = hasPassed
      ? 'PRODUCTION_READY_WITHIN_TESTED_SCOPE'
      : findingsCount > 0
      ? 'FINDINGS_IDENTIFIED'
      : 'AUDIT_EXECUTED';

    const record = new EvidenceRecord(
      input.evidenceId,
      timestamp,
      epistemicState === 'PRODUCTION_READY_WITHIN_TESTED_SCOPE' ? 'VERIFIED' : epistemicState,
      input.exitCode,
      input.command,
      input.checksums,
      findingsCount
    );

    const artifact: SerializedEvidenceArtifact = {
      evidenceId: input.evidenceId,
      timestamp,
      epistemicState,
      exitCode: input.exitCode,
      command: input.command,
      executionDuration: `${input.executionDurationMs}ms`,
      testsSummary: {
        totalTests: input.testCount,
        passed: input.passedCount,
        failed: findingsCount,
        findings: Object.freeze([...input.findings])
      },
      checksums: Object.freeze([...input.checksums])
    };

    return { record, artifact };
  }
}
