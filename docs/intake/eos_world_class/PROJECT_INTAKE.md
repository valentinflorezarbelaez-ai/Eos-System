# EOS World-Class Intake — Ontology, Policy & Evidence Fabric

**Project ID:** `PRJ-EOS-CONTROL-PLANE`
**Change ID:** `eos-world-class-ontology-policy`
**Status:** DRAFT — INTAKE COMPLETE, IMPLEMENTATION NOT AUTHORIZED
**Date:** 2026-10-18
**Owner:** Product Owner (EOS)
**PRODUCTION_READY:** NO
**Fundacion:** Δ=0

---

## 1. Mission

Evolve EOS from a local governed control plane into the most advanced system of its
class: an **ontology-driven, permissioned, evidence-native control plane for autonomous
software delivery**, deployable locally, on-prem, or at the edge, with human command
and immutable proof.

**Category:** Lattice/Foundry for the SDLC — not an ERP, kernel, cloud provider, or chatbot.

---

## 2. Current baseline (measured)

| Metric | Value |
| --- | ---: |
| Mission state | `LOCAL_GOVERNED_VERIFIED` |
| Production readiness | `NO` |
| Ladder | L41 OPEN; L30–L40 CLOSED |
| Tests | 1,460 passing |
| Strict checks | 913 passing |
| Tracked payload | 28.04 MB / 648,075 lines |
| Runtime dependencies | 0 |
| CLI latency | doctor ~95 ms, HUD ~128 ms, verify ~266 ms |

---

## 3. Problem statement

EOS has strong governance and evidence, but its ontology is implicit, permissions are
partially enforced, operator UX is CLI/HUD-centric, edge/multi-node operation is absent,
and certification/support do not exist. Without a formal ontology and policy core, every
new capability increases coupling and weakens trust.

---

## 4. Scope (in)

1. **EOS Ontology v1:** entities, links, actions, lineage.
2. **Policy engine:** ABAC, deny-by-default, purpose binding, approvals.
3. **Audit/evidence fabric:** every action emits a receipt; replayable.
4. **Operator console v0:** mission, graph, timeline, approvals, incidents.
5. **Edge mode:** local-first, offline, sync/conflict resolution.
6. **Proving ground:** digital twin, gameday, red team, chaos.
7. **Productization:** installer, upgrade, SSO/RBAC, observability, SLOs.
8. **Ecosystem:** plugin SDK, MCP registry, partner integrations.

## 5. Scope (out)

- ERP/finance/logistics, kernel/OS, browser, consumer apps.
- Rewriting EOS in Rust/Go without a measured need.
- Multi-region cloud scale before 10 design partners.
- Changes to `Fundacion/` or external target projects.
- `PRODUCTION_READY=YES` claims.

---

## 6. Stakeholders

| Role | Responsibility |
| --- | --- |
| Product Owner | Scope, authority, acceptance |
| Operator | Runs missions, approves high-risk actions |
| Agent | Executes bounded tasks with evidence |
| Security | Threat model, secrets, supply chain |
| Compliance | Audit export, retention, certification |
| Design partner | Real missions and success metrics |

---

## 7. Success metrics

| Metric | Target |
| --- | --- |
| Change traceability (spec→task→code→test→EVD) | 100% |
| Audit completeness | 100% of actions |
| Permission violations tolerated | 0 |
| Coverage / mutation score | > 90% / > 80% |
| Flaky rate | < 1% |
| Verify p95 | < 500 ms |
| Tests wall time | < 12 s |
| Human override rate | Measured and decreasing |
| Offline edge uptime | 100% |
| Replay fidelity | 100% deterministic |
| Time-to-evidence | < 1 min |

---

## 8. Constraints

- L0 purity: Node built-ins only at runtime; zero root `dependencies`.
- Complexity budget is `AT_CEILING` (35/35 schemas). New schemas require PO-approved
  retirement or budget amendment.
- No implementation code before approved spec + ADR + implementation authorization.
- Write barrier: no external project mutation without explicit authorization.
- Every claim must be classified and evidence-linked.

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Feature bloat / SAP envy | Category discipline; non-goals enforced |
| Ontology bureaucracy | Ontology must drive execution, not paperwork |
| Autonomy without control | Kill switch, HITL, deny-by-default |
| Docs inflation | One SSOT; archive superseded releases |
| Certification before product | Design partners first |
| Rewrite temptation | Benchmarks before native sidecars |

---

## 10. Decision requested

Approve **Phase 0 only**: intake, SPEC-0176 (Ontology v1), ADR for policy/ontology
boundaries, benchmark/coverage baseline, and design-partner selection.

**Implementation authorization:** NOT GRANTED in this document.

---

## 11. Next artifacts

1. `docs/specs/eos_world_class/SPEC-0176-eos-ontology-v1.md` (EARS/BDD).
2. ADR for ontology/policy foundation.
3. Benchmark + coverage + mutation baseline.
4. Operator console v0 design.
5. Design-partner success scorecard.
