# Proposal — Mission AK: Constitution Runtime Policy Gate (SPEC-0042)

## Why

Ladder 15 audit ranks **Constitution Runtime Policy Gate** as the third
L15 satellite (after AI MEASURED + AJ MEASURED). `CONSTITUTION.md` /
base-standards are documentary SSOT; there is no unified runtime
policy-as-code gate that enforces selected MUST/SHALL clauses on the
autonomous path (AI/AF/AG) before tool dispatch / session resume /
external write.

User axis: gate de validación de directivas constitucionales en
runtime, interceptor de comandos/acciones no autorizadas, compliance
formal en caliente.

## What

1. `src/core/policy/constitution-runtime-policy-gate.js` —
   `createConstitutionRuntimePolicyGate`; kind
   `eos-constitution-runtime-policy-gate`; `evaluate` / `intercept` /
   `listAllowlistedClauses` / `registerCheck` / `sealReceipt`;
   injectable `{ clauseAllowlist, checks, constitutionText/clauses,
   now, receiptSealer?, ledgerAppend? }`; fail-closed
   `POLICY_DENY` / `CLAUSE_UNMAPPED` / `UNKNOWN_ACTION` /
   `CRITICAL_UNMAPPED` / `FUNDACION_DENY` / `MISSING_DEP` /
   `INVALID_ACTION`; built-in allowlisted checks
   (`LAW_FUNDACION_DELTA0`, `LAW_PRODUCTION_READY_NO`,
   `LAW_VI_NO_SECRET_LITERAL`, `LAW_CLOUDAGENT_OUT`,
   `LAW_WRITE_BARRIER`); `AK_PRODUCTION_READY='NO'`.
2. Thin `src/core/policy/constitution-clause-allowlist.js` — default
   allowlist ids + metadata only (NOT a full legal interpreter).
3. Suite `tests/eos-ak-constitution-runtime-policy-gate.test.js`
   (AK1–AK16) hermetic; **no static vendor-key prefix substring**
   (runtime synth); slim-exclude; `npm run test:constitution-runtime-policy-gate`
   / `test:mission-ak`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-ak-constitution-runtime-policy-gate` from main tip
starting with `6a13307` (StartsWith OK); tests green (~12–16 PASS, 0 FAIL);
SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0;
no AI commit attribution; no CloudAgent; zero new npm deps; do NOT implement
AL/AM; no live network in CI.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AL Autonomy Replay / AM closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- Full legal interpreter / auto-amend constitution
- Compliance certification product
- Live network / CloudAgent
- Static vendor API key literals in source/tests
