# Eos- Architecture

> **Engineering Operating System** — Autonomous, reproducible, auditable engineering control plane with constitutional governance.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Runtimes (Copilot)                 │
│  Cursor │ GitHub Copilot │ Claude │ Custom                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ MCP (Model Context Protocol)
                     │ JSON-RPC 2.0
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   MCP Bridge (src/mcp/)                      │
│  • Tool dispatcher & routing                                 │
│  • Governance barrier validation                             │
│  • Request/response envelope (evidence custody)              │
│  • Error classification (JSON-RPC semantics)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Mission Runtime (src/mission-runtime/)           │
│  • Task execution & orchestration                            │
│  • Elevate state machine management                          │
│  • Evidence recording (immutable ledger)                     │
│  • Mission lifecycle (create → plan → package → verify)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Governance Engine (src/governance/)              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Constitutional Barriers                             │    │
│  │ • requiresTaskContract     ✓ Must declare outputs   │    │
│  │ • requiresOutputs          ✓ Must deliver evidence  │    │
│  │ • requiresRemediation      ✓ Must accept/reject     │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Transition Enforcer                                 │    │
│  │ • FSM validation (state → next_state)               │    │
│  │ • Barrier pre-checks before transition              │    │
│  │ • Nonce replay detection                            │    │
│  │ • Idempotency keying                                │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Authority Truth Source (src/authority/)           │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Mission Ledger  │  │  Integrity       │                 │
│  │ (append-only)    │  │  Manifest        │                 │
│  │ • Events         │  │ • File checksums │                 │
│  │ • Transitions    │  │ • Dependency     │                 │
│  │ • Evidence refs  │  │   graph          │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authority Snapshot (immutable anchor)               │  │
│  │  • Digest of all mission state at checkpoint         │  │
│  │  • Cryptographic hash                               │  │
│  │  • Pre-checked before every transition               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  On-Disk State (.missions/)│
        │ • mission.json             │
        │ • authority-snapshot.json  │
        │ • return-package.json      │
        │ • evidence/                │
        └────────────────────────────┘
```

## Data Flow: Mission Lifecycle

### 1. **CREATE** — Task Contract
```
Agent submits task:
  POST /eos.mission.create
  {
    task_id: "TASK-001",
    title: "Refactor auth handler",
    outputs: [
      { id: "code", description: "Modified handler.go" },
      { id: "tests", description: "Test coverage 100%" }
    ]
  }
        ↓
MissionRuntime.createMission():
  • Validate outputs declared (requiresTaskContract barrier)
  • Initialize mission.json with VISION_INTAKE state
  • Create .missions/TASK-001/ directory
  • Record initial event in ledger
  • Return mission handle
        ↓
Agent receives:
  { mission_id, state, ledger_anchor }
```

### 2. **PLAN** — FSM Transitions
```
Agent calls eos.mission.plan:
        ↓
TransitionEnforcer.validate():
  1. Load authority-snapshot.json
  2. Check snapshot integrity (hash match)
  3. Check nonce (not replayed)
  4. Validate FSM edge: VISION_INTAKE → PLANNING (exists in table)
  5. Pre-check all constitutional barriers:
     - requiresTaskContract? ✓ (checked at CREATE)
     - requiresOutputs? (not yet, will check at PACKAGE)
     - requiresRemediation? (not yet, will check at VERIFY)
  6. If all pass → allow transition
        ↓
MissionRuntime.planMission():
  • Update mission.json: state = PLANNING
  • Record transition event in ledger
  • Snapshot new authority state
        ↓
Agent receives: mission with PLANNING state
```

### 3. **WORK** — Autonomous Execution
```
Agent executes tasks via MCP:
  POST /eos.workspace.record_evidence
  {
    evidence_id: "EVD-001",
    type: "code_change",
    content: { files: [...], diff: "..." }
  }
        ↓
McpMissionBridge.recordEvidence():
  1. Validate evidence_id (no path traversal: /^[A-Za-z0-9._-]+$/)
  2. Call barrier_check to ensure write is within .missions/TASK-001/
  3. Record to evidence/ directory
  4. Append evidence_ref event to ledger
  5. Update authority snapshot
        ↓
Evidence immutable in ledger (cannot delete, can only append)
```

### 4. **PACKAGE** — Return Package
```
Agent submits final deliverable:
  POST /eos.mission.package
  {
    outputs: [
      { id: "code", path: "code_change.md" },
      { id: "tests", path: "test_results.json" }
    ]
  }
        ↓
TransitionEnforcer validates FSM + barriers:
  • Check: outputs_declared vs outputs_delivered (requiresOutputs)
  • Check: all outputs have evidence trail
  • FSM edge: (any state) → PENDING_VERIFICATION exists?
        ↓
MissionRuntime.packageMission():
  • Create return-package.json (immutable)
  • Write checksums to integrity manifest
  • Update state → PENDING_VERIFICATION
  • Snapshot authority state
        ↓
Agent sees: mission locked for verification phase
```

### 5. **VERIFY** — Governance Review
```
Human or automated verifier reviews:
  POST /eos.mission.verify
  {
    decision: "ACCEPT" | "REJECT",
    audit_notes: "Code review passed, tests pass, ..." 
  }
        ↓
TransitionEnforcer validates:
  • FSM: PENDING_VERIFICATION → VERIFIED (ACCEPT) or REJECTED (REJECT)
  • barrier: requiresRemediation (if REJECT, remediation path required)
        ↓
MissionRuntime.verifyMission():
  • Record verifier identity & decision
  • Append acceptance/rejection event (immutable)
  • If REJECT: mission enters remediation loop (requires new evidence)
  • If ACCEPT: advance to COMPLETED
  • Generate final authority snapshot
        ↓
Agent sees: mission state = VERIFIED or REJECTED
```

### 6. **REPORT** — Audit Trail
```
Agent/operator calls eos.mission.report:
        ↓
AuthorityTruthSource.getMissionReport():
  1. Load mission.json (current state)
  2. Replay all ledger events (immutable, append-only)
  3. Verify authority-snapshot at each checkpoint
  4. Validate integrity manifest (file checksums)
  5. Generate report:
     {
       mission_id,
       state_chain: [VISION_INTAKE → PLANNING → ... → VERIFIED],
       evidence_trail: [EVD-001, EVD-002, ...],
       verifier_decision,
       ledger_hash,
       integrity_status: "VALID" | "TAMPERED"
     }
        ↓
Report immutable: all state is cryptographically anchored
```

## Governance Barriers

### Constitutional Rules (checked before every transition)

#### 1. **requiresTaskContract**
- **When triggered:** At CREATE, must declare all outputs
- **What it checks:** `task.outputs` array has at least 1 entry, each with `id` and `description`
- **Violation:** Mission creation blocked with `INVALID_CONTRACT`
- **Why:** Prevents vague, unauditable tasks

#### 2. **requiresOutputs**
- **When triggered:** At PACKAGE, must have delivered all declared outputs
- **What it checks:** For each declared output, evidence exists with matching `id`
- **Violation:** Package rejected with `MISSING_OUTPUTS`
- **Why:** Prevents partial/incomplete deliverables

#### 3. **requiresRemediation**
- **When triggered:** If verification REJECT, must retry (no silent drop)
- **What it checks:** Mission enters remediation loop; must submit new evidence
- **Violation:** Mission state machine blocks completion until remediation approved
- **Why:** Prevents acceptance of rejected work

### Enforcement Layer

**Before every FSM transition:**
```javascript
TransitionEnforcer.validate(mission, targetState):
  1. Load authority-snapshot.json
  2. Hash current state → verify snapshot hash matches
     (detects tampering mid-chain)
  3. Check nonce: has this exact (mission, transition, nonce) been seen?
     → DENY (replay protection)
  4. Check FSM: does edge (current_state → targetState) exist?
     → DENY if not (state machine integrity)
  5. For each constitutional barrier on this edge:
     → Run barrier.check(mission, targetState)
     → If any returns false → DENY
  6. If all pass → allow transition
     → Record event in ledger
     → Generate new snapshot
     → Return success
```

## Security Model

### Threat Model

| Threat | Mitigation | Assurance |
|--------|-----------|----------|
| **Arbitrary file writes** | Path validation (`/^[A-Za-z0-9._-]+$/`), barrier_check scopes writes to mission directory | Regression test + mutation |
| **State tampering** | Cryptographic snapshots, ledger is append-only, pre-check before transition | Ledger hash mismatch blocks transition |
| **Replay attacks** | Per-mission nonce, ledger records each attempt | Duplicate nonce rejected |
| **Bypass constitutional rules** | Barriers evaluated before transition, not as afterthought | Mutation tests kill all bypass vectors |
| **Evidence destruction** | Evidence immutable (append-only ledger), return package sealed | Integrity manifest validates files |

### Assurance

- **Mutation Testing:** 25-case bypass battery with mutations; removing a barrier turns specific cases red
- **Clean-Clone Reproducibility:** Fresh clone on Linux: 772/772 tests pass
- **E2E Mission:** Real mission executed end-to-end with rejection mid-chain, remediation, final ACCEPT

## Request/Response Protocol

### MCP Tool Envelope

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "eos.mission.create",
    "arguments": {
      "task_id": "TASK-001",
      "outputs": [{ "id": "code", "description": "..." }]
    }
  }
}
```

**Success Response (200):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "mission_id": "TASK-001",
    "state": "VISION_INTAKE",
    "ledger_anchor": "abc123..."
  }
}
```

**Error Response (governance barrier violation):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "barrier": "requiresTaskContract",
      "reason": "No outputs declared",
      "mission_id": "TASK-001"
    }
  }
}
```

### Error Codes

| Code | Meaning | Example |
|------|---------|----------|
| `-32700` | Parse error | Invalid JSON |
| `-32602` | Invalid params | Missing required tool param |
| `-32603` | Internal error | Governance barrier violation |
| `-32000 to -32099` | Server error | Mission not found, I/O error |

## Component Details

### Authority Truth Source (`src/authority/`)

**Responsibilities:**
- Ledger persistence (append-only events)
- Integrity manifest (file checksums)
- Authority snapshot (immutable state anchor)
- Report generation (replay + validation)

**Key Classes:**
- `MissionLedger` — Event log, recovery, replay
- `IntegrityManifest` — File checksums, mutation detection
- `AuthoritySnapshot` — Cryptographic state anchor
- `AuthorityTruthSource` — Unified API

### Governance Engine (`src/governance/`)

**Responsibilities:**
- FSM definition (state chart, edges)
- Constitutional barriers (pre-transition checks)
- Transition enforcement (validation + ledger update)
- Nonce/idempotency tracking

**Key Classes:**
- `TransitionEnforcer` — FSM + barrier validation
- `ConstitutionalBarrier` — Base class for barriers
- `MissionFsm` — State machine definition

### Mission Runtime (`src/mission-runtime/`)

**Responsibilities:**
- Mission lifecycle (create, plan, package, verify, report)
- Elevate orchestration (strategy + control plane)
- Lazy initialization (no side effects until needed)
- Error handling + recovery

**Key Classes:**
- `MissionRuntime` — Orchestrator
- `MissionLedger` — Persistence
- `ElevateOrchestrator` — Strategy execution

### MCP Bridge (`src/mcp/`)

**Responsibilities:**
- JSON-RPC 2.0 protocol handling
- Tool dispatcher (route to Mission OS)
- Request/response envelope
- Evidence custody (recording with validation)
- Error classification

**Key Classes:**
- `EosMcpServer` — Main server
- `McpMissionBridge` — Mission API endpoint
- `ToolDispatcher` — Route to correct handler

## Testing Strategy

### Test Pyramid

```
           ▲
          ╱│╲
         ╱ │ ╲       E2E: Full mission chains (5-10 tests)
        ╱  │  ╲      - Clean clone reproducibility
       ╱   │   ╲     - Real-world scenarios
      ╱────┼────╲
     ╱     │     ╲   Integration: Cross-component (30-50 tests)
    ╱      │      ╲  - MCP ↔ Mission runtime
   ╱───────┼───────╲ - Governance ↔ Authority
  ╱        │        ╲
 ╱─────────┼─────────╲ Unit: Isolated (700+ tests)
                      - FSM logic, barriers, ledger
```

### Coverage Requirements

- **Foundation Layer** (Authority, Governance): 100% (mutations kill bypasses)
- **Core Layer** (Mission Runtime, MCP): ≥90% (critical paths fully covered)
- **Integration Layer** (Tools, Satellites): ≥80% (flexibility allowed)

### Test Categories

- **Bypass Battery** (25 cases, mutation-tested): Intentional rule violations
- **Portability** (clean-clone on Linux/Mac): OS-specific path handling
- **E2E** (real missions end-to-end): Full lifecycle with rejection, remediation
- **Property-Based** (Elevate strategies): State machine properties hold

## Deployment & Operations

### Local Development
```bash
node bin/eos.js                    # CLI
node bin/eos-doctor.js             # System diagnostics
npm run verify:strict              # Pre-commit validation (471 checks)
```

### Daemon Mode
```bash
node bin/eos-sentinel.js           # FDIR sentinel (failure detection & recovery)
node bin/eos-orchestrator.js       # Orchestration control plane
node bin/eos-hud.js                # HUD status display
node bin/eos-top.js                # Process monitor
```

### CI/CD
```bash
npm test                           # Run all tests (772 tests, ~3s)
npm run verify:strict              # Governance check (471 checks, ~50ms)
npm run ci                         # Full pipeline (contract + verify)
```

## Evolution & Governance

### Adding New Features

1. **If affects governance:** Write ADR, get 2 approvals
2. **If affects core:** Write ADR, 1 code review
3. **If affects integration:** Standard PR, 1 review

### Architectural Decisions

All decisions captured as ADRs in `docs/architecture/adrs/`. Each ADR includes:
- Context (why the decision was needed)
- Decision (what was chosen)
- Rationale (why this vs alternatives)
- Consequences (benefits + costs)
- Related ADRs (cross-references)

### Release Process

See `CHANGELOG.md` and `docs/guides/RELEASE.md`.

---

**Questions?** See CONTRIBUTING.md for how to ask, report issues, or propose changes.
