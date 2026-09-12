# Design — Mission T-gate (SPEC-0025a)

## Architecture

```
createExternalWriteGateway({
  fixtureRoot, isRealFundacionPath?, evaluatePreconditions?,
  registry?, applyDiff?, rollbackDiff?, runVerifier?
})
  assertPreconditions(projectId, receipts)
    → missing any of 6 → EXTERNAL_WRITE_PRECONDITION_FAILED
  authorizeExternalWrite({ projectId, targetPath, receipts })
    1. real Fundacion path → FUNDACION_ALWAYS_DENY (even if all 6 pass)
    2. outside fixtureRoot → OUTSIDE_HERMETIC_FIXTURE
    3. missing precondition(s) → EXTERNAL_WRITE_PRECONDITION_FAILED + missing[]
    4. else allow { PRODUCTION_READY:'NO' }
  runGovernedWrite(...)
    authorize → applyDiff → runVerifier
    verifier fail → rollbackDiff + EXTERNAL_WRITE_VERIFIER_FAILED
    apply fail → EXTERNAL_WRITE_APPLY_FAILED (no false success)
    success → receipt { sha256, hermeticFixtureOnly:true, fundacionDeltaOpened:false }
  health/status → { kind:'eos-external-write-gateway-l2', PRODUCTION_READY:'NO',
                    fundacionDeltaOpened:false, fundacionAlwaysDenyIntact:true }
```

## Six Level-2 preconditions (all required)

| Key | Meaning |
|-----|---------|
| REGISTERED | project registered in gateway registry |
| INTAKE_COMPLETE | intake receipt present/ok |
| SPEC_APPROVED | OpenSpec/spec approval receipt |
| AUDIT_COMPLETE | audit receipt |
| OWNER_APPROVAL | PO owner approval receipt |
| LEVEL_2_AUTHORIZED | Level 2+ authorization receipt |

## Controls

| ID | Control |
|----|---------|
| T1 | PRODUCTION_READY=NO + kind |
| T2 | missing precondition → EXTERNAL_WRITE_PRECONDITION_FAILED |
| T3 | all 6 + fixture path → allow |
| T4 | all 6 + real Fundacion-looking path → FUNDACION_ALWAYS_DENY |
| T5 | path outside fixture → OUTSIDE_HERMETIC_FIXTURE |
| T6 | governed write happy path + receipt hash |
| T7 | verifier fail → rollback + fail-closed |
| T8 | apply fail → no false success |
| T9 | partial preconditions list each missing key |
| T10 | health never claims Fundacion Δ opened / PRODUCTION_READY yes |
| T11 | NON-CLAIM source strings |
| T12 | optional SKIP live real Fundacion (must SKIP) |

## Honesty / NON-CLAIM

- Gateway allow ≠ Fundacion Δ=0 flipped
- Hermetic fixture ≠ production Fundacion
- Level-2 receipts ≠ PRODUCTION_READY
- ≠ CloudAgent path
- write-barrier `FUNDACION_ALWAYS_DENY` for real Fundacion remains intact

## Non-goals

No PRODUCTION_READY flip. No real Fundacion writes. No CloudAgent. No write-barrier always-deny weakening. No TR-01 raise. No new npm deps.
