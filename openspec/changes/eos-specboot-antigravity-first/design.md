# Design — eos-specboot-antigravity-first

## Approach (TDD)

1. OpenSpec FIRST.
2. RED: named test asserts cycle SSOT, Antigravity-first doc, lock, verify wire, AGY skill mirrors, NON-CLAIM CloudAgent-out / Cursor-IDE-ok, PRODUCTION_READY=NO.
3. GREEN: docs + thin skill mirrors + lock + verify 3g13 + npm script + evidence.
4. Leave DEFER standards stubs **dirty unstaged**.
5. Commit/push branch; **no PR**. No CloudAgent launch.

## SSOT paths

| Path | Role |
| --- | --- |
| `docs/harness/SPECBOOT_CYCLE.md` | Cycle diagram + EOS skill/command map + gaps |
| `docs/harness/ANTIGRAVITY_FIRST.md` | Runtime policy: AGY primary; CloudAgent out of default path |

## Skill mirror strategy (Windows-safe)

`core.symlinks=false` on operator Windows → git cannot reliably store real symlinks as executable skill bodies.

**Chosen:** thin `.agents/skills/<step>/SKILL.md` with YAML frontmatter + pointer to procedure SSOT:

- `ff|propose|apply|verify|archive` → `.cursor/commands/<step>.md`
- `commit` → `.cursor/commands/commit.md` + `ai-specs/skills/commit/SKILL.md`

Do **not** copy full command/skill bodies. AGY loads `.agents/skills`.

## Lock design (mirror worktree-policy-lock)

- Module: `scripts/lib/specboot-cycle-lock.js`
- Export: `SPECBOOT_CYCLE_INDEX`, `ANTIGRAVITY_FIRST_INDEX`, required sections/paths, `auditSpecbootCycleLock`
- Fail-closed on missing docs/needles/paths/skills
- Wire verify-eos **3g13** after worktree **3g12**

## Constraints

- Fundacion Δ=0; PRODUCTION_READY=NO
- Demote CloudAgent in policy; do not delete Cursor configs
- No new schemas JSON
- Leave DEFER stubs unstaged
