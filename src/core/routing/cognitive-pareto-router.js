/**
 * @module CognitiveParetoRouter
 * @description Multi-dimensional task complexity analyzer and Pareto-optimal
 * model router for EOS. Balances Cost ($USD), Latency (ms), and Epistemic Quality (EVD/kTok).
 */

import { createHash, randomBytes } from 'node:crypto';

export const MODEL_TIERS = Object.freeze({
  LEAN_SPEED: 'LEAN_SPEED',
  BALANCED_ENGINEERING: 'BALANCED_ENGINEERING',
  DEEP_REASONING: 'DEEP_REASONING'
});

export const MODEL_CATALOG = Object.freeze({
  [MODEL_TIERS.LEAN_SPEED]: {
    tier: MODEL_TIERS.LEAN_SPEED,
    inputCostPerMTok: 0.15,
    outputCostPerMTok: 0.60,
    expectedLatencyMs: 250,
    qualityScore: 7.2,
    maxContextTokens: 128000,
    bestFor: ['SYNTAX_CHECK', 'LINTING', 'UNIT_TEST_FORMAT', 'ROUTINE_PATCH']
  },
  [MODEL_TIERS.BALANCED_ENGINEERING]: {
    tier: MODEL_TIERS.BALANCED_ENGINEERING,
    inputCostPerMTok: 1.00,
    outputCostPerMTok: 3.00,
    expectedLatencyMs: 750,
    qualityScore: 8.8,
    maxContextTokens: 200000,
    bestFor: ['TDD_IMPLEMENTATION', 'API_DESIGN', 'REFACTORING', 'INTEGRATION']
  },
  [MODEL_TIERS.DEEP_REASONING]: {
    tier: MODEL_TIERS.DEEP_REASONING,
    inputCostPerMTok: 3.00,
    outputCostPerMTok: 15.00,
    expectedLatencyMs: 2500,
    qualityScore: 9.9,
    maxContextTokens: 200000,
    bestFor: ['ARCHITECTURE_DESIGN', 'SECURITY_AUDIT', 'FALSIFICATION', 'ROOT_CAUSE_ANALYSIS']
  }
});

export class CognitiveParetoRouter {
  constructor(options = {}) {
    this.catalog = options.catalog || MODEL_CATALOG;
    this.telemetryHistory = [];
  }

  /**
   * Analyzes multidimensional complexity of a task contract (0.0 to 10.0)
   * @param {object} taskContract
   * @returns {object} { complexityScore, riskCategory, dimensions }
   */
  analyzeComplexity(taskContract = {}) {
    const scope = taskContract.scope || {};
    const inputPayload = JSON.stringify(taskContract.input_payload || {});
    const rawTokens = Math.ceil(inputPayload.length / 4);
    const estimatedTokens = Math.max(500, rawTokens);

    // 1. Scope & File Count Dimension (0 - 2.5)
    const fileCount = (scope.allowed_files || scope.files || []).length;
    const scopeScore = Math.min(2.5, fileCount * 0.5 + (estimatedTokens > 8000 ? 1.0 : 0.2));

    // 2. Risk & Governance Dimension (0 - 3.0)
    const riskTier = taskContract.risk_tier || scope.risk_tier || 'LOW';
    let riskScore = 0.5;
    if (riskTier === 'CRITICAL' || taskContract.requires_security_audit) riskScore = 3.0;
    else if (riskTier === 'HIGH') riskScore = 2.2;
    else if (riskTier === 'MEDIUM') riskScore = 1.2;

    // 3. Domain & Logical Depth Dimension (0 - 2.5)
    const taskType = taskContract.task_type || taskContract.type || 'GENERAL';
    let domainScore = 0.5;
    if (['ARCHITECTURE', 'SECURITY', 'ROOT_CAUSE_FDIR', 'CONSENSUS_RESOLVE'].includes(taskType)) {
      domainScore = 2.5;
    } else if (['TDD_FEATURE', 'REFACTORING', 'INTEGRATION'].includes(taskType)) {
      domainScore = 1.5;
    } else if (['LINT_FIX', 'DOC_FORMAT', 'DISCOVERY_INSPECT'].includes(taskType)) {
      domainScore = 0.3;
    }

    // 4. Authority Level Dimension (0 - 2.0)
    const authority = taskContract.required_authority || 'LEVEL_0';
    let authScore = 0.2;
    if (authority === 'LEVEL_3' || authority === 'LEVEL_4') authScore = 2.0;
    else if (authority === 'LEVEL_2') authScore = 1.2;
    else if (authority === 'LEVEL_1') authScore = 0.6;

    const totalScore = Math.min(10.0, Math.round((scopeScore + riskScore + domainScore + authScore) * 10) / 10);

    return {
      complexityScore: totalScore,
      riskTier,
      estimatedTokens,
      dimensions: {
        scopeScore,
        riskScore,
        domainScore,
        authScore
      }
    };
  }

  /**
   * Routes task to Pareto-optimal model profile based on complexity and constraints
   * @param {object} taskContract
   * @param {object} [constraints] { maxCostUsd, maxLatencyMs, minQualityScore }
   * @returns {object} Routing decision envelope
   */
  routeTask(taskContract = {}, constraints = {}) {
    const analysis = this.analyzeComplexity(taskContract);
    const score = analysis.complexityScore;

    const maxCost = constraints.maxCostUsd ?? Infinity;
    const maxLatency = constraints.maxLatencyMs ?? Infinity;
    const minQuality = constraints.minQualityScore ?? 0;

    let selectedTier = MODEL_TIERS.BALANCED_ENGINEERING;
    let rationale = 'Default balanced engineering profile for standard TDD tasks';

    if (score >= 7.0 || analysis.riskTier === 'CRITICAL' || taskContract.requires_deep_reasoning) {
      selectedTier = MODEL_TIERS.DEEP_REASONING;
      rationale = `High complexity (${score}/10) or critical risk requires deep reasoning model`;
    } else if (score <= 3.0 && analysis.riskTier === 'LOW') {
      selectedTier = MODEL_TIERS.LEAN_SPEED;
      rationale = `Low complexity (${score}/10) routed to lean speed tier for ultra-low latency & cost`;
    }

    // Validate against constraints & apply Pareto fallback if exceeded
    const profile = this.catalog[selectedTier];
    const estimatedInputTokens = analysis.estimatedTokens || 1000;
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.3);

    const estimatedCostUsd =
      (estimatedInputTokens / 1_000_000) * profile.inputCostPerMTok +
      (estimatedOutputTokens / 1_000_000) * profile.outputCostPerMTok;

    return {
      route_id: `ROUT-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      task_id: taskContract.task_id || 'TASK-UNSPECIFIED',
      selected_tier: selectedTier,
      profile: {
        tier: profile.tier,
        expectedLatencyMs: profile.expectedLatencyMs,
        qualityScore: profile.qualityScore
      },
      complexity_analysis: analysis,
      estimated_economics: {
        input_tokens: estimatedInputTokens,
        output_tokens: estimatedOutputTokens,
        estimated_cost_usd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
        expected_latency_ms: profile.expectedLatencyMs
      },
      rationale,
      routed_at: new Date().toISOString()
    };
  }

  /**
   * Records execution telemetry to optimize future routing decisions
   * @param {object} telemetryRecord
   */
  recordTelemetry(telemetryRecord = {}) {
    const {
      task_id,
      tier,
      actual_cost_usd = 0,
      actual_latency_ms = 0,
      verified_evidence_count = 0,
      tokens_consumed = 0
    } = telemetryRecord;

    const evidencePerKilotoken =
      tokens_consumed > 0
        ? Math.round((verified_evidence_count / (tokens_consumed / 1000)) * 100) / 100
        : 0;

    const entry = {
      telemetry_id: `TEL-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
      task_id,
      tier,
      actual_cost_usd,
      actual_latency_ms,
      tokens_consumed,
      verified_evidence_count,
      evidence_per_kilotoken: evidencePerKilotoken,
      timestamp: new Date().toISOString()
    };

    this.telemetryHistory.push(entry);
    return entry;
  }
}
