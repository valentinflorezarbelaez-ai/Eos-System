# Proposal — Gentleman + LIDR Ecosystem Integration Registry

## Why

ADR-0010 (2026-09-04) declared the bridge to the Gentleman Programming and LIDR Academy ecosystems in prose. Nothing checked it. A direct read of both upstream organisations on 2026-10-01 found that four weeks had already produced drift:

- EOS carried **two incompatible expansions of RDD**. `CONSTITUTION.md` Article I §2 says Receipt-Driven Development; ADR-0010 §4 and the `adversarial-review` skill said otherwise. Upstream canon matches the Constitution, so an accepted ADR and the supreme document disagreed on a core acronym.
- Upstream's **4R review lens set** (Risk, Resilience, Readability, Reliability) was absent; `/adversarial-review` had no depth model, so a typo fix and a new security boundary paid the same review cost.
- **ODD** is now a named upstream workflow with a concrete contract; ADR-0010 described it generically and never mapped the obligations.
- `docs/rules/ARCHITECTURE_RULES.md` attributed the nine-role topology to **`agent-teams-lite`, which upstream archived and deprecated**.
- `.cursor/rules/engram.mdc` was a six-line stub naming **3 of 16** `mem_*` tools, with no protocol, while `.cursor/mcp.json` already declares the server.
- **No attribution notice existed** anywhere, although upstream MIT licensing does not permit implying endorsement or official affiliation and both Gentle AI and Engram are trademarks.
- Two upstream repositories declare **no license**, and nothing recorded that they must never be vendored.

Every one of those is a prose claim that decayed because nothing could fail.

## What changes

- `docs/governance/GENTLEMAN_ECOSYSTEM_REGISTRY.json` (new) is the integration SSOT: 10 components across both organisations, each with `upstream`, `license`, `upstreamStatus`, `eosStance`, `vendored`, `installedByEos`, `rationale`, `eosSurfaces` and optional `requiredMarkers`, plus the pinned `vocabulary`, the attribution `notices`, and the `nonClaims`.
- `scripts/lib/gentleman-ecosystem-lock.js` (new) is wired into `verify-eos --strict`, fail-closed on seven invariant families: registry shape, surface existence, `ADOPT`/`ADAPT` on an archived upstream, `vendored: true` against `NOASSERTION`, vocabulary integrity with amendment-pointing exemptions, required markers, attribution notices.
- `docs/architecture/adrs/ADR-0019-...md` (new) amends ADR-0010 §4 and records the stances, the RDD freeze-and-depth rules, the ODD mapping, and the refusals.
- `docs/architecture/adrs/ADR-0010-...md` gains an `Amended by` header; its body stays byte-stable as an accepted record.
- `.cursor/rules/gentleman-ecosystem-bridge.mdc` (new) teaches the vocabulary, ODD routing, the RDD depth ladder, and the refused imports, with the non-endorsement and trademark notice.
- `.cursor/rules/engram.mdc` is rewritten into a real memory protocol: tools by intent, six-step protocol, observation shape, stable `topic_key`, compaction ordering, and three hard limits.
- `.agents/skills/adversarial-review/SKILL.md` corrects the RDD expansion and gains the depth ladder with the one-bounded-correction limit.
- `docs/rules/ARCHITECTURE_RULES.md` §2 is retitled to EOS with an explicit note that the archived upstream is not a live source.
- `tests/gentleman-ecosystem-integration.test.js` (new, 22 tests) is registered in `SLIM_SUITE_EXCLUDES` because slim discovery sits at the TR-01 ceiling, and stays reachable through `npm run test:full`.
- `docs/audits/GENTLEMAN_ECOSYSTEM_INTEGRATION_AUDIT_2026-10-01.md` (new) records the nine findings with their measurement commands.

## What does not change

- No upstream file body is vendored. Every component declares `vendored: false`.
- No foreign installer, binary, hook, or theme enters the repository. `installedByEos` is `false` everywhere.
- L0 purity holds: the lock uses Node built-ins only and never touches the network.
- `Fundacion` stays at Δ=0. `PRODUCTION_READY` stays `NO`. The schema ceiling is untouched: the registry lives under `docs/governance/`, which the complexity budget does not count.
- ADR-0010 §2 remains the authority on when SDD is mandatory, and review outcomes remain INFORMATIONAL with no delivery authority.

## Non-claims

- **Registry ≠ runtime integration.** Stances and surfaces are recorded; nothing is installed, executed, or vendored.
- **Point-in-time observation.** `license` and `upstreamStatus` were read once via `gh api`; the lock audits internal consistency, not upstream reality.
- **No endorsement.** Neither upstream organisation reviewed, approved, or endorsed this integration.
- **Markers prove presence, not correctness.** The lock raises the floor; it does not replace review.
