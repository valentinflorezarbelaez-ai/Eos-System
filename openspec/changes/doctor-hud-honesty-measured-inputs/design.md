# Design — Doctor/HUD honesty surface, measured inputs

## Ponytail Decision Ladder

Tier 1/2 only. Every change is a built-in call (`execFileSync('git', ...)`) or a pure function
tweak. No new module, class, dependency or configuration surface.

## Surfaces

| Piece | Change |
| --- | --- |
| `src/core/observability/doctor-hud-honesty.js` | `PENDING_PORT_RE` loses the `i` flag. `evaluateDirtyState` distinguishes `dirty: undefined` (`measured: false`) from `dirty: false`. `formatHonestyBlock` prints `dirty=UNMEASURED` when `measured === false`. New pure helper `measureWorkingTree(execGit)` returning `{ dirty, dirtyPaths, measured, error }` (parses `git status --porcelain`). |
| `src/core/runtime/operator-doctor.js` | `runOperatorDoctor` resolves `sourceRevision` via `git rev-parse HEAD` and `dirty` via `measureWorkingTree` when the caller did not inject them (`options.execGit` seam, `options.skipGit` for fixtures). `HONESTY_*` checks carry `informational: true`; `formatDoctorReport` renders them as `[INFO]`/`[WARN]` instead of `[PASS]`/`[FAIL]` so they never contradict `VERDICT`. |
| `src/core/observability/operator-hud.js` | Reuses `measureWorkingTree` with the existing `options.execGit` seam so the HUD `dirty` line is measured too. |
| `tests/eos-post-l26-b-doctor-hud-honesty.test.js` | RED cases for F1/F2/F3 (see spec). Existing fixture-based tests keep passing because fixtures still inject values explicitly. |

## Epistemic labels

| Rendered | Meaning |
| --- | --- |
| `dirty=YES` / `dirty=NO` | Measured this run from `git status --porcelain` (or injected by a test). |
| `dirty=UNMEASURED` | No git available / `skipGit` / injected `undefined`. Optimistic result stays `DEFERRED`. |
| `source=<sha7>` | Measured via `git rev-parse HEAD` (or injected). |
| `source=UNKNOWN` | git unavailable; `HONESTY_REVISION` stays `NOT_VERIFIED`. |

## Fail-closed rules

- `measured === false` ⇒ `optimistic_allowed = false` (same as dirty). Unknown is never optimistic.
- git errors are captured in `revision.error` / `dirty.error` and never thrown out of the CLI.
- `--json` output exposes `measured` and `informational` so downstream rituals (T8 dirty-defer,
  doctor ritual automation port) can branch on them without parsing text.

## Verdict consistency

`report.ok` and `report.failed` remain the presence/light gate only. Informational honesty checks
are listed under `report.honesty.checks` and rendered in their own block. Rationale: making
freeze≠HEAD a hard doctor failure would fail every feature branch by construction; that is a policy
change outside this envelope.

## Pending-port parser

`PENDING_PORT_RE = /\b([A-Z]{1,3}(?:\s*[–—-]\s*[A-Z]{1,3})?)\s+pending\b/g` (no `i`). The freeze
document only ever labels ports in uppercase (`FI–FM pending`, `CQ pending`). Lowercase prose such
as `was pending`, `is pending`, `still pending` must not match. Note the historical freeze ledger
still yields 100+ uppercase labels from closed ladders; narrowing extraction to the latest fence is
a separate proposal and is explicitly out of scope here.

## Out of scope

Fundacion, root npm deps, `PRODUCTION_READY`, freeze document edits, verify:strict check count,
new dashboards.
