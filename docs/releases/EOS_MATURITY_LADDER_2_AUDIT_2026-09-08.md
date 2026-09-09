# EOS Maturity Ladder 2 Audit - 2026-09-08

**Branch:** cursor/eos-maturity-ladder-2-audit
**Audit base tip:** 94eaeda44817859e5b23f065dbe8ec98a986d2da (94eaeda)
**Subject:** Merge pull request #37 (branch-protection-hitl-status)
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE
**PRODUCTION_READY:** NO (unchanged; not in scope to flip)
**Scope:** EOS-only L0 control plane / Mission OS - evidence-based gap list + ordered next ROI ladder
**Fundacion:** Delta=0 (untouched)
**Dirty tree:** DEFERRED (same set as post-ladder hygiene; not force-committed)


---

## 1. Current tip + dictamen

| Field | Value | Evidence |
| --- | --- | --- |
| main tip SHA | 94eaeda44817859e5b23f065dbe8ec98a986d2da | git rev-parse HEAD on clean merge tip |
| Dictamen | COMPLETE_FOR_LOCAL_GOVERNED_USE | EOS_FREEZE_GATE_STATUS.md, RELEASE_CAPABILITY_MATRIX.md |
| PRODUCTION_READY | NO | Freeze gate + matrix + all ROI1-6 reports |
| Branch protection | RULE_CREATED_NOT_ENFORCED (Free private) | ROI3_BRANCH_PROTECTION_HITL.md (merged via #37) |

---

## 2. What is CLOSED (fusion + ROI1-6)

Evidence = merge subjects on main + release reports + ADRs. PRs landed:

| Close-out | PR | Merge SHA | Evidence pointers |
| --- | --- | --- | --- |
| Phase 0b/1 MCP SSOT | #26 | 9273e82 | Ground truth; eos-mcp.ssot.json; MCP_SSOT.md; mcp:sync |
| Phase 2 agent entrypoints | #27 | c79df43 | .agents/AGENTS.md SSOT; agent-entrypoints-check.js |
| Phase 4 Write Barrier | #28 | 6c973b7 | ADR-0013; src/core/write-barrier/; WRITE_BARRIER_SANDBOX.md; write-barrier-sandbox.test.js |
| Phase 5 Mission Loop | #29 | 0c96b4c | ADR-0014; mission-loop.js+runtime+bridge; MISSION_LOOP_ENFORCEMENT.md; mission-loop-enforcement.test.js |
| ROI1 dirty-tree hygiene | #30 | 36d85b5 | ROI1_DIRTY_TREE_TRIAGE_2026-09-08.md; freeze gate refresh |
| ROI2 engine prune | #31 | a212e54 | ROI2_ENGINE_PRUNE_2026-09-08.md; archive/quarantine/engine-roi2/; keep 19 |
| ROI3 I2.5 mutation/property | #32 | a7dd7ba | ROI3_I25_MUTATION_PROPERTY_2026-09-08.md; tests/roi3-i25-*.test.js; CI harden |
| ROI3 HITL branch protection | #37 | 94eaeda | ROI3_BRANCH_PROTECTION_HITL.md - rule exists, NOT enforced |
| ROI4 I3 evidence custody | #33 | c5372e9 | ADR-0015; evidence-custody.js; custody:verify; loop+sealer wired; verify:strict light |
| ROI5 long-run GameDay | #34 | 88c9847 | ROI5_LONG_RUN_GAMEDAY_2026-09-08.md; long-run-gameday-harness.js; gameday:long-run; test:roi5 |
| ROI6 Engram unify | #35 | 0416d20 | ADR-0016; engram-contract.js; .eos/engram/memory.jsonl; engram:verify; verify:strict light |
| Post-ladder deferred hygiene | #36 | 5e71df0 | POST_LADDER_HYGIENE_2026-09-08.md - DEFER set reconfirmed |

Operator surfaces present: eos-hud, eos-sentinel, fdir (+ontology); related tests exist.

Strict verify today locks custody and engram light audits among other checks. CI covers workspace verify, recursive node tests, JS syntax, governance engines. Dictamen remains local-governed only.

---

## 3. Ranked GAPS (EOS-only next work)

Each gap: problem, evidence, ROI proposal, effort, risk. Ranked by fail-closed leverage for L0 / Mission OS / evidence / complexity / docs.

### G1 - Strict verify does not lock fusion control-plane seams (highest fail-closed ROI)

- Problem: Post-fusion modules exist on disk, but scripts/verify-eos.js REQUIRED_FILES / light checks cover ROI4 custody + ROI6 engram, NOT Write Barrier, Mission Loop, MCP SSOT, or long-run GameDay harness. Silent delete/rename of Phase 4/5/0b seams would not fail strict verify the way custody/engram would.
- Evidence: findstr on scripts/verify-eos.js hits evidence-custody / engram-contract only among fusion seams; no required paths for src/core/write-barrier/, src/core/mcp/mission-loop.js, config/mcp/eos-mcp.ssot.json, src/core/adversarial/long-run-gameday-harness.js, ADR-0013/0014. Files ARE present (Test-Path True).
- ROI proposal: Extend strict verify with existence + minimal import/API smoke for fusion pack; keep L0 builtins-only.
- Effort: S (0.5-1 day)
- Risk: Low (fail-closed additions; no runtime behavior change if files present)

### G2 - Local main-push surrogate missing while GH protection is NOT_ENFORCED

- Problem: Branch protection rule for main is recorded but unenforced on Free private (RULE_CREATED_NOT_ENFORCED). EOS has pre-commit installer only; no pre-push / watchdog deny for direct pushes to main.
- Evidence: ROI3_BRANCH_PROTECTION_HITL.md; scripts/install-git-hooks.js writes pre-commit only; no pre-push in installer. GitHub Team upgrade is OUT OF SCOPE.
- ROI proposal: EOS-only local fail-closed optional pre-push + git-watchdog / commit:safe deny direct push/force to main unless explicit allow env; document as local surrogate, not GH enforcement claim.
- Effort: S-M
- Risk: Medium (operator friction if mis-tuned; must not claim GH-enforced)

### G3 - Operator HUD verify surfaces stale vs post-ROI4/6 truth

- Problem: HUD VERIFY_SURFACE_TYPES still only organic-gate, tdd-receipts, rdd-stance, l0-purity. Custody and engram check types already emit in verify JSON but HUD summarizer ignores them.
- Evidence: src/core/observability/operator-hud.js VERIFY_SURFACE_TYPES vs verify-eos.js type evidence-custody / engram-contract. Freeze/matrix observed as text only; freeze file still narrates unmerged ROI4/6 branches (stale).
- ROI proposal: Extend VERIFY_SURFACE_TYPES; optional OBSERVED freeze tip SHA vs live git rev-parse.
- Effort: S
- Risk: Low

### G4 - Release SSOT tip drift (freeze gate + capability matrix)

- Problem: Operator truth docs disagree with tip 94eaeda. Freeze gate still says ROI4/ROI6 branches do not merge / LAST ROI do not merge. RELEASE_CAPABILITY_MATRIX.md evaluated_tip is d7cd6fa (pre-fusion) and still lists Merge to main as FUTURE/BLOCKED while fusion+ROI ladder already merged.
- Evidence: EOS_FREEZE_GATE_STATUS.md ROI4/ROI6 follow-through blocks; RELEASE_CAPABILITY_MATRIX.md header tip + rows; actual merges #26-#37 on main.
- ROI proposal: Docs-only tip refresh + capability rows for MCP SSOT / write-barrier / mission-loop / custody / gameday / engram as COMPLETE_FOR_LOCAL_GOVERNED_USE; keep PRODUCTION_READY=NO.
- Effort: S
- Risk: Low (docs honesty; avoid over-claiming)

### G5 - CI GameDay / ROI seam pack not explicit

- Problem: Recursive node tests discover roi unit tests, but workflow never runs long-run gameday smoke nor named ROI pack scripts as explicit jobs.
- Evidence: .github/workflows/ci.yml jobs are verify / test / syntax / governance-gates only; package.json has gameday:long-run and test:roi3..6 scripts.
- ROI proposal: Add CI-safe default-N GameDay step (or governance-gates) + optional named ROI pack; keep Fundacion delta-0.
- Effort: S-M
- Risk: Medium (CI time; keep N=25 CI-safe; avoid soak defaults)

### G6 - Mission OS dual-FSM cognitive complexity (MCP loop overlay vs ATS)

- Problem: ADR-0014 states mission loop is an MCP overlay and does not replace ATS / Mission OS FSM. Operators face two stage vocabularies without a single coherence map in HUD/docs. Residual complexity: scripts/engine pruned 99 to 19, but src/core still ~181 JS files.
- Evidence: MISSION_LOOP_ENFORCEMENT.md non-goals; ADR-0014 consequences; ROI2 report; src/core file count.
- ROI proposal: Docs + HUD map (one-page Mission OS coherence); optional prune of non-L0 core islands only with PO-named paths (kernel freeze in base-standards).
- Effort: M
- Risk: Medium (docs-only first; code prune needs PO)

### G7 - EVD write paths outside ContractEvidenceSealer may skip custody

- Problem: Custody seals EVD via ContractEvidenceSealer and mission-loop advances/receipts. src/core/evidence.js has no EvidenceCustody coupling; hooks/evidence-logger.js is a separate path.
- Evidence: ROI4 report original gap list; sealer imports custody; evidence.js has no custody hits; ADR-0015 scope.
- ROI proposal: Inventory EVD writers; fail-closed seal or DENY unsigned EVD in governed paths; extend custody verify coverage.
- Effort: M
- Risk: Medium (false DENY if inventory incomplete)

---

## 4. Explicit OUT OF SCOPE

| Item | Why |
| --- | --- |
| App Fuerza / EVD-0060 / executive dossier | Satellite; DEFER per ROI1 + POST_LADDER_HYGIENE |
| GitHub Team / Enterprise upgrade (or public visibility) | Billing/visibility PO-only; HITL doc records option without recommending visibility change |
| Fundacion / PRJ-FUNDACION | Delta=0 constitutional freeze |
| PRODUCTION_READY=YES flip | Explicit non-goal; dictamen stays local-governed |
| Implementing M1 in this branch | Audit + ladder only |
| Restoring ROI2 quarantined engines | Unless PO names a restore |
| Fake FTS5 / parallel ledgers | DO_NOT_BUILD / ADR-0015/0016 |

---

## 5. Ordered ladder M1 to M6

| ID | Focus | One-line Definition of Done |
| --- | --- | --- |
| M1 | Strict verify fusion control-plane lock | Strict verify DENYs if write-barrier, mission-loop, MCP SSOT, long-run gameday harness, or ADR-0013/0014 missing; light import/API smoke PASS on tip |
| M2 | Local main-push surrogate | Installed/documented pre-push (or watchdog) DENYs direct push/force to main locally; docs state this is not GH enforcement; PRODUCTION_READY remains NO |
| M3 | HUD post-fusion verify surfaces | HUD surfaces include evidence-custody + engram-contract (and optionally mission-loop); freeze tip OBSERVED vs live HEAD without inventing PRODUCTION_READY |
| M4 | Release SSOT tip refresh | EOS_FREEZE_GATE_STATUS.md + RELEASE_CAPABILITY_MATRIX.md tip/rows match main@94eaeda (or newer) fusion+ROI closed state; dictamen unchanged |
| M5 | CI GameDay / ROI seam pack | CI runs CI-safe gameday long-run (default N) and/or named ROI verify scripts; Fundacion delta-0 still hard-fails |
| M6 | Mission OS dual-FSM coherence | Single operator map ATS to mission-loop (+ HUD/docs); no second FSM invented; optional PO-named core complexity trim only |

---

## 6. Recommend start with M1

Start with M1 — highest ROI fail-closed improvement for EOS-only L0 control plane:

1. Closes the largest post-ladder honesty hole: fusion Phases 4/5/0b are implemented and tested but not locked by the same verify surface that already locks custody/engram.
2. Small surface, L0-pure, reversible, no Fundacion, no billing, no PRODUCTION_READY claim.
3. Unblocks M3/M5 (HUD/CI can trust verify types) and makes M4 docs refresh meaningful.

Do not implement M1 in this audit branch. Next workstream should open a dedicated branch from updated main.

---

## 7. Audit method notes

- Read-first: CONSTITUTION (skim), base-standards, freeze gate, Phase 0 ground truth, ROI1-6 + POST_LADDER_HYGIENE, ADRs 0010-0016, mission-loop / write-barrier / custody / engram / gameday entrypoints, package.json scripts, strict verify, HUD/Sentinel/FDIR presence.
- Probes: git log --merges, Test-Path on fusion artifacts, findstr on verify-eos.js / HUD / hooks / CI, test file inventory under tests/.
- Dirty unstaged (Fuerza EVD/dossier, foreign ai-specs agents, ATP PNGs, Transmission-Live, quarantine docs) DEFERRED unchanged.

---

## 8. Non-claims

- This audit does not assert PRODUCTION_READY.
- This audit does not assert GitHub branch protection is enforced.
- This audit does not remediate App Fuerza, Fundacion, or billing.
