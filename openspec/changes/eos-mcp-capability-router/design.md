# Design — Dynamic MCP Capability Router (Ladder 11 Core)

## Architectural Role & Boundary

The `McpCapabilityRouter` lives under `src/core/mcp/mcp-capability-router.js`.
It sits between Task Decomposition / Orchestration and the MCP Client runtime, determining which MCP servers are projected into an agent's context for a given unit of work.

```text
+-----------------------+
| OpenSpec Task / Phase |
+-----------+-----------+
            |
            v
+-----------------------+
|  McpCapabilityRouter  |  <--- config/mcp/eos-mcp.ssot.json
|                       |  <--- Available Server Registry
+-----------+-----------+
            |
            v
+-------------------------------+
|  McpCapabilityEnvelope (v1)   |
|  - resolvedServers            |
|  - profile (L0 / L1)          |
|  - authority (writeAllowed)   |
|  - status (RESOLVED/DEFICIENT)|
+-------------------------------+
```

## Capability Taxonomy

| Capability Key | Primary Domain | Canonical MCP Servers |
| --- | --- | --- |
| `DESIGN` | UI/UX & Component Styling | `StitchMCP`, `figma`, `figma-desktop`, `mobbin` |
| `BROWSER_QA` | E2E QA, DOM, a11y, Performance | `chrome-devtools-mcp`, `playwright` |
| `DATABASE` | Schema, SQL, Migrations | `supabase`, `postgres` |
| `VCS` | Git, Branches, PRs, Commits | `github`, `git` |
| `MEMORY` | Causal learning, Cross-session memory | `engram`, `memory` |
| `PROJECT_INTAKE` | Epics, Stories, Backlog, Docs | `atlassian-mcp-server`, `notion` |
| `RESEARCH` | Web discovery, Documentation lookup | `brave-search`, `fetch`, `context7` |
| `REASONING` | Formal multi-step reasoning chains | `sequential-thinking` |
| `CORE_GOVERNANCE`| Kernel invariants, Write Barrier, Ledger | `eos-local` |

## Envelope Structure (`eos.mcp_capability_envelope.v1`)

```javascript
{
  schema: 'eos.mcp_capability_envelope.v1',
  phase: 'APPLY', // INTAKE, SPEC, PLAN, APPLY, VERIFY, REVIEW
  profile: 'L1_LOCAL_GOVERNED', // L0_READONLY or L1_LOCAL_GOVERNED
  capabilities: ['VCS', 'BROWSER_QA'],
  resolvedServers: ['github', 'chrome-devtools-mcp', 'eos-local', 'engram'],
  missingRequiredServers: [],
  status: 'RESOLVED', // 'RESOLVED' or 'DEFICIENT'
  authority: {
    writeAllowed: true,
    writeBarrierEnforced: true,
    restrictedRoots: ['Fundacion', 'docs/governance']
  },
  timestamp: '2026-09-11T...'
}
```

## Least-Privilege Authority Rules

1. If `phase` is in `['INTAKE', 'SPEC', 'PLAN', 'VERIFY', 'REVIEW']`:
   - `profile` = `'L0_READONLY'`
   - `authority.writeAllowed` = `false`
2. If `phase` is `'APPLY'`:
   - `profile` = `'L1_LOCAL_GOVERNED'`
   - `authority.writeAllowed` = `true`
3. Always include `eos-local` and `engram` as baseline core servers for causal memory and invariant checks unless explicitly excluded.
4. Fail-closed: If any requested capability has no available server in the registry, `status` becomes `'DEFICIENT'` and `missingRequiredServers` enumerates the gap.
