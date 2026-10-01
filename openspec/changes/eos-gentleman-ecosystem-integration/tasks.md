# Tasks — Gentleman + LIDR Ecosystem Integration Registry

## Audit (read-only)

- [x] Enumerate both upstream organisations with `gh api orgs/<org>/repos`
- [x] Record per-component license, archived flag and last push with `gh api repos/<owner>/<repo>`
- [x] Read the `gentle-ai`, `engram`, `Gentleman-Skills`, `agent-teams-lite`, `gga`, `lidr-specboot` and `manual-SDD` READMEs
- [x] Measure EOS-side claims with `grep` (RDD expansions, 4R, `agent-teams-lite`, Engram tool coverage)
- [x] Confirm the schema ceiling and complexity counting rule do not apply to `docs/governance/`

## Build

- [x] `docs/governance/GENTLEMAN_ECOSYSTEM_REGISTRY.json` — 10 components, vocabulary, notices, non-claims
- [x] `scripts/lib/gentleman-ecosystem-lock.js` — seven invariant families, L0 built-ins, read-only
- [x] Wire block 3g21 into `scripts/verify-eos.js`
- [x] `tests/gentleman-ecosystem-integration.test.js` — 22 tests including three temp-dir negative fixtures
- [x] Register the suite in `SLIM_SUITE_EXCLUDES` (TR-01 ceiling held at 145)

## Remediate the findings

- [x] F-01 — correct the RDD expansion in `.agents/skills/adversarial-review/SKILL.md`; add the `Amended by` header to ADR-0010 without touching its body
- [x] F-02 — record the 4R depth ladder in ADR-0019, the bridge rule and the skill
- [x] F-03 — map the ODD contract onto EOS primitives in ADR-0019 §4 and the bridge rule
- [x] F-04 — retitle `docs/rules/ARCHITECTURE_RULES.md` §2 and attribute the archived upstream honestly
- [x] F-05 — rewrite `.cursor/rules/engram.mdc` into the full memory protocol
- [x] F-06 — supersede the RSC-0014 skills claim in the registry without editing the research record
- [x] F-07 — require and enforce the non-endorsement, trademark and vendoring notices
- [x] F-08 — reject `vendored: true` against a `NOASSERTION` license
- [x] F-09 — bind the whole integration fail-closed in `verify:strict`

## Document

- [x] `docs/architecture/adrs/ADR-0019-gentleman-ecosystem-integration-registry.md`
- [x] `.cursor/rules/gentleman-ecosystem-bridge.mdc`
- [x] `docs/audits/GENTLEMAN_ECOSYSTEM_INTEGRATION_AUDIT_2026-10-01.md` — nine findings with measurement commands and residual risk
- [x] This OpenSpec package (`proposal.md`, `design.md`, `tasks.md`, `.openspec.yaml`)

## Verify (self-executed, recorded)

- [x] `node scripts/lib/gentleman-ecosystem-lock.js` audit → 14 checks / 0 failures / 10 components
- [x] `node --test tests/gentleman-ecosystem-integration.test.js` → 22 pass / 0 fail
- [x] `npm run verify:strict` → 937 checks / 0 failures (was 923)
- [x] `npm test` → 145 suites, TR-01 ceiling unchanged
- [x] `npm run test:full` → 321 suites / 4221 tests / 0 fail
- [x] `node scripts/ci/assert-gha-contract.js` → VERIFIED
- [x] `git diff --exit-code -- Fundacion` → Δ=0
- [ ] PR review + merge — no `PRODUCTION_READY` flip; GHA stays BILLING_BLOCKED; upstream status remains a point-in-time observation
