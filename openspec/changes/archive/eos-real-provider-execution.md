# Archive note — eos-real-provider-execution

Archived: 2026-09-24

Delta merged into `openspec/specs/real-provider-execution/spec.md`.
Change folder retained at `openspec/changes/eos-real-provider-execution/` (artifacts updated after apply).

All 3 slices (Fases 1, 2, 3) executed with 100% strict TDD:
- Unit 1: OpenRouterAdapter + LlmAdapterRegistry mapping + Law VI allowlist.
- Unit 2: enrutarMisionReal + ECR budget gate + D4 error bridge + probeProviderHealth.
- Unit 3: MCP handlers re-wired to real governed dispatch, fail-closed flips confirmed in tests/mcp-stdio-smoke.test.js (MCP-04) and tests/mcp-readonly-guard.test.js (GUARD-07).

Deterministic Evidence:
- `npm run test:real-provider`: 19/19 passing tests.
- `npm run verify:strict`: 914/914 green checks (0 failures).

Official OpenSpec CLI (`openspec archive`) was **not** run: binary not on PATH. That is `BLOCKED`, not faked.

Archive is not a release. Merge to `main` remains human / HITL / write-barrier.
