# IMPLEMENTATION AUTHORIZATION RECORD
## EOS CORE SYSTEM 2.0 & 2.1 (ADVERSARIAL ASSURANCE)

---

### Record Metadata
* **Authorization ID:** AUTH-2026-10-23-EOS-002
* **Project Name:** EOS Core System v2.1 (Evidence Trust & Adversarial Assurance)
* **Target Workspace:** `C:\Users\valen\Eos-System-1`
* **Authorization Level:** `LEVEL 2 (FULL EXECUTION AUTHORIZED)`
* **Authorizer:** Lead Architect & System Owner
* **Status:** `ACTIVE`
* **Timestamp:** 2026-10-23T14:35:00-05:00

---

### Preconditions Verification Ledger
| Precondition Requirement | Status | Verification Reference |
| :--- | :---: | :--- |
| 1. System Registry Registered | `SATISFIED` | `docs/projects/registry.json` |
| 2. Intake Package Recorded | `SATISFIED` | `docs/intake/INTAKE-002-EVIDENCE-TRUST-ADVERSARIAL.md` |
| 3. Formal EARS Specification Approved | `SATISFIED` | `docs/specs/SPEC-002-EVIDENCE-ATTESTATION.md` |
| 4. Architectural Plan & ADRs Documented | `SATISFIED` | `docs/plans/PLAN-002-ATTESTATION-CONTAINER.md` |
| 5. Atomic Task DAG Decomposed | `SATISFIED` | `docs/tasks/TASKS-002-DAG.md` |
| 6. Level 2 Gate Formal Concession | `SATISFIED` | Owner explicit mandate (Session 2026-10-23T14:35:00) |

---

### Scope of Authorization (Milestone EOS 2.1)
1. Deprecate legacy `EVD-0001` evidence record.
2. Implement pure domain attestation entities (`AttestationRecord`, `TrustPolicy`).
3. Implement `AsymmetricCryptoService` with Ed25519 signature validation.
4. Implement `AttestationVerifierService` enforcing read-only baseline rules.
5. Provision `.eos/trust/` root public key and initial signed baseline ledger.
6. Define hermetic verification container (`docker/Dockerfile.verify`).
7. Refactor `scripts/verify-strict.ps1` to break P0 circular overwrite and emit append-only evidence.
8. Execute negative and adversarial verification test suite.

---

### Record Metadata
* **Authorization ID:** AUTH-2026-10-25-ABERAMENTHO-004
* **Project Name:** Aberamentho / Pleroma Music (`aberamentho-music`)
* **Target Workspace:** `C:\Users\valen\Aberamentho-s-Pleroma-music`
* **Authorization Level:** `LEVEL 2 (FULL EXECUTION AUTHORIZED)`
* **Authorizer:** Lead Architect & System Owner (Mandate: "dale con toda perfeccion absoluta")
* **Status:** `ACTIVE`
* **Timestamp:** 2026-10-25T00:41:32-05:00

---

### Preconditions Verification Ledger (Aberamentho)
| Precondition Requirement | Status | Verification Reference |
| :--- | :---: | :--- |
| 1. System Registry Registered | `SATISFIED` | `docs/projects/registry.json` (`aberamentho-music`) |
| 2. Intake Package Recorded | `SATISFIED` | `docs/intake/INTAKE-003-XIRP-CONTINUOUS-EXCELLENCE.md` |
| 3. Formal EARS Specification Approved | `SATISFIED` | `docs/specs/SPEC-004-ABERAMENTHO-ENGINE-INTEGRITY.md` |
| 4. Architectural Plan & ADRs Documented | `SATISFIED` | `docs/plans/PLAN-004-ABERAMENTHO-PERFECTION.md` |
| 5. Atomic Task DAG Decomposed | `SATISFIED` | `docs/tasks/TASKS-004-DAG.md` |
| 6. Level 2 Gate Formal Concession | `SATISFIED` | Owner explicit mandate (Session 2026-10-25T00:41:32) |

---

### Scope of Authorization (Milestone Aberamentho 10/10)
1. Fix AudioContext lifecycle and persistent resume handling.
2. Implement playhead rebase math on pitch fader and SYNC tempo adjustments.
3. Implement two-stage gain staging (auto-gain normalization decoupled from volume faders).
4. Schedule sample-accurate hardware clock Bass Swap on Compás 1.
5. Multi-range pitch slider (±8%, ±16%, WIDE ±50%) & strict Camelot key handling.
6. Resolve WCAG 2.1 AA accessibility (Escape modal close, focus management, range slider labels).
7. Fix CSS filter button class collision between Altar de Honor and Artistas y Leyendas.
8. Rectify misattributed artist likenesses and ensure honest Spotify/Cabina demarcation.
9. Execute deterministic verification suite and verify exit code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-SYNC-005`
* **Target Projects:** `C:\Users\valen\portafolio`, `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T01:19:00Z
* **Mandate:** Continuous Co-Evolution of EOS & Public Landing Page (Portafolio).
* **Preconditions Checked:**
  - `INTAKE-005` created and verified.
  - `SPEC-005` formalized in EARS and BDD.
  - `PLAN-005` and ADRs approved.
  - `TASKS-005` atomic DAG decomposed.
* **Authorized Scope:**
  - Update `C:\Users\valen\portafolio\src\data\portfolio.ts` with Aberamentho 10/10 and EOS 2.1 state.
  - Implement `scripts/sync-landing-page.mjs` in `Eos-System-1`.
  - Typecheck and build verification of landing page.
  - Git commit and push to production on Vercel.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-EOS-CLI-006`
* **Target Projects:** `c:\Users\valen\Eos-System-1`, `C:\Users\valen\Eos-System`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T01:43:00Z
* **Mandate:** Focus 100% on EOS: CLI Tool Suite & Live Web Portal (eos-system-ten.vercel.app) Elevation.
* **Preconditions Checked:**
  - `INTAKE-006` recorded.
  - `SPEC-006` formalized in EARS/BDD.
  - `PLAN-006` approved with ADRs.
  - `TASKS-006` DAG decomposed.
* **Authorized Scope:**
  - Implement `scripts/eos-cli.mjs` in `Eos-System-1`.
  - Add `"eos"` script to `package.json`.
  - Elevate `C:\Users\valen\Eos-System` (`index.html` & `js/eos.js`) with Dual-Track and Attestation commands.
  - Execute `verify-landing.mjs` (6/6 Pass).
  - Deploy to Vercel production (`https://eos-system-ten.vercel.app/`).
  - Execute `verify-strict.ps1` in `Eos-System-1` (Exit Code 0).

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-UNIVERSAL-007`
* **Target Projects:** `c:\Users\valen\Eos-System-1`, `C:\Users\valen\Eos-System`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T02:03:00Z
* **Mandate:** "EOS debe poder hacer TODO siguiendo mis instrucciones, cualquier desarrollo de la manera más perfecta."
* **Preconditions Checked:**
  - `INTAKE-007` recorded.
  - `SPEC-007` formalized in EARS/BDD.
  - `PLAN-007` approved with ADRs.
  - `TASKS-007` DAG decomposed.
* **Authorized Scope:**
  - Implement `src/core/domain/models/AgentRoleMatrix.ts`.
  - Implement `src/core/application/UniversalDevelopmentEngine.ts`.
  - Integrate `develop` command into `scripts/eos-cli.mjs`.
  - Add Interactive Universal Engine Lab in `C:\Users\valen\Eos-System` (`index.html` & `js/eos.js`).
  - Execute `verify-landing.mjs` (6/6 Pass).
  - Deploy to Vercel production (`https://eos-system-ten.vercel.app/`).
  - Execute `verify-strict.ps1` in `Eos-System-1` (Exit Code 0).

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-UNIVERSAL-008`
* **Target Projects:** `c:\Users\valen\Eos-System-1`, `C:\Users\valen\Eos-System`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T02:18:00Z
* **Mandate:** "EOS debe poder hacer TODO siguiendo mis instrucciones, cualquier desarrollo de la manera más perfecta."
* **Preconditions Checked:**
  - `INTAKE-008` recorded and complete.
  - `SPEC-008` formalized in EARS and BDD.
  - `PLAN-008` approved with ADRs.
  - `TASKS-008` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement `src/core/application/CodeScaffolderService.ts`.
  - Export `CodeScaffolderService` in `src/index.ts`.
  - Update `scripts/eos-cli.mjs` with `--scaffold` support.
  - Elevate `C:\Users\valen\Eos-System` (`index.html` & `js/eos.js`) with dynamic prompt bar, presets, and synthesized code preview tabs.
  - Run verification suites and deploy to `https://eos-system-ten.vercel.app/`.
  - Run Browser QA on production deployment.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-AGEAC-AESTHETICS-009`
* **Target Projects:** `c:\Users\valen\Eos-System-1`, `C:\Users\valen\Eos-System`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T12:48:00Z
* **Mandate:** "https://www.youtube.com/@AGEACmedia es necesario que eos tenga la perfeccion de este canal de https://ageac.org/ a nivel de creacion audivisual en todo sentido de diseño de perfeccion de uso de colores todo"
* **Preconditions Checked:**
  - `INTAKE-009` recorded and complete.
  - `SPEC-009` formalized in EARS and BDD.
  - `PLAN-009` approved with ADRs.
  - `TASKS-009` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement `src/core/domain/models/SacredDesignSystem.ts` with AGEAC color alchemy tokens, luminance calculation, and WCAG contrast formulas.
  - Implement `src/core/application/AudiovisualProductionEngine.ts` synthesizing comprehensive production blueprints, 432 Hz acoustic specs, golden ratio framing, and thumbnail hierarchies.
  - Enhance `UniversalDevelopmentEngine.ts` and `CodeScaffolderService.ts` with audiovisual domain awareness.
  - Export new domain and application modules in `src/index.ts`.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-RAG-ESTIMATION-010`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T13:10:00Z
* **Mandate:** "Diseña sistemas RAG listos para producción... un sistema de estimación de tareas, esfuerzo y coste de proyectos IT, integrado en un software real de gestión de proyectos."
* **Preconditions Checked:**
  - `INTAKE-010` recorded and complete.
  - `SPEC-010` formalized in EARS and BDD.
  - `PLAN-010` approved with ADRs.
  - `TASKS-010` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement `src/core/domain/models/RagEstimationEngine.ts` with WBS models, PERT distribution math, and 4-factor confidence scoring.
  - Implement `src/core/application/ProductionRagEstimationService.ts` synthesizing full project estimation dossiers, role cost breakdowns, and risk audits.
  - Enhance `UniversalDevelopmentEngine.ts` with estimation keywords.
  - Integrate `estimate` command in `scripts/eos-cli.mjs`.
  - Add Invariant G to `scripts/verify-strict.ps1` and verify with Exit Code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-DECISION-ARBITER-011`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T13:30:00Z
* **Mandate:** "sigamos mejorando eos sigamos... centrar en la arquitectura multi-agente y en cómo reemplazar decisiones con modelos de decisión como Jev."
* **Preconditions Checked:**
  - `INTAKE-011` recorded and complete.
  - `SPEC-011` formalized in EARS and BDD.
  - `PLAN-011` approved with ADRs.
  - `TASKS-011` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement `src/core/domain/models/DecisionArbiter.ts` with 4-agent roles, weighted scoring math, and veto triggers.
  - Implement `src/core/application/MultiAgentDecisionService.ts` executing deliberation rounds, tallying votes, generating formal ADRs, and issuing SHA-256 seals.
  - Integrate Decision Arbiter into Step 6 of `UniversalDevelopmentEngine.ts`.
  - Export new domain and application modules in `src/index.ts`.
  - Integrate `decide` command in `scripts/eos-cli.mjs`.
  - Add Invariant H to `scripts/verify-strict.ps1` and verify with Exit Code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-UNIFIED-HUB-MCP-012`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T14:05:00Z
* **Mandate:** "sigamos mejorando eos sigamos"
* **Preconditions Checked:**
  - `INTAKE-012` recorded and complete.
  - `SPEC-012` formalized in EARS and BDD.
  - `PLAN-012` approved with ADRs.
  - `TASKS-012` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement `src/mcp/eosMcpServer.ts` (zero-dependency stdio JSON-RPC MCP server exposing 18 sovereign tools, 0.00% drift Borg reconciler, and live dispatch).
  - Implement `public/index.html` (interactive control center with AGEAC Cymatics canvas, live PERT slider calculator, multi-agent veto simulator, and fleet HUD).
  - Implement `scripts/serve-dashboard.mjs` (zero-dependency local HTTP static server on port 3300).
  - Add `dashboard` script to `package.json` and CLI command in `scripts/eos-cli.mjs`.
  - Add Invariant I to `scripts/verify-strict.ps1` and verify with Exit Code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-TEST-SUITE-013`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T16:53:00Z
* **Mandate:** "dale con toda" (Execute Master Evolution Plan Phase A - SPEC-013 Test Suite Foundation)
* **Preconditions Checked:**
  - `INTAKE-013` recorded and complete.
  - `SPEC-013` formalized in EARS and BDD.
  - `PLAN-013` approved with ADRs.
  - `TASKS-013` atomic DAG decomposed.
* **Authorized Scope:**
  - Configure `vitest.config.ts` with v8 coverage provider and threshold >= 95%.
  - Implement comprehensive unit tests for all 10 domain models in `tests/unit/domain/`.
  - Add `test:unit` and `test:coverage` scripts to `package.json`.
  - Implement Invariant J in `scripts/verify-strict.ps1` verifying unit test suite execution.
  - Execute full suite and generate cryptographic evidence record.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-SEMVER-014`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T17:04:00Z
* **Mandate:** "dale con toda" (Execute Master Evolution Plan Phase B - SPEC-014 Semantic Versioning & Changelog Engine)
* **Preconditions Checked:**
  - `INTAKE-014` recorded and complete.
  - `SPEC-014` formalized in EARS and BDD.
  - `PLAN-014` approved with ADRs.
  - `TASKS-014` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement pure domain `SemanticVersion.ts` (SemVer 2.0.0 math, comparison, bumping).
  - Implement pure domain `ConventionalCommitParser.ts` (header/body parsing, breaking flag detection, recommendation).
  - Implement 100% unit tests in `tests/unit/domain/SemanticVersion.test.ts` and `ConventionalCommitParser.test.ts`.
  - Implement `ReleaseOrchestrator.ts` application service for automated changelog synthesis and release bumping.
  - Expose in `src/index.ts` and integrate `release` command into `scripts/eos-cli.mjs`.
  - Validate with `npm run test:unit`, `test:coverage` and `verify:strict`.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-CONFIG-015`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T17:11:00Z
* **Mandate:** "dale con toda" (Execute Master Evolution Plan Phase C - SPEC-015 Runtime Configuration & Environment Management)
* **Preconditions Checked:**
  - `INTAKE-015` recorded and complete.
  - `SPEC-015` formalized in EARS and BDD.
  - `PLAN-015` approved with ADRs.
  - `TASKS-015` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement pure domain `EnvironmentConfig.ts` with profile validation and secret scanning.
  - Implement infrastructure adapter `ConfigLoader.ts` for `.eos/config/` hierarchies.
  - Create configuration profiles (`default.json`, `development.json`, `production.json`).
  - Implement 100% unit tests in `tests/unit/domain/EnvironmentConfig.test.ts`.
  - Expose in `src/index.ts` and integrate `config` command into `scripts/eos-cli.mjs`.
  - Validate with `npm run test:unit`, `test:coverage` and `verify:strict`.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-OBSERVABILITY-016`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T17:25:00Z
* **Mandate:** "dale con toda" (Execute Master Evolution Plan Phase D - SPEC-016 Observability & Telemetry Pipeline)
* **Preconditions Checked:**
  - `INTAKE-016` recorded and complete.
  - `SPEC-016` formalized in EARS and BDD.
  - `PLAN-016` approved with ADRs.
  - `TASKS-016` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement pure domain `TelemetryEvent.ts` (severity enum, immutability, correlation ID).
  - Implement pure domain `MetricCounter.ts` (counter/gauge/histogram, dimensional labels).
  - Implement application service `TelemetryPipeline.ts` (event bus, subscription, buffering).
  - Implement infrastructure adapter `LogTransport.ts` (StdoutTransport, FileTransport).
  - Implement 100% unit tests in `tests/unit/domain/` and `tests/unit/application/`.
  - Expose in `src/index.ts` and integrate `logs` command into `scripts/eos-cli.mjs`.
  - Implement Invariant K in `scripts/verify-strict.ps1` and verify with Exit Code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-AGENT-ORCHESTRATOR-017`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T17:41:00Z
* **Mandate:** "dale con toda" (Execute Master Evolution Plan Phase E - SPEC-017 Autonomous Agent Orchestrator)
* **Preconditions Checked:**
  - `INTAKE-017` recorded and complete.
  - `SPEC-017` formalized in EARS and BDD.
  - `PLAN-017` approved with ADRs.
  - `TASKS-017` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement pure domain `AgentCapability.ts` (personas, contracts, presets, immutability).
  - Implement infrastructure adapter `LLMProvider.ts` (ILLMProvider interface, MockLLMProvider, provider factory).
  - Implement application service `AgentOrchestrator.ts` (step execution, telemetry, execution history).
  - Implement 100% unit tests in `tests/unit/domain/AgentCapability.test.ts` and `tests/unit/application/AgentOrchestrator.test.ts`.
  - Expose in `src/index.ts` and integrate `agent` command into `scripts/eos-cli.mjs`.
  - Implement Invariant L in `scripts/verify-strict.ps1` and verify with Exit Code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-PLUGIN-SYSTEM-018`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T17:50:00Z
* **Mandate:** "dale con toda" (Execute Master Evolution Plan Phase F - SPEC-018 Plugin & Extension System)
* **Preconditions Checked:**
  - `INTAKE-018` recorded and complete.
  - `SPEC-018` formalized in EARS and BDD.
  - `PLAN-018` approved with ADRs.
  - `TASKS-018` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement pure domain `PluginManifest.ts` (manifest schema, hook types, SemVer validation, immutability).
  - Implement application service `PluginManager.ts` (registration, defensive hook dispatch, telemetry).
  - Implement 100% unit tests in `tests/unit/domain/PluginManifest.test.ts` and `tests/unit/application/PluginManager.test.ts`.
  - Expose in `src/index.ts` and integrate `plugin` command into `scripts/eos-cli.mjs`.
  - Implement Invariant M in `scripts/verify-strict.ps1` and verify with Exit Code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-MONTE-CARLO-019`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T18:12:00Z
* **Mandate:** "dale con toda ambos" (Execute Milestone SPEC-019: Monte Carlo Risk Simulation Engine)
* **Preconditions Checked:**
  - `INTAKE-019` recorded and complete.
  - `SPEC-019` formalized in EARS and BDD.
  - `PLAN-019` approved with ADRs.
  - `TASKS-019` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement pure domain `MonteCarloRiskSimulator.ts` (Mulberry32 PRNG, Beta-PERT sampling, percentiles P10-P99).
  - Implement application service `RiskSimulationService.ts` (task orchestration, telemetry emission, reporting).
  - Implement 100% unit tests in `tests/unit/domain/MonteCarloRiskSimulator.test.ts`.
  - Expose in `src/index.ts` and integrate `sim` command into `scripts/eos-cli.mjs`.
  - Implement Invariant N in `scripts/verify-strict.ps1` and verify with Exit Code 0.

---

## IMPLEMENTATION AUTHORIZATION: LEVEL 2+
* **Authorization ID:** `AUTH-2026-10-25-HASH-CHAIN-020`
* **Target Projects:** `c:\Users\valen\Eos-System-1`
* **Status:** `AUTHORIZED`
* **Timestamp:** 2026-10-25T18:12:30Z
* **Mandate:** "dale con toda ambos" (Execute Milestone SPEC-020: Monotonic Clock & Hash-Chain Ledger)
* **Preconditions Checked:**
  - `INTAKE-020` recorded and complete.
  - `SPEC-020` formalized in EARS and BDD.
  - `PLAN-020` approved with ADRs.
  - `TASKS-020` atomic DAG decomposed.
* **Authorized Scope:**
  - Implement pure domain `MonotonicClock.ts` (hardware nanoseconds, monotonic invariant, drift detection).
  - Implement pure domain `HashChainBlock.ts` (genesis block, cryptographic linking, tamper detection).
  - Implement application service `HashChainLedgerService.ts` (append block, verify chain, telemetry).
  - Implement 100% unit tests in `tests/unit/domain/MonotonicClock.test.ts` and `HashChainBlock.test.ts`.
  - Expose in `src/index.ts` and integrate `chain` command into `scripts/eos-cli.mjs`.
  - Implement Invariant O in `scripts/verify-strict.ps1` and verify with Exit Code 0.


