# EOS Final Tool Surface Architecture
## Segregation of Canonical, Specialist, Lab, and Legacy Surfaces
**Document ID:** `EOS-SURFACE-FINAL-001`

---

### Four-Tier Tool Surface Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIER A: CANONICAL AGENT SURFACE (14 Tools — 100% Default Visibility)     │
│ eos.kernel.boot, eos.authority.check, eos.context.compile,             │
│ eos.workspace.barrier_check, eos.intent.expand, eos.orchestrator.init,  │
│ eos.scaffolder.clean, eos.scaffolder.execute,                          │
│ eos.core.triamazikamno.validate, eos.verifier.run, eos.drift.detect,    │
│ eos.evidence.record, eos.orchestrator.advance, eos.mission.status       │
├─────────────────────────────────────────────────────────────────────────┤
│ TIER B: SPECIALIST SURFACE (28 Tools — Loaded On-Demand by Subagents)   │
│ FDIR Killswitch, Advanced Ontology Graph, Forensic Tescohan Auditing,   │
│ Conflict Arbiter, Sentinel Daemons, Markdown Exporters, Skill Routers   │
├─────────────────────────────────────────────────────────────────────────┤
│ TIER C: LAB & SIMULATION SURFACE (27 Tools — Segregated in eos-lab)     │
│ Pleroma Esoteric Abstractions, Dialectical AST Synthesizers, L0 Parser, │
│ Simulated MicroVM Sandboxes, CodeQL Heuristic Stubs                     │
├─────────────────────────────────────────────────────────────────────────┤
│ TIER D: LEGACY COMPATIBILITY SURFACE (1 Tool — Scheduled for Deletion)  │
│ eos.provider.health (Hardcoded NOT_CONFIGURED stub)                     │
└─────────────────────────────────────────────────────────────────────────┘
```
