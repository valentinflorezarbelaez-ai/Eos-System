# Proposal — Mission E: McpCapabilityRouter × Compute Worker (SPEC-0010)

## Why

SPEC-0009 delivered `McpCapabilityRouter` (capability projection + DEFICIENT fail-closed). SPEC-0008 Phase 3 delivered the headless compute worker with custody sealing. Operators still lack a governed bridge: compute plans must carry an MCP envelope, enforced runs must abort before diffs when capabilities are DEFICIENT, and custody receipts must record the resolved envelope.

## What (this change)

1. OpenSpec change envelope `openspec/changes/eos-mission-e-worker-mcp-integration/`.
2. Wire `scripts/runners/eos-compute-worker.js` to import real `McpCapabilityRouter` (no `src/core` mutation):
   - `buildComputePlan` sets `plan.mcpEnvelope` via `resolveMcpEnvelope` (APPLY phase; tasks → taskText).
   - `executeComputeRun({ enforceMcp: true })` checks capability availability; on DEFICIENT returns `MCP_CAPABILITY_DEFICIENT` before any `applyDiff`.
   - `sealComputeRunCustody` includes `mcp_envelope` in `sealVerifyReceipt` payload.
3. CLI flags: `--mcp-check` (print projection, exit 0), `--enforce-mcp` (exitCode 4 on DEFICIENT).
4. Tests `tests/runners/eos-compute-worker-mission-e.test.js`; basename in `SLIM_SUITE_EXCLUDES`; `npm run test:compute-worker-e`.

## Definition of Done

- Branch `grok/mission-e-worker-mcp-integration` from origin/main (~4413aa7).
- `npm run test:compute-worker-e` PASS; slim ≤145; `npm run verify:strict` EXIT 0.
- Conventional commit without AI attribution; branch pushed; **no PR**.
- `PRODUCTION_READY=NO`; Fundacion Δ=0; AT_CEILING.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- Mutating `src/core` (including adding methods to McpCapabilityRouter)
- New npm dependencies / JSON schemas
- Opening or merging a PR (parent HITL)
