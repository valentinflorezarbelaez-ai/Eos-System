# Design — Mission AK (SPEC-0042)

## Architecture

```
createConstitutionRuntimePolicyGate({
  clauseAllowlist?,  // ids / Set / metadata array — default DEFAULT_CLAUSE_ALLOWLIST
  checks?,           // Map/object clauseId → checker fn
  constitutionText?, // fixture string (NOT live file IO)
  clauses?,          // fixture clause objects
  now?, receiptSealer?, ledgerAppend?,  // AJ-compatible stub optional
  requireLedgerAppend?=false,
  includeBuiltins?=true,
  onReceipt?, throwOnDeny?
})
  evaluate(action)   // { type, payload?, requiredClauses? } → { ok, receipt } | { ok:false, denyCode, receipt }
  intercept(action)  // alias; may throw on DENY
  listAllowlistedClauses() / registerCheck(clauseId, fn)
  sealReceipt(outcome)
    kind:'eos-constitution-runtime-policy-gate', PRODUCTION_READY:'NO'
```

AK is an **injectable policy gate** over selected constitution clauses.
It is NOT a full legal interpreter and does NOT auto-amend the
constitution. Incomplete mapping for a critical clause → fail-closed
DENY (never skip).

## Fail-closed codes

| Condition | Code |
|-----------|------|
| Allowlisted check failed (PR flip / CloudAgent / secret / write barrier) | `POLICY_DENY` |
| Referenced clause not on allowlist / no checker (non-critical) | `CLAUSE_UNMAPPED` |
| Unknown autonomous action type | `UNKNOWN_ACTION` |
| Critical clause unmapped / no checker (fail-closed, no skip) | `CRITICAL_UNMAPPED` |
| Fundacion write intent | `FUNDACION_DENY` |
| Invalid / missing injectables | `MISSING_DEP` |
| Null / non-object / missing type action | `INVALID_ACTION` |

## Built-in allowlisted checks (hermetic defaults)

| Clause id | Behavior |
|-----------|----------|
| `LAW_FUNDACION_DELTA0` | DENY external Fundacion write intents |
| `LAW_PRODUCTION_READY_NO` | DENY PRODUCTION_READY=YES flip claims |
| `LAW_VI_NO_SECRET_LITERAL` | DENY provider secret material (runtime-synth detect) |
| `LAW_CLOUDAGENT_OUT` | DENY CloudAgent / cloud-coding-agent dispatch |
| `LAW_WRITE_BARRIER` | DENY unbounded `external.write` without barrier envelope |

## EARS (from L15 audit)

- WHEN an autonomous action is proposed (session resume / tool
  dispatch / external write intent), THE SYSTEM SHALL evaluate
  allowlisted constitution runtime checks before proceed.
- IF a critical constitution check fails, THE SYSTEM SHALL DENY the
  action and seal an EVD receipt.
- WHILE policy mapping is incomplete for a critical clause, THE
  SYSTEM SHALL fail-closed (DENY) rather than skip.

## Law VI

- Detect / redact api_key / token / authorization / secret / password
- Vendor-style key substrings via runtime-built regex (never static
  vendor-key prefix literals — AF11 lesson)
- Receipts / getState never echo secrets
- `rg`-style check: src+tests contain zero vendor-key prefix substring

## Controls

| ID | Control |
|----|---------|
| AK1 | kind + PRODUCTION_READY NO + NON-CLAIM |
| AK2 | allow when all allowlisted checks pass |
| AK3 | Fundacion write DENY + receipt |
| AK4 | PRODUCTION_READY flip DENY |
| AK5 | CloudAgent intent DENY |
| AK6 | unmapped critical → CRITICAL_UNMAPPED (no skip) |
| AK7 | unknown action → UNKNOWN_ACTION |
| AK8 | intercept unauthorized fixtures |
| AK9 | receipt sealed deny + allow |
| AK10 | PRODUCTION_READY === NO locked |
| AK11 | Law VI runtime synth + rg-clean |
| AK12 | NON-CLAIM markers |
| AK13 | MISSING_DEP |
| AK14 | INVALID_ACTION |
| AK15 | hermetic + registerCheck |
| AK16 | write barrier + fail-closed codes |

## Controls (constraints)

- Fundacion Δ=0 · PRODUCTION_READY=NO · no CloudAgent · no AL/AM
- Antigravity-first · zero new npm deps · hermetic CI
