# PLAN-001: EOS HEXAGONAL ARCHITECTURE & ADR LEDGER
## Clean Isolation, Component Boundaries, and Architectural Decision Records

---

## 1. HEXAGONAL SYSTEM TOPOLOGY

```text
+-----------------------------------------------------------------------------+
|                               PRESENTATION / CLI                             |
|  - EOS CLI Runner (`src/cli/eos.ts`)                                        |
|  - Sentinel Heartbeat Monitor                                               |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                             APPLICATION LAYER                                |
|  - DualTrackOrchestrator: Categorizes tasks into Fast vs Heavy Tracks       |
|  - EARSValidator: Syntactic and semantic validator for requirement rules    |
|  - EvidenceRecorder: Cryptographic ledger generation                         |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                                DOMAIN LAYER                                 |
|  (Zero Frameworks, Zero UI, Zero Network, Pure Invariants & Logic)         |
|  - Entities: Requirement, EvidenceRecord, TaskNode, OntologyGraph           |
|  - Value Objects: EpistemicState, TrackClassification, Sha256Hash           |
+-----------------------------------------------------------------------------+
                                      ^
                                      | (Interfaces / Ports)
+-----------------------------------------------------------------------------+
|                            INFRASTRUCTURE LAYER                             |
|  - CryptoService: SHA-256 calculation & signature verification             |
|  - FileSystemAdapter: Safe atomic read/write adapter                        |
|  - Sentinel & FDIR: Periodic heartbeat monitor & ontology graph healing     |
+-----------------------------------------------------------------------------+
```

---

## 2. ARCHITECTURAL DECISION RECORDS (ADR)

### ADR-001: Dual-Track Execution Engine (Fast vs Heavy)
* **Status:** `ACCEPTED`
* **Context:** Pure SDD introduces bureaucratic paralysis for trivial changes (HolaMundo critique), while pure Vibe Coding destroys codebases (Víctor Robles critique).
* **Decision:** Implement an automated risk classifier that routes low-risk modifications to a fast TDD loop, and high-risk structural changes to the full 21-step SDD pipeline.
* **Rejected Alternative:** 
  * *Uniform 21-Step Pipeline for all tasks:* Rejected because it paralyzes developer velocity and wastes token budgets on simple copy/token tweaks.
  * *Unrestricted Vibe Coding:* Rejected due to high risk of architectural drift and regressions.

### ADR-002: Machine Cryptographic Evidence Over Verbal Assertions
* **Status:** `ACCEPTED`
* **Context:** Agents often hallucinate completion states (e.g., asserting "all tests pass" without running them).
* **Decision:** A task cannot transition to `VERIFIED` without generating a cryptographically hashed JSON evidence artifact with SHA-256 signatures, execution timestamps, and zero exit codes.
* **Rejected Alternative:**
  * *Markdown status checkboxes:* Rejected because checkboxes can be toggled without verifiable execution proofs.

### ADR-003: Autonomous FDIR (Failure Detection, Isolation & Recovery)
* **Status:** `ACCEPTED`
* **Context:** Knowledge graphs and rule bases accumulate orphan links and unmonitored file mutations over time.
* **Decision:** Implement `EOSSentinelDaemon` (SHA-256 control plane monitoring) and `EOSFDIROntology` (orphan link isolation and self-healing).
* **Rejected Alternative:**
  * *Manual integrity audits:* Rejected because human operators cannot monitor integrity 24/7 at the scale required for autonomous agents.
