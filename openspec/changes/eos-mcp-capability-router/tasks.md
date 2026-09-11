# Tasks — eos-mcp-capability-router (SPEC-0009)

## Step 0: Branch & Preconditions

- [x] Create feature branch `cursor/eos-mcp-capability-router`
- [x] Verify base tip is clean `main@db10bd3`

## Step 1: OpenSpec Envelope (Complete Specification)

- [x] `.openspec.yaml` created
- [x] `proposal.md` created
- [x] `design.md` created
- [x] `specs/mcp-capability-router/spec.md` with EARS + BDD created
- [x] `tasks.md` DAG created

## Step 2: TDD RED Phase

- [x] Write `tests/mcp-capability-router.test.js` covering all scenarios
- [x] Add `test:mcp-router` to `package.json`
- [x] Add `mcp-capability-router.test.js` to `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js`
- [x] Execute `npm run test:mcp-router` and verify it fails-closed (RED)

## Step 3: TDD GREEN Phase

- [x] Implement `src/core/mcp/mcp-capability-router.js` (Ponytail Tier 2, pure Node.js)
- [x] Implement `CAPABILITY_MAP` and default configurations
- [x] Implement `parseTaskCapabilities(taskText)`
- [x] Implement `resolveMcpEnvelope({ capabilities, domain, phase, taskText, availableConfig })`
- [x] Execute `npm run test:mcp-router` and verify 100% pass (GREEN)

## Step 4: Verification & Sensor Integrity

- [x] Run `npm run test:mcp-router` (all pass)
- [x] Run `node scripts/test-runner.js --slim` (discovery ceiling <= 145 maintained)
- [x] Run `npm run verify:strict` (all 914 checks green, 0 failures)
- [x] Verify `Fundacion Delta=0`, `PRODUCTION_READY=NO`, `AT_CEILING: 35/35 schemas` intact

## Step 5: Commit & Documentation

- [ ] Prepare conventional commit without AI attribution
- [ ] Record architectural discovery in Engram
