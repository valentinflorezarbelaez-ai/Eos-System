# Evidence — Mission DH Quarantine / Soft-Remove Execution Port (SPEC-0117)

- **Date:** 2026-09-24 (America/Bogota)
- **Status:** MISSION_DH_CODE_READY
- **PRODUCTION_READY:** NO
- **Fundacion Δ:** 0

## Hermetic verification (box)

```bash
npm run test:mission-dh
# tests 17
# pass 17
# fail 0
```

```bash
npm run verify:strict
# Checks Passed: 914 | Failures: 0
# STATUS: VERIFIED — All checks passed cleanly.
```

## Modules

| Module | Role |
| --- | --- |
| `quarantine-execution-receipt.js` | `DH-RCPT-*` nine-field seal + freeze soft-observe (`06af7278`) + `quarantinedPaths` + `manifestDigest` + `ceilingHold` |
| `quarantine-execution-policy-gate.js` | Fail-closed preconditions (DG receipt linkage / hard-delete refuse / unapproved path refuse / mass-prune refuse / tip-pin / PR flip / GHE / L30 / L29 / Fundacion / Law VI refuse) |
| `quarantine-execution-port.js` | `govern` / `verifyTrail` / non-destructive file relocation into `.quarantine/<date>/` |

## Decisions exercised

- PASS: ACTIVE + valid DG receipt + namedPaths allowlist strictly respected → safe relocation + manifest digest + sealed receipt
- HOLD: executionMode HOLD (observe; zero file mutations)
- DENY: hard-delete flags (`forceDelete`, `purge`), mass-prune, unapproved paths, missing DG receipt, secrets (Law VI), Fundacion target, PR flip, L29 reopen, auto-seal without human gate

## Freeze honesty

- Freeze pin: `06af7278` / full `06af7278d6bdf3b55c65a044bfb22ce93e6205cf` (soft-observe read-only)
- Do NOT rewrite freeze tip pins from this package
- Explicitly: no tip-refresh / no Fundacion / no CloudAgent from this package
- Formal L29 CLOSED retained — NEVER reopen L29
- L30 OPEN (Audit + DF MEASURED + DG GATED · DH–DJ pending)

## NON-CLAIMS

≠ destructive delete ≠ mass prune ≠ Fundacion Δ>0 ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ L29 reopen ≠ L30 auto-close ≠ GHE ≠ CloudAgent
Soft quarantine relocation only; zero data destruction.

## Schemas

No `docs/schemas/**/*.json` added (AT_CEILING 35/35).
