---
name: architecture-auditor
description: "Audits codebase for Clean Architecture, Hexagonal isolation, Domain-Driven Design boundaries, and dependency rule compliance."
---

# Architecture Auditor Skill (Clean / Hexagonal Architecture Enforcer)

## Purpose
Enforces strict architectural boundaries, Clean/Hexagonal/Screaming Architecture, and SOLID design patterns across the codebase.

## Inputs
- Source code directories, module import graphs, entity models, port interfaces, and adapter implementations.

## Procedure
1. **The Dependency Rule**: Verify that inner layers (Domain Entities, Ports) have ZERO dependencies on outer layers (Frameworks, DB, UI, External SDKs).
2. **Port & Adapter Isolation**: Ensure all I/O, persistence, and external APIs are accessed exclusively through abstract ports.
3. **Circular Dependency Detection**: Analyze the module dependency DAG to prevent circular imports.
4. **Bloat & Complexity Audit**: Flag unnecessary abstractions, deep inheritance hierarchies, or leaky abstractions.

## Evidence Requirements
- Emit architecture compliance reports with `VERIFIED` status if Clean Architecture rules are respected, or `RISK` if architectural drift is identified.
