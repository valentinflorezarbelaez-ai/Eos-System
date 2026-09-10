# Tasks — eos-s6-model-routing-ratchet

## Step 0: Branch

- [x] Create `cursor/eos-s6-model-routing-ratchet` from S5 tip `cursor/eos-s5-mcp-tool-keep-inventory`

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: Docs + lock

- [x] `docs/harness/MODEL_ROUTING.md`
- [x] `docs/harness/RATCHET_RITUAL.md`
- [x] ADR-0018
- [x] `scripts/lib/model-routing-ratchet-lock.js`
- [x] Wire `scripts/verify-eos.js` 3g15 + REQUIRED_PATHS
- [x] `tests/eos-s6-model-routing-ratchet.test.js` + `test:s6`
- [x] Evidence + freeze note + matrix MEASURED row

## Step 3: Verify

- [ ] `npm run test:s6` PASS
- [ ] `npm run verify:strict` includes S6 lock green
- [ ] PRODUCTION_READY=NO; Fundacion Delta=0; DEFER dirty

## Step 4: Push (no PR)

- [ ] Commit + push; report SHA
