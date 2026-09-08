# ROI1 Dirty-Tree Triage — 2026-09-08

**Branch:** `cursor/roi1-post-fusion-hygiene`  
**Base main tip:** `0c96b4c726633cbb3208ee059895905b5b30b9dd`  
**Porcelain inventory at triage:** 34 entries  
**Fundacion:** untouched (Δ=0)  
**PRODUCTION_READY:** NO (unchanged)

## Counts (by classification)

| Class | Count (porcelain entries) | Policy |
| --- | ---: | --- |
| TRACK | 26 | Commit now as intentional EOS governance / LIDR-OpenSpec skills / harness docs |
| ARCHIVE | 0 | None relocated this pass (prefer DEFER over speculative moves) |
| DEFER | 8 | Leave unstaged; reasons below |
| DISCARD | 0 | Nothing clearly junk/generated and safe; never Fundacion; never secrets |

## TRACK (committed this ROI1)

### Modified
| Path | Reason |
| --- | --- |
| `.agents/skills/security-auditor/SKILL.md` | Expanded EOS security-auditor skill (10-dimension audit) |
| `ai-specs/skills/README.md` | Documents integrated Specboot skill dual placement |
| `docs/architecture/EOS_TOKEN_ECONOMICS_AND_HARNESS_OPTIMIZATION.md` | Model routing matrix + OSS token tooling (LIDR workshop) |
| `docs/architecture/HARNESS_AND_LOOP_ENGINEERING.md` | SDD framework landscape + dual-route rationale |
| `docs/base-standards.md` | Skills + mandatory OpenSpec execution pointers |

### Untracked skills / references (EOS governance)
| Path | Reason |
| --- | --- |
| `.agents/skills/adversarial-review/` | LIDR RDD adversarial review (informational; ADR-0010) |
| `.agents/skills/code-auditing/` | Systematic audit skill + references |
| `.agents/skills/enrich-us/` | Specboot user-story enrichment |
| `.agents/skills/openspec-sync-specs/` | OpenSpec delta→main sync |
| `.agents/skills/sdd/references/` | SDD frameworks landscape (portable ADR link fixed) |
| `.agents/skills/security-auditor/references/` | OWASP Top 10 + supply-chain vectors |
| `.agents/skills/using-git-worktrees/` | Isolated worktree lifecycle |
| `.agents/skills/writing-skills/` | Skill authoring TDD package |
| `ai-specs/skills/adversarial-review/` | Dual placement for multi-copilot |
| `ai-specs/skills/code-auditing/` | Dual placement |
| `ai-specs/skills/commit/` | Conventional commits Specboot skill |
| `ai-specs/skills/enrich-us/` | Dual placement |
| `ai-specs/skills/explain/` | Architecture explain skill |
| `ai-specs/skills/meta-prompt/` | Prompt engineering skill |
| `ai-specs/skills/openspec-sync-specs/` | Dual placement |
| `ai-specs/skills/show-spec-working/` | OpenSpec working-artifact inspector |
| `ai-specs/skills/sync-agent-symlinks/` | Symlink hygiene for OpenSpec installs |
| `ai-specs/skills/update-docs/` | Docs synchronizer skill |
| `ai-specs/skills/using-git-worktrees/` | Dual placement |
| `ai-specs/skills/writing-skills/` | Dual placement |
| `docs/knowledge/KI-ACCELERATION-WHIPLASH.json` | Empirical harness-engineering knowledge item |

### Status / process docs (this ROI1)
| Path | Reason |
| --- | --- |
| `docs/releases/EOS_FREEZE_GATE_STATUS.md` | Refresh to main tip 0c96b4c; fusion PRs #26–#29; agy remote-control |
| `docs/releases/EOS_PHASE_0_CONTROL_PLANE_ANTIGRAVITY_FUSION_GROUND_TRUTH_2026-09-08.md` | ROI1 follow-through + corruption fix |
| `docs/releases/ROI1_DIRTY_TREE_TRIAGE_2026-09-08.md` | This triage evidence |

## DEFER (left unstaged)

| Path | Reason |
| --- | --- |
| `ai-specs/agents/backend-developer.md` | Foreign template (Prisma / `.claude/doc`); no EOS markers; not in tracked agent set (architect/implementer/verifier/…) |
| `ai-specs/agents/frontend-developer.md` | Foreign React Bootstrap / candidate-management template; no EOS calibration |
| `ai-specs/agents/product-strategy-analyst.md` | Generic Claude product strategist stub; not EOS-governed agent protocol |
| `docs/evidence/EVD-0060.json` | Satellite `PRJ-APP-FUERZA` pipeline evidence re-hash (RISK/FAIL churn); not fusion hygiene |
| `docs/reports/executive/EXECUTIVE_DOSSIER_PRJ-APP-FUERZA.md` | Satellite dossier timestamp/module-count churn; defer pending dedicated audit commit |
| `docs/audits/atp_apple_light.png` | ATP theme screenshot (~387KB); satellite visual evidence; leave until audit package owns it |
| `docs/audits/atp_tidal_dark.png` | ATP theme screenshot (~426KB); same as above |
| `EOS-Lab/Transmission-Live/` | Unrelated audio/visualizer lab experiment; not EOS control-plane governance |

## ARCHIVE

None this pass. Deferred items may be archived under `docs/archive/untracked-experiments-2026-09/` in a later ROI if PO directs relocation.

## DISCARD

None. No secrets (`.env`/tokens) force-added. No Fundacion paths touched.

## Explicit non-goals

- No ROI 2+
- No merge to `main`
- No `PRODUCTION_READY=YES`
- No Fundacion modifications