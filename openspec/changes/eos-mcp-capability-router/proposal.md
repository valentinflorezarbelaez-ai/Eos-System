# Proposal — Dynamic MCP Capability Router & Multi-Tool Orchestration Engine

## Why

In complex multi-agent software engineering, injecting dozens of MCP server tool definitions into every prompt destroys the LLM context window, balloons token consumption, and exponentially increases hallucination rates. Conversely, restricting agents to hardcoded, static tools blinds them when a task requires specialized capabilities (e.g. Figma/Stitch for UI design, Chrome DevTools/Playwright for visual QA and accessibility, Supabase/PostgreSQL for persistence, Atlassian/Notion for ticket intake, or GitHub for PR management).

Furthermore, `docs/harness/CONTEXT_PACK_TPC.md` established the static Tool/Prompt/Context index, but explicitly recorded that it was a map rather than a runtime orchestrator.

EOS requires an objective, conscious, and deterministic **Dynamic MCP Capability Router** (`McpCapabilityRouter`) that:
1. Declaratively maps task requirements and domain intent to the exact minimal subset of MCP servers needed.
2. Projects an isolated MCP tool profile per task (reducing token overhead by >75%).
3. Enforces least-privilege authority boundaries fail-closed (`L0_READONLY` during exploration, review, and verification; `L1_LOCAL_GOVERNED` only during apply).
4. Verifies MCP connectivity and server availability beforehand, failing closed with precise diagnostics if a critical server is absent.

## What

1. **OpenSpec Change Envelope**:
   - `openspec/changes/eos-mcp-capability-router/` (`.openspec.yaml`, `proposal.md`, `design.md`, `specs/mcp-capability-router/spec.md`, `tasks.md`).
2. **Core Implementation**:
   - `src/core/mcp/mcp-capability-router.js` (Ponytail Tier 2, pure Node.js standard library, zero external dependencies).
   - Domain capability catalog (`DESIGN`, `BROWSER_QA`, `DATABASE`, `VCS`, `MEMORY`, `PROJECT_INTAKE`, `RESEARCH`, `REASONING`, `CORE_GOVERNANCE`).
   - `resolveMcpEnvelope({ capabilities, domain, phase, taskText, availableServers })`.
   - `checkMcpAvailability(resolvedServers, availableConfig)`.
   - Phase-based authority and write barrier boundary attachment.
3. **Comprehensive Test Suite (TDD RED -> GREEN)**:
   - `tests/mcp-capability-router.test.js` validating:
     - Exact minimal server projection for various domain tokens.
     - Annotation parsing from task descriptions (`@needs(VCS, BROWSER_QA)`).
     - Phase-based profile enforcement (`L0_READONLY` for INTAKE/VERIFY, `L1_LOCAL_GOVERNED` for APPLY).
     - Fail-closed behavior on missing or unconfigured critical servers.
     - Immutability of resolved envelopes.
4. **Verification & Invariants**:
   - Wire `package.json` script `test:mcp-router`.
   - Add to `SLIM_SUITE_EXCLUDES` in `scripts/test-runner.js` to preserve TR-01 ceiling (<= 145).
   - Maintain `npm run verify:strict` at 914/914 green.
   - `PRODUCTION_READY=NO`, `Fundacion Δ=0`, `AT_CEILING: 35/35 schemas` (pure code logic, zero new schemas).

## Routing

**SDD** — ZERO vibe coding. Antigravity-first.
