# Architecture Documentation

This directory contains the authoritative system design, decision records (ADRs), and technical guides for Eos-.

## Quick Navigation

### Decision Records (ADRs)
- **[ADR-0001: Project Structure & Governance Foundation](./adrs/ADR-0001-project-structure-governance.md)** — Canonical directory layout, layer enforcement, governance specs

### System Design
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — Complete system overview, request flow, data flow, FSM chart
- **[System Components](./components/)** — Deep dives: Authority, Governance, MCP, Mission Runtime

### Implementation Guides
- **[API Reference](../api/)** — MCP contract, tool definitions, governance APIs
- **[Standards](../standards/)** — Code style, testing, documentation conventions

## Governance Model

Eos- follows a **three-layer governance model**:

1. **Foundation** (inviolable) — Authority Truth Source, ledger, constitutional barriers
2. **Core** (mission-critical) — Mission runtime, MCP bridge, governance enforcement
3. **Integration** (extensible) — Tools, satellites, strategic engines

Each layer has distinct review rigor, test coverage, and side-effect policies. See ADR-0001.

## Key Principles

- **Authority as Source of Truth** — All governance state flows from Authority Truth Source
- **Immutable Ledger** — Mission events are append-only, cryptographically verified
- **Constitutional Governance** — Barriers enforce rules before state transitions
- **Zero Dependencies** — src/ has no npm dependencies by design
- **Copilot-Agnostic** — MCP bridge decouples from specific agent runtimes

## Reading Order for New Contributors

1. **Start here:** README.md (root) — Project overview
2. **Then:** ADR-0001 (this file) — Structure and governance layers
3. **Deep dive:** ARCHITECTURE.md — System design and request flow
4. **Learn:** CONTRIBUTING.md (root) — How to submit changes
5. **Reference:** API docs, standards, component guides as needed
