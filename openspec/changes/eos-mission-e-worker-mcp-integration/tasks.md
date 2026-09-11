# Tasks — eos-mission-e-worker-mcp-integration (Mission E)

## Step 0: Branch

- [ ] Create isolated worktree Eos-mission-e + branch grok/mission-e-worker-mcp-integration from origin/main (~4413aa7)
  - BLOCKED: host Shell cannot spawn powershell.exe (ENOENT). Payload staged at Eos-mission-e-payload + MISSION_E_BOOTSTRAP.ps1

## Step 1: OpenSpec FIRST

- [x] .openspec.yaml, proposal.md, design.md, tasks.md, specs/worker-mcp-integration/spec.md (EARS/BDD)

## Step 2: TDD + implement

- [x] Import McpCapabilityRouter (read-only); buildComputePlan → mcpEnvelope
- [x] executeComputeRun enforceMcp → MCP_CAPABILITY_DEFICIENT before diff
- [x] sealComputeRunCustody includes mcp_envelope (append after identity gate; L0 sealVerifyReceipt whitelists)
- [x] CLI --mcp-check / --enforce-mcp (exit 4)
- [x] tests/runners/eos-compute-worker-mission-e.test.js
- [x] Add basename to SLIM_SUITE_EXCLUDES; wire test:compute-worker-e

## Step 3: Verify

- [x] npm run test:compute-worker-e ALL PASS (box harness: 10/10)
- [ ] slim discovery ≤145 (exclude added; needs full worktree recount)
- [ ] npm run verify:strict EXIT 0 (needs host worktree)

## Step 4: Commit + push (no PR)

- [ ] Conventional commit feat(compute-worker): integrate McpCapabilityRouter (SPEC-0010); push origin; no PR; no AI attribution
