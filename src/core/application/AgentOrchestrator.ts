/**
 * AgentOrchestrator Application Service (Layer 1 — Application)
 * SPEC-017: Autonomous Agent Orchestrator
 *
 * Coordinates autonomous agent execution through the 21-Step Master Pipeline
 * or targeted sub-pipelines. Dispatches prompts to ILLMProvider, validates
 * contracts against AgentCapabilities, captures reasoning traces, and emits
 * structured events to TelemetryPipeline.
 */

import { AgentCapability, type AgentPersona } from '../domain/models/AgentCapability.js';
import type { ILLMProvider } from '../../infrastructure/LLMProvider.js';
import { MockLLMProvider } from '../../infrastructure/LLMProvider.js';
import type { TelemetryPipeline } from './TelemetryPipeline.js';

export interface PipelineStepPlan {
  readonly stepIndex: number;
  readonly name: string;
  readonly capabilityId: string;
  readonly prompt: string;
  readonly inputs?: Record<string, unknown>;
}

export interface StepExecutionResult {
  readonly stepIndex: number;
  readonly name: string;
  readonly persona: AgentPersona;
  readonly status: 'COMPLETED' | 'FAILED' | 'SKIPPED';
  readonly output: string;
  readonly durationMs: number;
  readonly tokens: number;
  readonly reasoning?: string | undefined;
  readonly error?: string | undefined;
}

export interface AgentExecutionRun {
  readonly runId: string;
  readonly goal: string;
  readonly timestamp: string;
  readonly status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  readonly steps: readonly StepExecutionResult[];
  readonly totalDurationMs: number;
  readonly totalTokens: number;
}

export interface AgentOrchestratorOptions {
  readonly provider?: ILLMProvider | undefined;
  readonly telemetry?: TelemetryPipeline | undefined;
}

export class AgentOrchestrator {
  private readonly provider: ILLMProvider;
  private readonly telemetry?: TelemetryPipeline | undefined;
  private readonly capabilities: Map<string, AgentCapability> = new Map();
  private readonly executionRuns: AgentExecutionRun[] = [];

  constructor(options: AgentOrchestratorOptions = {}) {
    this.provider = options.provider ?? new MockLLMProvider();
    this.telemetry = options.telemetry;

    // Load standard capability presets by default
    for (const preset of Object.values(AgentCapability.PRESETS)) {
      this.registerCapability(preset);
    }
  }

  registerCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.id, capability);
  }

  getCapability(id: string): AgentCapability | undefined {
    return this.capabilities.get(id);
  }

  listCapabilities(): readonly AgentCapability[] {
    return Object.freeze(Array.from(this.capabilities.values()));
  }

  get history(): readonly AgentExecutionRun[] {
    return Object.freeze([...this.executionRuns]);
  }

  async executeStep(step: PipelineStepPlan, correlationId?: string): Promise<StepExecutionResult> {
    const start = Date.now();
    const capability = this.capabilities.get(step.capabilityId);

    if (!capability) {
      return {
        stepIndex: step.stepIndex,
        name: step.name,
        persona: 'ARCHITECT',
        status: 'FAILED',
        output: '',
        durationMs: 0,
        tokens: 0,
        error: `Capability "${step.capabilityId}" not found in orchestrator registry.`,
      };
    }

    // Validate inputs against capability contract if inputs provided
    if (step.inputs) {
      const validation = capability.validateInputs(step.inputs);
      if (!validation.valid) {
        return {
          stepIndex: step.stepIndex,
          name: step.name,
          persona: capability.persona,
          status: 'FAILED',
          output: '',
          durationMs: Date.now() - start,
          tokens: 0,
          error: `Input contract violation: missing [${validation.missing.join(', ')}], errors: [${validation.errors.join(', ')}]`,
        };
      }
    }

    this.telemetry?.emit(
      'DEBUG',
      'AgentOrchestrator',
      `Dispatching step ${step.stepIndex}: "${step.name}" to persona ${capability.persona}`,
      { capabilityId: capability.id, correlationId }
    );

    try {
      const response = await this.provider.complete({
        prompt: step.prompt,
        persona: capability.persona,
        systemPrompt: `You are the ${capability.persona} persona operating within the EOS Autonomous Development System. Capability: ${capability.name}. Ensure strict compliance with the EOS Constitution.`,
        correlationId,
      });

      const durationMs = Date.now() - start;

      this.telemetry?.emit(
        'INFO',
        'AgentOrchestrator',
        `Step ${step.stepIndex} "${step.name}" COMPLETED in ${durationMs}ms using ${response.tokensUsed.total} tokens.`,
        { persona: capability.persona, durationMs, tokens: response.tokensUsed.total, correlationId }
      );

      return {
        stepIndex: step.stepIndex,
        name: step.name,
        persona: capability.persona,
        status: 'COMPLETED',
        output: response.content,
        durationMs,
        tokens: response.tokensUsed.total,
        reasoning: response.reasoningTrace,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);

      this.telemetry?.emit(
        'ERROR',
        'AgentOrchestrator',
        `Step ${step.stepIndex} "${step.name}" FAILED: ${errorMsg}`,
        { persona: capability.persona, error: errorMsg, correlationId }
      );

      return {
        stepIndex: step.stepIndex,
        name: step.name,
        persona: capability.persona,
        status: 'FAILED',
        output: '',
        durationMs,
        tokens: 0,
        error: errorMsg,
      };
    }
  }

  async executePipeline(
    goal: string,
    steps: readonly PipelineStepPlan[],
    correlationId?: string
  ): Promise<AgentExecutionRun> {
    const start = Date.now();
    const runId = `RUN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const executedSteps: StepExecutionResult[] = [];
    let hasFailure = false;

    this.telemetry?.emit(
      'INFO',
      'AgentOrchestrator',
      `Starting pipeline run ${runId} for goal: "${goal}" (${steps.length} steps planned).`,
      { runId, goal, correlationId }
    );

    let previousContext = '';

    for (const step of steps) {
      if (hasFailure) {
        executedSteps.push({
          stepIndex: step.stepIndex,
          name: step.name,
          persona: this.capabilities.get(step.capabilityId)?.persona ?? 'ARCHITECT',
          status: 'SKIPPED',
          output: '',
          durationMs: 0,
          tokens: 0,
          error: 'Skipped due to upstream step failure.',
        });
        continue;
      }

      // Enrich prompt with previous step context if available
      const enrichedPrompt = previousContext
        ? `${step.prompt}\n\n[Context from previous step]:\n${previousContext}`
        : step.prompt;

      const result = await this.executeStep(
        {
          ...step,
          prompt: enrichedPrompt,
        },
        correlationId
      );

      executedSteps.push(result);

      if (result.status === 'COMPLETED') {
        previousContext = result.output;
      } else {
        hasFailure = true;
      }
    }

    const totalDurationMs = Date.now() - start;
    const totalTokens = executedSteps.reduce((acc, s) => acc + s.tokens, 0);
    const runStatus: 'SUCCESS' | 'FAILED' | 'PARTIAL' = hasFailure
      ? executedSteps.some((s) => s.status === 'COMPLETED')
        ? 'PARTIAL'
        : 'FAILED'
      : 'SUCCESS';

    const run: AgentExecutionRun = {
      runId,
      goal,
      timestamp: new Date().toISOString(),
      status: runStatus,
      steps: Object.freeze(executedSteps),
      totalDurationMs,
      totalTokens,
    };

    this.executionRuns.push(run);

    this.telemetry?.emit(
      runStatus === 'SUCCESS' ? 'INFO' : 'WARN',
      'AgentOrchestrator',
      `Pipeline run ${runId} finished with status: ${runStatus} (${totalDurationMs}ms, ${totalTokens} tokens).`,
      { runId, status: runStatus, totalDurationMs, totalTokens, correlationId }
    );

    return run;
  }

  /**
   * Executes a standard multi-persona development pipeline (Architect -> Security -> Implementer -> QA)
   */
  async executeStandardPipeline(goal: string, correlationId?: string): Promise<AgentExecutionRun> {
    const steps: PipelineStepPlan[] = [
      {
        stepIndex: 1,
        name: 'Requirements & EARS Architecture Specification',
        capabilityId: 'CAP-SPEC-ENGINEERING',
        prompt: `Analyze goal and formulate EARS requirements: "${goal}"`,
        inputs: { rawPrompt: goal },
      },
      {
        stepIndex: 2,
        name: 'Adversarial Security & Zero Plain Secrets Audit',
        capabilityId: 'CAP-SECURITY-AUDIT',
        prompt: `Audit security parameters for proposed solution of: "${goal}"`,
        inputs: { targetCode: goal },
      },
      {
        stepIndex: 3,
        name: 'Clean Hexagonal Domain Logic Scaffolding',
        capabilityId: 'CAP-HEXAGONAL-IMPL',
        prompt: `Implement pure domain entities and application services for: "${goal}"`,
        inputs: { spec: goal },
      },
      {
        stepIndex: 4,
        name: 'Deterministic Quality & Invariant Verification',
        capabilityId: 'CAP-INVARIANT-VERIFY',
        prompt: `Verify all unit tests and invariants for: "${goal}"`,
        inputs: { suiteName: 'StrictVerificationSuite' },
      },
    ];

    return this.executePipeline(goal, steps, correlationId);
  }
}
