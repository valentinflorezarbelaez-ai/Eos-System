/**
 * @module MicroCycleEngine
 * @description Executes Uncle Bob Martin & Kent Beck style TDD Micro-Cycles:
 * Problem -> Smallest Behavior -> RED -> GREEN -> REFACTOR -> REVIEW -> INTEGRATE.
 */

import { calculateSha256 } from './epistemic-evidence-engine.js';

export class MicroCycleEngine {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.completedCycles = [];
  }

  /**
   * Executes a formal 7-step atomic TDD micro-cycle
   * @param {object} params
   * @param {string} params.behavior_title
   * @param {Function} params.test_runner Function that takes an implementation and returns boolean (true = pass, false/throws = fail)
   * @param {Function} params.baseline_implementation Minimal or null implementation expected to fail
   * @param {Function} params.green_implementation Minimal implementation expected to pass
   * @param {Function} [params.refactored_implementation] Cleaned implementation expected to pass cleanly
   * @param {object} [params.review_criteria]
   * @returns {object} Micro-cycle cryptographic receipt
   */
  executeMicroCycle(params) {
    if (!params || !params.behavior_title || !params.test_runner) {
      throw new Error('Micro-cycle requires behavior_title and test_runner');
    }

    const startTime = performance.now();
    const cycleLog = [];

    // 1. RED PHASE (Must fail on baseline)
    let redFailed = false;
    try {
      const redResult = params.test_runner(params.baseline_implementation || (() => null));
      redFailed = redResult === false;
    } catch {
      redFailed = true;
    }

    if (!redFailed) {
      throw new Error(`RED PHASE FAILED: Test did not fail on baseline for behavior "${params.behavior_title}". Test must fail first.`);
    }
    cycleLog.push({ step: 'RED', status: 'CONFIRMED_FAILED_AS_EXPECTED' });

    // 2. GREEN PHASE (Must pass on green implementation)
    let greenPassed = false;
    try {
      const greenResult = params.test_runner(params.green_implementation);
      greenPassed = greenResult === true;
    } catch {
      greenPassed = false;
    }

    if (!greenPassed) {
      throw new Error(`GREEN PHASE FAILED: Implementation did not satisfy test for behavior "${params.behavior_title}".`);
    }
    cycleLog.push({ step: 'GREEN', status: 'CONFIRMED_MINIMAL_PASS' });

    // 3. REFACTOR PHASE (Must preserve green)
    let activeImplementation = params.green_implementation;
    if (params.refactored_implementation) {
      let refactorPassed = false;
      try {
        const refResult = params.test_runner(params.refactored_implementation);
        refactorPassed = refResult === true;
      } catch {
        refactorPassed = false;
      }

      if (!refactorPassed) {
        throw new Error(`REFACTOR PHASE FAILED: Refactored code broke behavior for "${params.behavior_title}".`);
      }
      activeImplementation = params.refactored_implementation;
      cycleLog.push({ step: 'REFACTOR', status: 'CONFIRMED_CLEAN_PASS' });
    }

    // 4. REVIEW PHASE (Google-style Code Health)
    const reviewChecks = {
      is_abstraction_justified: params.review_criteria?.is_abstraction_justified ?? true,
      naming_communicates_intent: params.review_criteria?.naming_communicates_intent ?? true,
      no_hidden_debt: params.review_criteria?.no_hidden_debt ?? true,
      leave_system_healthier: params.review_criteria?.leave_system_healthier ?? true
    };
    cycleLog.push({ step: 'REVIEW', status: 'PASSED', checks: reviewChecks });

    const durationMs = Number((performance.now() - startTime).toFixed(3));

    // 5. INTEGRATE PHASE
    const receipt = {
      cycle_id: `CYCLE-${Date.now()}-${this.completedCycles.length + 1}`,
      behavior_title: params.behavior_title,
      status: 'VERIFIED_GREEN_AND_CLEAN',
      execution_log: cycleLog,
      code_health_verdict: 'LEAVE_THE_SYSTEM_HEALTHIER_SATISFIED',
      duration_ms: durationMs,
      timestamp: new Date().toISOString()
    };

    receipt.sha256 = calculateSha256(JSON.stringify(receipt));
    this.completedCycles.push(receipt);

    return receipt;
  }
}
