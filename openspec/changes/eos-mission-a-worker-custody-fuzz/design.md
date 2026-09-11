# Design — eos-mission-a-worker-custody-fuzz

## Scope

Adversarial fuzz coverage for SPEC-0008 worker helpers and V5 custody disjunction. Prefer proving gaps with tests; apply minimal fail-closed hardening only where RED proves a hole.

## Surfaces under test

| Surface | Adversarial cases | Fail-closed expectation |
| --- | --- | --- |
| `parseCheckboxTasks` | malformed MD, unclosed `[`, unicode text, embedded `../` / absolute / null-byte path fragments | no throw on benign garbage; **reject** traversal/null-byte task paths (`PATH_TRAVERSAL_REJECTED` / equivalent); never escape allow roots |
| `assertWritePathsInScope` | `..`, absolute, encoded-ish traversal siblings | `OUT_OF_SCOPE_WRITE` |
| `assertBuilderVerifierDisjunction` | identical ids, case/whitespace collision, invisible/format-char spoof of same token | `BUILDER_EQUALS_VERIFIER_VIOLATION` (or existing missing/placeholder codes) |
| `executeComputeRun` + `rollbackDiff` | verifier child `ok:false` after apply dirties a simulated tree | status `ROLLED_BACK`; simulated tree matches pre-apply snapshot; no dirty residuals |

## Hardening policy

- Strengthen only; do not loosen V5 production checks.
- Strip Unicode format / zero-width characters from custody identities before compare (spoofed same token).
- Reject task texts that embed path traversal / null bytes during checkbox parse (fail-closed).
- No new `src/core` modules beyond existing custody file; no new npm deps; AT_CEILING.

## Invariants

AT_CEILING; PRODUCTION_READY=NO; Fundacion Δ=0; no CloudAgent.
