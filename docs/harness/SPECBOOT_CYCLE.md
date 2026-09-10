# EOS SpecBoot Cycle — Antigravity-First Operator SSOT

**SSOT path:** `docs/harness/SPECBOOT_CYCLE.md`  
**Date:** 2026-09-09  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (untouched)  
**Runtime mandate:** **Antigravity (`agy`) is the coding runtime.** Cursor CloudAgent launches are out of band for this cycle.

> **NON-CLAIM:** This document is an operator map + readiness gap list.  
> It does **not** invent a new SpecBoot engine, orchestrator, or slash runtime.  
> Ceremony authority remains ADR-0010 + existing skills/commands + OpenSpec layout.

## 1. SpecBoot cycle (LIDR diagram)

```text
USER STORY
  → /enrich-us          → REFINED
  → /propose | /ff      → PROPOSAL ARTIFACTS (proposal/spec/design/tasks)
  → /apply              → BRANCH / TESTS / DOCS / CODE loop
  → /verify + /adversarial-review (code_review)
                        → FEATURE READY
  → /archive + /commit  → FEATURE FOR PR
  → publish (HITL)      → PR / merge (human)
```

| Step | Intent | OpenSpec / Adonis alias |
| --- | --- | --- |
| `/enrich-us` | JTBD, value hypothesis, `NO_BUILD` if no job | — |
| `/ff` or `/propose` | OpenSpec envelope | `opsx:propose` / `/opsx-propose` |
| `/apply` | Smallest task, strict TDD | `opsx:apply` / `/opsx-apply` |
| `/verify` | Independent evidence (BUILDER ≠ VERIFIER) | — |
| `/adversarial-review` | Informational RDD / code_review | — |
| `/archive` | Merge spec deltas; record learning | `opsx:archive` / `/opsx-archive` |
| `/commit` | Authorized git commit on feature branch | — |

Discipline: [`ADR-0010`](../architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md).  
Runbook: [`OPENSPEC_RUNTIME.md`](../manuals/OPENSPEC_RUNTIME.md).  
Mandatory tasks protocol: [`openspec-tasks-mandatory-steps.md`](../openspec-tasks-mandatory-steps.md).

**Hard rules (unchanged):**
- `/verify` is independent of `/apply`.
- `/adversarial-review` is INFORMATIONAL — does not authorize merge.
- After `/apply`, update OpenSpec artifacts before `/archive` (no code-only archive).
- Prefer Given/When/Then. Do not invent a second pipeline.
- Do not replace `node bin/eos.js` / `npm run eos:mission`.

## 2. Antigravity-first wiring (what exists)

| Surface | Role for AGY SpecBoot |
| --- | --- |
| `GEMINI.md` | Thin Antigravity/Gemini entrypoint → `.agents/AGENTS.md` |
| `.agents/AGENTS.md` | Canonical agent protocol (all IDEs) |
| `agy-daemon.cmd` + [`ANTIGRAVITY_REMOTE_CONTROL_AND_DAEMON_OPS.md`](../manuals/ANTIGRAVITY_REMOTE_CONTROL_AND_DAEMON_OPS.md) | Headless remote-control daemon; instance intent **eos-workstation** |
| `.agents/skills/` | Multi-IDE skill pack AGY can load (partial SpecBoot coverage) |
| `ai-specs/skills/` | Tracked LIDR skill inventory (ROI1) |
| `.cursor/commands/` | Full SpecBoot slash bodies (Cursor-native vocabulary) |
| `.agents/skills/sdd/SKILL.md` | Documents the cycle; points at ADR-0010 |
| `openspec/changes/` | Active OpenSpec change directories |
| `docs/mcp/MCP_SSOT.md` + `npm run mcp:sync` | MCP consumer SSOT |
| Fusion phases 0–5 | MCP SSOT, agent entrypoints, write-barrier, mission-loop (separate from SpecBoot slash) |

### Skill / command coverage matrix (verified 2026-09-09)

| SpecBoot step | `.cursor/commands/` | `.agents/skills/` | `ai-specs/skills/` |
| --- | :---: | :---: | :---: |
| enrich-us | yes | yes | yes |
| ff | yes | **no** | **no** |
| propose | yes | **no** | **no** |
| apply | yes | **no** | **no** |
| verify | yes | **no** | **no** |
| adversarial-review | yes | yes | yes |
| archive | yes | **no** | **no** |
| commit | yes | **no** | yes |
| sdd (umbrella) | — | yes | — |
| openspec-sync-specs | — | yes | yes |

## 3. Gaps — what must be installed/configured for SpecBoot via Antigravity (not Cursor CloudAgent)

1. **Runtime:** Use local **Antigravity / `agy`** (installed binary observed). Do **not** launch Cursor CloudAgent for SpecBoot work.
2. **Daemon (optional but intended):** `agy-daemon.cmd install --name eos-workstation` (Admin) so remote HITL works; confirm with `agy-daemon.cmd status`.
3. **Slash parity gap:** Full SpecBoot step bodies live under `.cursor/commands/`. Antigravity does **not** automatically inherit Cursor slash commands. Until mirrored, AGY operators must:
   - invoke the matching **skill** when present (`enrich-us`, `adversarial-review`, `sdd`), and/or
   - open the corresponding `.cursor/commands/<step>.md` as the procedure SSOT and execute it manually in AGY chat.
4. **Missing `.agents/skills` discrete steps:** `ff`, `propose`, `apply`, `verify`, `archive` (and `commit` only under `ai-specs/skills/`). Prefer thin skill wrappers that **point** at `.cursor/commands/*.md` — do not fork procedure bodies.
5. **MCP profile:** `.agents/mcp_config.json` is **L0_READONLY**. Cursor/Windsurf consumers are **L1_LOCAL_GOVERNED**. AGY via `.agents` MCP cannot rely on MCP write tools for `/apply`; use local shell + write-barrier + git on the feature branch. No dedicated Antigravity MCP consumer row exists in SSOT yet (optional follow-on: add AGY consumer or document shell-first apply).
6. **Entrypoint:** Always start from `GEMINI.md` → `.agents/AGENTS.md` → this file + ADR-0010. Do not dilute protocol into the stub.
7. **OpenSpec CLI (optional):** External OpenSpec/`opsx:*` aliases are ceremony aliases only; not required for L0. If installed, keep symlinks via `sync-agent-symlinks` skill — do not vendor a new engine.
8. **Do not confuse** Mission Loop MCP (`eos.mission.loop.*`) with SpecBoot slash ceremony — complementary, not substitutes.
9. **Fundacion Δ=0** and **PRODUCTION_READY=NO** remain in force for SpecBoot readiness work unless a separate authorization exists.

## 4. Minimal operator checklist (AGY SpecBoot session)

1. Confirm `agy` available; open repo; read `GEMINI.md` + this SSOT.
2. Organic routing (ADR-0010): DIRECT vs SDD — only run SpecBoot when SDD applies.
3. Create/use feature branch or worktree (`using-git-worktrees` / WORKTREE_ISOLATION_POLICY).
4. Walk the cycle; for missing AGY skills, execute the `.cursor/commands/<step>.md` procedure text.
5. Evidence: `node --test` / `npm run verify` / `verify:strict` as required; no narrative-only DONE.
6. Stop at PR-ready; **HITL** publishes/merges (no autonomous main merge).

## 5. Canonical pointers (do not fork)

| Doc | Role |
| --- | --- |
| This file | SpecBoot cycle + AGY-first readiness SSOT |
| ADR-0010 | Discipline bridge (organic routing, TDD, RDD) |
| `docs/harness/CONTEXT_PACK_TPC.md` | TPC index |
| `docs/harness/LOOP_ENGINEERING_4Q.md` | Loop Engineering 4Q |
| `docs/harness/WORKTREE_ISOLATION_POLICY.md` | Worktree isolation |
| `docs/agents/AGENT_ENTRYPOINTS.md` | Multi-IDE entrypoint contract |
| `docs/releases/EOS_PHASE_0_CONTROL_PLANE_ANTIGRAVITY_FUSION_GROUND_TRUTH_2026-09-08.md` | Fusion ground truth |

## 6. Explicit non-goals

- No Cursor CloudAgent launches from this SSOT.
- No new SpecBoot orchestrator / npm engine in L0.
- No Constitution mutation.
- No Fundacion writes.
- No claim of PRODUCTION_READY=YES.
