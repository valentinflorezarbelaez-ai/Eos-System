# EOS CI/CD CONTRACT — GitHub Actions

```text
provider: github-actions
mode: CI + RELEASE_GATE_CD
production_deploy: FORBIDDEN
fundacion_mutation: FORBIDDEN
dependency_policy: L0_NODE_BUILTINS_ONLY
```

Machine-readable companion: `docs/governance/CI_CD_CONTRACT.json`.

## CI (`EOS CI`)

| Job | Command | npm install |
| --- | --- | --- |
| verify | `node scripts/verify-eos.js --strict` | Forbidden |
| test | `npm test` | Forbidden |
| syntax | `node --check` on `bin/`, `src/`, `scripts/`, `tests/` | Forbidden |
| governance-gates | `evaluate:release`, `verify:independent`, `audit:system` | Forbidden |
| seam-pack | `gameday:long-run` + `test:roi3`..`test:roi6` + `test:m1`..`test:m4` + `test:n2`..`test:n6` + `test:p2`..`test:p6` + `test:q2`..`test:q6` + `test:r4`..`test:r5` + `test:s2`..`test:s6` + `test:specboot-agy` + `test:t2`..`test:t8` + `test:v2`..`test:v5` + `test:u2` + `test:compute-worker` + `test:c2` + `test:compute-worker-i`/`l`/`m`/`n`/`o` + `test:loop-compute` + `test:worker-daemon` + `test:fdir-sentinel` + `test:specboot-agent` + `test:external-write-gateway` (alias `test:native-suite-pack`) + `test:fdir-remediation`/`test:sovereign-session`/`test:developer-shell` (Ladder 12) + `test:target-flight`/`test:multi-agent-swarm`/`test:telemetry-server` (Ladder 13) + `test:llm-provider-port`/`test:token-budget-ecr`/`test:autonomous-loop`/`test:live-tool-engine` (Ladder 14) + `test:multi-session-autonomy`/`test:evidence-economy-ledger`/`test:constitution-runtime-policy-gate`/`test:autonomy-replay-forensic-observer` (Ladder 15) + `test:multi-workstation-federation`/`test:provider-failover-resilience`/`test:hitl-po-authority`/`test:evidence-export-notarization` (Ladder 16) + `test:cross-satellite-composition`/`test:operator-continuity`/`test:law-vi-broker`/`test:freeze-drift` (Ladder 17) | Forbidden |

Triggers: `push` to `main`, `pull_request`, `workflow_dispatch`.

## CD (`EOS CD Release Gate`)

CD evaluates whether a revision is a **release candidate evidence pack**. It does not publish, ship, or mutate production systems.

Triggers: `workflow_dispatch`, tags `rc/*`.

Verdict axiom: **CI pass ≠ PRODUCTION READY ≠ RELEASE APPROVED**.

## ROI3 fail-closed note
Orphan workflow YAMLs outside this contract are rejected by scripts/ci/assert-gha-contract.js. Legacy eos-ci.yml removed. continue-on-error true is forbidden on EOS CI.

## M5 seam-pack note (2026-09-08)
Fifth CI job `seam-pack` (`CI GameDay / ROI seam pack`) is contract-required. If/when branch protection required checks are updated, add this check name via HITL; do not invent GitHub enforcement. Status remains RULE_CREATED_NOT_ENFORCED on Free private. PRODUCTION_READY remains NO.

## P2 seam-pack note (2026-09-08)
seam-pack named pack extended with CI-safe `test:n2`..`test:n6` (Ladder 3 N locks). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## P3 hooks-install smoke note (2026-09-08)
seam-pack named pack extended with CI-safe `test:p3` (temp-dir hooks installer smoke; does not mutate checkout `.git`). verify:strict also audits installer surface + smoke. Local surrogate != GH enforcement. No soak. No new GH billing claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## Q2 seam-pack note (2026-09-09)
seam-pack named pack extended with CI-safe `test:p2` + `test:p4`..`test:p6` (Ladder 4 P locks; keep `test:p3`). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## R2 seam-pack note (2026-09-09)
seam-pack named pack extended with CI-safe `test:q2`..`test:q6` (Ladder 5 Q locks; keep `test:p2`..`test:p6`). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## R6 seam-pack note (2026-09-09)
seam-pack named pack extended with CI-safe `test:r4` + `test:r5` (Ladder 6 R locks; keep `test:q2`..`test:q6`). K6 CLOSED_BY_R4 — no lock reimplementation. No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.


## S4 seam-pack note (2026-09-09)
seam-pack named pack extended with CI-safe `test:s4` (Ladder 7 worktree isolation policy/CLI/path smoke; does **not** create real git worktrees). Keep `test:r4`..`test:r5`. No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. NON-CLAIM: no swarm.

## T2 seam-pack note (2026-09-09)
seam-pack named pack extended with CI-safe `test:s2`, `test:s3`, `test:s5`, `test:s6`, `test:specboot-agy` (Ladder 7 L7 locks; keep `test:s4` + prior R/Q/P/N/M/ROI packs). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## U2 seam-pack note (2026-09-09)
seam-pack named pack extended with CI-safe `test:t2`..`test:t8` (Ladder 8 T2–T8 locks; keep `test:s2`..`test:s6` + `test:specboot-agy` + prior R/Q/P/N/M/ROI packs). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## V4 seam-pack note (2026-09-10)
seam-pack named pack extended with CI-safe `test:v2`, `test:v3`, `test:v4` (Ladder 10 V2–V4 locks: token hygiene output filter, typed multi-agent handoff envelope, FDIR sentinel adversarial gate; keep prior packs). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## V5 seam-pack note (2026-09-10)
seam-pack named pack extended with CI-safe `test:v5` (Ladder 10 V5 lock: BUILDER != VERIFIER runtime enforcement and custody gate; keep prior packs). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.
## C2 seam-pack note (2026-09-11)
seam-pack named pack extended with CI-safe `test:u2` + `test:compute-worker` (SPEC-0008 unit+fuzz+adversarial) + `test:c2` lock (keep prior V2–V5 and T2–T8 packs). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. C2 lock basename stays in SLIM_SUITE_EXCLUDES to hold TR-01 ≤145.

## U / Mission U seam-pack note (2026-09-11)
seam-pack named pack extended with CI-safe native/macro mission satellites: `test:compute-worker-i`, `test:compute-worker-l`, `test:compute-worker-m`, `test:compute-worker-n`, `test:compute-worker-o`, `test:loop-compute`, `test:worker-daemon`, `test:fdir-sentinel`, `test:specboot-agent`, `test:external-write-gateway` (keep prior packs including `test:compute-worker` + `test:c2`). Local/CI alias: `test:native-suite-pack`. Lock: `test:mission-u` / `test:u11`. No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Satellites stay slim-excluded (TR-01 ceiling not raised); running in seam-pack is OK (same pattern as `test:compute-worker`).

## Ladder 11 note (2026-09-11)
Ladder 11 closeout: macros P–T measured; native suite required in CI seam-pack (SPEC-0026 / Mission U). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See `docs/releases/EOS_LADDER_11_CLOSEOUT_2026-09-11.md`.

## Y / Mission Y Ladder 12 seam-pack note (2026-09-11)
seam-pack named pack extended with CI-safe Ladder 12 satellites: `test:fdir-remediation` (V), `test:sovereign-session` (W), `test:developer-shell` (X). Keep prior native-suite + packs. Local aliases: `test:ladder12-pack`, `test:mission-y` / `test:y12`. Lock basename `eos-y-ladder12-seam-pack.test.js` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## Ladder 12 note (2026-09-11)
Ladder 12 closeout: V (FDIR remediation) + W (sovereign session) + X (developer shell) consolidated into CI seam-pack (SPEC-0030 / Mission Y). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See `docs/releases/EOS_LADDER_12_CLOSEOUT_2026-09-11.md`.

## AC / Mission AC Ladder 13 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 13 satellites: `test:target-flight` (Z), `test:multi-agent-swarm` (AA), `test:telemetry-server` (AB). Keep prior native-suite + packs (incl. Ladder 12). Local aliases: `test:ladder13-pack`, `test:mission-ac` / `test:ac13`. Lock basename `eos-ac-ladder13-seam-pack.test.js` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## Ladder 13 note (2026-09-12)
Ladder 13 closeout: Z (target flight sandbox) + AA (multi-agent swarm) + AB (telemetry stream server) consolidated into CI seam-pack (SPEC-0034 / Mission AC). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See `docs/releases/EOS_LADDER_13_CLOSEOUT_2026-09-12.md`.

## AH / Mission AH Ladder 14 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 14 satellites: `test:llm-provider-port` (AD), `test:token-budget-ecr` (AE), `test:autonomous-loop` (AF; alias of `test:autonomous-execution-loop`), `test:live-tool-engine` (AG). Keep prior native-suite + packs (incl. Ladder 12/13). Local aliases: `test:ladder14-pack`, `test:mission-ah` / `test:ah14`. Lock basename `eos-ah-ladder14-seam-pack.test.js` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals.

## Ladder 14 note (2026-09-12)
Ladder 14 closeout: AD (LLM provider port) + AE (token-budget ECR) + AF (autonomous execution loop) + AG (live tool engine) consolidated into CI seam-pack (SPEC-0039 / Mission AH). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See `docs/releases/EOS_LADDER_14_CLOSEOUT_2026-09-12.md`.

## AM / Mission AM Ladder 15 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 15 satellites: `test:multi-session-autonomy` (AI), `test:evidence-economy-ledger` (AJ), `test:constitution-runtime-policy-gate` (AK), `test:autonomy-replay-forensic-observer` (AL). Keep prior native-suite + packs (incl. Ladder 12/13/14). Local aliases: `test:ladder15-pack`, `test:mission-am` / `test:am15`. Lock basename `eos-am-ladder15-seam-pack.test.js` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals.

## Ladder 15 note (2026-09-12)
Ladder 15 closeout: AI (multi-session autonomy) + AJ (evidence-economy ledger) + AK (constitution runtime policy gate) + AL (autonomy replay forensic observer) consolidated into CI seam-pack (SPEC-0044 / Mission AM). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See `docs/releases/EOS_LADDER_15_CLOSEOUT_2026-09-12.md`.

## AR / Mission AR Ladder 16 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 16 satellites: `test:multi-workstation-federation` (AN), `test:provider-failover-resilience` (AO), `test:hitl-po-authority` (AP), `test:evidence-export-notarization` (AQ). Keep prior native-suite + packs (incl. Ladder 12/13/14/15). Local aliases: `test:ladder16-pack`, `test:mission-ar` / `test:ar16` / `test:l16`. Lock basename `eos-ar-ladder16-seam-pack.test.js` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals. Tip honesty ritual deferred to post-AR tip refresh (not this mission).

## Ladder 16 note (2026-09-12)
Ladder 16 closeout: AN (multi-workstation session federation) + AO (provider failover resilience) + AP (HITL/PO authority channel) + AQ (evidence export notarization) consolidated into CI seam-pack (SPEC-0049 / Mission AR). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See `docs/releases/EOS_LADDER_16_CLOSEOUT_2026-09-12.md`.

## AW / Mission AW Ladder 17 seam-pack note (2026-09-12)
seam-pack named pack extended with CI-safe Ladder 17 satellites: `test:cross-satellite-composition` (AS), `test:operator-continuity` (AT), `test:law-vi-broker` (AU), `test:freeze-drift` (AV). Keep prior native-suite + packs (incl. Ladder 12/13/14/15/16). Local aliases: `test:ladder17-pack`, `test:mission-aw` / `test:aw17` / `test:l17`. Lock basename `eos-aw-ladder17-seam-pack.test.js` stays in SLIM_SUITE_EXCLUDES (TR-01 ≤145). No soak. No continue-on-error. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO. Law VI: zero static provider-secret prefix literals.

## Ladder 17 note (2026-09-12)
Ladder 17 closeout: AS (cross-satellite composition harness) + AT (operator continuity / crash-recovery custody port) + AU (Law VI secret runtime broker) + AV (governed state freeze & drift observer) consolidated into CI seam-pack (SPEC-0054 / Mission AW). Dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE. PRODUCTION_READY=NO. Fundacion Δ=0. See `docs/releases/EOS_LADDER_17_CLOSEOUT_2026-09-12.md`.
