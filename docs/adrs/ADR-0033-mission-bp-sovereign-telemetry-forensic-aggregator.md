# ADR-0033 — Mission BP: Sovereign Telemetry & Forensic Trail Aggregator

**Status:** Accepted  
**Date:** 2026-09-14  
**Deciders:** Product Owner (Valentín Flórez Arbeláez)  
**Relates:** ADR-0029 (Ladder 21 Axis), ADR-0030 (BM Attestation), ADR-0031 (BN Sentinel), ADR-0032 (BO Two-Key)

---

## 1. Context

In Ladder 21, EOS establishes sovereign multi-agent provenance. Subsystems and agents generate heterogeneous cryptographic receipts:
- Mission Lifecycle (`BH-RCPT-*`)
- Cross-Session Continuity (`BI-RCPT-*`)
- Operator HUD (`BJ-RCPT-*`)
- Governed External Write (`BK-RCPT-*`)
- Agent Attestation (`BM-RCPT-*`)
- Sentinel Heartbeat (`BN-RCPT-*`)
- Two-Key Consensus (`BO-RCPT-*`)

Without an in-process, verifiable aggregator, reconstructing chronological audit history requires ad-hoc manual correlation.

## 2. Decision

Implement `ForensicTrailAggregator` and `SovereignTelemetryReceipt` (`BP-RCPT-*`):
1. Ingest receipts under strict Layer 0 pure domain rules.
2. Enforce chronological sequence and fail-closed validation of receipt hashes.
3. Emit aggregated batch receipts chained via SHA-256 root hashes.

## 3. Rejected Alternatives

1. **External Log Stacks (Splunk / Elasticsearch / CloudWatch):**
   - *Reason for rejection:* Violates sovereign local-governed operation, introduces external runtime network dependencies.
2. **Unvalidated JSON File Append:**
   - *Reason for rejection:* Susceptible to chronological inversion and silent receipt tampering without cryptographic verification.
3. **Distributed Kafka/Streaming Broker:**
   - *Reason for rejection:* Unnecessary operational weight (Tier 5 Anti-YAGNI rejection).

## 4. Consequences

- **Positive:** Provable chronological audit trail with tamper detection.
- **Negative:** Buffer must be periodically sealed into batches.
- **Invariants:** `PRODUCTION_READY: NO`, `Fundacion Δ=0`, `Law VI HELD`.
