# Gentleman + LIDR Ecosystem Integration Audit

**Date:** 2026-10-01
**Scope:** `https://github.com/Gentleman-Programming`, `https://github.com/LIDR-academy`, `https://gentlemanprogramming.com/` versus the EOS integration surface claimed by ADR-0010 (2026-09-04)
**Status:** `AUDIT_EXECUTED` → `FINDINGS_IDENTIFIED` → remediated and `VERIFIED` by `npm run verify:strict`
**Decision record:** [ADR-0019](../architecture/adrs/ADR-0019-gentleman-ecosystem-integration-registry.md)
**PRODUCTION_READY:** NO

## Method

Upstream state was read directly, not recalled:

```bash
gh api "orgs/Gentleman-Programming/repos?per_page=100&sort=updated" \
  --jq '.[] | "\(.name)\t\(.stargazers_count)\t\(.language)\t\(.description)"'
gh api "orgs/LIDR-academy/repos?per_page=100&sort=updated" --jq '...'

# per component: license, archived flag, default branch, last push
gh api "repos/<owner>/<repo>" \
  --jq '[.full_name, (.license.spdx_id // "NOASSERTION"), (if .archived then "ARCHIVED" else "ACTIVE" end), .default_branch, (.pushed_at|split("T")[0])] | @tsv'

# README bodies, decoded locally
gh api "repos/<owner>/<repo>/readme" --jq '.content' | base64 -d
```

The landing page was fetched for the stack narrative. EOS-side claims were then measured with `grep` against the working tree at commit `b42fbe32`.

Observed upstream state:

| Repository | License | Status | Last push |
| --- | --- | --- | --- |
| `Gentleman-Programming/gentle-ai` | MIT | ACTIVE | 2026-09-30 |
| `Gentleman-Programming/engram` | MIT | ACTIVE | 2026-09-30 |
| `Gentleman-Programming/gentle-shell` | MIT | ACTIVE | 2026-09-30 |
| `Gentleman-Programming/gentleman-guardian-angel` | MIT | ACTIVE | 2026-07-08 |
| `Gentleman-Programming/Gentleman-Skills` | MIT | ACTIVE | 2026-03-28 |
| `Gentleman-Programming/gentleman-architecture-agents` | NOASSERTION | ACTIVE | 2026-07-13 |
| `Gentleman-Programming/Gentleman.Dots` | Apache-2.0 | ACTIVE | 2026-09-29 |
| `Gentleman-Programming/agent-teams-lite` | MIT | **ARCHIVED** | 2026-03-26 |
| `LIDR-academy/lidr-specboot` | MIT | ACTIVE | 2026-07-21 |
| `LIDR-academy/manual-SDD` | NOASSERTION | ACTIVE | 2026-04-14 |

## Findings

### F-01 — Two incompatible expansions of RDD inside EOS (HIGH)

`CONSTITUTION.md` Article I §2 defines RDD as Receipt-Driven Development. Two governed surfaces defined it as Review-Driven Development: `docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md` §4 and `.agents/skills/adversarial-review/SKILL.md`. Upstream canon is Receipt-Driven Development (`gentle-ai` README, section "RDD — Check finished work at the right depth"), so the Constitution was right and the bridge had drifted. The supreme document and an accepted ADR disagreeing on a core acronym is a governance defect, not a wording preference.

```text
$ grep -rn "Review-Driven" --include=*.md --include=*.mdc --include=*.json .
.agents/skills/adversarial-review/SKILL.md:13
docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md:115
```

**Remediation.** The skill is live guidance and was corrected in place. ADR-0010 is an accepted record and keeps its body byte-stable; it now carries an `Amended by: ADR-0019` header, and the registry declares it as a vocabulary exemption that must point at the amending record.

### F-02 — The 4R review lens set was absent (MEDIUM)

Upstream applies four named lenses at high review depth: Risk, Resilience, Readability, Reliability. EOS had zero occurrences, and `/adversarial-review` had no depth model at all, so a typo fix and a new security boundary received the same review ceremony.

```text
$ grep -rn "\b4R\b" --include=*.md --include=*.mdc .
(no output)
```

**Remediation.** The depth ladder (passive → structural readback; medium → one lens; high → all four) is recorded in ADR-0019 §3, taught in `.cursor/rules/gentleman-ecosystem-bridge.mdc`, and operationalised in the `adversarial-review` skill, including the upstream limit of one bounded correction per review transaction.

### F-03 — ODD was never mapped as a named workflow (MEDIUM)

ADR-0010 §2 described "organic routing" generically. Upstream has since named it Organic Driven Development with a specific contract: stay read-only until a change is authorised, explore before editing, keep understood work lightweight, give substantial authorised work one recoverable feature document, implement task by task, close with observed evidence.

**Remediation.** ADR-0019 §4 maps each ODD obligation onto an EOS primitive, binding "one recoverable feature document" to the OpenSpec change directory rather than an ad-hoc scratch file.

### F-04 — Stale attribution to an archived upstream (MEDIUM)

`docs/rules/ARCHITECTURE_RULES.md` §2 titled the nine-role subagent topology "agent-teams-lite L0". Upstream archived and deprecated that repository in favour of `gentle-ai`; its README says "This project has been deprecated" and the GitHub archived flag is `true`. EOS was citing a dead project as a live design source.

```text
$ gh api repos/Gentleman-Programming/agent-teams-lite --jq '.archived'
true
```

**Remediation.** The section is retitled "9-Subagent Topology (EOS L0)" with an explicit attribution note. The registry records the component as `ARCHIVED` with stance `REFUSE`, and the lock now fails if any archived upstream is given an `ADOPT` or `ADAPT` stance.

### F-05 — The Engram rule under-served a configured capability (MEDIUM)

`.cursor/rules/engram.mdc` was six lines naming 3 of the 16 documented `mem_*` tools, with no memory protocol, no durable observation shape, no stable `topic_key` guidance, and no compaction-handoff ordering — while `.cursor/mcp.json` already declares the server. The compaction ordering matters: upstream requires persisting the handoff with `mem_session_summary` **before** calling `mem_context`, and the stub taught the reverse by omission.

**Remediation.** The rule now carries the tool-by-intent table, the six-step protocol, the What/Why/Where/Learned observation shape, stable topic keys, and three hard limits (memory is not evidence, Law VI applies, memory is not authority).

### F-06 — RSC-0014 recorded an integration that did not exist (LOW)

The 2026-08-11 benchmark recorded Gentleman-Skills as `ADOPT` with bodies "loaded into EOS `.agents/skills/` directory". No upstream skill body exists in this repository. It also names the repository `gentleman-skills` (actual: `Gentleman-Skills`) and carries no license, trademark, or upstream-status field.

**Remediation.** The registry supersedes RSC-0014 as the integration SSOT and records the honest stance: `ADAPT` of the portable `<skill-name>/SKILL.md` layout, `vendored: false`. RSC-0014 remains a research record and is not retroactively edited.

### F-07 — No attribution or trademark notice (MEDIUM, compliance)

Upstream states that the MIT license "does not permit implying endorsement or official affiliation", and that the Gentle AI and Engram names and logos are trademarks of Alan Buscaglia. EOS referenced both marks across rules, docs and research records with no notice anywhere.

**Remediation.** `notices.nonEndorsement`, `notices.trademarks` and `notices.vendoring` are required registry fields; the lock fails if any is missing or empty, and additionally fails if the non-endorsement text does not actually mention endorsement. The bridge rule repeats the notice on the surface agents read.

### F-08 — Unlicensed upstream could have been vendored (LOW)

`gentleman-architecture-agents` and `manual-SDD` declare no license. Nothing recorded that constraint.

**Remediation.** Both are registered with their `NOASSERTION` license, and the lock rejects `vendored: true` against a `NOASSERTION` license. Today every component declares `vendored: false`, so the rule guards the future rather than fixing a present violation.

### F-09 — The integration had no fail-closed binding (HIGH)

Every item above was expressible only in prose, which is why four weeks produced six drifts. Nothing could fail.

**Remediation.** `scripts/lib/gentleman-ecosystem-lock.js` runs inside `npm run verify:strict` and enforces seven invariant families: registry shape, surface existence, dead-upstream stance, vendoring license, vocabulary integrity with amendment-pointing exemptions, required markers, and attribution notices.

## Before and after

| Gate | Before | After |
| --- | --- | --- |
| `npm run verify:strict` | `Checks Passed: 923` / `Failures: 0` | `Checks Passed: 937` / `Failures: 0` |
| Ecosystem lock | did not exist | `checks=14` / `failures=0` / `components=10` |
| Ecosystem suite | did not exist | 22 tests, 3 negative fixtures, 0 failures |
| Governed files carrying a superseded RDD expansion | 2 | 0 outside declared exemptions |
| `mem_*` tools documented in `engram.mdc` | 3 of 16 | 11 named, all 16 reachable by intent |
| Review depth levels available to `/adversarial-review` | 0 | 3 |
| Registered upstream components with license and status | 0 | 10 |
| `npm run test:full` | 320 suites, 4201 tests, 0 failures | 321 suites, 4221 tests, 0 failures (14 pre-existing skips) |
| `npm test` (slim) | 145 suites, 1456 tests, 0 failures | unchanged — TR-01 ceiling held |

## Residual risk

- **Point-in-time observation.** `license` and `upstreamStatus` were read once. The lock checks internal consistency, never upstream reality; refreshing requires re-running the recorded `gh api` command.
- **Vocabulary scope is declared, not universal.** `tests/`, `docs/evidence/` and `archive/` are excluded from the vocabulary scan: negative fixtures legitimately contain superseded strings, and sealed receipts plus archived records are immutable, so a finding there would be unfixable by design.
- **Marker checks prove presence, not correctness.** A surface can contain the right phrase in a wrong sentence. The lock raises the floor; it does not replace review.
- **Attribution is best-effort.** The notices reflect the upstream terms as published on 2026-10-01. A license or trademark change upstream will not be detected automatically.
- **One more always-applied rule.** Two always-on Cursor rules grew. This is a token-hygiene cost accepted in ADR-0019 against guidance that was previously absent or wrong.
