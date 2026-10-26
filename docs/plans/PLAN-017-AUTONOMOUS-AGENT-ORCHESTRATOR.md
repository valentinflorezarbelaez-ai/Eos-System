# PLAN-017: Autonomous Agent Orchestrator & LLM Integration Engine

## Milestone: `SPEC-017-AGENT-ORCHESTRATOR`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Architectural Strategy & Clean Hexagonal Alignment

The Agent Orchestrator fits squarely within the Hexagonal Architecture:

```
[ Presentation Layer: CLI (scripts/eos-cli.mjs) & MCP Server (src/mcp/eosMcpServer.ts) ]
                                    │
                                    ▼
[ Application Layer: AgentOrchestrator (src/core/application/AgentOrchestrator.ts) ]
        │                                                     │
        ▼ (pure entities)                                     ▼ (ports)
[ Domain Layer: AgentCapability ]                 [ Port: ILLMProvider interface ]
(src/core/domain/models/AgentCapability.ts)                   │
                                                              ▼ (adapters)
                                                  [ Infrastructure: LLMProvider.ts ]
                                                  (MockProvider, GeminiAdapter, ClaudeAdapter)
```

---

## 2. Architectural Decision Records (ADRs)

### ADR-017-01: Provider Port Interface vs Direct SDK Binding
- **Context:** We need to support diverse AI models (Gemini, Claude, local models) without coupling application logic to proprietary SDK quirks or failing CI when offline.
- **Decision:** Introduce a clean interface `ILLMProvider` in application/infrastructure boundary. `AgentOrchestrator` only talks to `ILLMProvider`.
- **Alternatives Rejected:**
  - *Direct `@google/genai` or `@anthropic-ai/sdk` import in orchestrator:* Rejected because it violates hexagonal isolation and breaks offline unit tests.
  - *Generic LangChain/LlamaIndex abstraction:* Rejected due to bloated dependency graph, breaking zero vibe and fast startup requirements.

### ADR-017-02: Deterministic Mock Provider for Offline CI
- **Context:** Test suite runs in strict local verification without external network access or mandatory live API keys.
- **Decision:** Implement `MockLLMProvider` returning structured, realistic JSON outputs simulating agent personas with deterministic responses.
- **Alternatives Rejected:**
  - *Skipping agent tests when no API key present:* Rejected because test coverage must be 100% deterministic and verifiable in all environments.

---

## 3. Module Boundaries & Data Contracts

### 3.1 Domain Model: `src/core/domain/models/AgentCapability.ts`
- Types: `AgentPersona`, `RiskLevel`, `CapabilityInputContract`, `CapabilityOutputContract`
- Class: `AgentCapability`
  - `create(params: AgentCapabilityParams): AgentCapability`
  - Immutable (`Object.freeze`)
  - Validation against required inputs and outputs

### 3.2 Application Service: `src/core/application/AgentOrchestrator.ts`
- Coordinates execution of pipeline steps
- Records telemetry events via `TelemetryPipeline`
- Maintains in-memory execution run history
- Dispatches prompts to `ILLMProvider`

### 3.3 Infrastructure Adapter: `src/infrastructure/LLMProvider.ts`
- Interface: `ILLMProvider`
- Class: `MockLLMProvider`
- Class: `GeminiProviderAdapter` (using fetch or Google GenAI API patterns)
- Factory: `createLLMProvider(type: 'mock' | 'gemini' | 'claude', config: EnvironmentConfig)`
