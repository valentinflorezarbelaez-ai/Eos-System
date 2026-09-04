# ADR-0010: LIDR Specboot + Gentleman Discipline Bridge

* **Status:** Accepted
* **Date:** 2026-09-04
* **Author:** EOS Control Plane (conscious adoption; not a Constitution amendment)
* **Supersedes:** none (interprets existing SDD claims; does not replace PAT-0001 or the 21-step pipeline)
* **Does not amend:** `CONSTITUTION.md` / `docs/core/CONSTITUTION.md` (PO approval required for any Constitution mutation)

## Context

The Control Plane already *claims* LIDR / OpenSpec / Specboot alignment:

- OpenSpec artifact names (`proposal.md` → `spec.md` → `design.md` → `tasks.md`) in `.cursor/rules/` and `docs/specs/`
- LIDR cycle mentions in `docs/core/WORLD_CLASS_ENGINEERING_PIPELINE.md` (`/enrich-us`)
- A synthetic adapter and tests in `scripts/engine/spec-driven-product-loop.js` / `tests/spec-driven-product-loop.test.js`
- Gentleman / Engram research in `docs/intelligence/research/RSC-0014-gentleman-ecosystem-benchmark.json` (`ADAPT` for SDD, `ADAPT` for Gentle-AI)

What was missing as a **single decision** (verified 2026-09-04):

- No ADR that states *when* SDD is mandatory versus a direct change
- No `docs/base-standards.md` SSOT index (claimed, not present)
- No `openspec/` runtime layout and no `ai-specs/` role pack
- Operator docs did not tell humans the DIRECT vs SDD rule

The Product Owner asked for **conscious, precise adoption** of LIDR Academy Specboot + Gentleman Programming doctrine — not a blind copy of Engram, the gentle-ai Go installer, theme packs, dogmatic coverage quotas, or LIDR English-only operator policy.

This ADR is the discipline bridge. Runtime scaffolding (`openspec/`, `ai-specs/`, slash-command docs) is a follow-on change and must not invent new orchestrator engines.

## Decision

### 1. Default SDD ceremony for substantial changes

For **substantial** Control Plane or authorized target-project changes, the default specification ceremony is the LIDR Specboot + OpenSpec cycle:

```text
/enrich-us → /ff | /propose → /apply → /verify → /adversarial-review → /archive → /commit
```

| Step | Intent | EOS mapping (existing; do not invent a new engine) |
| --- | --- | --- |
| `/enrich-us` | JTBD, value hypothesis, `NO_BUILD` if no job | Pipeline steps 1–4 |
| `/ff` or `/propose` | OpenSpec envelope: proposal, specs, design, tasks | Pipeline steps 5–7; `docs/specs/` |
| `/apply` | Smallest task, TDD, one purpose | Pipeline steps 8–9 |
| `/verify` | Independent evidence against the spec | Evidence gate; BUILDER ≠ VERIFIER |
| `/adversarial-review` | Informational red-team / RDD | Meta-governance; does **not** ship |
| `/archive` | Merge spec deltas; record learning | Pipeline steps 16–17, 20 |
| `/commit` | Human / write-barrier authorized git commit | Git + HITL + Article III barrier |

Canonical OpenSpec filenames remain `proposal.md`, `spec.md`, `design.md`, `tasks.md`. Existing specs stay under `docs/specs/`. A later OpenSpec runtime may add `openspec/changes/` without relocating historical specs.

Slash-command names are **operator vocabulary**. They must not replace or break `node bin/eos.js` / `npm run eos:mission`.

### 2. Organic routing (DIRECT vs SDD)

Gentleman organic routing: take the **smallest route that is still honest**. File/diff size alone must not force SDD ceremony.

**Use DIRECT** when all of the following hold:

- The human asked for a local, already-scoped fix **or** the change is docs/formatting/comments/typos
- No new subsystem, public contract, state machine, or governance surface
- No external / target-project write
- Existing tests (if any) remain the evidence path

**Use SDD** (the Specboot cycle above) when any of the following hold:

- The human explicitly requests SDD, OpenSpec, Specboot, or a proposal
- A proposal has already been accepted
- New feature, non-trivial refactor, new subsystem, or architectural trade-off
- External project writes (SDD **and** Constitution Article III write barrier)
- New or changed public contracts, schemas, or mission FSM phases

`NO_BUILD` remains valid: if there is no user job-to-be-done, do not open a change.

This interprets `.cursorrules` §4 (“No Premature Code”) and `.cursor/rules/01-eos-engineering-doctrine.mdc`: OpenSpec is required for substantial work; it is not a tax on every one-line fix.

### 3. Strict TDD evidence for `/apply` and `/verify`

When tests already exist, or the change adds behavior:

```text
RED → GREEN → TRIANGULATE → REFACTOR
```

| Phase | Required evidence |
| --- | --- |
| RED | Failing test (or failing check) that names the behavior — recorded command output |
| GREEN | Minimal implementation that turns that test green |
| TRIANGULATE | A second example or negative case so the implementation is not a one-off cheat |
| REFACTOR | Structure cleanup with the suite still green |

`/apply` must leave **auditable** evidence (`node --test` on the touched files, or `npm run verify` / `verify:strict` when the change is in the verifier’s contract). Narrative “looks correct” is `NOT VERIFIED`.

`/verify` is a **separate** act from `/apply`. The builder must not self-certify. Aligns with `docs/governance/META_GOVERNANCE_ENGINE.md` (verifier independence) and `docs/governance/EOS_INDEPENDENT_EMPIRICAL_VALIDATION_STANDARD.md`:

```text
EXECUTOR != EVIDENCE PRODUCER != VERIFIER != VALIDATOR
```

Coverage is **risk-based**. Do not invent a dogmatic 90% quota. Do not delete or weaken tests to obtain green.

### 4. RDD — independent review is not delivery authority

Review-Driven Development (Gentleman / GGA-style `/adversarial-review`, independent audit, subagent REDTEAM) produces an **INFORMATIONAL** outcome.

Independent review **does not authorize delivery**. The following remain under human Product Owner / HITL / EOS write-barrier authority:

- `git commit` on shared branches (agents may commit on an assigned feature branch per operating rules; merge to `main` is human)
- Pull-request merge
- Release, tag, or production deploy
- External / `PRJ-FUNDACION` writes (`Δ = 0` unless a recorded authorization exists)
- Constitution, policy-engine, or autonomy-level changes

This is RDD aligned with Constitution **Article III** (external write barrier) and **Article IV** (autonomy ≠ write-anywhere), plus `R-HITL-01` / `R-BOUNDARY-01`.

### 5. NON-goals (explicitly refused wholesale imports)

EOS **does not** import the following as-is:

| Refused import | Why |
| --- | --- |
| Blind Engram copy | Memory protocol may stay adapted (`engram.mdc`); it is not evidence and must not replace `docs/evidence/` |
| gentle-ai Go installer | No foreign installer, theme pack, or agent-config binary in this repo |
| Theme / UI kit from LIDR or Gentleman | Control Plane is not a themed product surface |
| Dogmatic 90% coverage | Prefer existing suites + risk-based TDD; do not chase a quota |
| LIDR English-only operator policy | Operator UI and human comms may stay Spanish; code, ADRs, specs, commits stay professional English (existing EOS language rule) |
| New orchestrator / “Specboot engine” | Do not add speculative engines; reuse docs + skills + optional CLI outside L0 |
| npm dependencies in L0 `src/core` | `DEPENDENCY_POLICY_L0.md` / `NODE_BUILTINS_ONLY` stays intact |
| Constitution mutation in this decision | Any `CONSTITUTION.md` edit requires explicit PO approval |

### 6. Canonical pointers (do not fork SSOT)

| Surface | Role |
| --- | --- |
| `CONSTITUTION.md` and `docs/core/CONSTITUTION.md` | Articles I–IV: evidence, hierarchy, write barrier, autonomy limits |
| `.cursorrules` | Session greeting, classify → authorize → execute, TDD, epistemics |
| `docs/base-standards.md` | Coding / docs SSOT index (LIDR Specboot “base standards”) |
| `docs/architecture/adrs/` | This ADR and prior ADRs (canonical ADR folder per ADR-0001) |
| `docs/decisions/` | PO gates and **pointers** only — do not duplicate ADR bodies |
| `.agents/skills/sdd/SKILL.md` | Agent SDD procedure |
| `docs/core/WORLD_CLASS_ENGINEERING_PIPELINE.md` | 21-step lifecycle |
| `DEPENDENCY_POLICY_L0.md` | Node built-ins only |

## Consequences

### Positive

- Agents and humans share one rule for DIRECT vs SDD.
- Specboot vocabulary maps onto EOS without a second product loop.
- RDD cannot be used to launder a merge or an external write.
- NON-goals make “conscious adoption” auditable.

### Negative

- `.cursorrules` still reads more dogmatic than this ADR; agents must treat this ADR as the organic-routing interpretation until a PO-approved overlay edit.
- Historical audits that claim a fully operational `/enrich-us` CLI remain **claims**. This ADR does not re-certify them.

### Reversal

A later ADR may tighten or loosen organic routing. Reversal must not silently re-import refused items (Engram wholesale, Go installer, 90% quota, English-only operator policy) or mutate the Constitution without PO approval.
