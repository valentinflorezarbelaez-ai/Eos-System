# Design — eos-mission-b-sensor-mutation-fortify

## Scope

Scoped mutation fortification for three high-value false-positive sensors. Prefer proving gaps with mutation-style tests; apply minimal fail-closed hardening only where RED proves a hole. Do **not** mutate all 914 verify checks.

## Surfaces under mutation

| Sensor | Mutation / fixture | Fail-closed expectation |
| --- | --- | --- |
| V5 `assertBuilderVerifierDisjunction` | ZWSP / ZWNJ / BOM / bidi format chars spoofing same token; inverted allow-all mutant | `BUILDER_EQUALS_VERIFIER_VIOLATION` (production); mutant would incorrectly PASS |
| U7 `auditSpecbootDeferStubsLock` must-not-invent | Temp root invents `docs/frontend-standards.md` (or sibling forbidden paths) | audit `ok:false` with must-not-invent failure; inverted "exists ⇒ OK" mutant would PASS |
| T8 Dirty DEFER gate NON-MUTATING | Snapshot tracked paths around gate; strip `NON-MUTATING` needle from ritual text | gate exit 0 + no tree mutation; stripped ritual ⇒ audit `ok:false` |

## Hardening policy

- Strengthen only; do not loosen V5 / U7 / T8 production checks.
- Strip Unicode format / zero-width / control characters from custody identities before compare (spoofed same token).
- No new `src/core` modules; no new npm deps; AT_CEILING.
- Do not expand verify-eos REQUIRED_PATHS (preserve 914 check count).

## Invariants

AT_CEILING; PRODUCTION_READY=NO; Fundacion Δ=0; no CloudAgent; Tier 1/2 only.
