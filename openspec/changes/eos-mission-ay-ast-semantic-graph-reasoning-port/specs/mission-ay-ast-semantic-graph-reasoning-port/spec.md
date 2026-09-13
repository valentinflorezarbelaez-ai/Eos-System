# Spec — Mission AY AST & Semantic Graph Reasoning Port (SPEC-0056)

## Capability

Hermetic AST & Semantic Graph Reasoning Port over allowlisted source text
with phases PARSE → BUILD_GRAPH → QUERY, fail-closed policy DENY, and
sealed EVD-style receipts (sha256).

## EARS (L18)

### Requirement — Structural reasoning

WHEN developer engine needs structural reasoning over allowlisted source,
THE SYSTEM SHALL return sealed graph results via the AST & Semantic Graph Port.

### Requirement — Disallowed / inconsistent DENY

IF op targets disallowed paths or inconsistent graph, THE SYSTEM SHALL DENY
and emit a sealed receipt.

### Requirement — NON-CLAIM while active

WHILE the port is active, THE SYSTEM SHALL not claim full IDE,
language-server marketplace, or CloudAgent code intelligence SaaS completeness.

## Codes (frozen)

`OK`, `COMPLETED`, `DENY`, `PATH_NOT_ALLOWLISTED`, `SYNTAX_ERROR`,
`MALFORMED_GRAPH`, `UNSAFE_QUERY`, `INVALID_REQUEST`, `MISSING_DEP`,
`FUNDACION_DENY`, `QUERY_EMPTY`.

## Constants

- `AY_PRODUCTION_READY = 'NO'`
- `AY_KIND = 'eos-ast-semantic-graph-reasoning-port'`
- Fundacion Δ=0 / ALWAYS_DENY
- Antigravity-first (no CloudAgent)
- L17 CLOSED; L18 OPEN; AX MEASURED
- compose/extend AG + inject into AX (hooks only)

## Out of scope

AZ/BA/BB; rewriting AX/AG modules; Fundacion writes; CloudAgent;
flipping PRODUCTION_READY; acorn/babel deps; live network in CI.
