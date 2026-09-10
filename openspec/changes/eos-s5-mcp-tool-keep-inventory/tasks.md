# Tasks — eos-s5-mcp-tool-keep-inventory

## Step 0: Branch

- [x] Create `cursor/eos-s5-mcp-tool-keep-inventory` from tip-refresh-post-specboot

## Step 1: OpenSpec FIRST

- [x] `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta spec

## Step 2: Inventory + lock

- [x] `docs/releases/EOS_S5_MCP_TOOL_KEEP_INVENTORY_2026-09-09.md`
- [x] `scripts/lib/mcp-tool-keep-lock.js`
- [x] Wire `scripts/verify-eos.js` 3g14 + REQUIRED_PATHS
- [x] `tests/eos-s5-mcp-tool-keep-inventory.test.js` + `test:s5`
- [x] Freeze note; matrix MEASURED row

## Step 3: Verify

- [ ] `npm run test:s5` PASS
- [ ] `npm run test:p5` PASS (catalog untouched)
- [ ] `npm run test:m4` PASS (tip pin unchanged)
- [ ] PRODUCTION_READY=NO; Fundacion Delta=0; DEFER dirty

## Step 4: Push (no PR)

- [ ] Commit + push; report SHA
