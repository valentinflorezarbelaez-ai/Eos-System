import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class CompositionPolicyEngine {
  constructor() {
    this.policyGraphPath = path.join(rootDir, 'docs/knowledge/COMPOSITION_POLICY_GRAPH.json');
    this.taxonomyPath = path.join(rootDir, 'docs/knowledge/KNOWLEDGE_TYPE_TAXONOMY.json');
    this.utilityModelPath = path.join(rootDir, 'docs/governance/POLICY_UTILITY_MODEL.json');
  }

  // K-02 & K-04: Evaluate Adaptive Composition Strategy
  selectCompositionStrategy(context) {
    const {
      domainType,
      isStreamingBinary,
      hasSecrets,
      requiresLiveGuidance,
      isReadOnly,
      isPublicUnauthenticated,
      isUncharacterizedCustomRuntime,
      legacyParserLatencyMs
    } = context;

    // 1. Negative Knowledge Hard Gate
    if (isStreamingBinary) {
      return {
        strategy: 'DO_NOT_COMPOSE',
        selectedOrder: null,
        justification: 'Streaming binary protocol violates NEG-BKM-001 guard; regex DOM composition causes fatal thread starvation.',
        confidence: 0.99
      };
    }

    // 2. Uncharacterized Custom Runtime
    if (isUncharacterizedCustomRuntime) {
      return {
        strategy: 'RESEARCH_FIRST',
        selectedOrder: null,
        justification: 'Uncharacterized runtime environment (e.g. WebAssembly canvas) lacks structural DOM evidence; research required prior to strategy deployment.',
        confidence: 0.90
      };
    }

    // 3. High-Latency Legacy Parser with Constraints
    if (hasSecrets && requiresLiveGuidance && legacyParserLatencyMs && legacyParserLatencyMs > 250) {
      return {
        strategy: 'COMPOSE_WITH_CONSTRAINTS',
        selectedOrder: 'A_THEN_B',
        constraints: ['DEBOUNCE_FEEDBACK_300MS', 'MAX_PAYLOAD_50KB'],
        justification: 'Dual requirement present but legacy parser latency exceeds 250ms; composition permitted only under debounce and payload constraints.',
        confidence: 0.93
      };
    }

    // 4. Dual Requirement -> Order Dependent Composition (A -> B)
    if (hasSecrets && requiresLiveGuidance && !isReadOnly) {
      return {
        strategy: 'A_THEN_B',
        selectedOrder: 'A_FIRST_THEN_B',
        justification: 'Dual requirement: edge sanitization masks secrets at input boundary prior to rendering live accessible guidance.',
        confidence: 0.98
      };
    }

    // 5. Single Requirement: Sanitization Only (e.g. Read-Only Audit Log)
    if (hasSecrets && (isReadOnly || !requiresLiveGuidance)) {
      return {
        strategy: 'A_ONLY',
        selectedOrder: 'A_ONLY',
        justification: 'Secret masking required without interactive input guidance.',
        confidence: 0.96
      };
    }

    // 6. Single Requirement: Feedback Only (e.g. Public Questionnaire)
    if (!hasSecrets && requiresLiveGuidance && isPublicUnauthenticated) {
      return {
        strategy: 'B_ONLY',
        selectedOrder: 'B_ONLY',
        justification: 'Public unauthenticated questionnaire requires live validation without secret sanitization overhead.',
        confidence: 0.97
      };
    }

    return {
      strategy: 'DO_NOT_COMPOSE',
      selectedOrder: null,
      justification: 'Context presents no valid trigger for atomic or composite BKMs.',
      confidence: 0.85
    };
  }

  // K-03: Strategy Selection Benchmark Evaluator
  evaluateStrategySelectionBenchmark(scenarios = []) {
    const defaultScenarios = scenarios.length > 0 ? scenarios : [
      {
        scenarioId: 'BENCH-01-STREAMING',
        context: { domainType: 'SOCKET', isStreamingBinary: true, hasSecrets: true, requiresLiveGuidance: true },
        expectedStrategy: 'DO_NOT_COMPOSE'
      },
      {
        scenarioId: 'BENCH-02-ENV-MIGRATION',
        context: { domainType: 'MIGRATION_FORM', isStreamingBinary: false, hasSecrets: true, requiresLiveGuidance: true, isReadOnly: false },
        expectedStrategy: 'A_THEN_B'
      },
      {
        scenarioId: 'BENCH-03-AUDIT-VIEWER',
        context: { domainType: 'LOG_VIEWER', isStreamingBinary: false, hasSecrets: true, requiresLiveGuidance: false, isReadOnly: true },
        expectedStrategy: 'A_ONLY'
      },
      {
        scenarioId: 'BENCH-04-PUBLIC-SURVEY',
        context: { domainType: 'PUBLIC_FORM', isStreamingBinary: false, hasSecrets: false, requiresLiveGuidance: true, isPublicUnauthenticated: true },
        expectedStrategy: 'B_ONLY'
      },
      {
        scenarioId: 'BENCH-05-LEGACY-CONSTRAINED',
        context: { domainType: 'LEGACY_IMPORT', isStreamingBinary: false, hasSecrets: true, requiresLiveGuidance: true, legacyParserLatencyMs: 400 },
        expectedStrategy: 'COMPOSE_WITH_CONSTRAINTS'
      },
      {
        scenarioId: 'BENCH-06-WASM-CANVAS',
        context: { domainType: 'WASM_VIEW', isStreamingBinary: false, isUncharacterizedCustomRuntime: true },
        expectedStrategy: 'RESEARCH_FIRST'
      }
    ];

    let correctCount = 0;
    const evaluatedResults = defaultScenarios.map(s => {
      const decision = this.selectCompositionStrategy(s.context);
      const isCorrect = decision.strategy === s.expectedStrategy;
      if (isCorrect) correctCount++;

      return {
        scenarioId: s.scenarioId,
        context: s.context,
        expectedStrategy: s.expectedStrategy,
        selectedStrategy: decision.strategy,
        isCorrect,
        confidence: decision.confidence
      };
    });

    const accuracy = parseFloat((correctCount / defaultScenarios.length).toFixed(4));

    return {
      totalScenarios: defaultScenarios.length,
      correctCount,
      strategySelectionAccuracy: accuracy,
      accuracyPercentage: `${(accuracy * 100).toFixed(1)}%`,
      results: evaluatedResults,
      verdict: accuracy === 1.0 ? 'STRATEGY_SELECTION_ACCURACY_100_PERCENT' : 'POLICY_ERROR_DETECTED'
    };
  }

  // K-05: Policy Utility Calculation
  calculatePolicyUtility(params) {
    const { outcomeGain, costPenalty, riskPenalty, reworkPenalty } = params;
    // Policy Utility = OutcomeGain - CostPenalty - RiskPenalty - ReworkPenalty
    const utility = parseFloat((outcomeGain - costPenalty - riskPenalty - reworkPenalty).toFixed(2));

    return {
      metricClassification: 'EOS_INTERNAL_METRIC',
      metricName: 'Policy Utility Index',
      outcomeGain,
      costPenalty,
      riskPenalty,
      reworkPenalty,
      policyUtility: utility,
      utilityVerdict: utility > 10.0 ? 'HIGH_POLICY_UTILITY' : 'MARGINAL_POLICY_UTILITY'
    };
  }
}
