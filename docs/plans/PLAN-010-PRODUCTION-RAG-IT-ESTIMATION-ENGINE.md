# ARCHITECTURE PLAN: PLAN-010
## Production-Ready RAG & Multi-Agent IT Project Effort & Cost Estimation Engine

---

### 1. Architectural Strategy
* **Hexagonal Isolation (Law V)**:
  - **Domain Layer (`src/core/domain/models/RagEstimationEngine.ts`)**:
    - Defines pure entities: `HistoricalLineItemChunk`, `WbsBlock`, `TaskEstimationItem`, `ConfidenceScore`, `PertEstimate`, `SeniorityRateProfile`, `ProjectEstimationSummary`.
    - Implements statistical formulas for PERT beta distribution ($T_e = \frac{O + 4M + P}{6}$, $\sigma = \frac{P - O}{6}$) and confidence scoring.
    - Zero framework, zero I/O, zero external dependencies.
  - **Application Layer (`src/core/application/ProductionRagEstimationService.ts`)**:
    - Coordinates acronym expansion, WBS decomposition, per-task parallel retrieval simulation, confidence score synthesis, and financial cost modeling.
  - **CLI & Fleet Integration (`scripts/eos-cli.mjs`)**:
    - Exposes `npm run eos -- estimate "<project description>"` producing a comprehensive IT project proposal breakdown with cryptographic evidence.

---

### 2. Architecture Decision Records (ADRs)

#### ADR-001: Per-Task Granular Retrieval vs Monolithic Context Retrieval
* **Context**: Traditional RAG queries retrieve 5-10 chunks against the entire project description, causing context pollution and averaging out the costs of distinct technical modules (e.g. Auth vs DSP vs Database).
* **Decision**: Adopt the LIDR/Antonio Pérez per-task retrieval strategy (`_search_per_task`), breaking down the proposal into distinct WBS tasks and querying historical vector chunks specifically for each micro-task in parallel.
* **Rejected Alternative**: Single global prompt vector search. Rejected because it dilutes specific task precedent and fails to surface relevant hours for edge tasks like DevOps or automated migrations.
* **Consequences**: Fine-grained reference citations, task-level confidence factors, and elimination of context dilution.

#### ADR-002: Multi-Factor Mathematical Confidence Score
* **Context**: LLM estimation hallucinations can be catastrophic in commercial quotes. We need a deterministic indicator of how reliable an estimate is before it is presented to a client or team lead.
* **Decision**: Implement a 4-factor composite confidence function:
  $$\text{Confidence} = 0.30 \times F_{\text{count}} + 0.35 \times F_{\text{sim}} + 0.20 \times F_{\text{tech}} + 0.15 \times F_{\text{var}}$$
  Where low variance and high semantic similarity yield `HIGH` confidence ($> 0.75$), whereas novel un-indexed domains yield `LOW` confidence ($< 0.50$) with a higher contingency buffer.
* **Rejected Alternative**: Asking the LLM to output a subjective confidence percentage. Rejected because LLMs are notoriously uncalibrated and overconfident on out-of-distribution prompts.
* **Consequences**: Calibrated, mathematically defensible confidence levels directly tied to real historical quotes.

---

### 3. Verification & Evidence Plan
* **Unit Test Assertions**: Verify PERT calculations, WBS generation, confidence scoring factors, and cost calculations under strict edge cases.
* **Strict Verification Suite**: Run `scripts/verify-strict.ps1` to assert 0 findings and Exit Code 0.
