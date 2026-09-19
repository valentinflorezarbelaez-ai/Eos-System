# EVD — Post-L26 E SpecBoot Friction Gate (2026-09-19)

## Meta

| Field | Value |
|---|---|
| Workstream | E (ADR-0059 / ADR-0066) |
| Package | `/workspace/eos-post-l26-e-specboot-friction/` |
| Host machineId | `77c24295-69bc-4113-82ab-1d8f0359a5e7` |
| Host path | `C:\Users\valen\Documents\Eos system` |
| Host live scan | BLOCKED (prefer fixtures + host-apply) |
| HEAD context (delegated) | after C #370 ~ `4828087f` |
| Freeze tip (OBSERVED backlog) | `47cf1a79` / `47cf1a790c95f78a79e34830c4d6515d16dc67d0` |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 |
| Schemas | 35/35 AT_CEILING (unchanged; no new docs/schemas) |

## Commands (hermetic)

```bash
cd /workspace/eos-post-l26-e-specboot-friction
node --check src/core/specboot/specboot-friction-gate.js
node --check scripts/patch-post-l26-e.mjs
node --check tests/eos-post-l26-e-specboot-friction.test.js
node --test tests/eos-post-l26-e-specboot-friction.test.js
node scripts/patch-post-l26-e.mjs   # hermetic: scripts only; SLIM on host
```

## Friction items covered (inventory IDs)

F1 manual changeId copy · F2 repeated dirty check · F3 repeated HEAD/freeze check · F4 ambiguous ownership · F5 manual prereq scan · F6 stale proposal vs HEAD · F7 verify evidence path paste · F8 seal/readiness ambiguity

## Safe automation IDs

A1 prereq probe · A2 dirty probe · A3 stale probe · A4 ownership probe · A5 structured refuse · A6 preserve human seal gate · A7 preserve human prod gate

## Test matrix

| Case | Expectation |
|---|---|
| pass apply/enrich/verify/archive/commit | `ok`; `PRODUCTION_READY=NO`; `auto_seal=false` |
| missing proposal / verify_evidence | `MISSING_PREREQUISITES` |
| dirty tree / missing git | `DIRTY_STATE` or fail-closed missing git |
| stale tip / age / explicit stale | `STALE_INPUTS` |
| no owner / multi-owner | `AMBIGUOUS_OWNERSHIP` |
| autoSeal / prod flip / publish / commit sans ack | human-gate refuse codes |
| invalid step | `INVALID_STEP` |

## Surfaces

1. **NEW** `src/core/specboot/specboot-friction-gate.js`
2. **TEST** `tests/eos-post-l26-e-specboot-friction.test.js`
3. **PATCH** `scripts/patch-post-l26-e.mjs`
4. **FIXTURE** `fixtures/lidr-happy-change.json`
5. **DOCS** inventory (mermaid), ADR-0066, this EVD, release note

## NON-CLAIM

Fewer manual steps do not authorize automatic closure or a production flip.
Gate PASS ≠ L26 seal ≠ PRODUCTION_READY=YES.
