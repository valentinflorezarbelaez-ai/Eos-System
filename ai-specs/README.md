# ai-specs (EOS pointers)

LIDR Specboot expects a canonical `ai-specs/` pack (agents + skills). This directory is an **index**, not a Gentle-AI or Engram drop-in.

| Pack | Location |
| --- | --- |
| Agents | [`agents/README.md`](agents/README.md) → `docs/agents/` |
| Skills | [`skills/README.md`](skills/README.md) → `.agents/skills/` |

Discipline: `docs/architecture/adrs/ADR-0010-lidr-specboot-gentleman-discipline-bridge.md`  
Standards: `docs/base-standards.md`, `docs/backend-standards.md`

Do not vendor foreign agent installers, theme kits, or a second agent runtime here.
