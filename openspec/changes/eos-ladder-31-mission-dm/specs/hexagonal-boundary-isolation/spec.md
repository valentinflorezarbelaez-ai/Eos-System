# Spec — Hexagonal Architecture Boundary Isolation Port (SPEC-0123)

## Purpose

Defines the requirements for the Hexagonal Architecture Boundary Isolation Port, validating that core domain logic adheres strictly to Layer-0 purity (`NODE_BUILTINS_ONLY`) and that adapters remain encapsulated behind abstract ports.

## Requirements

### Requirement: Canonical DM-RCPT Receipt Format

The port MUST generate cryptographically sealed receipts conforming to canonical structure:
- SHALL seal nine canonical fields: `receiptId`, `operation`, `planId`, `decision`, `changeId`, `boundaryDigest`, `timestamp`, `fundacionDelta`, `prevReceiptHash`.
- SHALL set `operation = 'HEXAGONAL_BOUNDARY_ISOLATION'`.
- SHALL set `kind = 'eos-hexagonal-boundary-isolation-receipt'`.
- SHALL pin freeze soft-observe hash `f367a1cf` without mutation.

### Requirement: Fail-Closed Boundary Integrity Gating

The policy gate MUST evaluate architectural boundary reports with fail-closed semantics:
- SHALL require a valid `boundaryReport` object in the payload.
- SHALL DENY any request where `violationsCount > 0` or `violations.length > 0`.
- SHALL DENY any request where `boundaryIntegrityStatus !== 'ISOLATED'`.
- SHALL DENY any request where `nonBuiltinImportsCount > 0` in Layer 0 modules.

### Requirement: Sovereign Non-Claims & Invariant Preservation

The gate and port MUST strictly preserve all system-wide invariants:
- SHALL enforce `PRODUCTION_READY === 'NO'`.
- SHALL enforce `fundacionDelta === 0` (`FUNDACION_ALWAYS_DENY`).
- SHALL enforce zero plain secrets (Law VI).
- SHALL reject attempts to reopen Ladders 17 through 30.
- SHALL reject attempts to auto-close Ladder 31 without completing DN–DO.
