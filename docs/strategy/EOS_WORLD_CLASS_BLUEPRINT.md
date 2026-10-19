# EOS World-Class Blueprint — Lattice/Foundry for the SDLC

**Status:** PROPOSED (Phase 0)
**Change ID:** `eos-world-class-ontology-policy`
**PRODUCTION_READY:** NO
**Fundacion:** Δ=0
**Related:** `docs/intake/eos_world_class/PROJECT_INTAKE.md`

---

## 1. North Star

> Every change traceable to a specification, every claim backed by reproducible evidence,
> every agent confined by authority, every release reproducible — locally, on-prem, or at the edge.

EOS is not an ERP, kernel, browser, or chatbot. It is the **trust layer for autonomous
software delivery**: a control plane that commands fleets of agents with human authority
and immutable proof.

---

## 2. Six pillars

| Pillar | Purpose | First deliverable |
| --- | --- | --- |
| **Ontology** | Entities, links, actions, lineage | `EOS Ontology v1` + query API |
| **Policy** | ABAC, purpose binding, deny-by-default, HITL | Policy engine + decision receipts |
| **Evidence** | Append-only ledger, replay, custody | Event-sourced audit fabric |
| **Execution** | Agents, sandboxes, MCP tools, workers | Capability router + budgets |
| **Edge** | Local-first, offline, sync, conflict resolution | Edge node + sync protocol |
| **Proving ground** | Digital twin, gameday, chaos, red team | Continuous adversarial lab |

---

## 3. Maturity model

| Level | Name | Exit criteria |
| --- | --- | --- |
| **G0** | Local governed | CLI, MCP, evidence, tests, strict checks *(current)* |
| **G1** | Team-ready | Installer/upgrade, SSO/RBAC, multi-repo, GitHub/GitLab, benchmarks, user docs |
| **G2** | Enterprise | HA, multi-tenant, KMS, audit export, SOC2/ISO readiness, SLA |
| **G3** | Ecosystem | Plugin SDK, MCP registry, connectors, community, certifications |
| **G4** | Category standard | Public benchmarks, independent audits, global support, standards |

Current position: **G0 solid**, with partial G1 assets (MCP, evidence, HUD, doctor).

---

## 4. Phase plan

### Phase 0 — Foundations (now → 90 days)

- Approve intake and SPEC-0176 (Ontology v1).
- ADR for ontology/policy boundaries.
- Benchmark, coverage, and mutation baseline in CI.
- Split `src/mcp-server.js`; enforce import boundaries.
- Installer spike (Node SEA or single-file distribution).
- Select 3–5 design partners and mission KPIs.

**No implementation before spec + ADR + authorization.**

### Phase 1 — Ontology & Trust Core (0–6 months)

- Entities: `Mission`, `Repo`, `Spec`, `Task`, `Agent`, `Run`, `Evidence`, `Policy`,
  `Environment`, `Incident`, `Approval`.
- Links: `implements`, `verifies`, `authorizes`, `blocks`, `produces`, `depends_on`.
- Actions: `plan`, `execute`, `verify`, `approve`, `rollback`, `quarantine`.
- ABAC policy engine, deny-by-default, purpose binding.
- Every action emits a signed receipt; replay supported.
- SSO/RBAC minimum; audit export.

### Phase 2 — Operator & Edge (6–12 months)

- Operator console v0: mission graph, timeline, approvals, incidents.
- Event bus and real-time telemetry.
- Edge node: local store, offline mode, sync, conflict resolution.
- Jarvis v1: intent → plan preview → approval → execution → evidence.
- GitHub/GitLab, Jira, Slack/Teams, VS Code/Cursor integrations.
- HA single-region, retries, recovery.

### Phase 3 — Enterprise & Proving Ground (12–18 months)

- Digital twin and continuous gameday/chaos/red team.
- Multi-tenant, KMS/secrets, quotas, isolation.
- SOC2/ISO readiness, retention, audit export.
- SLOs, error budgets, incident response, backup/restore.
- Independent penetration test.

### Phase 4 — Ecosystem & Certification (18–24+ months)

- Plugin SDK and stable extension API.
- MCP registry/marketplace.
- Partner program, forward-deployed kit, training/certification.
- SOC2/ISO; FedRAMP/CMMC/ITAR only if the defense vertical is chosen.
- Public benchmarks and customer case studies.

---

## 5. Definition of Done (per feature)

```text
1. Approved spec (SDD)
2. ADR if architecture changes
3. Ontology contract (entity/link/action)
4. ABAC policy + audit hooks
5. Unit + integration + property/fuzz tests
6. Benchmark and performance budget
7. Documented failure mode + runbook
8. User documentation
9. Red-team / adversarial review
10. Reproducible evidence receipt
```

**Hard rules:** no spec → no code; no permission → no action; no evidence → no DONE;
no benchmark → no optimization; no failure mode → no release; no kill switch → no autonomy.

---

## 6. Metrics

| Area | Metric | Target |
| --- | --- | --- |
| Trust | Traceability, audit completeness | 100% |
| Quality | Coverage / mutation / flaky | >90% / >80% / <1% |
| Performance | verify p95 / tests wall time | <500 ms / <12 s |
| Safety | Permission violations | 0 |
| Operations | MTTR / offline uptime | <15 min / 100% |
| Autonomy | Human override rate | Measured, decreasing |
| Evidence | Time-to-evidence | <1 min |
| Reproducibility | Replay fidelity | 100% |

---

## 7. Non-goals

- ERP, finance, logistics, kernel, browser, consumer OS.
- Rewriting EOS in Rust/Go without measured hot paths.
- Multi-region scale before design-partner proof.
- Autonomy without human command.
- Certifications before product-market evidence.
- Documentation volume as a proxy for quality.

---

## 8. Immediate next artifacts

1. `docs/specs/eos_world_class/SPEC-0176-eos-ontology-v1.md`.
2. ADR: ontology and policy foundation.
3. `bench/` baseline + coverage/mutation gates.
4. Operator console v0 design.
5. Design-partner scorecard.
