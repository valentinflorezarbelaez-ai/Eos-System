# EOS P3.5 Technical Specification: Bounded Worktree Mutation Canary

**Document ID:** SPEC-P3-5-001  
**Status:** CANONICAL_IMPLEMENTATION_SPEC  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Overview & Architecture

Milestone P3.5 demonstrates the first **local-only, scoped code mutation canary** executed inside an isolated worktree sandbox (`src/core/sandbox/worktree-mutation-engine.js`):
1. **Isolated Worktree Provisioning**: Creates an ephemeral copy of a test fixture under `.eos/test_canary_worktree/` and takes a cryptographic SHA-256 snapshot of all baseline files.
2. **Strict Scoped Diff Application**:
   - Allows writes **strictly** to declared paths in `allowed_write_roots`.
   - Rejects path traversal (`..`), absolute paths, and protected surfaces (`docs/governance/**`, `src/core/**`).
   - Computes pre- and post-mutation SHA-256 checksums per file.
3. **Hermetic Test Execution**: Runs test runners (e.g. `node --test`) inside the isolated worktree directory and captures exit code, stdout, and stderr.
4. **Independent Review Receipt**: Evaluated by `ROLE-QA-ENGINEER` or `ROLE-SECURITY-AUDITOR` via `MultiAgentSupervisionEngine`.
5. **Mathematical Reversibility Proof ($\Delta = 0$)**: Restores the baseline snapshot and proves zero residual state or leftover files.
6. **Terminal Stop Gate**: Execution stops before merge, requiring explicit Human Release Gate. `main` branch, production, and external target projects (`PRJ-FUNDACION`) remain strictly immutable ($\Delta = 0$).

```text
       Isolated Worktree Initialization
                     │ (Cryptographic Baseline Snapshot)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Scoped Mutation Verification                  │
│   - Check path traversal (../) ──► BLOCKED                  │
│   - Check allowed_write_roots  ──► ENFORCED                 │
│   - Record pre/post SHA-256 checksums                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Hermetic Test Execution                       │
│   - Executes node --test inside isolated sandbox            │
│   - 100% Pass Rate required for progression                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          Independent Supervision & Verification             │
│   - Author != Reviewer Receipt Generation                   │
│   - Hash committed to HashChainedLedger                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       Rollback Verification            Terminal Stop Gate
   (Baseline restored, Δ = 0)      (Stops before merge to main)
```

---

## 2. Security & Isolation Invariants

| Dimension | Policy / Constraint |
|---|---|
| **Target Project Isolation** | `PRJ-FUNDACION` and all registered external projects remain in `LEVEL_0 / READ_ONLY` ($\Delta = 0$). |
| **Main Branch Protection** | Zero direct commits or mutations to `main`. |
| **Network Egress** | Strictly `BLOCKED_OFFLINE` (no external API calls or telemetry). |
| **Credentials & Secrets** | `ZERO_STAGED` / No secret access granted to worktree. |
| **Reversibility Standard** | All modified files must be restorable to initial SHA-256 baseline state. |

---

## 3. Epistemic Claim Permitted

> **EOS can coordinate a limited, local code mutation inside an isolated worktree under contractual scope, independent review, hermetic automated testing, cryptographic evidence, and mathematical rollback reversibility ($\Delta = 0$).**
