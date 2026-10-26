/**
 * Unit Tests for AgentCapability Domain Model
 * SPEC-017: Autonomous Agent Orchestrator
 */

import { describe, it, expect } from 'vitest';
import { AgentCapability, AgentPersonas, RiskLevels } from '../../../src/core/domain/models/AgentCapability.js';

describe('AgentCapability Domain Model', () => {
  it('instantiates valid capabilities with frozen immutability', () => {
    const cap = AgentCapability.create({
      id: 'CAP-TEST',
      name: 'Test Capability',
      description: 'Used for unit testing',
      persona: 'ARCHITECT',
      inputs: [{ name: 'inputA', type: 'string', required: true }],
      outputs: [{ name: 'outputB', type: 'number' }],
      riskLevel: 'LOW',
      tags: ['test', 'unit'],
    });

    expect(cap.id).toBe('CAP-TEST');
    expect(cap.name).toBe('Test Capability');
    expect(cap.persona).toBe('ARCHITECT');
    expect(cap.riskLevel).toBe('LOW');
    expect(cap.inputs.length).toBe(1);
    expect(cap.outputs.length).toBe(1);
    expect(cap.tags).toEqual(['test', 'unit']);
    expect(Object.isFrozen(cap)).toBe(true);
    expect(Object.isFrozen(cap.inputs)).toBe(true);
    expect(Object.isFrozen(cap.outputs)).toBe(true);
    expect(Object.isFrozen(cap.tags)).toBe(true);
  });

  it('throws error on missing or invalid mandatory fields', () => {
    expect(() =>
      AgentCapability.create({
        id: '',
        name: 'Test',
        description: 'Desc',
        persona: 'ARCHITECT',
        inputs: [],
        outputs: [],
      })
    ).toThrow('AgentCapability id must be a non-empty string.');

    expect(() =>
      AgentCapability.create({
        id: 'CAP-1',
        name: '   ',
        description: 'Desc',
        persona: 'ARCHITECT',
        inputs: [],
        outputs: [],
      })
    ).toThrow('AgentCapability name must be a non-empty string.');

    expect(() =>
      AgentCapability.create({
        id: 'CAP-1',
        name: 'Name',
        description: '',
        persona: 'ARCHITECT',
        inputs: [],
        outputs: [],
      })
    ).toThrow('AgentCapability description must be a non-empty string.');

    expect(() =>
      AgentCapability.create({
        id: 'CAP-1',
        name: 'Name',
        description: 'Desc',
        persona: 'INVALID_PERSONA' as any,
        inputs: [],
        outputs: [],
      })
    ).toThrow(/Invalid persona/);

    expect(() =>
      AgentCapability.create({
        id: 'CAP-1',
        name: 'Name',
        description: 'Desc',
        persona: 'ARCHITECT',
        inputs: [],
        outputs: [],
        riskLevel: 'EXPLOSIVE' as any,
      })
    ).toThrow(/Invalid riskLevel/);
  });

  it('validates input contracts correctly', () => {
    const cap = AgentCapability.create({
      id: 'CAP-VALIDATION',
      name: 'Validation test',
      description: 'Checks inputs',
      persona: 'QA_LEAD',
      inputs: [
        { name: 'mandatoryStr', type: 'string', required: true },
        { name: 'optionalNum', type: 'number', required: false },
        { name: 'mandatoryArr', type: 'array', required: true },
      ],
      outputs: [],
    });

    // Valid inputs
    const validResult = cap.validateInputs({
      mandatoryStr: 'hello',
      optionalNum: 42,
      mandatoryArr: [1, 2, 3],
    });
    expect(validResult.valid).toBe(true);
    expect(validResult.missing).toHaveLength(0);
    expect(validResult.errors).toHaveLength(0);

    // Missing required field
    const missingResult = cap.validateInputs({
      optionalNum: 42,
    });
    expect(missingResult.valid).toBe(false);
    expect(missingResult.missing).toContain('mandatoryStr');
    expect(missingResult.missing).toContain('mandatoryArr');

    // Type mismatch error
    const typeErrorResult = cap.validateInputs({
      mandatoryStr: 123 as any,
      mandatoryArr: 'not an array' as any,
    });
    expect(typeErrorResult.valid).toBe(false);
    expect(typeErrorResult.errors.length).toBeGreaterThan(0);
  });

  it('validates output contracts correctly', () => {
    const cap = AgentCapability.create({
      id: 'CAP-OUTPUTS',
      name: 'Output validation test',
      description: 'Checks outputs',
      persona: 'SECURITY_AUDITOR',
      inputs: [],
      outputs: [
        { name: 'issueCount', type: 'number' },
        { name: 'cleanFlag', type: 'boolean' },
      ],
    });

    const validResult = cap.validateOutputs({
      issueCount: 0,
      cleanFlag: true,
    });
    expect(validResult.valid).toBe(true);

    const missingResult = cap.validateOutputs({
      issueCount: 0,
    });
    expect(missingResult.valid).toBe(false);
    expect(missingResult.missing).toContain('cleanFlag');

    const typeErrorResult = cap.validateOutputs({
      issueCount: 'none' as any,
      cleanFlag: true,
    });
    expect(typeErrorResult.valid).toBe(false);
    expect(typeErrorResult.errors).toHaveLength(1);
  });

  it('serializes to JSON cleanly', () => {
    const cap = AgentCapability.create({
      id: 'CAP-JSON',
      name: 'JSON Test',
      description: 'JSON description',
      persona: 'PRODUCT_ESTIMATOR',
      inputs: [{ name: 'in1', type: 'string', required: true }],
      outputs: [{ name: 'out1', type: 'number' }],
      riskLevel: 'MEDIUM',
      tags: ['json'],
    });

    const json = cap.toJSON();
    expect(json.id).toBe('CAP-JSON');
    expect(json.persona).toBe('PRODUCT_ESTIMATOR');
    expect(json.riskLevel).toBe('MEDIUM');
    expect(json.tags).toEqual(['json']);
  });

  it('provides all 6 standard pipeline presets', () => {
    const presets = AgentCapability.PRESETS;
    expect(presets.SPECIFICATION_ENGINEERING).toBeDefined();
    expect(presets.SPECIFICATION_ENGINEERING.persona).toBe('ARCHITECT');

    expect(presets.SECURITY_AUDIT).toBeDefined();
    expect(presets.SECURITY_AUDIT.persona).toBe('SECURITY_AUDITOR');

    expect(presets.PERFORMANCE_BUDGETING).toBeDefined();
    expect(presets.PERFORMANCE_BUDGETING.persona).toBe('PERFORMANCE_ENGINEER');

    expect(presets.PERT_ESTIMATION).toBeDefined();
    expect(presets.PERT_ESTIMATION.persona).toBe('PRODUCT_ESTIMATOR');

    expect(presets.HEXAGONAL_IMPLEMENTATION).toBeDefined();
    expect(presets.HEXAGONAL_IMPLEMENTATION.persona).toBe('CORE_IMPLEMENTER');

    expect(presets.INVARIANT_VERIFICATION).toBeDefined();
    expect(presets.INVARIANT_VERIFICATION.persona).toBe('QA_LEAD');
  });

  it('exposes all valid personas and risk levels', () => {
    expect(AgentPersonas).toContain('ARCHITECT');
    expect(AgentPersonas).toContain('SECURITY_AUDITOR');
    expect(AgentPersonas).toContain('CORE_IMPLEMENTER');
    expect(RiskLevels).toContain('LOW');
    expect(RiskLevels).toContain('CRITICAL');
  });
});
