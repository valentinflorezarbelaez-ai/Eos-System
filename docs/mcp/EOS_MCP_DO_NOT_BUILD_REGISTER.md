# EOS MCP "Do Not Build" & Anti-Pattern Register
## Mission ID: EOS-MCP-SURFACE-RATIONALIZATION-001 — Phase 10 Deliverable

---

### Purpose
To permanently prevent the re-introduction of ungrounded abstractions, fictitious infrastructure simulations, speculative orchestration wrappers, and redundant tool interfaces into the EOS Mission OS core.

---

### Blacklisted Tool Patterns & Anti-Architectures

#### 1. Fictitious Infrastructure & Pseudo-Sandboxes
- 🚫 **DO NOT BUILD in-memory MicroVM stubs**: Tools like `eos.environment.sandbox.execute` that claim to launch gVisor, Docker, or WASM microVMs while only returning static strings must never be added to MCP. If sandbox capability is needed, integrate real Docker MCP or native OS execution.
- 🚫 **DO NOT BUILD pseudo-quantum or post-quantum stubs**: `eos.pleroma.anupadaka.shield`, `eos.pleroma.anupadaka.fuse`, and similar tools claiming "quantum lattice attestation" with Node SHA-256 strings are forbidden.

#### 2. False-Assurance Security Checkers
- 🚫 **DO NOT BUILD trivial regex filters claiming to be CodeQL/Semgrep**: `eos.security.adversarial.review` ran `.includes('TODO')` and claimed "zero vulnerabilities confirmed". This is dangerous and causes hallucinated security assurance. Real static analysis must invoke native tools.

#### 3. Ephemeral In-Memory Storage Claiming Database Persistency
- 🚫 **DO NOT BUILD mock database wrappers**: `eos.pleroma.akasha.engram` claimed SQLite FTS5 lexical indexing while only calculating an in-memory hash. Real persistence must use SQLite or Engram MCP.

#### 4. Redundant Presentation Adapters as Discrete MCP Tools
- 🚫 **DO NOT BUILD separate tools for different output formats**: Having `eos.mission.status`, `eos.report.generate`, and `eos.hud.dashboard` as 3 distinct MCP tools wastes agent context. Output formatting belongs in tool parameters (`format: "json" | "markdown" | "ansi"`).

#### 5. Dual Truth-Source Mission Initializers
- 🚫 **DO NOT BUILD parallel mission creators**: Having both `eos.mission.start` (creating files in `.missions/`) and `eos.orchestrator.init` (registering FSM state in `EOSOrchestrator`) creates state desynchronization. Mission lifecycle must have a single entrypoint.
