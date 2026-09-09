# ADR-0016: Local Engram SSOT path and envelope contract

- Status: Accepted (ROI6)
- Date: 2026-09-08
- Deciders: EOS local governed use

## Context

Engram memory was fragmented across external MCP engram, local EosMemory akasha path, mock MCP tool claiming FTS5, and Gentleman bridge without shared seal schema.
DO_NOT_BUILD forbids mock DB wrappers that claim FTS5.

## Decision

1. Canonical local storage root: .eos/engram/memory.jsonl (SSOT module src/core/memory/engram-contract.js).
2. Unified envelope eos.engram.envelope/v1; fts5 false mandatory locally.
3. Fail-closed assertEngramPath: DENY external-target, legacy akasha, paths outside .eos/engram/.
4. MCP tool #74 thin EosMemory adapter or honest FTS5-unavailable response.
5. External engram PATH binary remains the only real FTS5/SQLite backend.

## Consequences

- Local governed memory under .eos/ (gitignored runtime).
- Agents use external Engram MCP for FTS5; local adapter is JSONL + honest lexical search.
- verify:strict / engram:verify assert path + envelope round-trip without live CLI.
