# ADR-0029 — Ladder 21: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric

**Status:** Accepted  
**Date:** 2026-09-14  
**Deciders:** Product Owner (Valentín Flórez Arbeláez)  
**Relates:** ADR-0028 (L20 Closeout / BL), ADR-0023 (L20 Audit), ADR-0024–0027 (BH–BK), ADR-0013 (Write Barrier), Constitution / Law IV / Law VI

## Context

Ladder 20 is **CLOSED_FOR_LOCAL_GOVERNED_USE** (BH+BI+BJ+BK+BL MEASURED + seam-pack + closeout; Sovereign Mission Continuity & Operator Fabric axis). Ladder 19 is CLOSED (BC–BG; Sovereign Delivery & Verification Fabric). Ladder 18 is CLOSED (AX–BB; Sovereign Developer Engine). Ladder 17 is CLOSED (AS–AW; Sovereign Operator Continuity & Cross-Plane Composition). None of these ladders will be reopened.

The **L20 ceiling** reveals that while EOS has mission continuity, operator fabric, delivery/verification, and developer-engine building blocks, it lacks:

1. **Agent identity attestation & action provenance** — multi-agent swarm (AA) and mission lifecycle (BH) exist as MEASURED ports, but there is no typed port that cryptographically attests agent identity and seals action provenance receipts (BM-RCPT-*) for agent actions across the control plane.
2. **Continuous integrity sentinel & FDIR heartbeat daemon** — R FDIR sentinel and AZ self-repair FDIR bridge exist as MEASURED ports, but there is no typed continuous heartbeat daemon that seals integrity/heartbeat receipts (BN-RCPT-*) over long-running operator sessions.
3. **Multi-agent consensus & two-key handoff gate** — AA multi-agent swarm and AP HITL PO authority exist as MEASURED ports, but there is no typed two-key handoff / consensus gate with sealed consensus receipts (BO-RCPT-*) for multi-agent critical actions.
4. **Sovereign telemetry & forensic trail aggregator** — AB telemetry, AJ ledger, AQ/BF notary, BE replay, and BJ HUD exist as MEASURED surfaces, but there is no typed aggregator that binds BH/BI/BJ/BK/BM/BN receipts into a forensic trail (BP-RCPT-*).

## Decision

Open Ladder 21 with axis **Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric** and five proposed satellites:

| ID | SPEC | Satellite |
| --- | --- | --- |
| BM | 0070 | Agent Identity Attestation & Action Provenance Port |
| BN | 0071 | Continuous Integrity Sentinel & FDIR Heartbeat Daemon |
| BO | 0072 | Multi-Agent Consensus & Two-Key Handoff Gate |
| BP | 0073 | Sovereign Telemetry & Forensic Trail Aggregator |
| BQ | 0074 | L21 CI Seam-Pack & Closeout |

Each satellite composes/extends existing MEASURED building blocks (compose, don't rewrite doctrine). All remain fail-closed, evidence-custody, Fundacion Δ=0, PRODUCTION_READY=NO, CloudAgent out, Law VI held.

## Consequences

- L21 audit is docs-only; zero implementation of BM–BQ in the audit branch.
- Mission BM is the first proposed implementation target (agent identity attestation & action provenance).
- L17, L18, L19, L20 remain CLOSED — never reopen.
- PRODUCTION_READY stays NO; Fundacion Δ=0 stays intact.
- Each satellite must go through SpecBoot (OpenSpec envelope → propose → apply → verify) before any implementation code.
- Tip probe honesty: HEAD/audit base `5e0f94d…`; freeze `main_tip` may still pin L20 CLOSED seal `6b9ab46…` — do not rewrite freeze/matrix in this audit PR.

## Alternatives Considered

### Alternative A: Speculative cloud multi-tenant agent SaaS
- **Rejected:** Cloud multi-tenant agent SaaS would violate Antigravity-first (CloudAgent out), Fundacion Δ=0 / local-governed-use doctrine, and PRODUCTION_READY=NO strict. EOS remains a local sovereign control plane; speculative cloud multi-tenant agent SaaS is out of scope and would invent unmeasured production claims.

### Alternative B: Unsigned trust-based coop without crypto receipts
- **Rejected:** Unsigned trust-based cooperation among agents without cryptographic receipts would violate evidence-over-claims (Law III) and evidence-custody doctrine. L21 axis explicitly requires BM-RCPT-* / BN-RCPT-* / BO-RCPT-* / BP-RCPT-* sealed receipts. Trust-without-receipts is incompatible with Sovereign Multi-Agent Provenance.

### Alternative C: Premature unsupervised self-modifying loops
- **Rejected:** Unsupervised self-modifying agent loops without HITL / two-key / budget gates would violate fail-closed + HITL + Law VI + Constitution. L21 proposes BO two-key handoff and BM attestation as governed gates — not unsupervised self-modification. Premature unsupervised loops are explicitly NON-GOAL.

## NON-CLAIM

- L21 audit ≠ implementation of BM–BQ
- Agent Identity Attestation & Action Provenance ≠ OAuth/SAML IdP / ≠ PRODUCTION_READY identity product
- Continuous Integrity Sentinel & FDIR Heartbeat ≠ Datadog/K8s daemon / ≠ PRODUCTION_READY monitoring product
- Multi-Agent Consensus & Two-Key Handoff ≠ Blockchain PoS/BFT / ≠ PRODUCTION_READY consensus product
- Sovereign Telemetry & Forensic Trail Aggregator ≠ Splunk / ≠ PRODUCTION_READY SIEM product
- L21 seam-pack ≠ GH Team/Enterprise enforcement
- PRODUCTION_READY stays NO
- Fundacion Δ=0 intact
- CloudAgent out (Antigravity-first)
- Never reopen L17, L18, L19, or L20
