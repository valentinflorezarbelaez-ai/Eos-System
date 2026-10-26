# ARCHITECTURE PLAN: PLAN-011
## Autonomous Multi-Agent Decision Arbiter & Consensus Protocol ("Jev / Agentic Arbiter")

---

### 1. Architectural Strategy
* **Hexagonal Isolation (Law V)**:
  - **Domain Layer (`src/core/domain/models/DecisionArbiter.ts`)**:
    - Pure domain entities: `AgentVote`, `DeliberationRole`, `ConsensusVerdict`, `ArbitrationResult`, `FormalAdrPayload`.
    - Pure mathematical calculation of weighted consensus score ($S = \frac{\sum w_i s_i}{\sum w_i}$).
    - Veto evaluation logic enforcing Commandments I through VII.
    - Zero framework, zero I/O, zero external dependencies.
  - **Application Layer (`src/core/application/MultiAgentDecisionService.ts`)**:
    - Coordinates deliberation rounds across the 4 specialized roles.
    - Evaluates technical tradeoffs, generates formal ADR markdown, and calculates cryptographic SHA-256 seal.
    - Integrates into `UniversalDevelopmentEngine.ts` (Step 6: Architecture & ADRs).
  - **CLI Tooling (`scripts/eos-cli.mjs`)**:
    - Exposes `npm run eos -- decide "<proposition>"` command with rich visual output.

---

### 2. Architecture Decision Records (ADRs)

#### ADR-001: Weighted Multi-Agent Consensus with Constitutional Veto vs Majority Vote
* **Context**: Pure majority voting in software engineering can approve catastrophic proposals (e.g., 3 agents vote for speed/features while ignoring a critical security flaw identified by the security agent).
* **Decision**: Implement a weighted consensus protocol with asymmetric veto powers. Security and Architectural agents hold absolute veto over constitutional violations (e.g., hardcoded secrets, layer pollution), halting approval regardless of other votes.
* **Rejected Alternative**: Simple majority voting ($> 50\%$) or unweighted averaging. Rejected because critical security and architectural integrity cannot be compromised for feature velocity.
* **Consequences**: Guarantees zero regression on core constitutional laws while allowing nuanced deliberation on non-critical performance vs effort tradeoffs.

#### ADR-002: Formal Machine-Readable ADR Generation
* **Context**: Architectural decisions are often lost in chat logs or ephemeral PR discussions, causing architectural drift over time.
* **Decision**: Require the Decision Arbiter to emit complete, standard Architecture Decision Records (ADRs) with Context, Decision, Rejected Alternatives, Trade-offs, and cryptographic vote signatures.
* **Rejected Alternative**: Ephemeral terminal logs without persistent documentation. Rejected because ADRs are mandatory under EOS Law II and IEEE 830 traceability.
* **Consequences**: Deterministic architectural evolution, perfect audit trail, and zero ambiguity for downstream coding agents.

---

### 3. Verification & Evidence Plan
* **Unit Test Assertions**: Test unanimous approval, majority concurrence, and veto rejection scenarios.
* **Strict Verification Suite**: Update `scripts/verify-strict.ps1` with Invariant H for Multi-Agent Consensus and verify Exit Code 0.
