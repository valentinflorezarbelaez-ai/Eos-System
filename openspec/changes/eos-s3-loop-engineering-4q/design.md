# Design — eos-s3-loop-engineering-4q

## Approach (TDD)

1. OpenSpec FIRST (proposal/design/tasks/spec).
2. RED: `tests/eos-s3-loop-engineering-4q.test.js` asserts harness path, ADR-0017, lock module, verify wiring, 4Q needles, NON-CLAIM.
3. GREEN: implement `docs/harness/LOOP_ENGINEERING_4Q.md` + `ADR-0017` + `scripts/lib/loop-engineering-lock.js` + verify-eos wire + doctor NON-CLAIM + `test:s3`.
4. Evidence (ES) + freeze note.
5. Run `test:s3` + `verify:strict`; commit/push; **no PR**.

## SSOT path decision

**Chosen:** `docs/harness/LOOP_ENGINEERING_4Q.md` + `docs/architecture/adrs/ADR-0017-loop-engineering-4q.md`

Rationale:
- Harness matrix belongs beside `CONTEXT_PACK_TPC.md` (S2) under `docs/harness/`.
- Formal decision is ADR-0017 (next number after ADR-0016); ADR points to harness SSOT and **does not** rewrite ADR-0011 / ADR-0014.
- Mission loop MCP (ADR-0014) remains the stage FSM overlay; Loop Engineering 4Q is the **policy map** of guides/sensors across surfaces.

## Cycle (guides → act → sensors → feedback)

| Stage | Meaning in EOS |
| --- | --- |
| guides | Pre-act constraints and intent shaping (rules, plans, allowlists, doctor OBSERVED honesty) |
| act | Bounded execution under Write Barrier / mission-loop Act stage |
| sensors | Computational + inferential detectors (verify, CI, hooks post, fusion-light, adversarial, HITL) |
| feedback | Close the loop into policy/locks/reviews — not silent autonomous self-heal claims |

## 4Q matrix (map existing surfaces only)

### Feedforward × Computational
AGENTS.md, CLAUDE.md, .cursor/rules, hooks **pre**, linters, Write Barrier allowlist

### Feedforward × Inferential
plan mode / OpenSpec propose / doctor OBSERVED (honesty)

### Feedback × Computational
verify:strict, CI seam-pack, TDD, hooks **post**, complexity-budget / context-pack / sibling locks

### Feedback × Inferential
adversarial-review, fusion-light, human HITL

## Lock design (mirror context-pack-lock)

- Module: `scripts/lib/loop-engineering-lock.js`
- Export: `LOOP_ENGINEERING_INDEX`, `LOOP_ENGINEERING_REQUIRED_SECTIONS`, `LOOP_ENGINEERING_REQUIRED_PATHS`, `auditLoopEngineeringLock(rootDir, options)`
- Fail-closed: missing index OR missing required section needles OR missing PRODUCTION_READY=NO / NON-CLAIM language
- Wire: import + append REQUIRED_PATHS + strict block **3g11** after context-pack **3g10**
- Fixture overrides: `docText`, `docMissing`, `skipPathChecks`

## Doctor honesty (optional light)

Add one DOCTOR_NON_CLAIMS / report line: Loop Engineering policy ≠ verify:strict and ≠ productive autonomy (does not claim autonomous remediation).

## Constraints

- Fundacion Δ=0; PRODUCTION_READY=NO
- NON-CLAIM: policy ≠ productive autonomy; Loop ≠ verify:strict; doctor ≠ verify
- No new docs/schemas JSON (AT_CEILING)
- If TR-01 ceiling threatened → bump with evidence (expected headroom: live count ~122, ceiling 130)

## Verification

- `npm run test:s3`
- `npm run verify:strict`
