# Design — Gentleman + LIDR Ecosystem Integration Registry

## Shape

```text
docs/governance/GENTLEMAN_ECOSYSTEM_REGISTRY.json   SSOT: components, vocabulary, notices, nonClaims
        │
        ├─ scripts/lib/gentleman-ecosystem-lock.js  fail-closed audit (L0 built-ins, read-only)
        │        └─ scripts/verify-eos.js block 3g21 → npm run verify:strict
        │
        ├─ docs/architecture/adrs/ADR-0019-...md     decision record (amends ADR-0010 §4)
        ├─ .cursor/rules/gentleman-ecosystem-bridge.mdc   agent-facing doctrine
        ├─ .cursor/rules/engram.mdc                  memory protocol
        └─ tests/gentleman-ecosystem-integration.test.js  20 tests (slim-excluded, full-corpus reachable)
```

## Invariant families

| # | Invariant | Failure mode it closes |
| --- | --- | --- |
| 1 | Registry parses; every component declares the full contract | A half-filled entry reads as a decision without being one |
| 2 | Every `eosSurfaces` path resolves on disk | A stance survives the rename or deletion of the surface that implements it |
| 3 | `ARCHIVED`/`DEPRECATED` upstream cannot hold `ADOPT`/`ADAPT` | F-04: a dead project cited as a live design source |
| 4 | `vendored: true` requires a resolved SPDX license | F-08: copying from an unlicensed upstream |
| 5 | Canonical expansion attested where taught; superseded expansion absent outside declared exemptions; each exemption carries a marker pointing at the amending record | F-01: two expansions of one acronym coexisting silently |
| 6 | `requiredMarkers` resolve inside the component's own surfaces | An `ADOPT` stance asserted by an empty file |
| 7 | `notices.nonEndorsement` / `trademarks` / `vendoring` present and non-empty | F-07: trademark use with no attribution |

## Key decisions

**Why a registry rather than more prose.** The findings are the argument: nine drifts in four weeks, every one of them expressible only in prose. A registry plus a lock converts "we integrated the ecosystem" from a claim into a checked state.

**Why ADR-0010's body is not edited.** Accepted records are evidence of what was decided and when. Rewriting §4 would erase the drift instead of recording it. The exemption mechanism makes the cost of immutability explicit: an exempt path must point at the record that amends it, so the exemption cannot become a quiet hiding place.

**Why vocabulary scanning is scoped.** `tests/` holds negative fixtures that must contain superseded strings for the lock's own regression test to mean anything. `docs/evidence/` and `archive/` are immutable, so a finding there would be unfixable by design. The scan roots are exported constants, asserted by the suite, so the scope is reviewable rather than implicit.

**Why the new suite is slim-excluded.** `tests/test-runner.test.js` (TR-01) caps slim discovery at 145 and the corpus sits at exactly 145. The runner's own guidance prefers exclusion over raising the ceiling. The CI suite reachability lock from the previous change guarantees the excluded suite is still executed by `npm run test:full` and the `full-suite` job.

**Why `gga` is ADAPT and not ADOPT.** Its contract — `AGENTS.md` is the reviewable standard — is already honoured. Installing the hook would put an external AI provider call in the commit path of an L0, zero-dependency repository, and review outcomes carry no delivery authority under ADR-0010 anyway. Operators who want it run `gga install` on their own machine.

## Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Vendor the upstream skill bodies into `.agents/skills/` | Creates a fork with no sync path, and two sources are unlicensed. `RSC-0014` already implied this had happened; it had not |
| Edit ADR-0010 §4 in place | Destroys the record of the drift; accepted ADRs are evidence, not living documents |
| Add a JSON schema under `docs/schemas/` for the registry | Schema budget is `AT_CEILING 35/35` and new schemas there are FORBIDDEN. The lock performs the validation instead |
| Install the `gentle-ai` binary or the `gga` hook in-repo | ADR-0010 already refuses foreign installers; L0 purity and the clean-clone guarantee forbid it |
| Put the new suite in the slim corpus | Would breach the TR-01 ceiling of 145 |
| A `WATCH`-everything registry with no refusals | Records nothing enforceable; a refusal with a written reason is what stops silent re-import |
| Scan the whole tree for superseded vocabulary | Would flag immutable sealed receipts and the lock's own negative fixtures, producing unfixable failures |
