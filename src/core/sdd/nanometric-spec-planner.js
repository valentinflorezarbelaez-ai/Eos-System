/**
 * @module NanometricSpecPlanner
 * @description Compiles exhaustive, nanometric task specifications where every detail
 * (inputs, outputs, invariants, tool bindings, test commands, and falsification cases) is mathematically locked.
 */

import { calculateSha256 } from './epistemic-evidence-engine.js';

export class NanometricSpecPlanner {
  /**
   * Compiles an exhaustive nanometric plan from a high-level mission definition
   * @param {object} mission
   * @param {string} mission.id
   * @param {string} mission.goal
   * @param {string} [mission.architecture]
   * @param {Array<object>} mission.tasks
   * @returns {object} Nanometric plan envelope with cryptographic signature
   */
  compileNanometricPlan(mission) {
    if (!mission || !mission.id || !mission.goal || !Array.isArray(mission.tasks)) {
      throw new Error('Invalid mission envelope: id, goal, and tasks array are required');
    }

    const compiledTasks = mission.tasks.map((t, index) => {
      const taskId = t.task_id || `TASK-${String(index + 1).padStart(3, '0')}`;
      
      const compiled = {
        task_id: taskId,
        title: t.title || `Execute ${taskId}`,
        phase: t.phase || 'IMPLEMENTATION',
        authority_level: t.authority_level || 'A1',
        file_manifest: {
          new_files: t.file_manifest?.new_files || [],
          modify_files: t.file_manifest?.modify_files || [],
          read_only_files: t.file_manifest?.read_only_files || [],
          forbidden_paths: t.file_manifest?.forbidden_paths || ['docs/audits/', 'docs/governance/']
        },
        input_contract: t.input_contract || {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          additionalProperties: false
        },
        output_contract: t.output_contract || {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          additionalProperties: false
        },
        pre_conditions: t.pre_conditions || ['PRE_LEDGER_CHECK_PASS', 'ZERO_TRUST_AUTHORITY_CONFIRMED'],
        invariants: t.invariants || ['EXTERNAL_WRITE_BARRIER_DELTA_ZERO', 'ZERO_REGRESSION_IN_TEST_SUITE'],
        tool_bindings: t.tool_bindings || ['eos.workspace.barrier_check', 'eos.evidence.record'],
        exact_test_command: t.exact_test_command || 'npm test',
        falsification_checks: t.falsification_checks || [
          'REJECT_EMPTY_OR_NULL_PAYLOAD',
          'REJECT_UNAUTHORIZED_WRITE'
        ]
      };

      compiled.sha256 = calculateSha256(JSON.stringify(compiled));
      return compiled;
    });

    const plan = {
      plan_id: `PLAN-NANO-${mission.id}`,
      mission_id: mission.id,
      goal: mission.goal,
      architecture_standard: mission.architecture || 'CLEAN_HEXAGONAL_SPEC_DRIVEN_DEVELOPMENT',
      spec_depth_level: 'NANOMETRIC_SSOT_LEVEL_7',
      total_tasks: compiledTasks.length,
      tasks: compiledTasks,
      created_at: new Date().toISOString()
    };

    plan.sha256 = calculateSha256(JSON.stringify(plan));
    return plan;
  }

  /**
   * Validates if a task specification meets the nanometric completeness standard
   * @param {object} taskSpec
   * @returns {boolean}
   */
  validateCompleteness(taskSpec) {
    if (!taskSpec) return false;
    const required = [
      'task_id', 'title', 'phase', 'file_manifest',
      'input_contract', 'output_contract', 'pre_conditions',
      'invariants', 'tool_bindings', 'exact_test_command', 'falsification_checks'
    ];
    return required.every(field => taskSpec[field] !== undefined);
  }
}
