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

## Optional LIDR imports (do not bulk-copy)

These are **optional imports**. Reference the LIDR skills when useful. **Do not bulk-copy** their files into this tree (missing local copies are expected):

| Skill | Maps to |
| --- | --- |
| `enrich-us` | `/enrich-us` |
| `adversarial-review` | `/adversarial-review` (RDD, informational) |
| `using-git-worktrees` | Isolated worktrees; not a merge grant |
| `writing-skills` | How to write skills |
| `code-auditing` | Review aid; INFORMATIONAL |
| `openspec-sync-specs` | Sync spec deltas after apply |
| `sync-agent-symlinks` | CLI symlink hygiene if a human installs OpenSpec |
| `openspec-ff-change` / `openspec-continue-change` | `/ff` and resume-in-flight |

Gentleman **Scope Rule** (shared if ≥2 features, else local) is **NON-core** for L0 Mission OS unless the change touches a frontend satellite.
