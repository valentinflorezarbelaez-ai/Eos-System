# EOS Maturity Ladder 3 Audit - 2026-09-08

**Branch:** cursor/eos-ladder-3-audit
**Audit base tip:** ed120dc523cf54ebdc4890aadf75aeee195bc0a2 (ed120dc)
**Subject:** Merge pull request #45 (G7 EVD custody seal path) — Ladder 2 M1–M6 + G7 closed
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE
**PRODUCTION_READY:** NO (unchanged; not in scope to flip)
**Scope:** EOS-only L0 control plane / Mission OS — evidence-based gap list + ordered next ladder N1–Nn after Ladder 2 + G7
**Fundacion:** Delta=0 (untouched)
**Dirty tree:** DEFERRED (same DEFER set as post-ladder hygiene / ROI1; not force-committed)
**Implement N1 in this branch:** NO (audit docs only)

---


## 1. Current tip + dictamen

| Field | Value | Evidence |
| --- | --- | --- |
| main tip SHA | ed120dc523cf54ebdc4890aadf75aeee195bc0a2 | git rev-parse HEAD on main @ G7 #45 |
| Dictamen | COMPLETE_FOR_LOCAL_GOVERNED_USE | Freeze gate + capability matrix |
| PRODUCTION_READY | NO | Freeze gate + matrix + all Ladder2/G7 reports |
| Branch protection | RULE_CREATED_NOT_ENFORCED (Free private) | ROI3_BRANCH_PROTECTION_HITL.md |
| Freeze SSOT tip (stale) | 3c675dd2acca86b55cbf5e7b30b84f0e8464b6b5 | EOS_FREEZE_GATE_STATUS.md main_tip (M3 pin) |
| Matrix evaluated_tip (stale) | 3c675dd2acca86b55cbf5e7b30b84f0e8464b6b5 | RELEASE_CAPABILITY_MATRIX.md (M4 pin) |
| HUD freeze observe | DIVERGE expected | live HEAD != freeze main_tip |

---

## 2. What is CLOSED (do not re-propose)

Evidence = merge subjects on main + release reports + ADRs. Closed ladder includes:

| Close-out | PR | Merge SHA | Evidence pointers |
| --- | --- | --- | --- |
| Phase 0b/1 MCP SSOT | #26 | 9273e82 | Ground truth; eos-mcp.ssot.json; MCP_SSOT.md |
| Phase 2 agent entrypoints | #27 | c79df43 | .agents/AGENTS.md; agent-entrypoints-check.js |
| Phase 4 Write Barrier | #28 | 6c973b7 | ADR-0013; src/core/write-barrier/ |
| Phase 5 Mission Loop | #29 | 0c96b4c | ADR-0014; mission-loop + runtime |
| ROI1 dirty-tree hygiene | #30 | 36d85b5 | ROI1_DIRTY_TREE_TRIAGE_2026-09-08.md |
| ROI2 engine prune | #31 | a212e54 | ROI2_ENGINE_PRUNE; archive/quarantine/engine-roi2/ |
| ROI3 I2.5 mutation/property | #32 | a7dd7ba | tests/roi3-i25-*.test.js |
| ROI4 I3 evidence custody | #33 | c5372e9 | ADR-0015; evidence-custody.js; custody:verify |
| ROI5 long-run GameDay | #34 | 88c9847 | gameday:long-run; long-run-gameday-harness.js |
| ROI6 Engram unify | #35 | 0416d20 | ADR-0016; engram-contract.js; engram:verify |
| Post-ladder deferred hygiene | #36 | 5e71df0 | POST_LADDER_HYGIENE_2026-09-08.md |
| ROI3 HITL branch protection | #37 | 94eaeda | RULE_CREATED_NOT_ENFORCED |
| Ladder 2 audit | #38 | e88fc04 | EOS_MATURITY_LADDER_2_AUDIT_2026-09-08.md |
| M1 fusion-CP strict-verify lock | #39 | ad396f7 | fusion-cp-lock.js; verify:strict |
| M2 local main-push surrogate | #40 | ed8d960 | pre-push-hook.js; hooks:install |
| M3 HUD post-fusion verify surfaces | #41 | 3c675dd | operator-hud VERIFY_SURFACE_TYPES |
| M4 Release SSOT tip refresh | #42 | 444dfc6 | freeze+matrix to 3c675dd (then superseded by later merges) |
| M5 CI GameDay / ROI seam-pack | #43 | 112bb2d | ci.yml job seam-pack; test:m5 |
| M6 Mission OS ATS to loop coherence | #44 | 97b1965 | MISSION_OS_ATS_MISSION_LOOP_COHERENCE.md; mission-os-coherence.js |
| G7 EVD custody seal path | #45 | ed120dc | evd-seal-path.js; sealEvd SSOT; test:g7 |

Ladder 2 G1-G6 mapped to M1-M6 closed. Ladder 2 G7 closed via #45. Do not re-propose those.

Operator surfaces present: eos-hud, eos-sentinel, fdir (+ontology), pre-push installed locally, custody/engram/fusion-cp/evd-seal in verify:strict (with gaps below).

---

## 3. Ranked GAPS (EOS-only next work)

Each gap: problem, evidence, ROI proposal, effort, risk. Ranked by fail-closed / operator-honesty leverage for L0 / Mission OS / evidence / docs.

### H1 - Release SSOT tip + capability matrix drift after M5/M6/G7 (highest honesty ROI)

- Problem: Freeze gate main_tip and matrix evaluated_tip remain pinned at M3 3c675dd while live main is ed120dc (M4-M6 + G7 merged). Matrix lacks COMPLETE rows for CI seam-pack, Mission OS coherence, and EVD seal path. Operator HUD freeze observe will report DIVERGE. HITL required-check list still names 4 checks while CI has 5th seam-pack job.
- Evidence: EOS_FREEZE_GATE_STATUS.md header tip 3c675dd; RELEASE_CAPABILITY_MATRIX.md evaluated_tip same; git rev-parse HEAD = ed120dc; matrix grep M5/M6/G7 = false; ROI3_BRANCH_PROTECTION_HITL.md lists four required checks; ci.yml jobs include seam-pack.
- ROI proposal: Docs-only tip refresh (freeze + matrix + optional HITL note) to main@ed120dc (or newer if tip moved); add capability rows; keep PRODUCTION_READY=NO; leave DEFER dirty untouched.
- Effort: S (docs-only)
- Risk: Low

### H2 - G7 EVD custody audit is src-only; scripts/bin dual writers remain

- Problem: auditCanonicalEvdWritePaths walks only src/. Canonical docs/evidence writers under scripts/ and bin/ still use raw filesystem writes without sealEvd, so verify:strict can PASS while those paths skip custody. Confirmed writers: scripts/run-engineering-loop.js (EVD-ENGINEERING-LOOP-LIVE-001), bin/eos-orchestrator.js (generateEvidence to docs/evidence). Mission-local paths (mcp-mission-bridge, governed-task-executor) stay OUT OF SCOPE per G7. App Fuerza/dossier satellite writes stay OUT OF SCOPE.
- Evidence: evd-seal-path.js uses srcRoot under src only; live audit ok=true with sanctioned only SSOT; inventory marks SEAL on kernel/sealer/mcp-server/pipeline and non-seal on engineering-loop + orchestrator; G7 report inventory did not close scripts/bin.
- ROI proposal: Extend canonical EVD writer audit to scripts/ + bin/ (or route those two writers through sealEvd); keep mission-local OUT OF SCOPE; no parallel ledger.
- Effort: S-M
- Risk: Medium (false DENY if heuristic too broad; orchestrator references Fundacion/Fuerza project keys — route seal only, do not mutate Fundacion)

### H3 - Operator doctor unwired and pre-fusion

- Problem: src/core/runtime/operator-doctor.js exists as read-only health check but has no bin, no package script, no HUD surface, and is not locked by verify:strict. Checks cover bin/eos, mcp-server, verify-eos, CURRENT_MISSION, homedir leak, runtime engines, mcp pin, purpose — not write-barrier / mission-loop / custody / engram / evd-seal / pre-push / fusion-cp.
- Evidence: doctor-named files = only operator-doctor.js; package scripts doctor-ish = none; bins have eos-hud/eos-sentinel but no eos-doctor; verify-eos.js hits for operator-doctor = 0; doctor source has no fusion/custody/engram strings.
- ROI proposal: Add bin/eos-doctor.js + npm run eos:doctor (or doctor); extend checks for post-fusion locks (existence/light); optional HUD OBSERVED section; optional verify existence lock. No network/writes.
- Effort: S-M
- Risk: Low

### H4 - HUD / fusion-cp lock incomplete for post-G7 / M6 surfaces

- Problem: M3 HUD VERIFY_SURFACE_TYPES include custody/engram/fusion-cp-* but not evd-seal-path (type emitted by verify-eos after G7). fusion-cp-lock.js still does not require ADR-0015/0016, evd-seal-path, mission-os-coherence, or pre-push-hook — silent delete of coherence/pre-push/ADR-0015/16 seams is weaker than WB/loop/SSOT/gamedy lock (evd-seal is separately required in verify REQUIRED_PATHS + light audit).
- Evidence: operator-hud.js VERIFY_SURFACE_TYPES list (no evd-seal-path); fusion-cp-lock.js FUSION_CP_REQUIRED_PATHS ends at ADR-0013/0014; verify-eos REQUIRED includes evd-seal-path but not mission-os-coherence / pre-push-hook / ADR-0015 / ADR-0016.
- ROI proposal: Add evd-seal-path to HUD surfaces; extend fusion-cp or sibling lock for ADR-0015/0016 + coherence map + pre-push surrogate paths with light smoke; keep L0 builtins-only.
- Effort: S
- Risk: Low

### H5 - Independent verifier stale vs post-fusion control plane

- Problem: verify:independent / IndependentVerificationHarness still centers organic-gate / tdd-receipts / rdd-stance style surfaces and fixture falsification; it does not light-check custody, engram, fusion-cp, or evd-seal. Operators can believe independent verify covers the fusion pack when it does not.
- Evidence: independent-verification-harness.js imports tdd/organic/rdd only; no custody/engram/fusion-cp strings; package script verify:independent present; verify-eos mentions independent-verification path existence but harness itself is pre-fusion.
- ROI proposal: Add fail-closed light fusion/custody/engram/evd-seal awareness to independent harness OR document hard NON-CLAIM & optional --fusion-light mode. Prefer measured light checks over slogan docs.
- Effort: M
- Risk: Medium (scope creep; keep CI time bounded)

### H6 - Sentinel / FDIR not locked by strict verify (operator defense drift)

- Problem: eos-sentinel + FDIR (+ontology) are live operator defense surfaces with integration tests, but verify:strict does not require their paths or run a light API smoke. Drift of bin/eos-sentinel.js, sentinel-daemon.js, fdir.js, or fdir-ontology.js would not fail the same gate that locks custody/engram/fusion-cp.
- Evidence: verify-eos.js sentinel/fdir/drift hit counts = 0; bins + src/core/sentinel-daemon.js + fdir.js present; tests/fdir-sentinel-integration.test.js exists; npm scripts eos:sentinel / sentinel:daemon present.
- ROI proposal: REQUIRED_PATHS + light import/API smoke (construct daemon/FDIR, no long soak); optional HUD OBSERVED defense section. Do not claim PRODUCTION_READY.
- Effort: S-M
- Risk: Low-Medium  avoid flaky heartbeat in CI; smoke only)

---

## 4. Explicit OUT OF SCOPE

| Item | Why |
| --- | --- |
| App Fuerza / EVD-0060 / executive dossier | Satellite; DEFER per ROI1 + POST_LADDER_HYGIENE |
| GitHub Team / Enterprise upgrade (or public visibility) | Billing/visibility PO-only |
| Fundacion / PRJ-FUNDACION | Delta=0 constitutional freeze |
| PRODUCTION_READY=YES flip | Explicit non-goal |
| Implementing N1 in this branch | Audit docs only (this mission) |
| Restoring ROI2 quarantined engines | Unless PO names a restore |
| Fake FTS5 / parallel ledgers | DO_NOT_BUILD / ADR-0015/0016 |
| Mission-local evidence dirs (mcp-mission-bridge / governed-task-executor) | G7 explicitly OUT OF SCOPE |
| Re-proposing Fusion #26-29, ROI1-6, Ladder2 M1-M6, G7 | Closed |

---

## 5. Ordered ladder N1 to N6

| ID | Focus | One-line Definition of Done |
| --- | --- | --- |
| N1 | Release SSOT tip refresh post M5/M6/G7 | Freeze main_tip + matrix evaluated_tip = main@ed120dc (or newer agreed tip); matrix rows for seam-pack + Mission OS coherence + EVD seal path COMPLETE_FOR_LOCAL_GOVERNED_USE / MEASURED as appropriate; HITL note lists 5th CI check name without claiming GH enforcement; PRODUCTION_READY=NO; test:m4 still PASS |
| N2 | EVD audit beyond src/ (scripts+bin) | auditCanonicalEvdWritePaths (or successor) DENYs raw docs/evidence writers in scripts/ + bin/ OR those writers route through sealEvd; test:g7 (or test:n2) PASS; mission-local still excluded; Fundacion Delta=0 |
| N3 | Operator doctor wire + fusion checks | eos:doctor (bin+script) PASS on tip with checks for verify/fusion-cp/custody/engram/evd-seal/pre-push presence; optional HUD OBSERVED; no network writes; PRODUCTION_READY unchanged |
| N4 | HUD + fusion-cp post-G7/M6 lock | HUD surfaces include evd-seal-path; fusion-cp (or sibling) locks ADR-0015/0016 + mission-os-coherence + pre-push-hook with light smoke; verify:strict DENYs if missing |
| N5 | Independent verifier fusion-light | verify:independent fails closed if custody/engram/fusion-cp/evd-seal light checks missing OR ships explicit NON-CLAIM + measured --fusion-light; docs match behavior |
| N6 | Sentinel/FDIR strict-verify lock | verify:strict REQUIREs eos-sentinel + fdir (+ontology) paths and light API smoke; no soak; Fundacion Delta=0 |

---

## 6. Recommend start with N1

Start with **N1** — highest operator-honesty ROI, tiny docs-only surface, unlocks truthful HUD freeze observe and makes later N2-N6 reports tip-accurate:

1. Closes the largest post-G7 honesty hole: tip SSOT still narrates M3 while M4-M6+G7 are merged.
2. No runtime risk, no Fundacion, no billing, no PRODUCTION_READY claim.
3. Natural follow-up after this audit PR merges; parent can open PR for this audit, then start N1 on a dedicated branch.

**Do not implement N1 in this audit branch.**

---

## 7. Audit method notes

- Read-first: Ladder 2 audit, freeze gate, capability matrix, G7/M5/M6 reports, ADRs 0010-0016 under docs/architecture/adrs/, verify-eos.js, fusion-cp-lock.js, evd-seal-path.js, operator-hud.js, operator-doctor.js, pre-push-hook.js, install-git-hooks.js, ci.yml, independent-verification-harness.js, sentinel/fdir entrypoints.
- Probes: tip vs freeze/matrix; package scripts/bins; EVD writer inventory (SEAL vs non-seal); G7 audit live run (src-only); verify hit counts for sentinel/fdir/doctor/pre-push/ADR-0015/16; HITL required-check list vs CI jobs; tracked src/core JS count (~183); dirty tree Fundacion Delta=0.
- Dirty unstaged (Fuerza EVD/dossier, foreign ai-specs agents, ATP PNGs, Transmission-Live, quarantine docs) DEFERRED unchanged.

---

## 8. Non-claims

- This audit does not assert PRODUCTION_READY.
- This audit does not assert GitHub branch protection is enforced.
- This audit does not remediate App Fuerza, Fundacion, or billing.
- This audit does not implement N1-N6.
