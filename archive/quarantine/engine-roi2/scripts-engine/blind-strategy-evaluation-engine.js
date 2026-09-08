import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { CompositionPolicyEngine } from './composition-policy-engine.js';
import { AppendOnlyTelemetrySink } from './independent-telemetry-sink.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class BlindStrategyEvaluationEngine {
  constructor() {
    this.policyEngine = new CompositionPolicyEngine();
    this.telemetrySink = new AppendOnlyTelemetrySink();
  }

  // L-01 & L-02: Execute Blind Evaluation across Unseen Domain Set
  executeBlindEvaluation(unseenScenarios = []) {
    const defaultUnseen = unseenScenarios.length > 0 ? unseenScenarios : [
      {
        scenarioId: 'L-001-TOKEN-ROTATION',
        domain: 'Multi-Tenant Token Rotation Modal',
        context: { domainType: 'FORM', isStreamingBinary: false, hasSecrets: true, requiresLiveGuidance: true, isReadOnly: false },
        oracleStrategy: 'A_THEN_B',
        oracleOutcomeRate: 0.9200
      },
      {
        scenarioId: 'L-002-IOT-SENSOR-VIEWER',
        domain: 'Real-time IoT Sensor Metric Graph',
        context: { domainType: 'GRAPH', isStreamingBinary: false, hasSecrets: false, requiresLiveGuidance: false, isReadOnly: true },
        oracleStrategy: 'DO_NOT_COMPOSE',
        oracleOutcomeRate: 0.8800
      },
      {
        scenarioId: 'L-003-PUBLIC-BUG-FORM',
        domain: 'Public Anonymous Bug Submission Form',
        context: { domainType: 'PUBLIC_FORM', isStreamingBinary: false, hasSecrets: false, requiresLiveGuidance: true, isPublicUnauthenticated: true },
        oracleStrategy: 'B_ONLY',
        oracleOutcomeRate: 0.8500
      },
      {
        scenarioId: 'L-004-AUDIT-DUMPER',
        domain: 'Static Secure Audit Log Dumper',
        context: { domainType: 'LOG_DUMPER', isStreamingBinary: false, hasSecrets: true, requiresLiveGuidance: false, isReadOnly: true },
        oracleStrategy: 'A_ONLY',
        oracleOutcomeRate: 0.9000
      },
      {
        scenarioId: 'L-005-COBOL-BATCH-IMPORT',
        domain: 'Legacy COBOL Emulated Batch Importer',
        context: { domainType: 'COBOL_IMPORT', isStreamingBinary: false, hasSecrets: true, requiresLiveGuidance: true, legacyParserLatencyMs: 380 },
        oracleStrategy: 'COMPOSE_WITH_CONSTRAINTS',
        oracleOutcomeRate: 0.8200
      },
      {
        scenarioId: 'L-006-WEBGPU-CANVAS',
        domain: 'WebGPU Compute Pipeline Canvas',
        context: { domainType: 'WEBGPU_VIEW', isStreamingBinary: false, isUncharacterizedCustomRuntime: true },
        oracleStrategy: 'RESEARCH_FIRST',
        oracleOutcomeRate: 0.8000
      }
    ];

    let correctCount = 0;
    let totalRegret = 0;
    let falseTransferCount = 0;
    let abstentionOpportunities = 0;
    let correctAbstentions = 0;

    const evaluationDetails = defaultUnseen.map(s => {
      // Blind call: passing ONLY context (no oracleStrategy or gold labels)
      const decision = this.policyEngine.selectCompositionStrategy(s.context);
      const isMatch = decision.strategy === s.oracleStrategy;
      if (isMatch) correctCount++;

      // Regret calculation: Oracle Outcome - Actual Outcome of Selected Strategy
      // If strategy matches oracle, regret is 0.0%. If wrong, regret is penalty delta.
      const regret = isMatch ? 0.0000 : 0.2500;
      totalRegret += regret;

      // Track Abstention & False Transfer
      const isAbstentionCase = s.oracleStrategy === 'DO_NOT_COMPOSE' || s.oracleStrategy === 'RESEARCH_FIRST';
      if (isAbstentionCase) {
        abstentionOpportunities++;
        if (decision.strategy === 'DO_NOT_COMPOSE' || decision.strategy === 'RESEARCH_FIRST') {
          correctAbstentions++;
        } else {
          falseTransferCount++;
        }
      }

      return {
        scenarioId: s.scenarioId,
        domain: s.domain,
        selectedStrategy: decision.strategy,
        oracleStrategy: s.oracleStrategy,
        isCorrect: isMatch,
        regret,
        confidence: decision.confidence
      };
    });

    const accuracy = parseFloat((correctCount / defaultUnseen.length).toFixed(4));
    const meanRegret = parseFloat((totalRegret / defaultUnseen.length).toFixed(4));
    const falseTransferRate = abstentionOpportunities > 0 ? parseFloat((falseTransferCount / abstentionOpportunities).toFixed(4)) : 0;
    const abstentionPrecision = abstentionOpportunities > 0 ? parseFloat((correctAbstentions / abstentionOpportunities).toFixed(4)) : 1.0;

    return {
      totalUnseenScenarios: defaultUnseen.length,
      correctCount,
      accuracyUnseen: accuracy,
      accuracyUnseenPercentage: `${(accuracy * 100).toFixed(1)}%`,
      meanPolicyRegret: meanRegret,
      falseTransferRate,
      abstentionPrecision,
      abstentionPrecisionPercentage: `${(abstentionPrecision * 100).toFixed(1)}%`,
      evaluations: evaluationDetails,
      verdict: (accuracy >= 0.90 && meanRegret <= 0.02 && falseTransferRate === 0.0) ? 'BLIND_GENERALIZATION_VERIFIED' : 'GENERALIZATION_DRIFT_DETECTED'
    };
  }

  // L-06: Risk-Sensitive Lexicographic Decision Gate
  evaluateRiskSensitiveLexicographicGate(strategyProposal, securityAudit) {
    if (securityAudit.secretLeaksDetected > 0 || securityAudit.criticalVulnerabilities > 0) {
      return {
        gateStatus: 'HARD_REJECT',
        overriddenStrategy: 'DO_NOT_COMPOSE',
        reason: 'Lexicographic safety gate triggered: secret leaks or critical vulnerabilities automatically invalidate strategy before utility optimization.'
      };
    }

    return {
      gateStatus: 'PASS',
      approvedStrategy: strategyProposal.strategy,
      reason: 'Zero security regressions observed; strategy authorized for execution.'
    };
  }

  // L-08: Environmental Drift Simulation & Adaptation
  simulateEnvironmentalDrift(baseContext, driftPayload) {
    const driftedContext = { ...baseContext, ...driftPayload };
    const decision = this.policyEngine.selectCompositionStrategy(driftedContext);

    return {
      originalContext: baseContext,
      driftApplied: driftPayload,
      adaptedStrategy: decision.strategy,
      adaptationValid: decision.strategy === 'RESEARCH_FIRST' || decision.strategy === 'COMPOSE_WITH_CONSTRAINTS' || decision.strategy === 'DO_NOT_COMPOSE'
    };
  }
}
