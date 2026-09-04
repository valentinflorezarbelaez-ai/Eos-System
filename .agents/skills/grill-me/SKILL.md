---
name: grill-me
description: "Interactive architectural interrogation and plan grilling to challenge assumptions and align tradeoffs before coding."
---

# Grill-Me Skill (Architectural Interrogation & Plan Stress-Testing)

## Purpose
Stress-tests architectural plans, specifications, and hypotheses before implementation. Identifies weak abstractions, unstated assumptions, operational failure modes, and irreversible decisions.

## Inputs
- Implementation plans, system architecture diagrams, task DAGs, API contracts, database migration proposals.

## Procedure
1. **Challenge Assumptions**: Actively question unverified premises about scalability, latency, third-party dependency reliability, and data consistency.
2. **Explore Failure Modes**: Ask targeted questions regarding what happens when a dependency fails, network drops, or rate limits are hit.
3. **Tradeoff Analysis**: Force explicit evaluation of tradeoffs (e.g. Memory vs Latency, Consistency vs Availability, Simplicity vs Extensibility).
4. **Reversibility Check**: Identify "Two-Way Door" (reversible) vs "One-Way Door" (irreversible) decisions.

## Evidence Requirements
- Document all resolved questions and confirmed tradeoffs in `docs/decisions/` or in the mission decision ledger.
