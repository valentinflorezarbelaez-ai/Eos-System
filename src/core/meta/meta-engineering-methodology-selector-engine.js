/**
 * @module MetaEngineeringMethodologySelectorEngine
 * @description Dynamically routes problem contexts to optimal engineering methodologies:
 * Discovery, Formal Invariants, Chaos/Fuzzing, Bayesian Experimentation,
 * Theory of Constraints, HCI Cognitive Load, NASA IV&V, and Stop Conditions.
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class MetaEngineeringMethodologySelectorEngine {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.selectionHistory = [];
  }

  /**
   * Selects the optimal engineering methodology and checks stop conditions
   * @param {object} context
   * @param {string} context.problem_type
   * @param {number} [context.uncertainty_level] 0.0 to 1.0
   * @param {boolean} [context.authority_missing]
   * @param {boolean} [context.has_contradictory_evidence]
   * @returns {object} Methodology Selection Envelope
   */
  selectMethodology(context) {
    if (!context || !context.problem_type) {
      throw new Error('Methodology selection requires problem_type');
    }

    const uncertainty = context.uncertainty_level || 0.0;

    // 1. Evaluate Stop Conditions (Epistemic Humility)
    if (uncertainty > 0.85) {
      return this._formatResponse({
        status: 'STOP_CONDITION_TRIGGERED',
        reason: 'UNCERTAINTY_TOO_HIGH',
        recommendation: 'Escalate to human discovery or formulate smaller hypothesis before coding.'
      });
    }

    if (context.authority_missing === true) {
      return this._formatResponse({
        status: 'STOP_CONDITION_TRIGGERED',
        reason: 'HUMAN_AUTHORITY_REQUIRED',
        recommendation: 'Critical operation requires explicit HITL receipt.'
      });
    }

    if (context.has_contradictory_evidence === true) {
      return this._formatResponse({
        status: 'STOP_CONDITION_TRIGGERED',
        reason: 'CONTRADICTORY_EVIDENCE_DETECTED',
        recommendation: 'Resolve conflicting evidence before proceeding.'
      });
    }

    // 2. Dynamic Archetype Matching
    const type = context.problem_type.toLowerCase();
    let selected = 'STANDARD_SPEC_DRIVEN_DEVELOPMENT';
    let rationale = 'Default 10D Nanometric SDLC pipeline';

    if (type.includes('ambigu') || type.includes('discovery')) {
      selected = 'PRODUCT_DISCOVERY_AND_JTBD';
      rationale = 'Unclear business requirements demand continuous discovery and user interviews before architecture.';
    } else if (type.includes('fsm') || type.includes('state_machine') || type.includes('critical_transition')) {
      selected = 'FORMAL_INVARIANTS_AND_MODEL_CHECKING';
      rationale = 'State transition integrity demands Lamport/Hoare formal invariant proofs.';
    } else if (type.includes('adversarial') || type.includes('security') || type.includes('fuzz')) {
      selected = 'FUZZING_AND_CHAOS_ENGINEERING';
      rationale = 'Attack surface demands property fuzzing and deterministic fault injection.';
    } else if (type.includes('hypothesis') || type.includes('experiment') || type.includes('causal')) {
      selected = 'BAYESIAN_SCIENTIFIC_EXPERIMENTATION';
      rationale = 'High uncertainty requires explicit H0/H1 testing and Bayesian belief updates.';
    } else if (type.includes('bottleneck') || type.includes('performance') || type.includes('throughput')) {
      selected = 'THEORY_OF_CONSTRAINTS';
      rationale = 'Performance bottleneck requires Goldratt 5-focusing steps to optimize the primary constraint.';
    } else if (type.includes('ui') || type.includes('ux') || type.includes('interface')) {
      selected = 'HCI_COGNITIVE_LOAD_OPTIMIZATION';
      rationale = 'Interface complexity requires Don Norman mental models and cognitive load reduction.';
    } else if (type.includes('agent_delegation') || type.includes('subagent')) {
      selected = 'NASA_IV_AND_V_BOUNDED_AUTONOMY';
      rationale = 'Multi-agent delegation demands independent verification, anti-drift guardrails, and sandboxing.';
    }

    return this._formatResponse({
      status: 'METHODOLOGY_SELECTED',
      selected_methodology: selected,
      selection_rationale: rationale
    });
  }

  _formatResponse(payload) {
    const envelope = {
      ...payload,
      timestamp: new Date().toISOString()
    };
    envelope.sha256 = calculateSha256(JSON.stringify(envelope));
    this.selectionHistory.push(envelope);
    return envelope;
  }
}
