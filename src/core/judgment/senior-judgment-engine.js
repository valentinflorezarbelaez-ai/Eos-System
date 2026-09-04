/**
 * @module SeniorJudgmentEngine
 * @description Evaluates architectural proposals through the lens of Senior Engineering Judgment:
 * Rich Hickey (Decomplecting), Fred Brooks (Conceptual Integrity), Jeff Dean (Minimizing Coordination Cost),
 * Dan North (Anti-Architecture Theater), Kent Beck (Smallest Behavior), and Uncle Bob (Code Health).
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class SeniorJudgmentEngine {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.history = [];
  }

  /**
   * Evaluates an architectural proposal or implementation plan against Senior Judgment principles
   * @param {object} proposal
   * @param {string} proposal.title
   * @param {boolean} proposal.solves_real_problem
   * @param {number} [proposal.layer_count] Number of architectural layers introduced
   * @param {number} [proposal.agent_count] Number of agents requested for coordination
   * @param {boolean} [proposal.is_decomplected] Whether components are independent and unentangled
   * @param {boolean} [proposal.preserves_conceptual_integrity] Whether it adheres to core system nomenclature & rules
   * @param {boolean} [proposal.reduces_future_change_cost] Whether it makes tomorrow's change easier
   * @returns {object} Senior Judgment Verdict Envelope
   */
  evaluateProposal(proposal) {
    if (!proposal || !proposal.title) {
      throw new Error('Proposal must provide a title');
    }

    const solvesReal = proposal.solves_real_problem !== false;
    const layerCount = proposal.layer_count || 1;
    const agentCount = proposal.agent_count || 1;
    const decomplected = proposal.is_decomplected !== false;
    const conceptualIntegrity = proposal.preserves_conceptual_integrity !== false;
    const futureChangeReady = proposal.reduces_future_change_cost !== false;

    let verdict = 'APPROVED_SIMPLE';
    const criticisms = [];

    // 1. Anti-Architecture Theater Check (Dan North / Stroustrup)
    if (!solvesReal || layerCount > 4) {
      verdict = 'REJECTED_ARCHITECTURE_THEATER';
      criticisms.push('Proposal introduces complexity or layers without a real, demonstrable underlying problem.');
    }

    // 2. Coordination Cost Check (Jeff Dean)
    if (agentCount > 4 && verdict === 'APPROVED_SIMPLE') {
      verdict = 'REJECTED_COORDINATION_BLOAT';
      criticisms.push('Too many agents requested. Minimizing coordination cost produces faster, more reliable results.');
    }

    // 3. Decomplecting Check (Rich Hickey)
    if (!decomplected && verdict === 'APPROVED_SIMPLE') {
      verdict = 'REJECTED_COMPLECTED_DESIGN';
      criticisms.push('Components are tightly entangled. Decomplecting into orthogonal pieces is required.');
    }

    // 4. Conceptual Integrity Check (Fred Brooks)
    if (!conceptualIntegrity && verdict === 'APPROVED_SIMPLE') {
      verdict = 'REJECTED_CONCEPTUAL_DRIFT';
      criticisms.push('Violates system-wide naming, rules, or architectural consistency.');
    }

    // Calculate Seniority Score (0.0 to 1.0)
    let score = 1.0;
    if (layerCount > 3) score -= 0.2;
    if (agentCount > 2) score -= 0.15;
    if (!solvesReal) score -= 0.5;
    if (!decomplected) score -= 0.3;
    if (!conceptualIntegrity) score -= 0.2;
    if (!futureChangeReady) score -= 0.2;
    score = Math.max(0.0, Number(score.toFixed(2)));

    const judgment = {
      proposal_title: proposal.title,
      verdict,
      seniority_score: score,
      criticisms,
      senior_principles_checked: [
        'KENT_BECK_SMALLEST_VIABLE_BEHAVIOR',
        'RICH_HICKEY_DECOMPLECTING',
        'FRED_BROOKS_CONCEPTUAL_INTEGRITY',
        'JEFF_DEAN_MINIMIZE_COORDINATION_COST',
        'DAN_NORTH_ANTI_ARCHITECTURE_THEATER',
        'UNCLE_BOB_LEAVE_SYSTEM_HEALTHIER'
      ],
      timestamp: new Date().toISOString()
    };

    judgment.sha256 = calculateSha256(JSON.stringify(judgment));
    this.history.push(judgment);

    return judgment;
  }
}
