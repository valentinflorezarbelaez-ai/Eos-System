# Evidence — Mission DU Sovereign Pure Domain Event Publisher Port (SPEC-0131)

- **Date:** 2026-09-25 (America/Bogota)
- **Package:** `/workspace/eos-mission-du/`
- **Status:** MISSION_DU_CODE_READY
- **PRODUCTION_READY:** NO
- **Fundacion Δ:** 0

## Hermetic verification (box)

```
cd /workspace/eos-mission-du && npm run test:mission-du
# tests 17
# pass 17
# fail 0
```

```
node --check src/core/composition/*.js tests/*.js scripts/*.mjs
# all OK
```

## Modules

| Module | Role |
| --- | --- |
| `domain-event-publisher-receipt.js` | `DU-RCPT-*` nine-field seal + freeze soft-observe (`b205ce8c`) + publishHold (purePublishOnly; outboxDispatchDeferred) |
| `domain-event-publisher-policy-gate.js` | Fail-closed preconditions (missing domainEvent / eventType / aggregateId / empty payload / outbox dispatch / tip-pin / PR flip / GHE / L30–L32 reopen / L33 auto-close / mass-prune / secrets / Fundacion / …) |
| `domain-event-publisher-port.js` | `govern` / `verifyTrail` |

## Decisions exercised

- PASS: ACTIVE + valid domainEvent (eventType + aggregateId + non-empty payload) → sealed `DU-RCPT-*` (≠ outbox dispatch / ≠ tip-pin rewrite / ≠ PRODUCTION_READY flip / ≠ L33 auto-close)
- HOLD: ritualMode HOLD (observe; freeze soft-observe only)
- DENY: missing/invalid domainEvent, missing eventType/aggregateId, empty payload, outbox dispatch, tip rewrite, PR flip, GHE, Fundacion, secrets, L30/L31/L32 reopen, L33 auto-close, mass prune, auto-seal without human gate, tampered receiptHash

## Freeze honesty

- Freeze pin: `b205ce8c` / full `b205ce8cc28e94bfbf27954af745f85420c4bd4c` (PR #442 tip-honesty merge; tip-refresh-post-442 preferred soft-observe target)
- Do NOT rewrite freeze tip pins from this package
- Explicitly: no tip-refresh / no Fundacion / no CloudAgent from this package
- Formal L30+L31+L32 CLOSED retained — NEVER reopen L30/L31/L32
- L33 OPEN (Audit MEASURED · DU–DY pending) retained — refuse L33 auto-close

## NON-CLAIMS

≠ outbox dispatch (DV later) ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠ GHE ≠ L33 auto-close ≠ L30/L31/L32 reopen ≠ CloudAgent ≠ mass prune
PASS = sealed domain event publish receipt ≠ outbox dispatch ≠ PRODUCTION_READY

## Schemas

No `docs/schemas/**/*.json` added (AT_CEILING 35/35).
