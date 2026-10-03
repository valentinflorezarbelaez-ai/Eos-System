# Proposal — Defensive intelligence finding

## Why

Public security research shows classes of tool EOS must refuse to ingest: covert people-tracking, browser availability attacks, and unaudited custom cryptography. The operator doctor in `src/core/runtime/operator-doctor.js` never states a secret-handling boundary or an untrusted-input boundary. That kernel file stays frozen. Operators still need a small, testable place to record a finding and to see the boundary when they run the doctor CLI.

## What

- An OpenSpec change for a defensive finding record: source, date, confidence, and a human gate.
- A non-kernel module that accepts only that record and rejects malformed input and secret material.
- The doctor CLI prints those boundaries after the existing kernel report. `--json` stays valid JSON from the kernel.

## Routing

**SDD** (ADR-0010). The human asked for one spec in the OpenSpec layout and, if a real gap exists, one failing-then-passing test. Cite `docs/base-standards.md`. Not DIRECT.

## Authorization

- `src/core/` product kernel: not authorized. The doctor module is not edited.
- `Fundacion/` and `PRJ-FUNDACION`: `Δ = 0`.
- `CONSTITUTION.md`, `docs/core/CONSTITUTION.md`, `DEPENDENCY_POLICY_L0.md`: not edited.
- `site/`: not edited.
- L0: Node built-ins only. No root dependency added.
- Autonomy remains `LEVEL_2_SUPERVISED_AUTONOMY`. No auto-merge. No production deploy.

## NON-goals

- No clone, port, or procedure from an offensive repository.
- No exploit steps, payloads, malware, credential theft, or covert tracking.
- No OSINT beyond the public profile and README purposes already named by the operator.
- No claim that EOS surpassed any security lab, and no `PRODUCTION_READY` claim.
- No new engine, plane, or Mission CLI wrapper.
- No kernel adoption of the shield.
