# Mission AK — Constitution Runtime Policy Gate (SPEC-0042) — 2026-09-12

## Summary

Hermetic **Constitution Runtime Policy Gate** — injectable policy-as-code
mapping selected CONSTITUTION MUST/SHALL clauses → enforceable runtime
checks on the autonomous path (`session.resume` / `tool.dispatch` /
`external.write`). Fail-closed on unknown/unmapped critical clauses.
Deny+seal EVD receipts. Law VI deep-redacts secrets (runtime synth only
— no static vendor-key prefix substring). Additive under
`src/core/policy/` — **does not** implement AL/AM, **does not** flip
PRODUCTION_READY, **does not** use CloudAgent, **does not** open live
network in CI, **does not** claim full legal interpreter / auto-amend /
compliance certification products.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `6a13307` (`6a133077b5abc24f3e6dd0387f00470033aca90b`) |
| Branch | `grok/mission-ak-constitution-runtime-policy-gate` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ak` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ak-payload` |
| Ladder 15 | AI+AJ MEASURED; **AK this mission**; AL/AM not this mission |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Constitution runtime | **NON-CLAIM** — ≠ full legal interpreter ≠ auto-amend constitution ≠ compliance certification product ≠ PRODUCTION_READY |
| AL/AM | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Live network in CI | **FORBIDDEN** — hermetic fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createConstitutionRuntimePolicyGate` |
| Evaluate | `evaluate(action)` — allowlisted checks before proceed |
| Intercept | `intercept(action)` — DENY unauthorized; optional throw |
| Allowlist | `listAllowlistedClauses()` / `registerCheck(clauseId, fn)` |
| Receipt | `sealReceipt(outcome)` + deny/allow forensic receipts |
| Fail-closed codes | `POLICY_DENY`, `CLAUSE_UNMAPPED`, `UNKNOWN_ACTION`, `CRITICAL_UNMAPPED`, `FUNDACION_DENY`, `MISSING_DEP`, `INVALID_ACTION` |
| Built-in checks | `LAW_FUNDACION_DELTA0`, `LAW_PRODUCTION_READY_NO`, `LAW_VI_NO_SECRET_LITERAL`, `LAW_CLOUDAGENT_OUT`, `LAW_WRITE_BARRIER` |
| Law VI | `sanitizePayload` / `containsSecretMaterial` — runtime-synth detect |
| AGY / CloudAgent | **NON-CLAIM** |

## EARS

- WHEN autonomous action proposed → evaluate allowlisted constitution runtime checks before proceed
- IF critical constitution check fails → DENY + seal EVD receipt
- WHILE policy mapping incomplete for critical clause → fail-closed DENY (no skip)

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/policy/constitution-runtime-policy-gate.js` | **NEW** |
| `src/core/policy/constitution-clause-allowlist.js` | **NEW** |
| `tests/eos-ak-constitution-runtime-policy-gate.test.js` | **NEW** |
| `scripts/patch-mission-ak.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AL/AM modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ak-payload && npm run test:mission-ak
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AK1–AK16)

Slim exclude basename: `eos-ak-constitution-runtime-policy-gate.test.js`  
Scripts: `npm run test:constitution-runtime-policy-gate` / `npm run test:mission-ak`

## Cases

| ID | Case |
|----|------|
| AK1 | kind + PRODUCTION_READY NO + NON-CLAIM |
| AK2 | allow when checks pass |
| AK3 | Fundacion write DENY |
| AK4 | PRODUCTION_READY flip DENY |
| AK5 | CloudAgent DENY |
| AK6 | unmapped critical fail-closed |
| AK7 | unknown action |
| AK8 | intercept unauthorized |
| AK9 | receipts deny+allow |
| AK10 | PRODUCTION_READY NO locked |
| AK11 | Law VI runtime synth + rg-clean |
| AK12 | NON-CLAIM markers |
| AK13 | MISSING_DEP |
| AK14 | INVALID_ACTION |
| AK15 | hermetic + registerCheck |
| AK16 | write barrier + codes |

## Host bootstrap

`MISSION_AK_BOOTSTRAP.ps1` — Expected StartsWith `6a13307`; worktree
`Eos-mission-ak`; branch `grok/mission-ak-constitution-runtime-policy-gate`;
patcher → test:mission-ak → slim≤145 → verify:strict → commit/push.

Commit: `feat(policy): constitution runtime policy gate (SPEC-0042)`

**Host bootstrap NOT run from this box** (Antigravity-first payload
build only; parent CopyFromBox later).
