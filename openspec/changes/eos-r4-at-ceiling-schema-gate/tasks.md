# Tasks — eos-r4-at-ceiling-schema-gate

## Step 0: Setup feature branch (MANDATORY FIRST)

- [x] Create and switch to `cursor/eos-r4-at-ceiling-schema-gate` from main tip `a4917bbc296eb570dd881cf63a6c627fd2faa233`
- Evidence: `git rev-parse --abbrev-ref HEAD`

## Step 1: OpenSpec artifacts FIRST

- [x] Create `openspec/changes/eos-r4-at-ceiling-schema-gate/` with `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta `specs/complexity-budget-gate/spec.md`
- Consulted: `openspec/config.yaml`, `docs/openspec-tasks-mandatory-steps.md`, `docs/base-standards.md` / ADR-0010

## Step 2: TDD RED

- [x] Add `tests/eos-r4-at-ceiling-schema-gate.test.js` that FAIL before implementation (import missing lock / assert deny behaviors)
- Evidence command: `node --test tests/eos-r4-at-ceiling-schema-gate.test.js` (expect non-zero)

## Step 3: Implement minimal lock + verify wire (GREEN)

- [x] Implement `scripts/lib/complexity-budget-lock.js` (`auditComplexityBudgetLock`)
- [x] Wire into `scripts/verify-eos.js` (import + REQUIRED_PATHS + strict audit block)
- [x] Document AT_CEILING new-schema forbidden policy (budget policy note + Spanish evidence)
- Evidence: RED to GREEN on same test file

## Step 4: Triangulate edge cases

- [x] WITHIN_BUDGET under ceiling (temp fixture) allow
- [x] AT_CEILING exact (real tree 35/35) allow
- [x] OVER (count > max / extra schema file fixture) deny
- [x] Dishonest WITHIN_BUDGET at ceiling deny
- [x] Missing counting_rule deny
- Evidence: `node --test tests/eos-r4-at-ceiling-schema-gate.test.js`

## Step 5: package.json + evidence + freeze

- [x] Add `package.json` script `test:r4`
- [x] Spanish evidence `docs/releases/EOS_R4_AT_CEILING_SCHEMA_GATE_2026-09-09.md`
- [x] Freeze note in `docs/releases/EOS_FREEZE_GATE_STATUS.md`
- Leave DEFER dirty unstaged

## Step 6: Agent-executed verification (MANDATORY — zero user delegation)

- [x] Run `npm run test:r4`
- [x] Run related `npm run test:q4`
- [x] Run `npm run verify:strict`
- [x] Capture exit codes in evidence doc

## Step 7: Endpoint / API contract verification

- [x] N/A for UI/HTTP — R4 is verify/governance lock only. Surrogate: `node scripts/verify-eos.js --strict --json` and assert report includes complexity-budget-lock checks / no failures from this gate on clean tree

## Step 8: UI and E2E

- [x] N/A — no operator UI surface in R4

## Step 9: Commit + push (no PR merge)

- [x] Commit R4 artifacts only (do not stage DEFER dirty)
- [x] Push branch `cursor/eos-r4-at-ceiling-schema-gate`
- [x] Do NOT open/merge PR
