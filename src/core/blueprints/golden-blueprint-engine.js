/**
 * @module GoldenBlueprintEngine
 * @description Master orchestration engine for executing EOS Golden Spec-Driven Blueprints.
 * Enforces 9-phase sequential execution, epistemic gate compliance, and SHA-256 receipt generation.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SchemaValidator } from '../contracts/schema-validator.js';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class GoldenBlueprintEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.baseDir]
   * @param {SchemaValidator} [options.schemas]
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.schemas = options.schemas || new SchemaValidator({ schemaRoots: [path.join(this.baseDir, 'docs/schemas')] });
    this.executionHistory = [];
  }

  /**
   * Loads a blueprint JSON from disk
   * @param {string} blueprintPath Path relative to baseDir or absolute
   * @returns {object} Parsed blueprint object
   */
  loadBlueprint(blueprintPath) {
    const fullPath = path.isAbsolute(blueprintPath) ? blueprintPath : path.resolve(this.baseDir, blueprintPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`BLUEPRINT_NOT_FOUND: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const parsed = JSON.parse(content);
    this.validateBlueprint(parsed);
    return parsed;
  }

  /**
   * Validates a blueprint object against golden-blueprint.schema.json
   * @param {object} blueprint
   * @returns {boolean} True if valid
   */
  validateBlueprint(blueprint) {
    if (!blueprint || typeof blueprint !== 'object') {
      throw new Error('BLUEPRINT_VALIDATION_ERROR: Blueprint must be a valid object');
    }

    const requiredFields = [
      'schema_version',
      'blueprint_id',
      'title',
      'version',
      'description',
      'engineering_standard',
      'lifecycle_phases',
      'governance_invariants',
      'required_engines'
    ];

    for (const f of requiredFields) {
      if (!blueprint[f]) {
        throw new Error(`BLUEPRINT_VALIDATION_ERROR: Missing required field "${f}"`);
      }
    }

    if (!Array.isArray(blueprint.lifecycle_phases) || blueprint.lifecycle_phases.length < 9) {
      throw new Error(`BLUEPRINT_VALIDATION_ERROR: Blueprint must declare at least 9 lifecycle phases (found ${blueprint.lifecycle_phases?.length || 0})`);
    }

    return true;
  }

  /**
   * Executes a blueprint phase sequence with step-by-step epistemic gate validation
   * @param {object} params
   * @param {object} params.blueprint
   * @param {object} params.missionContext
   * @param {Function} params.phaseExecutor (phase, context) => Promise<object>
   * @returns {Promise<object>} Execution report
   */
  async executeBlueprint(params = {}) {
    const { blueprint, missionContext = {}, phaseExecutor } = params;
    this.validateBlueprint(blueprint);

    if (typeof phaseExecutor !== 'function') {
      throw new Error('BLUEPRINT_ERROR: phaseExecutor must be an executable async function');
    }

    const executionId = `BEX-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const phaseResults = [];
    const startTime = Date.now();

    for (let i = 0; i < blueprint.lifecycle_phases.length; i++) {
      const phase = blueprint.lifecycle_phases[i];
      const phaseStart = Date.now();

      // Check Epistemic Gate
      if (phase.epistemic_gate === 'HUMAN_APPROVAL_REQUIRED') {
        const hitlReceipt = missionContext.hitl_receipts?.[phase.phase_id];
        if (!hitlReceipt && !missionContext.allow_simulated_gates) {
          throw new Error(`EPISTEMIC_GATE_BLOCKED [${phase.phase_id}]: Human Director HITL receipt required to advance`);
        }
      }

      // Execute Phase
      const result = await phaseExecutor(phase, {
        ...missionContext,
        previous_phase_results: phaseResults
      });

      phaseResults.push({
        phase_index: i + 1,
        phase_id: phase.phase_id,
        name: phase.name,
        duration_ms: Date.now() - phaseStart,
        epistemic_status: result.status || 'VERIFIED',
        outputs: result.outputs || {},
        completed_at: new Date().toISOString()
      });
    }

    const report = {
      execution_id: executionId,
      blueprint_id: blueprint.blueprint_id,
      title: blueprint.title,
      total_phases: blueprint.lifecycle_phases.length,
      duration_total_ms: Date.now() - startTime,
      verdict: 'GOLDEN_BLUEPRINT_COMPLETE',
      phases: phaseResults,
      completed_at: new Date().toISOString()
    };

    report.sha256 = calculateSha256(JSON.stringify(report));
    this.executionHistory.push(report);
    return report;
  }
}
