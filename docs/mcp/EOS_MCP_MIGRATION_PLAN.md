# EOS MCP Surface Migration Plan (Zero-Downtime, Non-Breaking)
## Mission ID: EOS-MCP-SURFACE-RATIONALIZATION-001 — Phase 9 Deliverable

> [!IMPORTANT]
> **MODE: DESIGN ONLY — DO NOT EXECUTE WITHOUT HUMAN APPROVAL**
> This document outlines the reversible, small-batch, testable migration steps to rationalise the MCP surface from 74 uncurated tools to a 14-tool Canonical Surface and segregated Specialist/Lab surfaces.

---

### Migration Roadmap

#### STEP 1: Surface Configuration Tagging (Non-Breaking)
- **Action**: Add `surface: 'CANONICAL' | 'SPECIALIST' | 'LAB' | 'LEGACY'` metadata property to each entry in `CANONICAL_TOOLS` within `src/mcp-server.js`.
- **Validation**: Run `node --test tests/eos-local-contracts.test.js` (assert 0 contract regressions).
- **Rollback**: Revert `src/mcp-server.js` via Git.

#### STEP 2: Environment-Based Tool Filtering Gate
- **Action**: Introduce `EOS_MCP_SURFACE_FILTER` environment variable (defaults to `ALL` for backward compatibility, with options `CANONICAL`, `SPECIALIST`, `LAB`).
- **Validation**: Test `tools/list` with `EOS_MCP_SURFACE_FILTER=CANONICAL` returning exactly 14 tools.
- **Rollback**: Default variable to `ALL`.

#### STEP 3: Deprecation Warning Emission on Simulation Tools
- **Action**: Update simulation handlers to include `warning: "DEPRECATED_SIMULATION_STUB: This tool is scheduled for relocation to eos-lab MCP."` in their JSON-RPC responses.
- **Validation**: Verify existing tests receive the warning without breaking assertions.
- **Rollback**: Remove warning property.

#### STEP 4: Segregation of Lab & Simulation Tools to `eos-lab` Server
- **Action**: Move the 22 simulation tools and 6 experimental tools to a dedicated secondary server `src/lab-mcp-server.js` (`eos-lab`).
- **Validation**: Run `tests/mcp-*.test.js` against `eos-lab` server endpoint.
- **Rollback**: Keep both servers active concurrently.

#### STEP 5: Canonical Surface Lock & Golden Path Hardening
- **Action**: Lock `src/mcp-server.js` to expose only the 14 Canonical Tools by default.
- **Validation**: Run full E2E test suite `npm run test:core` ensuring exit code 0.
- **Rollback**: Set `EOS_MCP_SURFACE_FILTER=ALL`.
