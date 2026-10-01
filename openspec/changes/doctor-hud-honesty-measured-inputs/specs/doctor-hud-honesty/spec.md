# Doctor/HUD honesty — measured inputs

Capability: the honesty surface rendered by `eos:doctor` and `eos:hud` SHALL only print a definite
value (`YES`/`NO`, a SHA) for an input it measured in this run or that a caller injected; anything
else SHALL render as `UNMEASURED`/`UNKNOWN` and keep optimistic results deferred.

## Requirements

### Requirement: Working-tree dirtiness is measured, never assumed

The doctor and HUD SHALL obtain `dirty` from `git status --porcelain` (via the injectable git seam)
when the caller does not provide it. When neither measurement nor injection is available the surface
SHALL render `dirty=UNMEASURED` and SHALL NOT print `dirty=NO`.

#### Scenario: Dirty checkout is reported dirty by the doctor

- GIVEN a repository checkout with one modified tracked file
- WHEN `runOperatorDoctor({ root })` runs with the default git seam
- THEN `report.honesty.dirty.dirty` is `true`, `dirty_paths` contains the file, `optimistic.result` is `DEFERRED`, and the rendered block contains `dirty=YES`

#### Scenario: Unmeasured dirtiness is labeled, not denied

- GIVEN `buildHonestySurface({ freezeRevision, sourceRevision })` with `dirty` undefined and no git seam
- WHEN the block is formatted
- THEN it contains `dirty=UNMEASURED`, `dirty.measured` is `false`, and `optimistic.result` is `DEFERRED`

#### Scenario: Explicit clean injection still renders NO

- GIVEN `buildHonestySurface({ ..., dirty: false })`
- WHEN the block is formatted
- THEN it contains `dirty=NO` and `dirty.measured` is `true`

### Requirement: Doctor resolves live HEAD like the HUD

`runOperatorDoctor` SHALL resolve `sourceRevision` via `git rev-parse HEAD` when not injected, using
the same seam and the same `NOT_VERIFIED` fallback as `operator-hud.js`.

#### Scenario: Doctor on a git checkout shows the live SHA

- GIVEN a git checkout whose HEAD is `H`
- WHEN `node bin/eos-doctor.js` runs
- THEN the honesty block prints `source=<H short>` and `HONESTY_REVISION` is not `NOT_VERIFIED`

#### Scenario: Doctor without git stays NOT_VERIFIED

- GIVEN `runOperatorDoctor({ root, execGit: () => { throw new Error('no git'); } })`
- WHEN the report is built
- THEN `honesty.revision.epistemic` is `NOT_VERIFIED`, `revision.error` is set, and the CLI exits without throwing

### Requirement: Rendered verdict and check lines agree

Honesty checks SHALL be flagged `informational: true` and SHALL NOT be rendered with the same
`[PASS]`/`[FAIL]` markers used by the presence/light gate that determines `VERDICT`.

#### Scenario: No FAIL line under a PASS verdict

- GIVEN a report where `honesty.revision.epistemic` is `NOT_VERIFIED`
- WHEN `formatDoctorReport(report)` renders
- THEN the output contains `VERDICT: PASS` only if no line starts with `[FAIL]`, and the honesty checks appear as `[INFO]` or `[WARN]`

### Requirement: Pending-port extraction matches uppercase port labels only

`extractPendingPorts` SHALL match `[A-Z]{1,3}` labels (optionally ranged with `–`/`—`/`-`) followed
by `pending`, case-sensitively.

#### Scenario: Lowercase prose is ignored

- GIVEN the text `The receipt was pending review. Audit MEASURED: FI–FM pending.`
- WHEN `extractPendingPorts` runs
- THEN the result is exactly `['FI–FM pending']`

#### Scenario: Existing uppercase fixtures keep working

- GIVEN the existing fixtures `Audit MEASURED · CQ–CR pending` and `CQ pending`
- WHEN `extractPendingPorts` runs
- THEN `CQ–CR pending` / `CQ pending` are still returned (regression guard for current tests)

#### Scenario: Real freeze ledger has no lowercase labels

- GIVEN `docs/releases/EOS_FREEZE_GATE_STATUS.md` at `main@8903b578`
- WHEN `extractPendingPorts` runs
- THEN no returned label starts with a lowercase letter (today: `was pending` is returned)
