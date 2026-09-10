---
name: verify
description: Independent SpecBoot verification pass; BUILDER != VERIFIER (SpecBoot /verify).
---

# verify Skill (Antigravity mirror)

**Procedure SSOT:** [`.cursor/commands/verify.md`](../../../.cursor/commands/verify.md)

AGY loads skills from `.agents/skills/`. This file is a **thin pointer** — do **not** fork the procedure body.

## Instructions

1. Open and follow `.cursor/commands/verify.md` as the authoritative SpecBoot step procedure.
2. Obey ADR-0010 + [`docs/harness/SPECBOOT_CYCLE.md`](../../../docs/harness/SPECBOOT_CYCLE.md) + [`docs/harness/ANTIGRAVITY_FIRST.md`](../../../docs/harness/ANTIGRAVITY_FIRST.md).
3. Mission CLI unchanged: `node bin/eos.js` / `npm run eos:mission`.
