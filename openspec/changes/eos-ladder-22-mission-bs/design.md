# Design — Mission BS Dynamic Agent Capability Matcher & Governed Dispatcher Port (SPEC-0076)

## Overview

Layer-0 capability matcher & governed dispatcher port located in `src/core/orchestration/`.
Matches task requirements against certified agent capability profiles.
Integrates with Mission BM (`agent-identity-attestation-port`) for identity validation, and optionally
with Mission BO (`two-key-consensus-gate`) when tasks require multi-key escalation.
Every dispatch decision is cryptographically sealed as a `BS-RCPT-*` receipt.

## Components

1. **Receipt (`agent-capability-matcher-receipt.js`)**:
   Nine-field SHA-256 seal:
   `{ receiptId, taskId, agentId, requiredCapability, matchedCapability, status, timestamp, consensusSignature, prevReceiptHash }` → `BS-RCPT-*`
2. **Policy Gate (`agent-capability-matcher-policy-gate.js`)**:
   Fail-closed checks:
   - `UNCERTIFIED_CAPABILITY_DENY`: Agent does not possess the required capability profile.
   - `UNATTESTED_AGENT_DENY`: Agent identity has not been attested via Mission BM.
   - `INSUFFICIENT_CLEARANCE_DENY`: Agent clearance level is lower than task requirement.
   - `FUNDACION_ALWAYS_DENY`: Blocks tasks targeting forbidden external directories.
   - `MALFORMED_TASK_DENY`: Task node missing required fields (id, capability).
3. **Port Facade (`dynamic-agent-capability-dispatcher-port.js`)**:
   `createAgentCapabilityDispatcherPort({ now, hash, policyGate, attestationPort, consensusGate })`
   - `registerAgentProfile({ agentId, capabilities, clearanceLevel, role })`: Enrolls certified agent.
   - `matchAgentForTask(taskNode)`: Finds best matching registered agent matching required capability.
   - `dispatchTask(taskNode, agentIdOrAuto, opts)`: Validates assignment, verifies attestation, seals `BS-RCPT-*`.
   - `batchDispatchDag(dag, opts)`: Iterates through approved DAG in topological order, dispatching each node.
   - `verifyDispatchTrail(receipts)`: Validates receipt hashes and cryptographic chain.

## Constraints

- `PRODUCTION_READY=NO`; `Fundacion Δ=0`; Antigravity-first; Law VI clean.
- Zero network dependencies; hermetic test execution.

## NON-CLAIM

≠ Kubernetes scheduler · ≠ Distributed message broker · ≠ PRODUCTION_READY orchestrator
