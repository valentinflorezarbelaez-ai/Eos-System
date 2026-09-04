# EOS MCP Governance Path & Mutation Control Matrix
## Mission ID: EOS-MCP-SURFACE-RATIONALIZATION-001 — Phase 5 Deliverable

---

### Governance Path Definition

Every mutating tool in EOS must traverse the 12-checkpoint Governance Pipeline:
```
CURSOR ➔ MCP ➔ TOOL ➔ AUTHORITY ➔ POLICY ➔ SCOPE ➔ MISSION RUNTIME ➔ FSM ➔ HITL ➔ EXECUTION ➔ VERIFICATION ➔ EVIDENCE
```

Control States:
- `ENFORCED`: Strict programmatic blocker with automated failure on violation.
- `ADVISORY`: Checked and reported, but execution does not halt automatically.
- `BYPASSABLE`: Can be evaded via alternative entrypoints or mock inputs.
- `MISSING`: Checkpoint is absent from the tool's execution path.

---

### Mutating Tools Governance Mapping Table

| Tool Name | Authority Check | Policy Check | Scope Enforcement | Runtime FSM Gate | HITL Gate | Execution Reality | Evidence Verification | Overall Governance Status |
|---|---|---|---|---|---|---|---|---|
| `eos.kernel.ledger` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.kernel.evidence` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.mission.start` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.mission.recover` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.ledger.update_feature` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.evidence.record` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (.missions/ only) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ENFORCED (EVD-XXXX.json Written) | **ENFORCED_WITH_GAPS** |
| `eos.fdir.trip` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Root Baselines) | MISSING | ENFORCED (A2 Gate) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED** |
| `eos.fdir.recover` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Root Baselines) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED** |
| `eos.fdir.ontology.sanitize` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Root Baselines) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED** |
| `eos.sentinel.toggle` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.blueprint.run` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.scaffolder.clean` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Subprocess/Disk) | ADVISORY | **ENFORCED** |
| `eos.ontology.link` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.orchestrator.init` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | ENFORCED (Transition Table) | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED** |
| `eos.orchestrator.advance` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | ENFORCED (Transition Table) | ENFORCED (Gate 8/9) | ENFORCED (Kernel/Memory) | ENFORCED (Hash Required) | **ENFORCED** |
| `eos.scaffolder.execute` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Subprocess/Disk) | ADVISORY | **ENFORCED** |
| `eos.orchestrator.rollback` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | ENFORCED (Transition Table) | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED** |
| `eos.core.triamazikamno.validate` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.audit.tescohan.scan` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.ledger.octave.advance` | ENFORCED (evaluateToolGuard) | ENFORCED (evaluateToolGuard mode) | ENFORCED (Workspace) | MISSING | MISSING (Autonomous) | ENFORCED (Kernel/Memory) | ADVISORY | **ENFORCED_WITH_GAPS** |
| `eos.pleroma.jubilee` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.kundalini.mirror` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.mercabah.crystallize` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.elemental.intercede` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.net.trogomesh.balance` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.amens.audit` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.jeu.watch` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.audit.tescohan.telescope` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.system.mahapralaya` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.anupadaka.shield` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.audit.telemetry.stream` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.moses.transmute` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.zodiac.shield` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.auxiliary.state` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.trees.anchor` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.anupadaka.fuse` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.voices.modulate` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.melchizedek.govern` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.environment.sandbox.execute` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.security.adversarial.review` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.sdlc.engineer.autonomous` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
| `eos.pleroma.akasha.engram` | ENFORCED (evaluateToolGuard) | MISSING | MISSING (In-Memory) | MISSING | MISSING (Autonomous) | MOCK (Symbolic SHA-256) | MOCK (Hash Generated) | **BYPASSABLE (Simulation)** |
