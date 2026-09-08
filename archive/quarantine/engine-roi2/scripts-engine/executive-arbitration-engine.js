import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ExecutiveArbitrationEngine {
  constructor() {
    this.hypotheses = new Map();
    this.decisions = [];
    this.contradictions = [];
  }

  // M-01 & M-02: Multi-Source Evidence Arbitration & Agent Reliability
  arbitrateRecommendations(recommendations, context = {}) {
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('INVALID_ARBITRATION_INPUT: recommendations array is required');
    }

    // Weighting: Never use pure majority vote. Weight by:
    // Domain Expertise (0.30), Evidence Quality (0.30), Historical Reliability (0.25), Source Provenance (0.15)
    const evaluated = recommendations.map(rec => {
      const domainFit = rec.agentDomain === context.targetDomain ? 10.0 : 6.0;
      const evidenceGrade = rec.evidenceType === 'EMPIRICAL_EXECUTION' ? 10.0 : (rec.evidenceType === 'SANDBOX_BENCHMARK' ? 8.0 : 4.0);
      const reliability = Number(rec.historicalReliability || 8.0);
      const provenance = rec.isPrimarySource ? 10.0 : 6.0;

      const arbitrationScore = Number((
        domainFit * 0.30 +
        evidenceGrade * 0.30 +
        reliability * 0.25 +
        provenance * 0.15
      ).toFixed(2));

      return {
        ...rec,
        arbitrationScore,
        epistemicGrade: evidenceGrade >= 8.0 ? 'EMPIRICAL' : 'ASSUMPTION'
      };
    });

    // Sort by arbitration score descending
    evaluated.sort((a, b) => b.arbitrationScore - a.arbitrationScore);
    const topChoice = evaluated[0];

    return {
      selectedRecommendation: topChoice,
      evaluatedCandidates: evaluated,
      arbitrationMethod: 'WEIGHTED_PROVENANCE_AND_EXPERTISE (Anti-Majority Vote)',
      confidence: topChoice.arbitrationScore >= 8.0 ? 'HIGH_CONFIDENCE' : 'MEDIUM_CONFIDENCE'
    };
  }

  // M-03: Contradiction Detection Engine
  detectContradiction(claimA, claimB) {
    const isContradiction = (
      (claimA.assertion === true && claimB.assertion === false) ||
      (claimA.value && claimB.value && claimA.value !== claimB.value && claimA.subject === claimB.subject)
    );

    if (isContradiction) {
      const record = {
        contradictionId: `CONTRA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        subject: claimA.subject || 'UNSPECIFIED_SUBJECT',
        claimA: { source: claimA.source, assertion: claimA.assertion, value: claimA.value },
        claimB: { source: claimB.source, assertion: claimB.assertion, value: claimB.value },
        status: 'CONFLICTED',
        resolutionPolicy: 'HALT_AUTO_ASSUMPTION_REQUIRE_PRIMARY_SOURCE_RESEARCH',
        detectedAt: new Date().toISOString()
      };
      this.contradictions.push(record);
      return {
        hasContradiction: true,
        status: 'CONFLICTED',
        record
      };
    }

    return { hasContradiction: false, status: 'CONSISTENT' };
  }

  // M-04: Confidence & Uncertainty Engine
  evaluateUncertainty(evidenceItems, isSyntheticOnly = false) {
    if (!evidenceItems || evidenceItems.length === 0) {
      return {
        epistemicState: 'UNKNOWN',
        confidenceScore: 0.0,
        policy: 'TRIGGER_RESEARCH_PLAN'
      };
    }

    const hasContradiction = evidenceItems.some(item => item.isContradicted);
    if (hasContradiction) {
      return {
        epistemicState: 'CONFLICTED',
        confidenceScore: 0.20,
        policy: 'HALT_AUTO_ASSUMPTION_RESOLVE_CONTRADICTION'
      };
    }

    let baseScore = evidenceItems.reduce((acc, item) => {
      if (item.type === 'REAL_WORLD_EVIDENCE') return acc + 0.95;
      if (item.type === 'SANDBOX_EMPIRICAL') return acc + 0.80;
      return acc + 0.40; // ASSUMPTION
    }, 0) / evidenceItems.length;

    // Single source / Synthetic repetition penalty
    if (isSyntheticOnly) {
      baseScore = Math.min(baseScore, 0.70); // Never claim >70% confidence on synthetic-only tests
    }

    baseScore = Number(baseScore.toFixed(2));

    let epistemicState = 'MEDIUM_CONFIDENCE';
    if (baseScore >= 0.85) epistemicState = 'HIGH_CONFIDENCE';
    else if (baseScore >= 0.75) epistemicState = 'KNOWN_IN_SANDBOX';
    else if (baseScore < 0.50) epistemicState = 'LOW_CONFIDENCE';

    return {
      epistemicState,
      confidenceScore: baseScore,
      evidenceCount: evidenceItems.length,
      isSyntheticOnly,
      policy: baseScore >= 0.75 ? 'PROCEED_WITH_VERIFICATION' : 'REQUIRE_ADDITIONAL_RESEARCH'
    };
  }

  // M-05: Decision Synthesis
  synthesizeExecutiveDecision(input) {
    const {
      topic,
      objective,
      selectedOption,
      alternatives = [],
      evidenceRefs = [],
      confidence = 'HIGH_CONFIDENCE',
      risks = [],
      rollbackPlan = 'Revert commit or configuration'
    } = input;

    const decisionRecord = {
      decisionId: `DEC-${Date.now()}`,
      topic,
      objective,
      decision: selectedOption.name,
      rationale: selectedOption.rationale,
      alternativesConsidered: alternatives.map(a => ({ name: a.name, rejectionReason: a.rejectionReason })),
      confidence,
      evidenceTraced: evidenceRefs,
      risksIdentified: risks,
      rollbackProcedure: rollbackPlan,
      governanceStatus: 'GOVERNED_AND_AUDITABLE',
      timestamp: new Date().toISOString()
    };

    this.decisions.push(decisionRecord);
    return decisionRecord;
  }

  // M-06: Hypothesis Management
  registerHypothesis(hypothesis) {
    const { hypothesisId, statement, domain } = hypothesis;
    const record = {
      hypothesisId,
      statement,
      domain,
      status: 'PROPOSED',
      empiricalRuns: 0,
      supportedRuns: 0,
      refutedRuns: 0,
      verdict: 'PENDING_EVALUATION'
    };
    this.hypotheses.set(hypothesisId, record);
    return record;
  }

  updateHypothesisOutcome(hypothesisId, wasSupported, context = '') {
    if (!this.hypotheses.has(hypothesisId)) {
      throw new Error(`HYPOTHESIS_NOT_FOUND: Hypothesis ${hypothesisId} does not exist`);
    }

    const hyp = this.hypotheses.get(hypothesisId);
    hyp.empiricalRuns += 1;
    if (wasSupported) hyp.supportedRuns += 1;
    else hyp.refutedRuns += 1;

    hyp.status = 'TESTING';

    if (hyp.empiricalRuns >= 3) {
      const supportRate = hyp.supportedRuns / hyp.empiricalRuns;
      if (supportRate >= 0.80) {
        hyp.verdict = 'SUPPORTED';
        hyp.status = 'RESOLVED';
      } else if (supportRate <= 0.20) {
        hyp.verdict = 'REFUTED';
        hyp.status = 'RESOLVED';
      } else {
        hyp.verdict = 'DOMAIN_SPECIFIC';
        hyp.status = 'RESOLVED_CONDITIONALLY';
      }
    }

    return hyp;
  }
}
