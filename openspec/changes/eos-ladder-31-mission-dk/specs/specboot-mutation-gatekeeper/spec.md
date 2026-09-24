# Spec — SpecBoot Mutation Testing Gatekeeper Port (SPEC-0121)

## Purpose

Defines the requirements for the SpecBoot Mutation Testing Gatekeeper Port, validating that code modifications demonstrate mathematical test resilience with zero surviving mutants before certification.

## Requirements

### Requirement: Canonical DK-RCPT Receipt Format

The port MUST generate cryptographically sealed receipts conforming to canonical structure:
- SHALL seal nine canonical fields: `receiptId`, `operation`, `planId`, `decision`, `changeId`, `mutationDigest`, `timestamp`, `fundacionDelta`, `prevReceiptHash`.
- SHALL set `operation = 'SPECBOOT_MUTATION_GATEKEEPER'`.
- SHALL set `kind = 'eos-specboot-mutation-gatekeeper-receipt'`.
- SHALL pin freeze soft-observe hash `2cead226` without mutation.

### Requirement: Fail-Closed Mutation Resilience Gating

The policy gate MUST evaluate mutation testing results with fail-closed semantics:
- SHALL require a valid `mutationReport` object in the payload.
- SHALL DENY any request where `survivedMutants > 0`.
- SHALL DENY any request where `status !== 'VERIFIED'`.
- SHALL DENY any request where `mutationScore` is below the declared threshold.

### Requirement: Sovereign Non-Claims & Invariant Preservation

The gate and port MUST strictly preserve all system-wide invariants:
- SHALL enforce `PRODUCTION_READY === 'NO'`.
- SHALL enforce `fundacionDelta === 0` (`FUNDACION_ALWAYS_DENY`).
- SHALL enforce zero plain secrets (Law VI).
- SHALL reject attempts to reopen Ladders 17 through 30.
- SHALL reject attempts to auto-close Ladder 31 without completing DL–DO.
