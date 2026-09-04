# EOS Component Quarantine & Safe Retirement Plan
**Document ID:** `EOS-QUARANTINE-001`

---

### 3-Stage Reversible Quarantine Protocol

#### Stage 1: Logical Isolation (Zero Risk)
- Tag tools in `CANONICAL_TOOLS` with `surface: 'LAB'`.
- Default MCP server exposes only the 14 Canonical Tools.

#### Stage 2: Physical Relocation to `EOS-Lab/`
- Relocate 22 simulation handlers to `EOS-Lab/mcp/lab-mcp-server.js`.
- Move isolated tests to `EOS-Lab/tests/`.

#### Stage 3: Verification & Archival
- Run core regression suite `npm run test:core` ensuring exit code 0.
- Archive legacy stubs in `docs/archive/`.
