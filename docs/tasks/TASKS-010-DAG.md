# TASK DAG: TASKS-010
## Production-Ready RAG & Multi-Agent IT Project Effort & Cost Estimation Engine

---

### 1. Task Dependency Graph (DAG)

```text
[TASK-010-01: Implement RagEstimationEngine Domain Model]
       │
       ▼
[TASK-010-02: Implement ProductionRagEstimationService Application Service]
       │
       ▼
[TASK-010-03: Enhance UniversalDevelopmentEngine with Estimation Classification]
       │
       ▼
[TASK-010-04: Integrate CLI Estimate Command & Export Public API]
       │
       ▼
[TASK-010-05: Update scripts/verify-strict.ps1 with RAG Invariants]
       │
       ▼
[TASK-010-06: Compile TypeScript & Execute Strict Verification Pass (Exit Code 0)]
```

---

### 2. Atomic Task Breakdown

#### TASK-010-01: Implement `RagEstimationEngine.ts`
* **Layer**: Pure Domain Layer (`src/core/domain/models/RagEstimationEngine.ts`).
* **Description**: Create immutable models for WBS blocks, historical line items, PERT beta distributions, multi-factor confidence evaluation, and seniority role matrices.
* **Done Criteria**: 100% pure TypeScript, zero runtime dependencies, exports PERT math and confidence algorithms.

#### TASK-010-02: Implement `ProductionRagEstimationService.ts`
* **Layer**: Application Layer (`src/core/application/ProductionRagEstimationService.ts`).
* **Description**: Service that orchestrates acronym preprocessing, WBS decomposition, per-task parallel retrieval simulation, confidence factor calculations, PERT estimation, and financial quote breakdown.
* **Done Criteria**: Returns complete `ProjectEstimationSummary` with deterministic structure for any prompt.

#### TASK-010-03: Enhance `UniversalDevelopmentEngine.ts`
* **Layer**: Application Layer.
* **Description**: Add keywords and classification for estimation, effort, cost, RAG, budget, and quotes; synthesize appropriate hexagonal artifacts when requested.
* **Done Criteria**: Detects `IT_PROJECT_ESTIMATION` domain.

#### TASK-010-04: Integrate CLI Estimate Command & Export Public API
* **Layer**: CLI & Package Exports (`scripts/eos-cli.mjs`, `src/index.ts`).
* **Description**: Expose `npm run eos -- estimate "<project description>"` to print the formatted IT project estimation dossier directly to the terminal.
* **Done Criteria**: CLI outputs the formatted dossier with SHA-256 attestation.

#### TASK-010-05: Update `scripts/verify-strict.ps1` with RAG Invariants
* **Layer**: Quality & Verification Tooling.
* **Description**: Add Invariant G (RAG PERT Math & Confidence Factor Verification) to Stage 4 and include new files in Stage 1 checks.
* **Done Criteria**: Invariant G verifies cleanly.

#### TASK-010-06: Compile TypeScript & Execute Strict Verification Pass
* **Layer**: Testing & Evidence Collection.
* **Description**: Run `npm run build` and `npm test`, asserting 100% test pass, 0 lint/type errors, and Exit Code 0.
* **Done Criteria**: Verification ledger generated with Exit Code 0.
