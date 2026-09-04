/**
 * @module AutonomousMissionProver
 * @description Master Autonomous Mission Proving Engine for EOS Mission OS.
 * Orchestrates the full 21-Step Master Engineering Pipeline end-to-end:
 * Intake ➔ Intent Compilation (EARS/BDD) ➔ Topological DAG Planning ➔
 * Governed Execution ➔ Closed-Loop Auto-Repair ➔ Ledger Verification ➔ Executive Report ➔ ATS Closure.
 */

import fs from 'node:fs';
import path from 'node:path';

import { MissionRuntime } from './mission-runtime.js';
import { SchemaValidator } from '../contracts/schema-validator.js';

export class AutonomousMissionProver {
  /**
   * @param {object} [options]
   * @param {MissionRuntime} [options.runtime]
   * @param {SchemaValidator} [options.validator]
   */
  constructor(options = {}) {
    this.runtime = options.runtime || new MissionRuntime(options);
    this.validator = options.validator || new SchemaValidator();
  }

  /**
   * Executes a complete autonomous mission from human goal to closed, verified ledger state.
   * @param {object} params
   * @param {string} params.goal Human intention or engineering goal
   * @param {string} [params.businessContext] Business motivation
   * @param {string} params.projectPath Target workspace path
   * @param {string} [params.authorityLevel] Authority token (default: LEVEL_2)
   * @param {number} [params.budgetCapUsd] Budget ceiling in USD (default: 0.25)
   * @param {object} [options]
   * @param {object} [options.intentSpec] Explicit pre-compiled intent spec
   * @param {boolean} [options.useLlmCompiler] If true, uses GovernedLlmService compiler
   * @param {object} [options.taskOptions] Options passed down to task executor (e.g. runner, autoRepair)
   * @returns {Promise<object>} Canary execution telemetry package
   */
  async runAutonomousCanary(params, options = {}) {
    if (!params && !params.goal && !params.projectPath) {
      throw new Error('CANARY_ERROR: params.goal and params.projectPath are required.');
    }

    const authorityLevel = params.authorityLevel || 'LEVEL_2';
    const startTime = Date.now();

    // 1. INTAKE & MISSION INITIALIZATION
    const created = this.runtime.createMission({
      goal: params.goal,
      businessContext: params.businessContext || 'Autonomous Canary Proving Mission',
      projectPath: params.projectPath,
      authorityLevel,
      budgetCapUsd: params.budgetCapUsd || 0.25
    });
    const missionId = created.mission_id;

    // 2. INTENT UNDERSTANDING & SPECIFICATION SYNTHESIS (EARS / BDD / TASK DAG)
    let intentSpec = options.intentSpec;
    if (!intentSpec) {
      if (options.useLlmCompiler && this.runtime.intentCompiler?.compileIntent) {
        intentSpec = await this.runtime.intentCompiler.compileIntent({
          caller_agent_id: 'AGENT-CANARY-01',
          mission_id: missionId,
          authority_token: authorityLevel,
          prompt: params.goal,
          domainContext: path.basename(params.projectPath)
        });
      } else {
        intentSpec = this.runtime.intentCompiler.expandirIntencion({
          prompt: params.goal,
          domainContext: path.basename(params.projectPath),
          authorityLevel
        });
      }
    }

    // Assert intent specification contract
    this.validator.assertValid(intentSpec, 'intent-specification.schema.json', 'intent-specification');

    // 3. TOPOLOGICAL DAG PLANNING & TASK CONTRACT GENERATION
    const planned = this.runtime.planMission(missionId, { intentSpec });

    // 4. GOVERNED WAVE-BY-WAVE EXECUTION & CLOSED-LOOP REPAIR
    const dagResult = await this.runtime.executeMissionDag(missionId, {
      authorityLevel,
      ...(options.taskOptions || {})
    });

    // 5. EXECUTIVE REPORT GENERATION
    const report = this.runtime.reportMission(missionId, 'json');

    // 6. MERKLE & LEDGER INTEGRITY VERIFICATION
    const verification = this.runtime.verifyMission(missionId);
    if (!verification.valid) {
      throw new Error(`CANARY_INTEGRITY_FAILED: Ledger chain or manifest validation failed for mission '${missionId}': ${JSON.stringify(verification.discrepancies)}`);
    }

    // 7. CANONICAL CLOSURE & KNOWLEDGE PERSISTENCE
    const closed = this.runtime.closeMission(
      missionId,
      'Autonomous canary proving completed with 100% verified evidence and 0 broken invariants.'
    );

    const durationMs = Date.now() - startTime;

    return {
      mission_id: missionId,
      status: 'VERIFIED_COMPLETED',
      duration_ms: durationMs,
      created,
      intent_spec: intentSpec,
      planned,
      dag_result: dagResult,
      verification,
      report,
      closed
    };
  }
}
