# Spec — Adversarial Invariant Refuter Port (SPEC-0122)

## Purpose

Defines the requirements for the Adversarial Invariant Refuter Port, actively challenging proposed specifications and state models against chaotic stress vectors to verify invariant durability before apply.

## Requirements

### Requirement: Canonical DL-RCPT Receipt Format

The port MUST generate cryptographically sealed receipts conforming to canonical structure:
- SHALL seal nine canonical fields: `receiptId`, `operation`, `planId`, `decision`, `changeId`, `refutationDigest`, `timestamp`, `fundacionDelta`, `prevReceiptHash`.
- SHALL set `operation = 'ADVERSARIAL_INVARIANT_REFUTER'`.
- SHALL set `kind = 'eos-adversarial-invariant-refuter-receipt'`.
- SHALL pin freeze soft-observe hash `20cb9abd` without mutation.

### Requirement: Fail-Closed Invariant Breach Detection

The policy gate MUST evaluate adversarial stress reports with fail-closed semantics:
- SHALL require a valid `refutationReport` object in the payload.
- SHALL DENY any request where `unhandledBreaches > 0`.
- SHALL DENY any request where `resilienceStatus === 'COMPROMISED'`.
- SHALL support `CHALLENGE` decisions when non-fatal warnings are flagged under `allowChallengeMode`.

### Requirement: Sovereign Non-Claims & Invariant Preservation

The gate and port MUST strictly preserve all system-wide invariants:
- SHALL enforce `PRODUCTION_READY === 'NO'`.
- SHALL enforce `fundacionDelta === 0` (`FUNDACION_ALWAYS_DENY`).
- SHALL enforce zero plain secrets (Law VI).
- SHALL reject attempts to reopen Ladders 17 through 30.
- SHALL reject attempts to auto-close Ladder 31 without completing DM–DO.
