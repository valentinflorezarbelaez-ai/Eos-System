# ADR-0019: Gentleman + LIDR Ecosystem Integration Registry

* **Status:** Accepted
* **Date:** 2026-10-01
* **Author:** EOS Control Plane (conscious adoption audit; not a Constitution amendment)
* **Amends:** [ADR-0010](./ADR-0010-lidr-specboot-gentleman-discipline-bridge.md) §4 (RDD expansion) and extends it with a review-depth ladder and a machine-checked registry
* **Relates to:** [ADR-0016](./ADR-0016-engram-local-ssot-contract.md) (Engram local SSOT), [ADR-0011](./ADR-0011-harness-engineering-token-hygiene-and-anti-overengineering.md) (token hygiene)
* **Does not amend:** `CONSTITUTION.md` / `docs/core/CONSTITUTION.md`

## Context

ADR-0010 (2026-09-04) established the discipline bridge to LIDR Academy SpecBoot and Gentleman Programming. It was prose, and prose drifts. A read of both upstream organisations on 2026-10-01 found four weeks of drift against a bridge that nothing was checking:

| Finding | Evidence |
| --- | --- |
| EOS carried two incompatible expansions of **RDD**. `CONSTITUTION.md` Article I §2 says Receipt-Driven Development; ADR-0010 §4 and the `adversarial-review` skill said otherwise. Upstream canon is **Receipt**-Driven Development. | `gh api repos/Gentleman-Programming/gentle-ai/readme`, section "RDD — Check finished work at the right depth"; `grep -rn "Review-Driven" .` returned 2 governed files |
| Upstream's canonical high-depth review lens set, **4R = Risk, Resilience, Readability, Reliability**, was absent from EOS. `/adversarial-review` had no depth model at all. | `grep -rn "\b4R\b" --include=*.md --include=*.mdc .` returned zero hits |
| **ODD (Organic Driven Development)** is now a named upstream workflow with a specific contract. ADR-0010 §2 described "organic routing" generically and never mapped the contract. | `gentle-ai` README section "ODD — Keep small work small" |
| `docs/rules/ARCHITECTURE_RULES.md` §2 attributed the nine-role subagent topology to `agent-teams-lite`, which upstream has **archived and deprecated** in favour of `gentle-ai`. | `gh api repos/Gentleman-Programming/agent-teams-lite --jq .archived` → `true` |
| `.cursor/rules/engram.mdc` was a two-line stub naming 3 of 16 `mem_*` tools, with no memory protocol, no observation shape, no stable `topic_key` guidance, and no compaction-handoff ordering — while the MCP server was already configured and paid for in `.cursor/mcp.json`. | file contents before this change; `engram` README "For agents" protocol |
| `RSC-0014` (2026-08-11) recorded Gentleman-Skills as ADOPT with bodies "loaded into EOS `.agents/skills/`", named the repository `gentleman-skills` (actual: `Gentleman-Skills`), and carried no license, trademark, or upstream-status field. No upstream skill body exists in this repository. | `ls .agents/skills/`; `gh api repos/Gentleman-Programming/Gentleman-Skills` |
| Upstream MIT licensing "does not permit implying endorsement or official affiliation", and Gentle AI and Engram are trademarks. EOS referenced both marks across rules and docs with no notice. | `gentle-ai` README trademark notice; `TRADEMARKS.md` upstream |
| Two upstream repositories declare **no license** (`gentleman-architecture-agents`, `manual-SDD`). Nothing recorded that constraint, so a future agent could vendor from them. | `gh api repos/<r> --jq '.license.spdx_id'` → `null` |

The pattern is the same one Mission CI found in the CI harness: the gates declared more than they enforced. An integration asserted only in prose is an integration that silently decays.

## Decision

### 1. One machine-checked registry is the SSOT

`docs/governance/GENTLEMAN_ECOSYSTEM_REGISTRY.json` records, per upstream component: `upstream`, `license`, `upstreamStatus`, `eosStance`, `vendored`, `installedByEos`, `rationale`, `eosSurfaces`, and optional `requiredMarkers`. It also pins the shared `vocabulary` and the attribution `notices`.

Stances are a closed set:

| Stance | Meaning |
| --- | --- |
| `ADOPT` | Consumed at runtime as an external dependency; never vendored, never installed by EOS |
| `ADAPT` | The concept is mapped onto EOS surfaces; no upstream body is imported |
| `REFUSE` | Explicitly declined, with the reason recorded so it cannot be re-imported silently |
| `WATCH` | Observed, deliberately not integrated; revisit requires a new decision record |

### 2. The registry is enforced fail-closed

`scripts/lib/gentleman-ecosystem-lock.js` runs inside `npm run verify:strict` and fails on: an incomplete component contract, a declared surface that does not exist, an `ADOPT`/`ADAPT` stance on an `ARCHIVED` or `DEPRECATED` upstream, `vendored: true` against a `NOASSERTION` license, a canonical expansion missing from the surface that is supposed to teach it, a superseded expansion appearing anywhere in the governed tree outside a declared exemption, an exemption without a pointer to its amending record, a `requiredMarkers` entry absent from every surface, or a missing attribution notice.

Vocabulary exemptions exist so accepted records stay byte-stable. Each exemption must declare a `reason` and a `requiresMarker` that points at the amending ADR, which is why ADR-0010 now carries an **Amended by** header instead of an edited body.

### 3. RDD is Receipt-Driven Development

The expansion in `CONSTITUTION.md` Article I §2 is canonical and matches upstream. ADR-0010 §4's reading is superseded. The substance of ADR-0010 §4 is unchanged and reaffirmed: **independent review is INFORMATIONAL and carries no delivery authority.**

RDD adds two operational rules EOS did not have:

1. **Freeze before reading.** Review a committed revision plus its `git diff`, never a live worktree that can shift mid-review, so the evidence belongs to the exact revision being relied upon.
2. **Depth from the candidate, not from the reviewer's mood.** Passive depth gets a structural readback with zero lenses; medium depth gets one lens chosen by the dominant risk; high depth gets all four 4R lenses — Risk, Resilience, Readability, Reliability. At most one bounded correction per review transaction.

### 4. ODD is the default workflow; SDD is a branch inside it

ODD, as mapped in `.cursor/rules/gentleman-ecosystem-bridge.mdc`: stay read-only until a change is authorised; explore before editing; route by understanding rather than line count; give substantial authorised work one recoverable document, which in EOS is the OpenSpec change directory and never an ad-hoc scratch file; implement task by task; close with observed evidence.

This is the same rule ADR-0010 §2 stated as DIRECT-versus-SDD routing, now named and given its upstream contract. ADR-0010 §2 remains the authority on *when* SDD is mandatory.

### 5. Attribution is a hard requirement

Every surface that teaches this bridge states that EOS is independent, that the integration implies no endorsement or official affiliation, and that Gentle AI and Engram are trademarks of Alan Buscaglia. No upstream file body is vendored: every component declares `vendored: false`, and the lock refuses vendoring from an unlicensed upstream.

### 6. Refusals, recorded

| Upstream | Stance | Reason |
| --- | --- | --- |
| `gentle-ai` binary as an in-repo installer | REFUSE (ADR-0010) | No foreign installer in an L0 repository; operators may run it on their own machine |
| `gga` hook installation | ADAPT, not installed | `AGENTS.md` stays the reviewable standard; a commit-path hook calling an external provider is an unreviewed network dependency |
| `agent-teams-lite` | REFUSE | Upstream archived and deprecated; not a live design source |
| `gentleman-architecture-agents` | REFUSE | No upstream license, and Scope Rule is frontend placement — NON-core per ADR-0010 §4.3 |
| `Gentleman.Dots` | REFUSE | Workstation configuration, out of scope for a control plane |
| `gentle-shell` | WATCH | Requires the Pi runtime; a second harness would fork authority from `bin/eos.js` |
| `manual-SDD` | WATCH | No upstream license; reference reading only |

## Consequences

### Positive

- A stance that points at a deleted surface, an archived upstream, or drifted vocabulary now fails `verify:strict` instead of ageing quietly in prose.
- `/adversarial-review` has a depth model, so low-risk changes stop paying for a four-lens review and high-risk changes stop getting a one-paragraph skim.
- The Engram capability EOS already configured is now actually usable from the rule surface.
- Refusals are recorded with reasons, so re-importing a refused component requires arguing against a written decision.

### Negative

- The registry's `license` and `upstreamStatus` are point-in-time observations. They can go stale; the lock checks internal consistency, not upstream reality.
- One more always-applied Cursor rule, against ADR-0011 token hygiene. Accepted because it replaces guidance that was absent or wrong, and because `engram.mdc` grew by roughly 35 lines while closing a 16-tool gap.

### Reversal

A later ADR may change any stance. Reversal must update the registry in the same change, must not silently re-import a `REFUSE` component, and must not weaken the attribution notices, which exist for license compliance rather than for style.

## Non-claims

- **Registry ≠ integration.** This ADR records stances and surfaces. It installs nothing, executes nothing, and vendors nothing.
- **No endorsement.** Neither upstream organisation reviewed, approved, or endorsed this integration.
- **Not continuously synchronised.** Upstream status is re-read by a human or agent running the recorded `gh api` command, not by the lock.
- **Review still carries no delivery authority.** 4R depth changes how thoroughly a change is read, never who may merge it.
