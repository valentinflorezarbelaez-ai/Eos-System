# ARCHITECTURE PLAN: PLAN-008
## EOS Universal Autonomous Code Scaffolder & Interactive Live Web Lab

---

### 1. Architectural Strategy
* **Hexagonal Isolation (Law V)**:
  - `CodeScaffolderService` lives strictly in the **Application Layer** (`src/core/application/CodeScaffolderService.ts`). It generates pure Layer 0 code adhering to Hexagonal architecture:
    - **Domain**: Pure TypeScript classes/types with internal validation and business rules.
    - **Port**: Interface defining abstract dependencies.
    - **Application**: Use Case orchestrator coordinating the workflow.
    - **Adapter**: In-memory test implementation.
    - **Test**: Deterministic test runner script verifying correctness.
  - **Zero External Dependencies**: Output code relies exclusively on pure TypeScript and Node standard libraries. No Zod, no Axios, no Express; pure standard contracts.

---

### 2. Architecture Decision Records (ADRs)

#### ADR-001: Modular In-Browser Pipeline Synthesizer vs Server-Side Execution
* **Context**: We need to allow visitors on `https://eos-system-ten.vercel.app/` to type any instruction and experience real-time execution of the 21-step pipeline and generated code visualization without latency or server cost.
* **Decision**: Implement a client-side execution engine inside `js/eos.js` that mirrors `UniversalDevelopmentEngine.ts` and `CodeScaffolderService.ts`. Uses `crypto.subtle.digest('SHA-256', ...)` for authentic in-browser cryptographic proofs.
* **Rejected Alternative**: Webhook back to a Node server or serverless lambda. Rejected because it introduces network latency, cold starts, API rate limits, and failure modes when disconnected.
* **Consequences**: Instant, zero-latency feedback (sub-10ms), offline PWA support, guaranteed 100% uptime on Vercel Edge.

#### ADR-002: Dynamic Code Generator Scaffolding Template
* **Context**: The CLI needs to be able to output real working code to disk when the `--scaffold` flag is used.
* **Decision**: Structure synthesized projects under `dist/generated/<feature-slug>/` or a user-specified path with standard file names:
  - `<Feature>Entity.ts`
  - `<Feature>RepositoryPort.ts`
  - `Execute<Feature>UseCase.ts`
  - `InMemory<Feature>Repository.ts`
  - `<Feature>.test.ts`
  - `SPECIFICATION.md`
* **Rejected Alternative**: Monolithic single-file generation. Rejected because it violates Clean Architecture and Separation of Concerns.

---

### 3. Verification & Evidence Plan
* Run strict landing invariant suite (`scripts/verify-landing.mjs`) on `Eos-System`.
* Run strict control plane verification suite (`scripts/verify-strict.ps1`) on `Eos-System-1`.
* Execute browser subagent live tests on `https://eos-system-ten.vercel.app/` entering a custom prompt and verifying output tabs.
