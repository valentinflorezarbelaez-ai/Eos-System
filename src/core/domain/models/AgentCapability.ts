/**
 * AgentCapability Domain Model (Layer 0 — Pure Domain)
 * SPEC-017: Autonomous Agent Orchestrator
 *
 * Defines agent personas, execution capabilities, input/output data contracts,
 * risk assessments, and standard pipeline step presets.
 *
 * ZERO external dependencies — strictly pure TypeScript.
 */

import type { RiskLevel } from '../types.js';

export const AgentPersonas = [
  'ARCHITECT',
  'SECURITY_AUDITOR',
  'PERFORMANCE_ENGINEER',
  'PRODUCT_ESTIMATOR',
  'CORE_IMPLEMENTER',
  'QA_LEAD',
] as const;

export type AgentPersona = (typeof AgentPersonas)[number];

export const RiskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export interface CapabilityInputContract {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly required: boolean;
  readonly description?: string;
}

export interface CapabilityOutputContract {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description?: string;
}

export interface AgentCapabilityParams {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly persona: AgentPersona;
  readonly inputs: readonly CapabilityInputContract[];
  readonly outputs: readonly CapabilityOutputContract[];
  readonly riskLevel?: RiskLevel;
  readonly tags?: readonly string[];
}

export class AgentCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly persona: AgentPersona;
  readonly inputs: readonly CapabilityInputContract[];
  readonly outputs: readonly CapabilityOutputContract[];
  readonly riskLevel: RiskLevel;
  readonly tags: readonly string[];

  constructor(params: AgentCapabilityParams) {
    if (!params.id || params.id.trim().length === 0) {
      throw new Error('AgentCapability id must be a non-empty string.');
    }
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('AgentCapability name must be a non-empty string.');
    }
    if (!params.description || params.description.trim().length === 0) {
      throw new Error('AgentCapability description must be a non-empty string.');
    }
    if (!AgentPersonas.includes(params.persona)) {
      throw new Error(`Invalid persona "${params.persona}". Valid personas: ${AgentPersonas.join(', ')}`);
    }

    const risk = params.riskLevel ?? 'LOW';
    if (!RiskLevels.includes(risk)) {
      throw new Error(`Invalid riskLevel "${risk}". Valid levels: ${RiskLevels.join(', ')}`);
    }

    this.id = params.id.trim();
    this.name = params.name.trim();
    this.description = params.description.trim();
    this.persona = params.persona;
    this.inputs = Object.freeze([...(params.inputs ?? [])]);
    this.outputs = Object.freeze([...(params.outputs ?? [])]);
    this.riskLevel = risk;
    this.tags = Object.freeze([...(params.tags ?? [])]);

    Object.freeze(this);
  }

  static create(params: AgentCapabilityParams): AgentCapability {
    return new AgentCapability(params);
  }

  validateInputs(providedInputs: Record<string, unknown>): { valid: boolean; missing: string[]; errors: string[] } {
    const missing: string[] = [];
    const errors: string[] = [];

    for (const contract of this.inputs) {
      const val = providedInputs[contract.name];
      if (contract.required && (val === undefined || val === null || val === '')) {
        missing.push(contract.name);
        continue;
      }
      if (val !== undefined && val !== null) {
        const actualType = Array.isArray(val) ? 'array' : typeof val;
        if (actualType !== contract.type) {
          errors.push(`Input "${contract.name}" expected type ${contract.type}, received ${actualType}`);
        }
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors,
    };
  }

  validateOutputs(providedOutputs: Record<string, unknown>): { valid: boolean; missing: string[]; errors: string[] } {
    const missing: string[] = [];
    const errors: string[] = [];

    for (const contract of this.outputs) {
      const val = providedOutputs[contract.name];
      if (val === undefined || val === null) {
        missing.push(contract.name);
        continue;
      }
      const actualType = Array.isArray(val) ? 'array' : typeof val;
      if (actualType !== contract.type) {
        errors.push(`Output "${contract.name}" expected type ${contract.type}, received ${actualType}`);
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      persona: this.persona,
      inputs: this.inputs,
      outputs: this.outputs,
      riskLevel: this.riskLevel,
      tags: this.tags,
    };
  }

  // ─── Standard Presets for 21-Step Pipeline ────────────────────

  static readonly PRESETS = Object.freeze({
    SPECIFICATION_ENGINEERING: AgentCapability.create({
      id: 'CAP-SPEC-ENGINEERING',
      name: 'Requirements & EARS Specification Engineering',
      description: 'Formalizes user requests into EARS patterns and BDD acceptance criteria.',
      persona: 'ARCHITECT',
      inputs: [{ name: 'rawPrompt', type: 'string', required: true, description: 'Client request or intake prompt' }],
      outputs: [{ name: 'specContent', type: 'string', description: 'EARS specification markdown' }],
      riskLevel: 'LOW',
      tags: ['spec', 'ears', 'bdd', 'architecture'],
    }),

    SECURITY_AUDIT: AgentCapability.create({
      id: 'CAP-SECURITY-AUDIT',
      name: 'Adversarial Security & Zero Plain Secrets Audit',
      description: 'Inspects code and configuration for secrets, vulnerabilities, and boundary violations.',
      persona: 'SECURITY_AUDITOR',
      inputs: [{ name: 'targetCode', type: 'string', required: true, description: 'Code or config to audit' }],
      outputs: [{ name: 'vulnerabilitiesCount', type: 'number', description: 'Identified security issues count' }],
      riskLevel: 'CRITICAL',
      tags: ['security', 'owasp', 'secrets'],
    }),

    PERFORMANCE_BUDGETING: AgentCapability.create({
      id: 'CAP-PERFORMANCE-BUDGET',
      name: 'Performance Budgets & Algorithmic Bounds Evaluation',
      description: 'Calculates latency ceilings, memory bounds, and bundle limits.',
      persona: 'PERFORMANCE_ENGINEER',
      inputs: [{ name: 'benchmarkMetrics', type: 'object', required: true, description: 'Runtime execution metrics' }],
      outputs: [{ name: 'passedThresholds', type: 'boolean', description: 'True if within budgets' }],
      riskLevel: 'MEDIUM',
      tags: ['performance', 'latency', 'budgets'],
    }),

    PERT_ESTIMATION: AgentCapability.create({
      id: 'CAP-PERT-ESTIMATION',
      name: 'Production RAG & PERT Beta Effort Decomposition',
      description: 'Generates optimistic, nominal, and pessimistic task estimations with confidence scoring.',
      persona: 'PRODUCT_ESTIMATOR',
      inputs: [{ name: 'taskScope', type: 'string', required: true, description: 'Feature scope description' }],
      outputs: [{ name: 'pertHours', type: 'number', description: 'Calculated PERT expected hours' }],
      riskLevel: 'LOW',
      tags: ['rag', 'pert', 'estimation'],
    }),

    HEXAGONAL_IMPLEMENTATION: AgentCapability.create({
      id: 'CAP-HEXAGONAL-IMPL',
      name: 'Clean Hexagonal Domain & Application Implementation',
      description: 'Develops pure domain logic and application service orchestrators.',
      persona: 'CORE_IMPLEMENTER',
      inputs: [{ name: 'spec', type: 'string', required: true, description: 'Approved specification' }],
      outputs: [{ name: 'implementationCode', type: 'string', description: 'Produced TypeScript implementation' }],
      riskLevel: 'HIGH',
      tags: ['domain', 'application', 'implementation'],
    }),

    INVARIANT_VERIFICATION: AgentCapability.create({
      id: 'CAP-INVARIANT-VERIFY',
      name: 'Deterministic Quality & Invariant Test Verification',
      description: 'Runs test assertions and produces cryptographic evidence records.',
      persona: 'QA_LEAD',
      inputs: [{ name: 'suiteName', type: 'string', required: true, description: 'Test suite identifier' }],
      outputs: [{ name: 'allTestsPassed', type: 'boolean', description: 'True if exit code 0' }],
      riskLevel: 'LOW',
      tags: ['tests', 'verification', 'evidence'],
    }),
  });
}
