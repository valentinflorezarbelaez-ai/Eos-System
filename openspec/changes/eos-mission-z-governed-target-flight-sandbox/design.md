# Design — Mission Z (SPEC-0031)

## Architecture

```
createTargetFlightSandbox({
  gatekeeper?,          // createPreconditionGatekeeper (default constructed)
  rollbackEngine?,      // createFlightRollbackEngine (default in-memory)
  writeGateway?,        // optional T-style: authorize|authorizeExternalWrite
  ledger?,              // createHashChainedLedger (default constructed)
  isRealFundacionPath?, // default deny Documents/Fundacion + /Fundacion/
  initialTree?, applyMutation?, verify?, hash?, now?, onReceipt?
})
  preflight({ preconditions, targetPath, mutationPlan, tree })
    IDLE → PREFLIGHT
    1. real Fundacion path / plan → FUNDACION_ALWAYS_DENY (even if all 6 pass)
    2. missing precondition(s) → PRECONDITION_FAILED + missing[]
    3. optional writeGateway.authorize → honor deny (compose, do not rewrite T)
    4. captureSnapshot → { sha256, entries, at }
    → SANDBOX_ACTIVE | DENIED
  executeFlight({ mutationPlan, verify, applyMutation }) / run(...)
    require SANDBOX_ACTIVE else FLIGHT_UNAUTHORIZED
    SANDBOX_ACTIVE → MUTATING (apply on ephemeral tree / os.tmpdir — NEVER Fundacion)
                 → VERIFYING
    verify fail → rollback(snapshot) + ledger FLIGHT_ROLLED_BACK → ROLLED_BACK
    apply fail  → ESCALATED_HITL (no false success)
    verify ok   → COMMITTED + ledger FLIGHT_COMMITTED
  attemptWrite({ path, content })
    IDLE / wrong state → FLIGHT_UNAUTHORIZED
    Fundacion path     → FUNDACION_ALWAYS_DENY
  health/getState/getReceipts
    kind:'eos-governed-target-flight-sandbox', PRODUCTION_READY:'NO',
    fundacionDeltaOpened:false, fundacionAlwaysDenyIntact:true
```

## Six Level-2 preconditions (all required — same as T-gate)

| Key | Meaning |
|-----|---------|
| REGISTERED | project registered |
| INTAKE_COMPLETE | intake receipt present/ok |
| SPEC_APPROVED | OpenSpec/spec approval receipt |
| AUDIT_COMPLETE | audit receipt |
| OWNER_APPROVAL | PO owner approval receipt |
| LEVEL_2_AUTHORIZED | Level 2+ authorization receipt |

## State machine

`IDLE → PREFLIGHT → SANDBOX_ACTIVE → MUTATING → VERIFYING → COMMITTED | ROLLED_BACK | ESCALATED_HITL | DENIED`

Fail-closed: missing keys, Fundacion paths, unauthorized writes, invalid transitions. Never skip states. Simulation ≠ Fundacion Δ opened.

## HashChainedLedger (sealEvd style)

```
bodySha256 = sha256(canonical JSON { type, at, payload })
sha256     = sha256(prevHash + bodySha256)
prevHash   = previous event.sha256 (genesis = 64 zeros)
```

Each receipt carries `prevHash` + `sha256` + `bodySha256`. `verifyChain()` recomputes.

## Port contracts (injection only — do not rewrite T/W/V)

| Port | Expected surface |
|------|------------------|
| gatekeeper | `evaluate(preconditions) → { ok, missing[] }` |
| rollbackEngine | `captureSnapshot(treeOrRoot)`, `rollback(snapshot)`, `applyMutation`, `getTree` |
| writeGateway | `authorize` / `authorizeExternalWrite` (optional compose) |
| ledger | `append(type, payload)`, `getEvents`, `getTip`, `verifyChain` |

## Controls

| ID | Control |
|----|---------|
| Z1 | kind + PRODUCTION_READY NO |
| Z2 | blocked without Level 2 auth / missing precondition |
| Z3 | all 6 + hermetic fixture → preflight OK + snapshot sha256 |
| Z4 | real Fundacion-looking path → FUNDACION_ALWAYS_DENY |
| Z5 | ephemeral mutation succeeds + ledger receipt chain |
| Z6 | verify fail → atomic rollback restores snapshot |
| Z7 | rollback engine capture/restore roundtrip |
| Z8 | gatekeeper lists each missing key |
| Z9 | HashChainedLedger prevHash links |
| Z10 | unauthorized write attempt fail-closed |
| Z11 | state machine honesty |
| Z12 | NON-CLAIM source strings + Fundacion Δ=0 honesty in health |
| Z13 | writeGateway compose deny honored |
| Z14 | apply fail → ESCALATED_HITL no false success |
| Z15 | optional SKIP live real Fundacion (must SKIP) |
| Z16 | codes + helpers |

## Honesty / NON-CLAIM

- not PRODUCTION_READY
- simulation ≠ Fundacion Δ opened
- sandbox ≠ live Fundacion writes
- Level-2 receipts ≠ PRODUCTION_READY
- ≠ CloudAgent path
- write-barrier `FUNDACION_ALWAYS_DENY` for real Fundacion remains intact
- Prefer not rewriting write-barrier or external-write-gateway

## Non-goals

No PRODUCTION_READY flip. No real Fundacion writes. No CloudAgent. No write-barrier always-deny weakening. No TR-01 raise. No new npm deps.
