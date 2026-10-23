import { TrackType, RiskLevel } from '../domain/types.js';

export interface TaskClassificationInput {
  readonly taskId: string;
  readonly description: string;
  readonly affectedPaths: readonly string[];
  readonly affectsDatabaseSchema?: boolean;
  readonly affectsAuthentication?: boolean;
  readonly affectsPublicApiContract?: boolean;
}

export interface TaskClassificationResult {
  readonly taskId: string;
  readonly track: TrackType;
  readonly riskLevel: RiskLevel;
  readonly reason: string;
  readonly requiredSteps: readonly string[];
}

/**
 * DualTrackOrchestrator (Application Layer)
 * Solves the HolaMundo SDD Paradox:
 * Eliminates bureaucratic waterfall for low-risk changes while enforcing
 * strict specification gates for architectural/domain changes.
 */
export class DualTrackOrchestrator {
  private static readonly HIGH_RISK_KEYWORDS = [
    'schema',
    'migration',
    'auth',
    'payment',
    'security',
    'domain',
    'core',
    'credential',
    'api contract',
    'constitution'
  ];

  classify(input: TaskClassificationInput): TaskClassificationResult {
    // 1. Check explicit high-risk flags
    if (
      input.affectsDatabaseSchema ||
      input.affectsAuthentication ||
      input.affectsPublicApiContract
    ) {
      return {
        taskId: input.taskId,
        track: 'HEAVY_TRACK',
        riskLevel: 'CRITICAL',
        reason: 'Explicitly affects critical subsystem (schema, auth, or public API)',
        requiredSteps: [
          'Intake & Context Update',
          'EARS Functional Requirements',
          'BDD Acceptance Scenarios',
          'Architecture Plan & ADRs',
          'Atomic Task DAG Decomposition',
          'Level 2 Authorization Gate',
          'Unit & Integration Testing',
          'Cryptographic Evidence Generation'
        ]
      };
    }

    // 2. Check path sensitivity
    const affectsCoreDomain = input.affectedPaths.some(
      (p) =>
        p.includes('core/domain') ||
        p.includes('docs/specs') ||
        p.includes('CONSTITUTION.md')
    );

    if (affectsCoreDomain) {
      return {
        taskId: input.taskId,
        track: 'HEAVY_TRACK',
        riskLevel: 'HIGH',
        reason: 'Modifies core domain logic or system constitution',
        requiredSteps: [
          'Formal EARS Specification Update',
          'BDD Scenarios Verification',
          'ADR Decision Record',
          'Implementation Gate',
          'Strict Regression Verification'
        ]
      };
    }

    // 3. Check description semantics
    const lowerDesc = input.description.toLowerCase();
    const matchesHighRiskWord = DualTrackOrchestrator.HIGH_RISK_KEYWORDS.some(
      (keyword) => lowerDesc.includes(keyword)
    );

    if (matchesHighRiskWord) {
      return {
        taskId: input.taskId,
        track: 'HEAVY_TRACK',
        riskLevel: 'MEDIUM',
        reason: 'Contains architectural keywords requiring formal specification',
        requiredSteps: [
          'Living Delta Spec Update',
          'Unit & Contract Tests',
          'Implementation',
          'Regression Verification'
        ]
      };
    }

    // 4. Default to Fast-Track for low-risk, localized adjustments
    return {
      taskId: input.taskId,
      track: 'FAST_TRACK',
      riskLevel: 'LOW',
      reason: 'Localized change with minimal risk surface; fast TDD loop selected',
      requiredSteps: [
        'Atomic Task Description',
        'Unit / Contract Test',
        'Direct Implementation',
        'Instant Regression Verification'
      ]
    };
  }
}
