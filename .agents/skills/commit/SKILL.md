---
name: commit
description: Prepare a conventional commit on the assigned feature branch (SpecBoot /commit). Discoverable under .agents for Antigravity.
---

# commit Skill (Antigravity mirror)

**Procedure SSOT (SpecBoot step):** [`.cursor/commands/commit.md`](../../../.cursor/commands/commit.md)
**Extended LIDR commit skill:** [`ai-specs/skills/commit/SKILL.md`](../../../ai-specs/skills/commit/SKILL.md)

AGY loads skills from `.agents/skills/`. This file is a **thin pointer** — do **not** fork either body.

## Instructions

1. Prefer SpecBoot step rules in `.cursor/commands/commit.md` (feature branch only; no force-push; no commit to main; HITL for merge).
2. For fuller commit/PR craftsmanship, follow `ai-specs/skills/commit/SKILL.md` when in scope — still respect EOS write-barrier + ADR-0010 (RDD does not authorize merge).
3. Obey [`docs/harness/SPECBOOT_CYCLE.md`](../../../docs/harness/SPECBOOT_CYCLE.md) + [`docs/harness/ANTIGRAVITY_FIRST.md`](../../../docs/harness/ANTIGRAVITY_FIRST.md).
