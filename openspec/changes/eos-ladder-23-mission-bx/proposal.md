# Change Proposal — Mission BX: Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port

## 1. Why

In autonomous software engineering systems, failures, invariant drift, and unexpected execution errors inevitably occur. A fragile control plane halts completely or enters unbounded retry loops when facing an error. 

EOS requires a pure Layer-0 **Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port** that:
- Detects and categorizes runtime invariant drift and telemetry anomalies.
- Immediately isolates faulty components to prevent cascading failure across the multi-agent workspace.
- Applies targeted rollbacks using verified cryptographic state snapshots (from Mission BT).
- Bounds remediation retries (`maxRetries=3`) and fails closed into a structured `ESCALATED_HITL_REQUIRED` posture if autonomous healing cannot resolve the fault.
- Emits cryptographically sealed `BX-RCPT-*` healing receipts with zero plain secrets and Fundacion write barrier protection.

## 2. What Changes

1. Implement `src/core/sentinel/self-healing-receipt.js` to emit canonical `BX-RCPT-*` receipts.
2. Implement `src/core/sentinel/self-healing-policy-gate.js` enforcing fail-closed bounds, retry limits, Law VI secret screening, and Fundacion write protection.
3. Implement `src/core/sentinel/autonomous-self-healing-port.js` providing the unified self-healing and remediation facade.
4. Add comprehensive unit tests in `tests/eos-bx-autonomous-self-healing-port.test.js`.
5. Exclude the suite from default slim discovery in `scripts/test-runner.js` and register `"test:mission-bx"` in `package.json`.

## 3. Impact Assessment

- **Scope:** `src/core/sentinel/`, `tests/`, `docs/`.
- **Breaking Changes:** None. Pure Layer-0 additive architecture.
- **Dependencies:** Pure Node.js built-ins (`node:crypto` only).
