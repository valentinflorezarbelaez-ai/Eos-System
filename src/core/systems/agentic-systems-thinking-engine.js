/**
 * @module AgenticSystemsThinkingEngine
 * @description Coordinates the High-Performance Engineering Disciplines for Autonomous Agents:
 * NASA V&V, Goldratt (Theory of Constraints), Munger (Pre-Mortem Inversion),
 * Taleb (Antifragility & Blast Radius), and Toyota Lean (Waste Elimination).
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class AgenticSystemsThinkingEngine {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.evaluatedMissions = [];
  }

  /**
   * Evaluates a mission plan under the High-Performance Engineering OS disciplines
   * @param {object} plan
   * @param {string} plan.mission_id
   * @param {object} plan.nasa_vv { verification_plan: string, validation_outcome: string }
   * @param {object} plan.goldratt_constraint { bottleneck: string, targeted_fix: string }
   * @param {object} plan.munger_premortem { potential_failures: string[], mitigations: string[] }
   * @param {object} plan.taleb_safety { is_blast_radius_bounded: boolean, is_reversible: boolean }
   * @param {object} [plan.toyota_lean] { has_redundant_agents: boolean, has_unused_abstractions: boolean }
   * @returns {object} Systems Thinking Evaluation Envelope
   */
  evaluateMissionEngineering(plan) {
    if (!plan || !plan.mission_id) {
      throw new Error('Mission engineering evaluation requires mission_id');
    }

    const missingDisciplines = [];

    // 1. NASA V&V Separation
    if (!plan.nasa_vv || !plan.nasa_vv.verification_plan || !plan.nasa_vv.validation_outcome) {
      missingDisciplines.push('NASA_VV_INCOMPLETE: Verification (Build Right) and Validation (Build Right Thing) must both be defined.');
    }

    // 2. Goldratt Constraint Identification
    if (!plan.goldratt_constraint || !plan.goldratt_constraint.bottleneck) {
      missingDisciplines.push('GOLDRATT_TOC_MISSING: Primary bottleneck must be identified before optimizing.');
    }

    // 3. Munger Pre-Mortem Inversion
    if (!plan.munger_premortem || !Array.isArray(plan.munger_premortem.potential_failures) || plan.munger_premortem.potential_failures.length === 0) {
      missingDisciplines.push('MUNGER_PREMORTEM_MISSING: Explicit failure modes and mitigations required.');
    }

    // 4. Taleb Antifragility & Blast Radius
    if (!plan.taleb_safety || plan.taleb_safety.is_blast_radius_bounded !== true || plan.taleb_safety.is_reversible !== true) {
      missingDisciplines.push('TALEB_BLAST_RADIUS_UNSAFE: Blast radius must be strictly bounded and changes must be reversible.');
    }

    // 5. Toyota Lean Waste Check
    const hasWaste = plan.toyota_lean?.has_redundant_agents === true || plan.toyota_lean?.has_unused_abstractions === true;
    if (hasWaste) {
      missingDisciplines.push('TOYOTA_LEAN_WASTE_DETECTED: Redundant agents or unused abstractions must be eliminated.');
    }

    const isApproved = missingDisciplines.length === 0;

    const evaluation = {
      mission_id: plan.mission_id,
      verdict: isApproved ? 'MISSION_ENGINEERING_APPROVED' : 'MISSION_ENGINEERING_REJECTED',
      missing_disciplines: missingDisciplines,
      disciplines_applied: [
        'NASA_VERIFICATION_AND_VALIDATION',
        'GOLDRATT_THEORY_OF_CONSTRAINTS',
        'MUNGER_PREMORTEM_INVERSION',
        'TALEB_ANTIFRAGILE_BLAST_RADIUS',
        'TOYOTA_LEAN_WASTE_ELIMINATION',
        'DEMING_SYSTEMIC_ROOT_CAUSE',
        'SRE_EXPLICIT_RISK_BUDGET'
      ],
      timestamp: new Date().toISOString()
    };

    evaluation.sha256 = calculateSha256(JSON.stringify(evaluation));
    this.evaluatedMissions.push(evaluation);

    return evaluation;
  }
}
