# ADR-0042 — Mission BX Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port

- **Status:** Accepted — local governed (Ladder 23 Satellite 2)
- **Date:** 2026-09-15
- **Deciders:** EOS local governed use (Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric)
- **Spec:** SPEC-0081

## Context

Ladders 11 through 22 are formally CLOSED_FOR_LOCAL_GOVERNED_USE and sealed against modification.
Ladder 23 establishes the **Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric**.
Autonomous multi-agent systems inevitably encounter runtime exceptions, telemetry anomalies, and invariant drift during complex workflow execution.
A naive control plane either crashes abruptly or enters unbounded retry loops that exhaust resources and cascade across agent nodes.

Mission BX delivers a pure Layer-0 sovereign self-healing sentinel and FDIR (Failure Detection, Isolation & Recovery) remediation engine port that:
1. Detects and categorizes anomalies into formal severity classes (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
2. Quarantines critical components to isolate failure cascades.
3. Executes bounded autonomous remediation actions (`RESTART`, `ROLLBACK_SNAPSHOT`, `STATE_RESET`, `ISOLATE_CIRCUIT_BREAKER`).
4. Bounds retry attempts (`maxRetries=3`) and fails closed into structured human-in-the-loop escalation (`ESCALATED_HITL_REQUIRED`).
5. Screens for plain secrets (Law VI) and enforces the Fundacion write barrier (`FUNDACION_ALWAYS_DENY`).
6. Emits cryptographically sealed `BX-RCPT-*` receipts verifying chain of custody.

## Decision

1. Implement three Layer-0 modules under `src/core/sentinel/`:
   - `self-healing-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`BX-RCPT-*`) via `node:crypto`.
   - `self-healing-policy-gate.js`: Fail-closed policy gate enforcing schema bounds, retry limits, Law VI secret screening, and Fundacion write barrier.
   - `autonomous-self-healing-port.js`: Unified port facade (`AutonomousSelfHealingPort`, `registerIncident`, `quarantineComponent`, `releaseQuarantine`, `executeRemediation`, `resolveIncident`, `getComponentHealth`, `listActiveIncidents`, `verifyHealingTrail`).
2. Bounded retry execution:
   Each incident and component tracks cumulative remediation attempts. If `currentRetries >= maxRetries`, autonomous remediation halts immediately and escalates to HITL.
3. Auto-quarantine on `CRITICAL` severity:
   Components reporting critical invariant drift or state corruption are automatically marked `QUARANTINED` to isolate workload execution.
4. Exclude satellite test suite `tests/eos-bx-autonomous-self-healing-port.test.js` from default test discovery (`SLIM ≤ 145`) via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-bx`.
5. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, zero external npm dependencies.

## Alternatives considered AND REJECTED

### A. Cloud/Enterprise AIOps Platform (Datadog / PagerDuty / Dynatrace)
**Rejected.** Enterprise AIOps introduces external SaaS dependencies, network latency, credential leakage risks (violating Law VI), and non-hermetic execution.
Technical reason: Pure Layer-0 FDIR logic provides deterministic in-process failure detection and remediation with zero plain secrets and zero network calls.

### B. Unbounded Autonomous Retry Loops
**Rejected.** Allowing an agent or system to retry remediations indefinitely risks thrashing, resource exhaustion, and masked bugs.
Technical reason: Strict bounded retries (`maxRetries=3`) followed by deterministic fail-closed HITL escalation guarantees bounded execution and safety.

## Consequences

- **Positive:** Autonomous resilience, rapid failure isolation, cryptographic proof of recovery, zero secrets, Fundacion Δ=0.
- **Negative:** Autonomous remediation actions limited to verified strategies (`RESTART`, `ROLLBACK_SNAPSHOT`, `STATE_RESET`, `ISOLATE_CIRCUIT_BREAKER`).
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held.
