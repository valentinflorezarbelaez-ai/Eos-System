# EOS Post-P2 Canonical Inventory and Map

**Document ID:** MAP-CANONICAL-P2-001  
**Status:** CANONICAL_SYSTEM_MAP  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Executive Overview & Single Sources of Truth (SSOT)

To prevent architectural drift, semantic ambiguity, and duplication, this document establishes the **exhaustive inventory and classification** of all software artifacts in the EOS workspace following the completion of Milestone P2.

### Single Sources of Truth by Architectural Domain

| Architectural Domain | Canonical Module (SSOT) | Schema / Standard | Epistemic Classification |
|---|---|---|---|
| **Core Discovery** | [`src/core/discovery/universal-technical-discovery-engine.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/discovery/universal-technical-discovery-engine.js) | `project-profile.schema.json` | `CANONICAL` |
| **Governed Selection & ADR** | [`src/core/discovery/governed-technical-selection-engine.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/discovery/governed-technical-selection-engine.js) | `architecture-decision.schema.json` | `CANONICAL` |
| **Capability Receipts** | [`src/core/discovery/operational-capability-receipt-engine.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/discovery/operational-capability-receipt-engine.js) | `evidence-receipt.schema.json` | `CANONICAL` |
| **Integration Governance** | [`src/core/governance/integration-gatekeeper.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/governance/integration-gatekeeper.js) | `integration-contract.schema.json` | `CANONICAL` |
| **Token Economics** | [`src/core/economics/token-economics-audit-engine.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/economics/token-economics-audit-engine.js) | `token-economics-audit.schema.json` | `CANONICAL` |
| **Canonical Ledger** | [`src/core/sdd/epistemic-evidence-engine.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/sdd/epistemic-evidence-engine.js) (`HashChainedLedger`) | `ADR-0009` | `CANONICAL` |
| **Executive Observability** | [`src/core/observability/executive-mission-reporter.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/observability/executive-mission-reporter.js) | `mission-executive-report.schema.json` | `CANONICAL` |
| **FSM & Transitions** | [`src/core/sdd/sdd-fsm-engine.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/sdd/sdd-fsm-engine.js) | `task-contract.schema.json` | `CANONICAL` |
| **Human Gatekeeper** | [`src/core/sdd/hitl-gatekeeper.js`](file:///c:/Users/valen/Documents/Eos%20system/src/core/sdd/hitl-gatekeeper.js) | `hitl-receipt.schema.json` | `CANONICAL` |
| **External Registration** | [`docs/projects/registry.json`](file:///c:/Users/valen/Documents/Eos%20system/docs/projects/registry.json) | `docs/projects/schema.json` | `CANONICAL` |

---

## 2. Core Engines Inventory & Taxonomy

| Path | Primary Function | Taxonomy Category | Active Dependencies / Notes |
|---|---|---|---|
| `src/core/discovery/universal-technical-discovery-engine.js` | 10-domain static project profile compilation | `CANONICAL` | Validates against `project-profile.schema.json` |
| `src/core/discovery/governed-technical-selection-engine.js` | 8-dimensional scoring, model selection, ADR emission | `CANONICAL` | Validates against `architecture-decision.schema.json` |
| `src/core/discovery/operational-capability-receipt-engine.js` | Stack, model, endpoint capability receipts & $\Delta=0$ | `CANONICAL` | Bound to `HashChainedLedger` |
| `src/core/governance/integration-gatekeeper.js` | P2 integration lifecycle, FDIR kill switch, SSRF defense | `CANONICAL` | Validates against `integration-contract.schema.json` |
| `src/core/economics/token-economics-audit-engine.js` | Token telemetry, context redundancy, anti-loop retries | `CANONICAL` | Validates against `token-economics-audit.schema.json` |
| `src/core/observability/executive-mission-reporter.js` | Dual JSON/Markdown mission reporting with provenance | `CANONICAL` | Validates against `mission-executive-report.schema.json` |
| `src/core/sdd/epistemic-evidence-engine.js` | `EpistemicEvidenceEngine` & `HashChainedLedger` (SSOT) | `CANONICAL` | ADR-0009 designated canonical source of truth |
| `src/core/sdd/hitl-gatekeeper.js` | Human approval receipt validation and gate enforcement | `CANONICAL` | Validates against `hitl-receipt.schema.json` |
| `src/core/sdd/sdd-fsm-engine.js` | Spec-Driven Development 6-state transition machine | `CANONICAL` | Enforces state graph transitions |
| `src/mcp-server.js` | Control Plane MCP server exposing registered tools | `ACTIVE_SUPPORTING` | Exposes 5 ACTIVE + 15 SIMULATION tools |

---

## 3. Schemas Inventory & Validation Scope

### A. Primary Canonical Schemas (Validated in `scripts/validate_schemas.js`)

| Schema File | Required Fields | Status | Role |
|---|---|---|---|
| `mission-package.schema.json` | 11 | `CANONICAL` | Top-level autonomous mission package envelope |
| `task-contract.schema.json` | 16 | `CANONICAL` | Atomic task execution and verification contract |
| `hitl-receipt.schema.json` | 11 | `CANONICAL` | Human-in-the-Loop decision receipt |
| `project-profile.schema.json` | 14 | `CANONICAL` | 10-domain static project discovery output |
| `stack-candidate.schema.json` | 9 | `CANONICAL` | Multi-candidate 8-dimensional evaluation scoring |
| `architecture-decision.schema.json` | 12 | `CANONICAL` | Machine-readable ADR with SHA-256 evidence hash |
| `model-capability.schema.json` | 10 | `CANONICAL` | Model capabilities, pricing vectors, and privacy tiers |
| `endpoint-contract.schema.json` | 12 | `CANONICAL` | Service endpoint schemas and idempotency contracts |
| `integration-contract.schema.json` | 18 | `CANONICAL` | Minimal Real Integration Gate contract (P2) |
| `token-economics-audit.schema.json` | 10 | `CANONICAL` | Token consumption, cost, redundancy and retry audit |
| `mission-executive-report.schema.json` | 12 | `CANONICAL` | Standardized executive mission report with provenance |

### B. Auxiliary & Legacy Schemas

| Schema File | Status | Notes |
|---|---|---|
| `evidence-receipt.schema.json` | `ACTIVE_SUPPORTING` | Draft-07 specialized evidence receipt format |
| `transition-event.schema.json` | `ACTIVE_SUPPORTING` | FSM state machine transition event payload |
| `transition-error.schema.json` | `ACTIVE_SUPPORTING` | FSM state machine transition error payload |
| `ledger-event.schema.json` | `ACTIVE_SUPPORTING` | Hash-chained event log entry structure |
| `context_receipt.schema.json` | `LEGACY_COMPATIBILITY` | Legacy context compilation receipt |
| `feature_list.schema.json` | `LEGACY_COMPATIBILITY` | Product feature list decomposition schema |
| `hitl-decision-result.schema.json` | `LEGACY_COMPATIBILITY` | Legacy HITL decision result format |

---

## 4. MCP Tools Matrix (20 Tools)

| Tool Name | Status | Real Access | Epistemic Scope |
|---|---|---|---|
| `eos_verify_workspace` | `ACTIVE` | Local filesystem | Executes `verify-eos.js` |
| `eos_read_project_profile` | `ACTIVE` | Local discovery | Reads discovered static profile |
| `eos_validate_schemas` | `ACTIVE` | Local schemas | Executes `validate_schemas.js` |
| `eos_verify_ledger_chain` | `ACTIVE` | Local ledger | Verifies SHA-256 hash chaining |
| `eos_generate_executive_report` | `ACTIVE` | Local telemetry | Emits JSON/MD executive reports |
| *15 Simulation Tools (e.g. `eos_execute_task`, `eos_deploy_service`)* | `SIMULATION_ONLY` | Mock / Stub only | Declared simulation tools; no real execution |

---

## 5. Architectural Decision Records (ADRs) Inventory

| ADR ID | Title | Status | Notes / Conflicts |
|---|---|---|---|
| `ADR-0001` | Workspace Initialization | `CANONICAL` | Foundational setup |
| `ADR-0002` (A) | Autonomous Control Plane Architecture | `CANONICAL` | Core control plane designation |
| `ADR-0002` (B) | Luxe Registry Architecture | `DUPLICATE_ID / INVESTIGATE` | **Collision**: Shares ID `ADR-0002` with control plane ADR |
| `ADR-0003` | Flowdesk Stack and Architecture | `CANONICAL` | Flowdesk stack decision |
| `ADR-0004` | RelayHub Architecture and Stack | `CANONICAL` | RelayHub architecture |
| `ADR-0005` | Core Self-Hosting Architecture | `CANONICAL` | Self-hosting guidelines |
| `ADR-0006` | Multimodal Creative Architecture | `CANONICAL` | Multimodal guidelines |
| `ADR-0007` | Research Intelligence Architecture | `CANONICAL` | Research intelligence plane |
| `ADR-0008` | Value-Driven UI Architecture | `CANONICAL` | UI guidelines |
| `ADR-0009` | Canonical Ledger Designation | `CANONICAL` | Designates `HashChainedLedger` as SSOT |
| `ADR-0010` (Generated) | Technical Stack Selection Model | `CANONICAL` | Governed selection engine ADR model |

---

## 6. Scripts & Legacy Compatibility Adapters

| Script / Engine Path | Taxonomy Category | Reason / Recommendation |
|---|---|---|
| `scripts/engine/context-compiler.js` | `ACTIVE_SUPPORTING` | Compiles deterministic prompt context |
| `scripts/engine/authority-adapter.js` | `ACTIVE_SUPPORTING` | Normalizes autonomy levels (`LEVEL_0` to `LEVEL_3`) |
| `scripts/engine/epistemic-evidence-engine.js` | `LEGACY_COMPATIBILITY` | Stub re-exporting `src/core/sdd/epistemic-evidence-engine.js` |
| `scripts/engine/hitl-gatekeeper.js` | `LEGACY_COMPATIBILITY` | Stub re-exporting `src/core/sdd/hitl-gatekeeper.js` |
| `scripts/engine/sdd-fsm-engine.js` | `LEGACY_COMPATIBILITY` | Stub re-exporting `src/core/sdd/sdd-fsm-engine.js` |
| `scripts/engine/mission-ledger.js` | `SUPERSEDED` | Superseded by `HashChainedLedger` per ADR-0009 |
| `scripts/engine/autonomous-ecosystem-manager-v1.js` | `SUPERSEDED` | Superseded by `autonomous-ecosystem-manager.js` |
| ~90 Simulation / Historical Harnesses in `scripts/engine/` | `SIMULATION_ONLY / TEST_ONLY` | Retained for regression testing across 33 historical phases |
| `scripts/verify-eos.js` | `CANONICAL` | 277 structural workspace integrity checks |
| `scripts/validate_schemas.js` | `CANONICAL` | 11 canonical schema validation harness |
