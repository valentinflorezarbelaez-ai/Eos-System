# EOS Architecture Migration Plan (Phased Execution)
**Document ID:** MIG-PLAN-001  
**Status:** AWAITING_APPROVAL (Phase B)  

---

## Migration Sequence (5 Atomic Steps)

### Step 1: Entrypoint & MCP Server Consolidation
- Update `src/mcp-server.js` to remove legacy imports (`scripts/engine/mission-ledger.js`, `authority-adapter.js`, `context-compiler.js`) and route 100% of tool calls through `McpMissionBridge` and `MissionRuntime`.
- Update `package.json` `"scripts"`:
  - Change `"eos"` from `"node scripts/cli/eos.js"` $\rightarrow$ `"node bin/eos.js"`.
  - Retain `"eos:mission"` as alias to `"node bin/eos.js"`.

### Step 2: Duplication Retirement
- Quarantine duplicate files:
  - `scripts/engine/epistemic-evidence-engine.js`
  - `scripts/engine/hitl-gatekeeper.js`
  - `scripts/engine/sdd-fsm-engine.js`
- Mark `scripts/cli/eos.js` as DEPRECATED.

### Step 3: Historical Simulation Engine Segregation
- Relocate 84 historical simulation and canary scripts from `scripts/engine/` to `archive/historical_engines/` or `EOS-Lab/simulations/`.
- Reorganize associated tests into `tests/simulations/`.

### Step 4: Test Suite & Fixture Alignment
- Fix test fixture in `tests/operator-doctor.test.js` to include `docs/intelligence/EOS_GLOBAL_KNOWLEDGE.json` and `src/core/runtime/global-knowledge.js` in mock tmpdir.
- Re-run `node --test` and confirm 100% pass rate (896/896).

### Step 5: Git Canonicalization
- Apply updated `.gitignore`.
- Stage and commit canonical specifications, schemas, agent skills, and tests using conventional commits.
