# EOS BYPASS THREAT MODEL & ADVERSARIAL ANALYSIS
**Document ID:** `SEC-EOS-THREAT-MODEL-2026`  
**Classification:** `RED_TEAM_THREAT_MODEL`  

---

## 1. Adversarial Bypass Vectors & Defense Countermeasures

| Attack Vector | Threat Scenario | Current Defense | Residual Risk | Target P0 Hardening |
|---|---|---|---|---|
| **FSM Direct Mutation** | Agent modifies `mission-package.json` directly to jump to `EXECUTION`. | `AuthorityTruthSource` compares state against cryptographically hashed ledger history. | Low. | Invalidate mission package if ledger chain hash mismatches. |
| **HITL Approval Bypass** | Agent generates fake approval text in chat to proceed without human consent. | `HitlGatekeeper` validates structural JSON receipt signed with valid `plan_hash`. | Zero inside MCP/CLI. | Enforce explicit human public key signature verification. |
| **Write Barrier Escape** | Script executes `fs.writeFileSync('../Fundacion/file.js')` bypassing MCP tool. | Checked at MCP layer via `eos.workspace.barrier_check`. | Medium (for untrusted local scripts). | Wrap execution in sandboxed worker threads with locked write roots. |
| **Token Inflation Injection** | Agent or IDE pads prompt with duplicate files to drain budget. | `EOSContextCompiler` computes SHA-256 fingerprints and aborts with `TOKEN_INFLATION_VIOLATION`. | Zero. | Maintain strict deduplication. |
| **State Desynchronization** | Operator uses `eos.orchestrator.init` while another tool calls `eos.mission.start`. | None currently (dual state vulnerability). | **HIGH (P0 finding).** | Consolidate orchestrator into a derived lens of `AuthorityTruthSource`. |
| **Replay Attack** | Agent reuses previous valid HITL receipt for new unapproved plan. | Nonce and `plan_hash` must match. | Zero. | Mark nonce as consumed in persistent ledger. |
