# Spec — Sovereign Epistemic Knowledge Ledger Port (SPEC-0124)

## Purpose

Defines the requirements for the Sovereign Epistemic Knowledge Ledger Port, validating that all truth claims and state transitions are strictly grounded in verifiable, reproducible execution evidence.

## Requirements

### Requirement: Canonical DN-RCPT Receipt Format

The port MUST generate cryptographically sealed receipts conforming to canonical structure:
- SHALL seal nine canonical fields: `receiptId`, `operation`, `planId`, `decision`, `changeId`, `epistemicDigest`, `timestamp`, `fundacionDelta`, `prevReceiptHash`.
- SHALL set `operation = 'SOVEREIGN_EPISTEMIC_LEDGER'`.
- SHALL set `kind = 'eos-sovereign-epistemic-ledger-receipt'`.
- SHALL pin freeze soft-observe hash `079e6f2a` without mutation.

### Requirement: Fail-Closed Epistemic State Transition Gating

The policy gate MUST evaluate state transitions with fail-closed semantics:
- SHALL require a valid `epistemicReport` object in the payload.
- SHALL require that transitions to `VERIFIED` originate strictly from `AUDIT_EXECUTED` or `REVALIDATION_REQUIRED`.
- SHALL DENY transitions to `VERIFIED` if `checksPassed <= 0`.
- SHALL DENY transitions to `VERIFIED` if `evidenceHash` is missing or invalid.
- SHALL DENY any direct claim of `PRODUCTION_READY`.

### Requirement: Sovereign Non-Claims & Invariant Preservation

The gate and port MUST strictly preserve all system-wide invariants:
- SHALL enforce `PRODUCTION_READY === 'NO'`.
- SHALL enforce `fundacionDelta === 0` (`FUNDACION_ALWAYS_DENY`).
- SHALL enforce zero plain secrets (Law VI).
- SHALL reject attempts to reopen Ladders 17 through 30.
- SHALL reject attempts to auto-close Ladder 31 without completing Mission DO.
