# EOS P3.2 Technical Specification: Cursor Bidirectional Return Adapter

**Document ID:** SPEC-P3-2-001  
**Status:** CANONICAL_IMPLEMENTATION_SPEC  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Overview & Architecture

Milestone P3.2 closes the bidirectional loop with Cursor by establishing the **Cursor Return Package Ingestion & Reconciliation Engine**:
1. **Canonical Schema (`docs/schemas/cursor-return-package.schema.json`)**: 12 required fields enforcing structured feedback (affected files, unified diffs, executed commands, test results, evidence hashes, risks).
2. **Ingestion Engine (`src/core/adapters/cursor-return-ingestion-engine.js`)**: Evaluates return packages against the original task contract, detecting protected surface violations, secret leakage, epistemic test contradictions, and replay nonces.
3. **Strict Invariant**: **Zero automatic diff application to disk**. Returns are audited, reconciled, and staged in `.missions/<id>/evidence/` with a deterministic verdict (`ACCEPT`, `REQUEST_CORRECTION`, `PAUSE`, `REJECT`, `ESCALATE_HITL`).

```text
       Cursor Execution Agent
                 │
                 ▼ (Produces Return Package JSON)
┌─────────────────────────────────────────────────────────────┐
│               cursor-return-package.json                    │
│   - status: COMPLETED | BLOCKED | FAILED | NEEDS_REVIEW     │
│   - affected_files: [{ path, action, sha256_before, ... }]  │
│   - diff: Unified diff format                               │
│   - commands_executed: [{ command, exit_code, stdout }]     │
│   - test_results: { pass_rate, failed_tests }               │
│   - evidence: { receipt_hashes }                            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ (eos mission submit <id> --file <path>)
┌─────────────────────────────────────────────────────────────┐
│          CursorReturnIngestionEngine                        │
│   1. Task Contract Reconciler (allowed_write_roots check)   │
│   2. Protected Surface Guard (docs/governance/**, src/core) │
│   3. Deep Secret Scanner (tokens, keys, certificates)       │
│   4. Epistemic Contradiction Check (pass_rate == 100%)      │
│   5. Anti-Replay Nonce Store                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Reconciliation Verdict                    │
│   - ACCEPT: All contracts, tests, and bounds satisfied      │
│   - REQUEST_CORRECTION: Test failures / format mismatch     │
│   - REJECT: Security violation (secrets / protected root)   │
│   - ESCALATE_HITL: Blocked / Needs Human Review             │
│                                                             │
│   * auto_apply_authorized = FALSE (Strict Safety Barrier)   │
│   * Ledger Event: CURSOR_RETURN_INGESTED (SHA-256 chained)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Decision Logic Matrix

| Condition / Findings | Ingestion Verdict | Action / Escalation |
|---|---|---|
| Zero deviations, test pass rate = 100%, status = `COMPLETED` | `ACCEPT` | Staged in evidence; logged in ledger. |
| Test failures reported (`failed_tests > 0` or `pass_rate < 1.0`) | `REQUEST_CORRECTION` | Returns failure reasons to agent for remediation. |
| Protected surface mutation attempt (`docs/governance/**`, etc.) | `REJECT` | Security violation logged; escalation triggered. |
| Detected API key, bearer token, or private key in diff | `REJECT` | Security violation logged; execution blocked. |
| Replayed nonce detected | `REJECT` | Replay attack prevented. |
| Status reported as `BLOCKED` or `NEEDS_REVIEW` | `ESCALATE_HITL` | Requires Human Director guidance before proceeding. |

---

## 3. Epistemic Status

- **Permitted Claim**: `EOS can receive, validate, and reconcile structured return packages from Cursor under human governance, enforcing strict security and test invariants without automated project mutation.`
