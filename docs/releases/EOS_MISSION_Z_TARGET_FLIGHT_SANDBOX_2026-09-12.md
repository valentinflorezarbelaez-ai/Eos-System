# Mission Z — Governed Target Flight Sandbox & Level 2 Precondition Verifier (SPEC-0031) — 2026-09-12

## Summary

Fail-closed **Level-2 Target Flight Sandbox** that verifies the six constitutional
preconditions (same as T-gate), captures a SHA-256 snapshot, applies a governed
mutation **only** in an ephemeral in-memory / `os.tmpdir` tree, seals
HashChainedLedger receipts (prevHash + sha256 body, sealEvd style), and
atomically rolls back on verify fail. New modules under `src/core/sandbox/` —
additive overlay; **does not** open real Documents/Fundacion, **does not** flip
PRODUCTION_READY, **does not** use CloudAgent, **does not** rewrite write-barrier
or external-write-gateway (inject/compose).

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — real Fundacion paths ALWAYS DENIED (`FUNDACION_ALWAYS_DENY` / ADR-0013) |
| Simulation | **≠** Fundacion Δ opened |
| Sandbox | **≠** live Fundacion writes |
| Level-2 receipts | **≠** PRODUCTION_READY |
| PRODUCTION_READY | **`NO`** (never YES) |
| write-barrier always-deny | **intact** — sandbox does not mutate `src/core/write-barrier/*` |
| T-gate gateway | **not rewritten** — optional inject `writeGateway` |
| CloudAgent | **out** — Antigravity-first / box-only |
| App Fuerza / Fundacion trees on disk | **untouched** |

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createTargetFlightSandbox` → preflight / executeFlight / run / attemptWrite / health / getState / getReceipts |
| Preconditions | REGISTERED, INTAKE_COMPLETE, SPEC_APPROVED, AUDIT_COMPLETE, OWNER_APPROVAL, LEVEL_2_AUTHORIZED |
| Gatekeeper | `createPreconditionGatekeeper` → `evaluate` `{ ok, missing[], PRODUCTION_READY:'NO' }` |
| Rollback | `createFlightRollbackEngine` → `captureSnapshot` / `rollback` (SHA-256 sorted path→content) |
| Fundacion | `denyRealFundacion` / `defaultIsRealFundacionPath` → always `FUNDACION_ALWAYS_DENY` |
| Ledger | `createHashChainedLedger` — genesis prevHash = 64 zeros; `sha256 = H(prevHash + bodySha256)` |
| Ephemeral tree | in-memory or `os.tmpdir` — NEVER real Fundacion |
| AGY / CloudAgent | **NON-CLAIM** — no CloudAgent |

## State machine

`IDLE → PREFLIGHT → SANDBOX_ACTIVE → MUTATING → VERIFYING → COMMITTED | ROLLED_BACK | ESCALATED_HITL | DENIED`

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/sandbox/precondition-gatekeeper.js` | **NEW** |
| `src/core/sandbox/flight-rollback-engine.js` | **NEW** |
| `src/core/sandbox/target-flight-sandbox.js` | **NEW** |
| `tests/eos-z-target-flight-sandbox.test.js` | **NEW** |
| `scripts/patch-mission-z.mjs` | **NEW** |
| `src/core/write-barrier/*` | **No** (prefer) |
| `src/core/governance/external-write-gateway.js` | **No** (inject/compose) |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/Eos-mission-z-payload && node --test tests/eos-z-target-flight-sandbox.test.js
```

→ **15 PASS**, 1 SKIP, 0 FAIL (Z1–Z14 + Z16 PASS; Z15 SKIP live Fundacion)

Slim exclude `eos-z-target-flight-sandbox.test.js` + `npm run test:target-flight` / `test:mission-z`.

## Cases

| ID | Result |
| --- | --- |
| Z1 kind + PRODUCTION_READY NO | PASS |
| Z2 blocked without Level 2 auth / missing precondition | PASS |
| Z3 all 6 + hermetic fixture → preflight OK + snapshot sha256 | PASS |
| Z4 real Fundacion-looking path → FUNDACION_ALWAYS_DENY | PASS |
| Z5 ephemeral mutation succeeds + ledger receipt chain | PASS |
| Z6 verify fail → atomic rollback restores snapshot | PASS |
| Z7 rollback engine capture/restore roundtrip | PASS |
| Z8 gatekeeper lists each missing key | PASS |
| Z9 HashChainedLedger prevHash links | PASS |
| Z10 unauthorized write attempt fail-closed | PASS |
| Z11 state machine honesty | PASS |
| Z12 NON-CLAIM source strings + Fundacion Δ=0 honesty | PASS |
| Z13 writeGateway compose deny honored | PASS |
| Z14 apply fail → ESCALATED_HITL no false success | PASS |
| Z15 Optional live real Fundacion | SKIP |
| Z16 codes + helpers | PASS |

## Package scripts (exact)

```json
"test:target-flight": "node --test tests/eos-z-target-flight-sandbox.test.js",
"test:mission-z": "node --test tests/eos-z-target-flight-sandbox.test.js"
```

SLIM_SUITE_EXCLUDES entry: `'eos-z-target-flight-sandbox.test.js'`

Applied on host by `scripts/patch-mission-z.mjs` (idempotent).

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `e2ab1ecabb28643057b8f2625e0851e7fc69de01` (tip refresh post-#186 = PR #187)
- **NON-CLAIM:** not PRODUCTION_READY; simulation ≠ Fundacion Δ opened; sandbox ≠ live Fundacion writes; ≠ CloudAgent
- No AI commit attribution

## Branch

`grok/mission-z-governed-target-flight-sandbox`

## Payload

`/workspace/Eos-mission-z-payload/` (host: `C:\Users\valen\Documents\Eos-mission-z-payload`)
