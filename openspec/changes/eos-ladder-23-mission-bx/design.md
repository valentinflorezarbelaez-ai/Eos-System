# Architectural Design — Mission BX: Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port

## 1. Domain Model

```text
┌─────────────────────────────────────────────────────────────┐
│             ANOMALY & INCIDENT INGESTION                    │
│                                                             │
│   Incident: { id, componentId, severity, anomalyType,       │
│               details, status, retries, timestamp, ... }    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             POLICY GATE & QUARANTINE MANAGER                │
│  - Severity Classification: LOW, MEDIUM, HIGH, CRITICAL     │
│  - Quarantine Isolation: Disconnect routing, mark component  │
│  - Secret Screening: Law VI regex scanning                  │
│  - Fundacion Barrier: Path & target protection (Δ=0)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FDIR REMEDIATION ENGINE                     │
│  - Strategies: RESTART, ROLLBACK_SNAPSHOT, STATE_RESET,     │
│                ISOLATE_CIRCUIT_BREAKER                      │
│  - Bounded Execution: maxRetries (default 3)                │
│  - Fallback: ESCALATED_HITL_REQUIRED                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   RECEIPT SEALER (BX-RCPT-*)                │
│  - SHA-256 Canonical Snapshot Hash                          │
│  - Sequential Hash Chaining (prevReceiptHash)               │
│  - Nine-field canonical seal                                │
└─────────────────────────────────────────────────────────────┘
```

## 2. Policy Gate Invariants

1. `MALFORMED_INCIDENT_DENY`: Incidents must have non-empty `incidentId`, `componentId`, valid `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and `anomalyType`.
2. `MAX_RETRIES_EXCEEDED_DENY` / `ESCALATED_HITL_REQUIRED`: Autonomous remediation retries for any single incident or component cannot exceed `maxRetries` (default 3). If exceeded, the engine escalates to human-in-the-loop and halts autonomous mutation.
3. `INVALID_REMEDIATION_ACTION_DENY`: Remediation strategy must belong to supported set (`RESTART`, `ROLLBACK_SNAPSHOT`, `STATE_RESET`, `ISOLATE_CIRCUIT_BREAKER`).
4. `SECRET_DETECTED_DENY`: Incident details, logs, or remediation commands matching known credential patterns are rejected fail-closed.
5. `FUNDACION_ALWAYS_DENY`: Any incident or remediation targeting `Documents/Fundacion` triggers immediate rejection and preserves `Fundacion Δ=0`.
