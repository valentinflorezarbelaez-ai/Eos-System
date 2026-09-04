# EOS Capability Registry Specification

**Document ID:** SPEC-EOS-CAPABILITY-REGISTRY-001  
**Version:** `1.0.0`  
**Status:** DRAFT_GOVERNED_DESIGN  
**Governing Baseline:** `GOV-BASE-2026-001`  
**Schema Definition:** [`docs/schemas/capability-entry.schema.json`](file:///c:/Users/valen/Documents/Eos%20system/docs/schemas/capability-entry.schema.json)  
**Date:** 2026-08-21  
**Lead Architect:** EOS Senior Systems Architect & Engineering Agent  

---

## 1. Architectural Motivation & Scope

This specification establishes the **EOS Capability Registry**, the foundational mechanism for Step 1 of the post-Level 1 roadmap (unifying EOS Authority, Gentleman Programming multi-agent configuration and receipts, and LIDR Academy Spec-Driven Development).

### Core Architectural Principles
1. **Explicit Epistemic Provenance**: Every registered capability must declare its origin (`EOS_CANONICAL`, `GENTLEMAN_PROGRAMMING`, `LIDR_ACADEMY`, or `HYBRID_FUSION`), contract version, and verified reference specs.
2. **Strict Epistemic Classification**: Capabilities are classified under one of six epistemic states:
   - `CANONICAL_OPERATIONAL`: Fully implemented in active runtime, tested, and audited.
   - `WIRED_READ_ONLY`: Active in engine for read operations; mutating paths blocked by governance guards.
   - `WIRED_BLOCKED_MUTATING`: Wired to active engine, but blocked by monotonic autonomy guards (`read-only / LEVEL_0`).
   - `SIMULATION_ONLY`: Declared in schema/target manifest with default-deny simulation response (no side effects).
   - `DESIGNED_NOT_RUN`: Formally contracted but unexecuted in live environment (e.g. P4 external canary).
   - `DEPRECATED`: Superseded legacy interface.
3. **Monotonic Authority Gating**: Each entry declares the minimum required authority (`A0` to `A3` / `LEVEL_0` to `LEVEL_3`) and side effect boundary (`NONE`, `READ_ONLY`, `LEDGER_WRITE`, `FILE_WRITE_ISOLATED`, `EXTERNAL_NETWORK`, `SAFE_MODE_TRIP`).
4. **Token Economics Profile**: Every capability declares token input/output estimates and a strict USD cost ceiling.

---

## 2. Capability Data Model & Schema Fields

The canonical schema is defined in [`docs/schemas/capability-entry.schema.json`](file:///c:/Users/valen/Documents/Eos%20system/docs/schemas/capability-entry.schema.json).

```json
{
  "schema_version": "1.0.0",
  "capability_id": "CAP-CTX-COMPILER-001",
  "name": "Progressive Context Compilation Engine",
  "description": "Compiles deterministic, token-budgeted prompt context with cryptographic receipt and section inclusion hashing.",
  "category": "CONTEXT_COMPILATION",
  "epistemic_status": "WIRED_READ_ONLY",
  "authority_level_required": "A0",
  "provenance": {
    "source_framework": "EOS_CANONICAL",
    "origin_contract_version": "1.1.0",
    "author_or_maintainer": "EOS Core Team",
    "reference_specs": [
      "docs/specs/eos_core/EOS-EVIDENCE-ENGINE-SPEC.md",
      "docs/policies/EOS-CONTEXT-AND-TOKEN-EFFICIENCY-POLICY.md"
    ]
  },
  "tool_binding": {
    "mcp_tool_name": "eos.context.compile",
    "engine_module_path": "scripts/engine/context-compiler.js",
    "execution_mode": "IN_PROCESS",
    "input_schema_ref": "docs/schemas/task-contract.schema.json"
  },
  "side_effects": "READ_ONLY",
  "token_budget_profile": {
    "estimated_input_tokens": 150,
    "estimated_output_tokens": 800,
    "max_cost_usd_cap": 0.0020
  },
  "verification_suite": {
    "test_file": "tests/p1-operational-capability-receipts.test.js",
    "required_assertion_count": 8
  }
}
```

---

## 3. Registered Categories & Initial Catalog

| Category | Description | Initial Capability Candidates |
|---|---|---|
| **`GOVERNANCE`** | Monotonic authority check, policy validation, HITL gatekeeping | `CAP-GOV-AUTH-CHECK-001`, `CAP-GOV-HITL-RECEIPT-001` |
| **`CONTEXT_COMPILATION`**| Progressive prompt context compilation with receipts | `CAP-CTX-COMPILER-001` |
| **`LEDGER_OBSERVABILITY`**| Append-only hash-chained ledger and feature tracking | `CAP-LDG-GET-FEATURES-001`, `CAP-LDG-UPDATE-FEATURE-001` |
| **`EVIDENCE_VERIFICATION`**| Cryptographic SHA-256 evidence auditing and manifests | `CAP-EVD-VERIFIER-001` |
| **`ROUTING_AND_DISPATCH`**| Outcome-first routing (direct vs delegated vs SDD) | `CAP-ROU-OUTCOME-ROUTER-001` |
| **`CODE_MUTATION`** | Bounded worktree mutation with Δ = 0 verification | `CAP-MUT-WORKTREE-ISOLATED-001` |
| **`TESTING_AND_QA`** | Multi-agent supervision, red-team adversarial check | `CAP-TST-SUPERVISION-001`, `CAP-TST-BROWSER-QA-001` |
| **`SECURITY_AND_FDIR`** | Secret scanning, write barrier enforcement, emergency FDIR | `CAP-SEC-BARRIER-CHECK-001`, `CAP-SEC-FDIR-BREAKER-001` |
| **`BENCHMARK_AND_LEARNING`**| Token economics calculation, BKM extraction, Engram memory | `CAP-LRN-TOKEN-ECONOMICS-001` |

---

## 4. Integration Invariants & Safety Barriers

1. **Read-Only by Default**: Registering a capability in `docs/schemas/` or `src/core/capabilities/` creates zero runtime side effects until bound and authorized.
2. **Immutability of Protected Surfaces**: `PRJ-FUNDACION` remains in `LEVEL_0 / READ_ONLY` with $\Delta = 0$.
3. **No External Calls**: Real provider routing or external network calls remain `BLOCKED_OFFLINE` and require explicit Level 3 HITL authorization.
4. **Receipts Required**: Any mutating capability (`LEDGER_WRITE`, `FILE_WRITE_ISOLATED`) must produce a content-bound cryptographic receipt before state transition.
