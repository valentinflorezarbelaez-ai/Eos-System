# Spec — Constitution Runtime Policy Gate (SPEC-0042 / Mission AK)

## Purpose

Provide a hermetic, fail-closed **Constitution Runtime Policy Gate**:
injectable policy-as-code that maps selected CONSTITUTION MUST/SHALL
clauses to enforceable runtime checks on the autonomous path — without
becoming a full legal interpreter, auto-amend engine, or compliance
certification product.

## Requirements

### R1 — Factory & kind
- `createConstitutionRuntimePolicyGate(options)` returns object with
  `kind: 'eos-constitution-runtime-policy-gate'` and
  `PRODUCTION_READY: 'NO'`.

### R2 — Evaluate before proceed
- `evaluate(action)` SHALL run allowlisted constitution runtime checks
  before an autonomous action proceeds (`session.resume` /
  `tool.dispatch` / `external.write` / …).
- Returns `{ ok: true, receipt }` or `{ ok: false, denyCode, receipt }`.

### R3 — Intercept
- `intercept(action)` SHALL alias evaluate and MAY throw on DENY when
  configured (`throwOnDeny` / `{ throw: true }`).

### R4 — Allowlist & register
- `listAllowlistedClauses()` SHALL list allowlisted clause ids.
- `registerCheck(clauseId, fn)` SHALL register/replace a hermetic
  checker and add the id to the allowlist.

### R5 — Fail-closed unmapped critical
- Referenced / required critical clause without allowlist entry or
  checker → `CRITICAL_UNMAPPED` or `CLAUSE_UNMAPPED` DENY (never skip).

### R6 — Built-in checks
- Built-in allowlisted checks SHALL include at least:
  `LAW_FUNDACION_DELTA0`, `LAW_PRODUCTION_READY_NO`,
  `LAW_VI_NO_SECRET_LITERAL`, `LAW_CLOUDAGENT_OUT`,
  `LAW_WRITE_BARRIER`.

### R7 — Unknown / invalid
- Unknown action type → `UNKNOWN_ACTION`.
- Null / non-object / missing `type` → `INVALID_ACTION`.

### R8 — Fundacion
- Fundacion write intent → `FUNDACION_DENY`.
- Fundacion Δ=0; no writes.

### R9 — Law VI
- DENY payloads carrying provider secret material.
- No static vendor-key prefix substring in source/tests (runtime synth).

### R10 — Receipts
- `sealReceipt(outcome)` and evaluate denials/allows emit forensic
  receipts with `PRODUCTION_READY:'NO'`.
- Optional `receiptSealer` / `ledgerAppend` (AJ-compatible stub).

### R11 — Honesty
- `health()` / `getState()` carry NON-CLAIM flags.
- Do NOT implement AL/AM.
- ≠ full legal interpreter / ≠ auto-amend / ≠ compliance certification.
- No CloudAgent; no live network in CI.

### R12 — Tests
- Hermetic suite ≥12 PASS; slim-excluded basename
  `eos-ak-constitution-runtime-policy-gate.test.js`.

## EARS

- WHEN an autonomous action is proposed (session resume / tool
  dispatch / external write intent), THE SYSTEM SHALL evaluate
  allowlisted constitution runtime checks before proceed.
- IF a critical constitution check fails, THE SYSTEM SHALL DENY the
  action and seal an EVD receipt.
- WHILE policy mapping is incomplete for a critical clause, THE
  SYSTEM SHALL fail-closed (DENY) rather than skip.

## Non-requirements
- AL/AM, PRODUCTION_READY flip, CloudAgent, real Fundacion writes,
  full legal interpreter, auto-amend constitution, compliance
  certification product.
