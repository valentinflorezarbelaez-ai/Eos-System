# ai-specs / skills

Canonical EOS skills (do not fork):

- `.agents/skills/sdd/SKILL.md` — SDD + LIDR cycle pointer (ADR-0010)
- `.agents/skills/evidence-auditor/SKILL.md`
- `.agents/skills/security-auditor/SKILL.md`
- `.agents/skills/quality-auditor/SKILL.md`
- `.agents/skills/accessibility-auditor/SKILL.md`
- `.agents/skills/performance-auditor/SKILL.md`
- `.agents/skills/seo-auditor/SKILL.md`
- `.agents/skills/browser-qa/SKILL.md`

Slash-command docs for the cycle: `.cursor/commands/`.
Runbook: `docs/manuals/OPENSPEC_RUNTIME.md`.

## Active LIDR Specboot Skills (Integrated)

The core Specboot skills have been incorporated and calibrated for the EOS multi-copilot ecosystem:

| Skill | Directory | Intent & Mapping |
| --- | --- | --- |
| `enrich-us` | `ai-specs/skills/enrich-us/` & `.agents/skills/enrich-us/` | JTBD user story refinement (`/enrich-us`) |
| `adversarial-review` | `ai-specs/skills/adversarial-review/` & `.agents/skills/adversarial-review/` | Independent red-team review (`/adversarial-review`, RDD informational) |
| `code-auditing` | `ai-specs/skills/code-auditing/` & `.agents/skills/code-auditing/` | Systematic 6-phase code audit & dead code analysis |
| `using-git-worktrees` | `ai-specs/skills/using-git-worktrees/` & `.agents/skills/using-git-worktrees/` | Isolated git worktree lifecycle |
| `writing-skills` | `ai-specs/skills/writing-skills/` & `.agents/skills/writing-skills/` | TDD-style skill development & validation |
| `openspec-sync-specs` | `ai-specs/skills/openspec-sync-specs/` & `.agents/skills/openspec-sync-specs/` | Living spec delta synchronization after apply |
| `commit` | `ai-specs/skills/commit/` | Conventional commits workflow |
| `explain` | `ai-specs/skills/explain/` | Codebase architecture explanation |
| `meta-prompt` | `ai-specs/skills/meta-prompt/` | Systematic prompt engineering |
| `show-spec-working` | `ai-specs/skills/show-spec-working/` | Change status and working artifact inspector |
| `sync-agent-symlinks` | `ai-specs/skills/sync-agent-symlinks/` | Copilot symlink manager |
| `update-docs` | `ai-specs/skills/update-docs/` | Technical documentation synchronizer |

Gentleman **Scope Rule** (shared if ≥2 features, else local) is **NON-core** for L0 Mission OS unless the change touches a frontend satellite.

