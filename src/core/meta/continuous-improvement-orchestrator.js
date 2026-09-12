/**
 * @module ContinuousImprovementOrchestrator
 * @description Master Meta-Engineering & Continuous Improvement Orchestrator for EOS.
 * Combines MetaEngineeringMethodologySelectorEngine and EvolutionaryStrategyOptimizer to
 * select optimal engineering paradigms, rank candidate strategies via Pareto fitness,
 * enforce epistemic stop conditions, and seal verifiable Strategy Decision Contracts.
 */

import fs from 'node:fs';
import crypto from "node:crypto";
import path from 'node:path';

import { MetaEngineeringMethodologySelectorEngine } from './meta-engineering-methodology-selector-engine.js';
import { EvolutionaryStrategyOptimizer } from '../optimization/evolutionary-strategy-optimizer.js';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class ContinuousImprovementOrchestrator {
  /**
   * @param {object} [options]
   * @param {MetaEngineeringMethodologySelectorEngine} [options.selector]
   * @param {EvolutionaryStrategyOptimizer} [options.optimizer]
   * @param {SchemaValidator} [options.validator]
   */
  constructor(options = {}) {
    this.selector = options.selector || new MetaEngineeringMethodologySelectorEngine(options);
    this.optimizer = options.optimizer || new EvolutionaryStrategyOptimizer(options);
    this.validator = options.validator || new SchemaValidator();
  }

  /**
   * Evaluates problem context, routes to optimal engineering methodology, and ranks candidate strategies.
   * @param {object} params
   * @param {string} params.missionId
   * @param {string} params.problemType
   * @param {number} [params.uncertaintyLevel]
   * @param {Array<object>} [params.candidates]
   * @param {object} [params.weights]
   * @param {string} [params.missionDir]
   * @returns {object}
   */
  evaluateAndDecideStrategy(params = {}) {
    if (!params.missionId || !params.problemType) {
      throw new Error('STRATEGY_ERROR: missionId and problemType are required.');
    }

    const missionId = params.missionId;
    const problemType = params.problemType;
    const uncertaintyLevel = params.uncertaintyLevel || 0.0;

    // 1. Evaluate Engineering Methodology and Stop Conditions
    const methodologyResult = this.selector.selectMethodology({
      problem_type: problemType,
      uncertainty_level: uncertaintyLevel,
      authority_missing: params.authorityMissing === true,
      has_contradictory_evidence: params.hasContradictoryEvidence === true
    });

    if (methodologyResult.status === 'STOP_CONDITION_TRIGGERED') {
      return {
        status: 'STOP_CONDITION_TRIGGERED',
        mission_id: missionId,
        reason: methodologyResult.reason,
        recommendation: methodologyResult.recommendation
      };
    }

    // 2. Multi-Objective Pareto Strategy Evaluation
    const candidates = Array.isArray(params.candidates) && params.candidates.length > 0
      ? params.candidates
      : [
          {
            id: 'STRAT-01',
            name: `${methodologyResult.selected_methodology}_STANDARD`,
            estimatedLatencyMs: 120,
            memoryBytes: 2048,
            bloatIndex: 1.0,
            reversibilityScore: 0.95
          },
          {
            id: 'STRAT-02',
            name: `${methodologyResult.selected_methodology}_SPECULATIVE`,
            estimatedLatencyMs: 250,
            memoryBytes: 8192,
            bloatIndex: 3.5,
            reversibilityScore: 0.70
          }
        ];

    const candidateResult = this.optimizer.evaluateCandidates(candidates, params.weights || {});
    const winnerName = candidateResult.selected_name || methodologyResult.selected_methodology;
    const winnerScore = candidateResult.winner_fitness_score ?? 1.0;

    // 3. Formulate and Seal Strategy Decision Record
    const decisionId = `STRAT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").substring(0, 4).toUpperCase()}`;
    const rawDecision = {
      schema_version: '1.0.0',
      decision_id: decisionId,
      mission_id: missionId,
      problem_type: problemType,
      selected_strategy: winnerName,
      rationale: `${methodologyResult.selection_rationale} | Winner: ${winnerName} (Fitness: ${winnerScore})`,
      candidates_evaluated: candidateResult.candidates_comparison || [],
      issued_at: new Date().toISOString()
    };

    const canonicalStr = JSON.stringify(rawDecision, Object.keys(rawDecision).sort());
    const decisionRecord = {
      ...rawDecision,
      sha256: calculateSha256(canonicalStr)
    };

    // 4. Assert Schema Conformance
    this.validator.assertValid(decisionRecord, 'strategy-decision.schema.json', 'strategy-decision');

    // 5. Persist to Mission Decisions Directory if missionDir provided
    if (params.missionDir && fs.existsSync(params.missionDir)) {
      const decisionsDir = path.join(params.missionDir, 'decisions');
      if (!fs.existsSync(decisionsDir)) {
        fs.mkdirSync(decisionsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(decisionsDir, 'strategy-decision.json'), JSON.stringify(decisionRecord, null, 2), 'utf8');
    }

    return {
      status: 'DECISION_COMMITTED',
      decisionRecord,
      methodologyResult,
      candidateResult
    };
  }
}
