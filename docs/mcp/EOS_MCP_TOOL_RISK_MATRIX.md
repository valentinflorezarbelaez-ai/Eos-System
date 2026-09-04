# EOS MCP Tool Risk Matrix & Vulnerability Assessment

---

### Risk Classification Methodology

- **CRITICAL RISK**: Tools capable of wiping state, halting entire system execution, or bypassing core safety boundaries.
- **HIGH RISK**: Tools that write files to disk, execute external child processes, alter mission FSM phases, or execute automated repair loops.
- **MEDIUM RISK**: Tools that append transactions to the cryptographic ledger, mutate in-memory graphs, or modify feature DoD states.
- **LOW RISK**: Pure read-only queries, deterministic mathematical functions, and in-memory simulation stubs.

---

### High & Critical Risk Tools Analysis

| Tool Name | Risk Level | Authority | Danger Vector / Impact | Guardrails & Mitigation |
|---|---|---|---|---|
| `eos.fdir.trip` | **HIGH** | A2 | Trips the global FDIR safe-mode breaker, halting all mutating operations across the control plane. | Requires Level 2 Authority (A2) + explicit justification string. |
| `eos.fdir.recover` | **HIGH** | A1 | Physically overwrites corrupted governance files (`.cursorrules`, `CONSTITUTION.md`) with baseline contents. | SHA-256 integrity hash verification before applying disk writes. |
| `eos.scaffolder.execute` | **HIGH** | A1 | Spawns `node` child_process to execute tests in an autonomous repair loop (TDD auto-heal). | Bounded by `maxIterations` (default 5); logs execution trace to ledger. |
| `eos.orchestrator.rollback` | **HIGH** | A1 | Rolls back mission phase state in the FSM and mission orchestrator chain. | Requires explicit justification reason; logged permanently in history. |
| `eos.orchestrator.init` | **HIGH** | A1 | Initializes new mission FSM and registers governance roots in the ontology graph. | Strict state transition table validation; rejected if invalid ID. |
| `eos.orchestrator.advance` | **HIGH** | A1 | Advances mission to next SDD phase gate. | Mandatory SHA-256 evidence hash validation before unlocking phase transition. |
| `eos.scaffolder.clean` | **MEDIUM** | A1 | Writes physical spec, test, domain, and adapter files to disk. | Strict regex name validation (`/^[a-z0-9-]+$/`) and `EOSProcessGovernor` envelope. |
| `eos.evidence.record` | **MEDIUM** | A1 | Creates and writes physical `EVD-*.json` files to disk in `.missions/<id>/evidence/`. | Scope restricted to mission evidence directory; blocked in read-only mode. |
| `eos.kernel.ledger` | **MEDIUM** | A1 | Appends persistent state mutation records to the cryptographic ledger. | Monotonic append-only integrity; blocked in read-only mode. |

---

### Bypass Vulnerabilities & Exploitation Vectors

#### 1. Simulation Assurance Illusion (High Risk)
- **Vulnerability**: Tools like `eos.environment.sandbox.execute` and `eos.security.adversarial.review` claim to run MicroVM sandboxes and CodeQL scans, but return hardcoded exit code 0 and mock verification receipts.
- **Exploitation**: An LLM agent relying on these tools will commit insecure code or unvalidated scripts believing they passed rigorous automated sandboxing.
- **Mitigation**: Segregate or remove simulation tools from the primary MCP server exposed to production agents.

#### 2. Evidence Hash Spoofing on Phase Gates (Medium Risk)
- **Vulnerability**: `eos.orchestrator.advance` verifies that `hashEvidencia` starts with `sha256-` or is a 64-character hex string, but does not independently verify that the corresponding evidence JSON file on disk contains exit code 0 from a real test run unless combined with `eos.verifier.run`.
- **Exploitation**: An agent could generate a random 64-character hex hash to advance past a phase gate without running tests.
- **Mitigation**: Wire `eos.orchestrator.advance` to look up the physical `EVD-*.json` file and verify its cryptographic signature and test assertions before transitioning.

#### 3. Advisory Write Barrier Bypass (Medium Risk)
- **Vulnerability**: `eos.workspace.barrier_check` is an informational check. If an agent performs raw filesystem operations (outside MCP) without consulting the barrier, the write barrier cannot physically block the OS write.
- **Mitigation**: Ensure all file write operations pass through `guardrail-sandwich.js` or native OS-level read-only permissions.
