# Design — Mission AP: HITL / PO Authority Channel Hardening (SPEC-0047)

## Architecture

Injectable **HITL / PO Authority Channel** sits over AI HITL + AK constitution
gate building blocks, with AJ-like ledger tip linkage and AF-like scheduler pause:

```
long-horizon action → openRequest
                    → optional constitutionGate.evaluate
                    → pause scheduler
                    → seal OPEN receipt (HITL_REQUIRED) linked to ledger tip
                    → WHILE open: tryAdvanceDependentCycle → SCHEDULER_BLOCKED
decide(approve)     → resume scheduler + AUTHORITY_APPROVED sealed receipt
decide(deny)        → DENY + forensic receipt (resume so system not wedged)
tickTimeout         → AUTHORITY_TIMEOUT DENY + forensic (never auto-approve)
```

## Injectables

| Port | Shape |
| --- | --- |
| `ledger` | AJ-like `{ tip(), append?(entry) }` |
| `scheduler` | AF-like `{ pause, resume, isPaused, advanceCycle? }` |
| `constitutionGate` | optional AK-like `{ evaluate(req) }` |
| `now` / `hash` | clock + digest |
| `receiptSealer` | optional post-seal hook |

## Fail-closed

- `HITL_REQUIRED` — open authority request (escalate)
- `AUTHORITY_DENIED` — explicit deny / constitution / Fundacion
- `AUTHORITY_TIMEOUT` — timeout → DENY (no auto-approve)
- `AUTHORITY_OPEN` — surface for consumers (AN/AO gates)
- `AUTHORITY_APPROVED` — terminal approve
- `MISSING_DEP` — ledger / scheduler absent when required
- `INVALID_REQUEST` — bad open / decide payload
- `SECRET_LEAK_FORBIDDEN` — persistSecrets into receipt/state
- `LEDGER_LINK_FAIL` — tip unavailable when ledger required
- `SCHEDULER_BLOCKED` — dependent cycle while authority open

## Law VI

- ZERO static vendor-key prefix literals in src/tests
- Synth secrets at runtime for leak tests
- `sanitizeApPayload` deep-redacts before receipts / getState
- Never put secrets in sealed receipts

## NON-CLAIM

authority ≠ GH branch-protection enforcement ≠ org IAM ≠ PRODUCTION_READY
approval SaaS; not AQ/AR; Fundacion Δ=0; Antigravity-first; CloudAgent out;
no auto-approve on timeout.

## Reuse

- AI HITL escalate patterns (threshold → HITL_REQUIRED)
- AK constitution gate (optional injectable evaluate)
- AJ ledger tip / append style (fake stub for linkage)
- AF cycle advance pause (injectable scheduler)
- AO patcher CRLF-safe slim-exclude style
