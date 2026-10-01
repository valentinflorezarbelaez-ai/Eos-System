# Tasks — Doctor/HUD honesty measured inputs

Gate: **HUMAN_L2_AUTHORIZATION_REQUIRED** before TASK-01. All product edits are under `src/core/`
(frozen surface). Record the authorization (decision record or PR approval naming
`doctor-hud-honesty-measured-inputs`) before running `/apply`.

## TASK-00 — Authorization (human)

- [ ] Product Owner authorizes the exact file list in `.openspec.yaml` `affected_areas`
- [ ] Authorization reference recorded here: `________`

## TASK-01 — RED: pending-port parser is case-sensitive

- [ ] Add test: `extractPendingPorts('The receipt was pending review. Audit MEASURED: FI–FM pending.')` deep-equals `['FI–FM pending']`
- [ ] Add test: real `docs/releases/EOS_FREEZE_GATE_STATUS.md` yields no label starting with a lowercase letter
- [ ] GREEN: remove the `i` flag from `PENDING_PORT_RE` in `src/core/observability/doctor-hud-honesty.js`

Evidence command: `node --test tests/eos-post-l26-b-doctor-hud-honesty.test.js`

## TASK-02 — RED: dirtiness is measured or labeled UNMEASURED

- [ ] Add test: `buildHonestySurface` with `dirty` undefined renders `dirty=UNMEASURED`, `dirty.measured === false`, `optimistic.result === 'DEFERRED'`
- [ ] Add test: `dirty: false` injected renders `dirty=NO`, `dirty.measured === true`
- [ ] Add test: `runOperatorDoctor({ root: tmpGitRepo })` with one modified file reports `dirty.dirty === true` and `dirty_paths` includes the file
- [ ] GREEN: `measureWorkingTree(execGit)` helper + `measured` flag in `evaluateDirtyState` + renderer label
- [ ] GREEN: `runOperatorDoctor` and `collectOperatorHud` call the helper through the existing `execGit` seam

Evidence command: `node --test tests/eos-post-l26-b-doctor-hud-honesty.test.js tests/operator-hud.test.js`

## TASK-03 — RED: doctor resolves live HEAD; verdict/lines agree

- [ ] Add test: doctor on a temp git repo prints `source=<HEAD short>` and `HONESTY_REVISION` is not `NOT_VERIFIED`
- [ ] Add test: `execGit` throwing keeps `NOT_VERIFIED`, sets `revision.error`, CLI does not throw
- [ ] Add test: `formatDoctorReport` output never contains both `VERDICT: PASS` and a line starting with `[FAIL]`
- [ ] GREEN: `sourceRevision` resolution in `runOperatorDoctor`; `informational: true` on `HONESTY_*` checks; `[INFO]`/`[WARN]` rendering

Evidence command: `node --test tests/eos-post-l26-b-doctor-hud-honesty.test.js tests/eos-cv-hud-doctor-honesty-ritual-port.test.js tests/eos-db-doctor-ritual-automation-port.test.js`

## TASK-04 — Verify

- [ ] `npm test` green, `git status --porcelain` empty afterwards
- [ ] `npm run verify:strict` — check count unchanged (913 at `main@8903b578`)
- [ ] Re-run the three reproduction commands from `proposal.md`; paste GREEN output into the PR
- [ ] NON-CLAIM retained: `PRODUCTION_READY=NO`; no ladder reopened; Fundacion `Δ = 0`
