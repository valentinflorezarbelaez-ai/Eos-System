# Proposal — Doctor/HUD honesty surface reports measured inputs only

## Status

`PROPOSED_AWAITING_HUMAN_L2_AUTHORIZATION`. All affected product files live under `src/core/`,
which is a frozen surface (`.cursor/rules/00-eos-operating-system.mdc` → "Do not mutate Core kernel
product code under `src/core/` unless a human explicitly authorizes that exact change"). No source
code was modified while drafting this envelope. `/apply` is blocked until the Product Owner records
authorization for the exact edits listed in `tasks.md`.

## Why

The post-L26 Workstream B honesty surface exists so operators never read an optimistic value that
was not measured. Three audit findings (`AUDIT_EXECUTED`, reproduced on `main@8903b578`, Linux,
Node v22.14.0) show the surface currently violates its own contract:

### F1 — Doctor prints `dirty=NO` on a dirty tree (unmeasured claim rendered as a fact)

```
$ echo "# tmp" >> CLEAN_CLONE.md && git status --porcelain
 M CLEAN_CLONE.md
$ node bin/eos-doctor.js | grep -E "VERDICT|HONESTY_DIRTY|dirty="
VERDICT: PASS
[PASS] HONESTY_DIRTY — working tree clean (honesty)
             dirty=NO  deferred=NO  blocked=NO
```

`runOperatorDoctorCli` never computes `dirty`; `evaluateDirtyState({dirty: undefined})` collapses
`undefined` into `dirty: false`, and the renderer prints `NO`. `bin/eos-hud.js` has the same gap
(`dirty=NO` with the same dirty tree). The dirty-defer ritual (T8) therefore cannot trigger from the
doctor/HUD path.

### F2 — Doctor never resolves live HEAD, so `HONESTY_REVISION` is permanently `FAIL` while `VERDICT: PASS`

```
$ node bin/eos-doctor.js | grep -E "VERDICT|HONESTY_REVISION|source="
VERDICT: PASS
[FAIL] HONESTY_REVISION — UNKNOWN — missing freeze or source revision (freeze=78141c3 source=null)
             freeze=78141c3  source=UNKNOWN  match=NO
```

`runOperatorDoctor` passes `options.sourceRevision || options.liveHead`, and the CLI supplies
neither. The HUD already resolves HEAD via `git rev-parse HEAD` (`observeFreezeTipVsHead`), so the
two surfaces disagree on the same checkout. In addition, `attachHonestyToDoctorReport` appends
`HONESTY_*` checks *after* `failed` and `ok` were computed, so `[FAIL]` lines coexist with
`VERDICT: PASS` and the JSON `failed` array omits them.

### F3 — `PENDING_PORT_RE` matches lowercase prose

```
$ node -e "import('./src/core/observability/doctor-hud-honesty.js').then(m =>
    console.log(JSON.stringify(m.extractPendingPorts('The receipt was pending review. Audit MEASURED: FI–FM pending.'))))"
["was pending","FI–FM pending"]
```

The regex uses the `i` flag with `[A-Z]{1,3}`, so any 1–3 letter lowercase word followed by
"pending" becomes a pending port. On the real `docs/releases/EOS_FREEZE_GATE_STATUS.md` (4915
lines) the extractor returns 114 labels including `was pending`, which is then printed in the
doctor, the HUD and the `HONESTY_PENDING_PORT` check detail.

## What

1. Doctor and HUD measure `dirty` from `git status --porcelain` (injectable `execGit`, fail-closed
   to `UNMEASURED`), and the renderer prints `dirty=UNMEASURED` when no measurement exists instead
   of `NO`.
2. Doctor resolves `sourceRevision` from `git rev-parse HEAD` the same way the HUD does, with the
   same injectable seam and the same `NOT_VERIFIED` fallback.
3. `HONESTY_*` checks are marked `informational: true` and excluded from `failed`/`ok` explicitly,
   or they are included before `ok` is computed. Either way the rendered verdict and the per-check
   lines must agree. The spec below picks the informational route to avoid turning every
   freeze≠HEAD divergence into a doctor failure (that would be a behavior change beyond honesty).
4. `PENDING_PORT_RE` drops the `i` flag so only uppercase port labels (`FI–FM pending`,
   `CQ pending`) match.

## Job to be done (`/enrich-us`)

- **User:** EOS operator / Human Director reading `eos:doctor` or `eos:hud` before a ritual.
- **Job:** Know whether the checkout is dirty and whether HEAD equals the freeze tip, without
  running git by hand.
- **Success signal:** Dirty tree ⇒ `dirty=YES`, `HONESTY_DIRTY` not PASS, optimistic result
  `DEFERRED`. Clean + matched ⇒ `ALLOW_OBSERVED_ONLY`. Unmeasurable ⇒ `UNMEASURED`, never `NO`.
  No lowercase prose appears as a pending port.
- **NO_BUILD?** No — the current surface asserts a clean tree it never checked.

## Routing (ADR-0010)

**SDD**, not DIRECT: product-code change under `src/core/`, existing test suite
(`tests/eos-post-l26-b-doctor-hud-honesty.test.js`) ⇒ Strict TDD receipts required, and the risk
tier is CRITICAL (frozen surface) ⇒ human authorization gate before `/apply`.

## NON-goals

- No `Fundacion/` writes (`Δ = 0`).
- No new root `package.json` dependencies (L0 `NODE_BUILTINS_ONLY`).
- Do not flip `PRODUCTION_READY`; do not reopen any closed ladder.
- Do not rewrite `docs/releases/EOS_FREEZE_GATE_STATUS.md` to "fix" the prose; the parser is the
  defect.
- Do not change the strict verifier check count.

## Approach

1. This envelope (`openspec/changes/doctor-hud-honesty-measured-inputs/`).
2. Human L2 authorization recorded (decision record or PR approval naming this change id).
3. `/apply` — RED tests first in `tests/eos-post-l26-b-doctor-hud-honesty.test.js`, then minimal
   GREEN edits limited to the four files in `.openspec.yaml`.
4. `/verify` — `node --test tests/eos-post-l26-b-doctor-hud-honesty.test.js`, `npm test`,
   `npm run verify:strict`, plus the three reproduction commands above re-run as GREEN evidence.

## Acceptance

Given/When/Then in `specs/doctor-hud-honesty/spec.md`.
