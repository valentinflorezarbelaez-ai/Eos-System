/**
 * LLMProvider Infrastructure Adapter (Layer 2 — Infrastructure)
 * SPEC-017: Autonomous Agent Orchestrator
 *
 * Implements provider abstraction ports and adapters for multi-model AI execution.
 * Includes deterministic MockLLMProvider for 100% reproducible offline verification.
 */

export interface LLMCompletionRequest {
  readonly prompt: string;
  readonly systemPrompt?: string | undefined;
  readonly persona?: string | undefined;
  readonly temperature?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly correlationId?: string | undefined;
}

export interface LLMCompletionResponse {
  readonly content: string;
  readonly tokensUsed: {
    readonly prompt: number;
    readonly completion: number;
    readonly total: number;
  };
  readonly durationMs: number;
  readonly model: string;
  readonly reasoningTrace?: string | undefined;
}

export interface ILLMProvider {
  readonly name: string;
  readonly modelId: string;
  isAvailable(): boolean;
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
}

/**
 * Deterministic Mock LLM Provider for local testing and CI verification.
 * Generates structured, persona-aware responses with zero external network requests.
 */
export class MockLLMProvider implements ILLMProvider {
  readonly name = 'MockLLMProvider';
  readonly modelId = 'eos-mock-v1';

  private cannedResponses: Map<string, string> = new Map();
  private callHistory: LLMCompletionRequest[] = [];

  constructor(customResponses?: Record<string, string>) {
    if (customResponses) {
      for (const [key, val] of Object.entries(customResponses)) {
        this.cannedResponses.set(key.toLowerCase(), val);
      }
    }
  }

  isAvailable(): boolean {
    return true;
  }

  get history(): readonly LLMCompletionRequest[] {
    return Object.freeze([...this.callHistory]);
  }

  setResponse(keywordOrPersona: string, response: string): void {
    this.cannedResponses.set(keywordOrPersona.toLowerCase(), response);
  }

  clearHistory(): void {
    this.callHistory = [];
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const start = Date.now();
    this.callHistory.push(request);

    // Check custom canned responses
    const promptLower = request.prompt.toLowerCase();
    const personaLower = (request.persona ?? '').toLowerCase();

    let matchedContent: string | null = null;
    for (const [key, resp] of this.cannedResponses.entries()) {
      if (personaLower === key || promptLower.includes(key)) {
        matchedContent = resp;
        break;
      }
    }

    if (!matchedContent) {
      matchedContent = this.generatePersonaDefaultResponse(request.persona, request.prompt);
    }

    const durationMs = Math.max(1, Date.now() - start);
    const promptTokens = Math.ceil(request.prompt.length / 4);
    const completionTokens = Math.ceil(matchedContent.length / 4);

    return {
      content: matchedContent,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      durationMs,
      model: this.modelId,
      reasoningTrace: `[${request.persona ?? 'GENERAL'}] Evaluated prompt with ${promptTokens} tokens. Invariants validated.`,
    };
  }

  private generatePersonaDefaultResponse(persona?: string, prompt?: string): string {
    switch (persona) {
      case 'ARCHITECT':
        return JSON.stringify({
          verdict: 'APPROVED',
          architecture: 'Clean Hexagonal Architecture',
          modules: ['Domain', 'Application', 'Infrastructure'],
          summary: `Architectural blueprint established for: ${prompt?.substring(0, 40) ?? 'scope'}`,
        });

      case 'SECURITY_AUDITOR':
        return JSON.stringify({
          vulnerabilitiesCount: 0,
          owaspPassed: true,
          zeroPlainSecrets: true,
          summary: 'Security review clean. Zero credential exposure detected.',
        });

      case 'PERFORMANCE_ENGINEER':
        return JSON.stringify({
          passedThresholds: true,
          latencyCeilingMs: 100,
          bundleBudgetKb: 50,
          summary: 'Performance metrics within acceptable production bounds.',
        });

      case 'PRODUCT_ESTIMATOR':
        return JSON.stringify({
          optimistic: 8,
          nominal: 16,
          pessimistic: 32,
          pertHours: 17.33,
          confidenceScore: 0.92,
          summary: 'RAG PERT estimation completed with 4-factor confidence.',
        });

      case 'CORE_IMPLEMENTER':
        return JSON.stringify({
          status: 'IMPLEMENTATION_COMPLETE',
          domainPurity: '100%',
          summary: `Implementation logic scaffolded successfully for: ${prompt?.substring(0, 40) ?? 'scope'}`,
        });

      case 'QA_LEAD':
        return JSON.stringify({
          allTestsPassed: true,
          exitCode: 0,
          invariantsVerified: 12,
          summary: 'Automated invariant tests executed cleanly.',
        });

      default:
        return JSON.stringify({
          status: 'SUCCESS',
          output: `Autonomous step completed for prompt: ${prompt?.substring(0, 50) ?? 'general'}`,
        });
    }
  }
}

/**
 * Adapter for Google Gemini API via official endpoint structure.
 */
export class GeminiProviderAdapter implements ILLMProvider {
  readonly name = 'GeminiProvider';
  readonly modelId = 'gemini-2.5-pro';
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['GEMINI_API_KEY'] ?? null;
  }

  isAvailable(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.trim().length > 0;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY in environment or config.');
    }

    const start = Date.now();
    // In production, invoke Gemini API endpoint with safe fetch
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.prompt}` }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxTokens ?? 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API request failed (${response.status}): ${errText}`);
    }

    const json = (await response.json()) as any;
    const content = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const durationMs = Date.now() - start;

    return {
      content,
      tokensUsed: {
        prompt: json?.usageMetadata?.promptTokenCount ?? 0,
        completion: json?.usageMetadata?.candidatesTokenCount ?? 0,
        total: json?.usageMetadata?.totalTokenCount ?? 0,
      },
      durationMs,
      model: this.modelId,
    };
  }
}

/**
 * Provider factory function.
 */
export function createLLMProvider(
  type: 'mock' | 'gemini' | 'claude' = 'mock',
  options: { apiKey?: string; customResponses?: Record<string, string> } = {}
): ILLMProvider {
  switch (type) {
    case 'gemini':
      return new GeminiProviderAdapter(options.apiKey);
    case 'mock':
    default:
      return new MockLLMProvider(options.customResponses);
  }
}
