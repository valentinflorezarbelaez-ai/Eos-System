# Proposal — Mission F: Worker × MCP Adversarial Red-Team (SPEC-0010-ADV)

## Why

Mission E wired `McpCapabilityRouter` into the compute worker. Operators still need proof that the bridge is fail-closed under adversarial inputs: polluted `@needs`, path traversal, spoofed authority profiles, tampered custody envelopes, and DEFICIENT catalogs that must never touch disk.

## What (this change)

1. OpenSpec change envelope `openspec/changes/eos-mission-f-worker-mcp-adversarial/`.
2. Harden `scripts/runners/eos-compute-worker.js` (worker-side only):
   - Reject `%2e`/`%2f`/`%5c` and traversal segments in task text (`PATH_TRAVERSAL_REJECTED`).
   - `sanitizeMcpTaskText` rejects `__proto__` / `constructor` / `prototype` / non-identifier tokens (`MCP_CAPABILITY_REJECTED`).
   - Reject L0_READONLY + `writeAllowed` profile spoof (`MCP_PROFILE_SPOOF` / seal `MCP_ENVELOPE_TAMPERED`).
   - `sealComputeRunCustody` requires envelope, structural integrity, and re-resolve compare when config/router available.
3. Suite `tests/runners/eos-compute-worker-mission-f-adversarial.test.js` (F1–F10 + extras); basename in `SLIM_SUITE_EXCLUDES`; `npm run test:compute-worker-f`.

## Definition of Done

- Branch `grok/mission-f-worker-mcp-adversarial` from origin/main (~aaab3a2 tip-refresh post #114 or live tip).
- `npm run test:compute-worker-f` PASS; `npm run test:compute-worker-e` PASS; slim ≤145; `npm run verify:strict` EXIT 0.
- Conventional commit without AI attribution; branch pushed.
- `PRODUCTION_READY=NO`; Fundacion Δ=0; AT_CEILING.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- Mutating `src/core`
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
