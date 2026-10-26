# TASK DAG: TASKS-011
## Autonomous Multi-Agent Decision Arbiter & Consensus Protocol ("Jev / Agentic Arbiter")

---

### 1. Task Dependency Graph (DAG)

```text
[TASK-011-01: Implement DecisionArbiter Domain Model]
       │
       ▼
[TASK-011-02: Implement MultiAgentDecisionService Application Service]
       │
       ▼
[TASK-011-03: Integrate Decision Arbiter into UniversalDevelopmentEngine Step 6]
       │
       ▼
[TASK-011-04: Integrate CLI Decide Command & Export Public API]
       │
       ▼
[TASK-011-05: Update scripts/verify-strict.ps1 with Consensus Invariant H]
       │
       ▼
[TASK-011-06: Compile TypeScript & Execute Strict Verification Pass (Exit Code 0)]
```

---

### 2. Atomic Task Breakdown

#### TASK-011-01: Implement `DecisionArbiter.ts`
* **Layer**: Pure Domain Layer (`src/core/domain/models/DecisionArbiter.ts`).
* **Description**: Create immutable models for Agent Roles, Agent Votes, Veto triggers, Consensus scoring math, and Verdict evaluation.
* **Done Criteria**: 100% pure TypeScript, zero runtime dependencies, exports voting math and veto rules.

#### TASK-011-02: Implement `MultiAgentDecisionService.ts`
* **Layer**: Application Layer (`src/core/application/MultiAgentDecisionService.ts`).
* **Description**: Service that orchestrates the 4 agent roles, evaluates technical tradeoffs for any proposition, tallies votes, handles vetoes, formats ADR records, and attaches SHA-256 seal.
* **Done Criteria**: Returns complete `ArbitrationResult` with deterministic structure for any prompt.

#### TASK-011-03: Integrate Decision Arbiter into `UniversalDevelopmentEngine.ts`
* **Layer**: Application Layer.
* **Description**: Enhance Step 6 (ARCHITECTURE & ADRs) in `UniversalDevelopmentEngine.ts` to execute real multi-agent arbitration and attach consensus verifications to the pipeline.
* **Done Criteria**: Step 6 reflects the multi-agent consensus verdict and ADR payload.

#### TASK-011-04: Integrate CLI Decide Command & Export Public API
* **Layer**: CLI & Package Exports (`scripts/eos-cli.mjs`, `src/index.ts`).
* **Description**: Expose `npm run eos -- decide "<proposition>"` to print the formatted decision dossier and vote matrix directly to the terminal.
* **Done Criteria**: CLI outputs the formatted deliberation with SHA-256 attestation.

#### TASK-011-05: Update `scripts/verify-strict.ps1` with Consensus Invariant H
* **Layer**: Quality & Verification Tooling.
* **Description**: Add Invariant H (Multi-Agent Consensus Math & Veto Enforcement) to Stage 4 and include new files in Stage 1 checks.
* **Done Criteria**: Invariant H verifies cleanly.

#### TASK-011-06: Compile TypeScript & Execute Strict Verification Pass
* **Layer**: Testing & Evidence Collection.
* **Description**: Run `npm run build` and `npm test`, asserting 100% test pass, 0 lint/type errors, and Exit Code 0.
* **Done Criteria**: Verification ledger generated with Exit Code 0.
