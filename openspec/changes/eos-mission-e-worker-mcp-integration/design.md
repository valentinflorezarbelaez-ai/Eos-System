# Design — Mission E (SPEC-0010)

## Real API (SPEC-0009 — read-only import)

`src/core/mcp/mcp-capability-router.js` exports:

- `McpCapabilityRouter` with `resolveMcpEnvelope({ capabilities, taskText, phase, availableConfig })`
- Envelope fields: `status` (`RESOLVED` | `DEFICIENT`), `resolvedServers`, `missingRequiredServers`, `profile`, `authority`, `PRODUCTION_READY: 'NO'`
- **No** `checkCapabilityAvailability` instance method on the shipped router

Worker-local `checkCapabilityAvailability(envelope)` therefore gates on `envelope.status` (fail-closed). If a future router method appears, callers may prefer it without changing L0.

## Plan envelope

`buildComputePlan`:

1. Join checkbox task texts into `taskText` (preserves `@needs(...)` annotations).
2. Call `router.resolveMcpEnvelope({ phase: 'APPLY', taskText, availableConfig? })`.
3. Attach immutable-ish `plan.mcpEnvelope`.

Injectable `mcpRouter` / `availableConfig` / `mcpBaseDir` for tests.

## Enforce gate

`executeComputeRun({ enforceMcp: true })`:

1. BEFORE `applyDiff`, run `checkCapabilityAvailability(plan.mcpEnvelope)`.
2. If DEFICIENT → `{ ok: false, status: 'MCP_CAPABILITY_DEFICIENT', PRODUCTION_READY: 'NO' }` — zero diffs.
3. If `enforceMcp` false/omitted → existing Mission D behavior unchanged.

## Custody

`sealComputeRunCustody` builds a `sealVerifyReceipt` **input** payload that includes `mcp_envelope: plan.mcpEnvelope || null` and hashes it into `receipt_hash`.

Real `EvidenceCustody.sealVerifyReceipt` whitelists fields and would drop `mcp_envelope`. Without mutating `src/core`, the worker persists via `custody.append(VERIFY_RECEIPT, {…, mcp_envelope})` after the same BUILDER≠VERIFIER gate.

## CLI

| Flag | Behavior |
| --- | --- |
| `--mcp-check` | Build plan / resolve envelope; print JSON projection; exit 0 |
| `--enforce-mcp` | Pass `enforceMcp: true`; on DEFICIENT exit **4** |
| existing flags | unchanged (`--change`, `--root`, `--writes`) |

## L0 / invariants

No `src/core` mutation. No new npm deps. PRODUCTION_READY=NO. Fundacion Δ=0. AT_CEILING.
