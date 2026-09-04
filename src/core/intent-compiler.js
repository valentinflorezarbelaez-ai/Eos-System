/**
 * @module EOSIntentCompiler
 * @description Universal Intent Compiler and Holistic Synthesis Engine for EOS.
 * Expands brief human directives into full-spectrum EARS specifications, BDD scenarios,
 * hexagonal architecture boundaries, and sequenced atomic DAG tasks using Governed Intelligence
 * with fallback to deterministic templates.
 */

import crypto from 'node:crypto';
import { GovernedLlmService } from './intelligence/governed-llm-service.js';
import { SchemaValidator } from './contracts/schema-validator.js';
import { calculateSha256 } from './sdd/epistemic-evidence-engine.js';

export class EOSIntentCompiler {
  /**
   * @param {object} [options]
   * @param {GovernedLlmService} [options.llmService]
   * @param {SchemaValidator} [options.validator]
   */
  constructor(options = {}) {
    this.name = 'EOS Universal Intent Compiler';
    this.validator = options.validator || new SchemaValidator();
    this.llmService = options.llmService || new GovernedLlmService({ validator: this.validator });
  }

  /**
   * Cognitively compiles a human instruction into a formal, verified specification package via Governed Intelligence.
   * @param {object} params
   * @param {string} params.prompt Raw human instruction or goal
   * @param {string} [params.missionId] Optional mission identifier
   * @param {string} [params.domainContext='general-software'] Optional domain context
   * @param {string} [params.authorityLevel='LEVEL_1'] Authority level
   * @param {string} [params.model='gemini-2.0-flash'] Target model
   * @param {object} [params.budgetConstraints] Budget limits
   * @param {object} [params.metadata] Additional context
   * @returns {Promise<object>} Formal verified intent specification package with LLM receipt
   */
  async compileIntent({
    prompt,
    missionId,
    domainContext = 'general-software',
    authorityLevel = 'LEVEL_1',
    model = 'gemini-2.0-flash',
    budgetConstraints = null,
    metadata = {}
  } = {}) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('MISSING_PROMPT: Provide a human instruction or goal statement to compile.');
    }

    const trimmedPrompt = prompt.trim();
    const effectiveMissionId = missionId || `MIS-INTENT-${Date.now()}`;
    const intentId = `INTENT-${Date.now().toString(36).toUpperCase()}`;

    const intentSchema = this.validator.loadSchema('intent-specification.schema.json');

    const systemPrompt = `You are the EOS Sovereign Intent Compiler and Specification Synthesizer.
Transform the provided engineering request into a formal specification package.
Follow these mandatory standards:
1. Requirements must follow formal EARS syntax (patterns: 'Ubiquitous', 'Event-Driven', 'State-Driven', 'Error-Handling', 'Optional').
2. Acceptance criteria must follow BDD GIVEN-WHEN-THEN-AND format.
3. Architecture boundaries must specify Clean/Hexagonal ports and adapters.
4. The atomic task DAG must decompose work into sequential steps assigned to canonical roles: 'SYSTEM_ARCHITECT', 'CORE_ENGINEER', 'EVIDENCE_AUDITOR', 'SECURITY_AUDITOR', or 'QA_ENGINEER'.
5. Epistemic analysis must identify explicit assumptions, unknown variables, risks, and whether human clarification is required.
Respond strictly in valid JSON matching the schema.`;

    const request = {
      schema_version: '1.0.0',
      request_id: `REQ-${Date.now()}`,
      mission_id: effectiveMissionId,
      task_id: 'TASK-INTENT-01',
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Domain Context: ${domainContext}\nInstruction to compile:\n"${trimmedPrompt}"`
        }
      ],
      structured_output_schema: intentSchema,
      authority_level: authorityLevel,
      budget_constraints: budgetConstraints || {
        max_input_tokens: 4000,
        max_output_tokens: 3000,
        timeout_ms: 25000
      },
      metadata: {
        domainContext,
        ...metadata
      }
    };

    const { response, receipt } = await this.llmService.executeInference(request);

    const structured = response.structured_output || {};

    const compiledPackage = {
      schema_version: '1.0.0',
      intent_id: intentId,
      mission_id: effectiveMissionId,
      raw_prompt: trimmedPrompt,
      domain_context: domainContext,
      high_level_goal: structured.high_level_goal || `Implement verified solution for: ${trimmedPrompt}`,
      intent_summary: structured.intent_summary || trimmedPrompt,
      requirements_ears: structured.requirements_ears || [],
      bdd_scenarios: structured.bdd_scenarios || [],
      architecture_boundaries: structured.architecture_boundaries || {
        affected_layers: ['Domain Core', 'Application Service'],
        external_write_barrier_status: 'ENFORCED',
        ports_required: [],
        adapters_required: []
      },
      atomic_task_dag: structured.atomic_task_dag || [],
      epistemic_analysis: structured.epistemic_analysis || {
        assumptions: [],
        unknowns: [],
        risks: [],
        requires_hitl_clarification: false
      }
    };

    // Assert full package validity against schema
    this.validator.assertValid(compiledPackage, 'intent-specification.schema.json', 'intent-specification');

    const canonicalPackageStr = JSON.stringify(compiledPackage, Object.keys(compiledPackage).sort());
    const packageHash = calculateSha256(canonicalPackageStr);

    return {
      ...compiledPackage,
      sha256_hash: packageHash,
      epistemic_state: 'INTENT_COGNITIVELY_COMPILED',
      llm_receipt: receipt
    };
  }

  /**
   * Deterministic synchronous fallback for template-based intent expansion (backward-compatible)
   * @param {object} params
   * @param {string} params.prompt Raw human instruction or goal
   * @param {string} [params.domainContext] Optional domain context
   * @param {string} [params.authorityLevel] Authority grant level
   * @returns {object} Full formal specification package
   */
  expandirIntencion({ prompt, domainContext = 'general-software', authorityLevel = 'LEVEL_1' } = {}) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('MISSING_PROMPT: Provide a human instruction or goal statement to expand.');
    }

    const trimmedPrompt = prompt.trim();
    const timestamp = new Date().toISOString();
    const intentId = `INTENT-${Date.now().toString(36).toUpperCase()}`;

    // 1. Synthesize High-Level Objective
    const highLevelGoal = `Implement formal, verified solution for: ${trimmedPrompt}`;

    // 2. Derive Formal EARS Requirements
    const requirementsEars = [
      {
        id: 'REQ-EARS-001',
        pattern: 'Ubiquitous',
        statement: `EL SISTEMA DEBE garantizar la integridad inmutable y el cumplimiento de las invariantes para: ${trimmedPrompt}.`
      },
      {
        id: 'REQ-EARS-002',
        pattern: 'Event-Driven',
        statement: `CUANDO el usuario o agente invoque la operación, EL SISTEMA DEBE ejecutar la validación contractual previa.`
      },
      {
        id: 'REQ-EARS-003',
        pattern: 'Error-Handling',
        statement: `SI se detecta una anomalía o desviación de datos, ENTONCES EL SISTEMA DEBE abortar de forma segura sin mutaciones residuales.`
      }
    ];

    // 3. Formulate BDD Acceptance Scenarios
    const bddScenarios = [
      {
        scenario_id: 'SCN-001',
        name: `Ejecución exitosa de ${trimmedPrompt.slice(0, 40)}`,
        given: 'DADO un estado inicial nominal y contratos validados',
        when: 'CUANDO se procesa la solicitud conforme a la especificación',
        then: 'ENTONCES el resultado observable es verificado con exit code 0',
        and: 'Y la evidencia SHA-256 es registrada en el Ledger'
      },
      {
        scenario_id: 'SCN-002',
        name: 'Manejo defensivo ante entrada anómala',
        given: 'DADO un payload con parámetros inválidos o corruptos',
        when: 'CUANDO el sistema recibe la solicitud',
        then: 'ENTONCES rechaza la operación sin efectos secundarios',
        and: 'Y emite un diagnóstico estructurado'
      }
    ];

    // 4. Compute Causal Blast Radius & Safety Bounds
    const causalBlastRadius = {
      affected_layers: ['Domain Core', 'Application Service', 'MCP / Presentation Adapter'],
      external_write_barrier_status: 'ENFORCED',
      risk_level: 'LOW_GOVERNED',
      rollback_strategy: 'FDIR Atomic Reversion via Engram Baseline'
    };

    const architectureBoundaries = {
      affected_layers: ['Domain Core', 'Application Service', 'MCP / Presentation Adapter'],
      external_write_barrier_status: 'ENFORCED',
      ports_required: ['LlmPort'],
      adapters_required: ['GeminiAdapter']
    };

    // 5. Decompose into Atomic Task DAG
    const atomicTaskDag = [
      {
        task_id: 'TASK-SPEC-01',
        step_order: 1,
        assigned_role: 'SYSTEM_ARCHITECT',
        name: 'SPEC_FORMALIZATION',
        objective: 'Record EARS requirements and BDD scenarios in docs/specs/',
        acceptance_criteria: ['Specification approved by human director']
      },
      {
        task_id: 'TASK-ARCH-02',
        step_order: 2,
        assigned_role: 'SYSTEM_ARCHITECT',
        name: 'ARCHITECTURE_PLAN',
        objective: 'Define module interfaces and clean hexagonal boundaries',
        acceptance_criteria: ['0 cyclic dependencies']
      },
      {
        task_id: 'TASK-TDD-03',
        step_order: 3,
        assigned_role: 'CORE_ENGINEER',
        name: 'TDD_RED_TESTS',
        objective: 'Write unit tests establishing fail-first deterministic contracts',
        acceptance_criteria: ['Tests fail predictably on missing implementation']
      },
      {
        task_id: 'TASK-IMPL-04',
        step_order: 4,
        assigned_role: 'CORE_ENGINEER',
        name: 'DOMAIN_IMPLEMENTATION',
        objective: 'Implement pure domain logic satisfying test contracts',
        acceptance_criteria: ['100% test pass rate on scoped suite']
      },
      {
        task_id: 'TASK-AUDIT-05',
        step_order: 5,
        assigned_role: 'EVIDENCE_AUDITOR',
        name: 'STRICT_AUDIT_SEAL',
        objective: 'Run verify:strict (481 checks) and seal EVD evidence',
        acceptance_criteria: ['Evidence receipt SHA-256 committed to ledger']
      }
    ];

    const packageData = {
      schema_version: '1.0.0',
      intent_id: intentId,
      mission_id: `MIS-FALLBACK-${Date.now()}`,
      timestamp,
      raw_prompt: trimmedPrompt,
      domain_context: domainContext,
      authority_level: authorityLevel,
      high_level_goal: highLevelGoal,
      intent_summary: trimmedPrompt,
      requirements_ears: requirementsEars,
      bdd_scenarios: bddScenarios,
      causal_blast_radius: causalBlastRadius,
      architecture_boundaries: architectureBoundaries,
      atomic_task_dag: atomicTaskDag,
      epistemic_analysis: {
        assumptions: ['Environment is clean and deterministic'],
        unknowns: [],
        risks: ['External write boundary violation if Level 2 unapproved'],
        requires_hitl_clarification: false
      }
    };

    const packageHash = crypto.createHash('sha256').update(JSON.stringify(packageData)).digest('hex');

    return {
      ...packageData,
      sha256_hash: packageHash,
      epistemic_state: 'INTENT_HOLISTICALLY_EXPANDED'
    };
  }
}
