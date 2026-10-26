/**
 * Unit Tests for AgentOrchestrator Application Service
 * SPEC-017: Autonomous Agent Orchestrator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../../../src/core/application/AgentOrchestrator.js';
import { AgentCapability } from '../../../src/core/domain/models/AgentCapability.js';
import { MockLLMProvider } from '../../../src/infrastructure/LLMProvider.js';
import { TelemetryPipeline } from '../../../src/core/application/TelemetryPipeline.js';

describe('AgentOrchestrator Application Service', () => {
  let mockProvider: MockLLMProvider;
  let pipeline: TelemetryPipeline;
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    pipeline = new TelemetryPipeline({ minSeverity: 'DEBUG' });
    orchestrator = new AgentOrchestrator({
      provider: mockProvider,
      telemetry: pipeline,
    });
  });

  it('initializes with standard presets and empty history', () => {
    const capabilities = orchestrator.listCapabilities();
    expect(capabilities.length).toBeGreaterThanOrEqual(6);

    const specCap = orchestrator.getCapability('CAP-SPEC-ENGINEERING');
    expect(specCap).toBeDefined();
    expect(specCap?.persona).toBe('ARCHITECT');

    expect(orchestrator.history).toHaveLength(0);
  });

  it('allows registering custom capabilities', () => {
    const customCap = AgentCapability.create({
      id: 'CAP-CUSTOM',
      name: 'Custom Capability',
      description: 'Does something custom',
      persona: 'PERFORMANCE_ENGINEER',
      inputs: [{ name: 'param1', type: 'string', required: true }],
      outputs: [{ name: 'res1', type: 'string' }],
    });

    orchestrator.registerCapability(customCap);
    expect(orchestrator.getCapability('CAP-CUSTOM')).toBe(customCap);
  });

  it('executes single step successfully and emits telemetry', async () => {
    const result = await orchestrator.executeStep(
      {
        stepIndex: 1,
        name: 'Analyze Architecture',
        capabilityId: 'CAP-SPEC-ENGINEERING',
        prompt: 'Formulate EARS requirements for user authentication',
        inputs: { rawPrompt: 'user authentication' },
      },
      'CORR-123'
    );

    expect(result.status).toBe('COMPLETED');
    expect(result.persona).toBe('ARCHITECT');
    expect(result.output).toBeDefined();
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.tokens).toBeGreaterThan(0);
    expect(result.reasoning).toContain('[ARCHITECT]');

    // Check telemetry events
    expect(pipeline.bufferedCount).toBeGreaterThan(0);
  });

  it('handles input contract validation failures gracefully', async () => {
    const result = await orchestrator.executeStep({
      stepIndex: 1,
      name: 'Fail Step',
      capabilityId: 'CAP-SPEC-ENGINEERING',
      prompt: 'Missing input parameter',
      inputs: {}, // Missing 'rawPrompt'
    });

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('Input contract violation');
    expect(result.error).toContain('rawPrompt');
  });

  it('handles missing capability in step execution', async () => {
    const result = await orchestrator.executeStep({
      stepIndex: 99,
      name: 'Unknown step',
      capabilityId: 'CAP-NON-EXISTENT',
      prompt: 'Do something',
    });

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('Capability "CAP-NON-EXISTENT" not found');
  });

  it('executes full standard pipeline successfully with context chaining', async () => {
    const run = await orchestrator.executeStandardPipeline(
      'Implement structured telemetry streaming for EOS dashboard',
      'CORR-PIPELINE-001'
    );

    expect(run.status).toBe('SUCCESS');
    expect(run.runId).toMatch(/^RUN-/);
    expect(run.steps).toHaveLength(4);
    expect(run.totalTokens).toBeGreaterThan(0);
    expect(run.totalDurationMs).toBeGreaterThanOrEqual(0);

    const stepPersonas = run.steps.map((s) => s.persona);
    expect(stepPersonas).toEqual(['ARCHITECT', 'SECURITY_AUDITOR', 'CORE_IMPLEMENTER', 'QA_LEAD']);

    expect(orchestrator.history).toHaveLength(1);
    expect(orchestrator.history[0].runId).toBe(run.runId);
  });

  it('skips downstream steps if an upstream step fails', async () => {
    // Custom provider that rejects on security step
    const failingProvider: any = {
      name: 'FailingProvider',
      modelId: 'fail-v1',
      isAvailable: () => true,
      complete: async (req: any) => {
        if (req.persona === 'SECURITY_AUDITOR') {
          throw new Error('Simulated security provider outage');
        }
        return {
          content: 'OK',
          tokensUsed: { prompt: 10, completion: 10, total: 20 },
          durationMs: 5,
          model: 'fail-v1',
        };
      },
    };

    const failingOrchestrator = new AgentOrchestrator({
      provider: failingProvider,
    });

    const run = await failingOrchestrator.executeStandardPipeline('Feature requiring security review');

    expect(run.status).toBe('PARTIAL');
    expect(run.steps[0].status).toBe('COMPLETED');
    expect(run.steps[1].status).toBe('FAILED');
    expect(run.steps[1].error).toContain('Simulated security provider outage');
    expect(run.steps[2].status).toBe('SKIPPED');
    expect(run.steps[3].status).toBe('SKIPPED');
  });

  it('records mock provider call history', async () => {
    await orchestrator.executeStandardPipeline('Test run history tracking');
    expect(mockProvider.history.length).toBe(4);
    expect(mockProvider.history[0].persona).toBe('ARCHITECT');

    mockProvider.clearHistory();
    expect(mockProvider.history.length).toBe(0);
  });
});
