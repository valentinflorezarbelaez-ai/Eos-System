# ADR-0136 — Ladder 38 Maturity Gap Audit

- **Status:** Proposed — local governed (Ladder 38 Audit; docs-only)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Credential-Handle & Secret-Zero Governance Fabric)
- **Spec:** LADDER-38-MATURITY-AUDIT (satellites SPEC-0156–0160 proposed)
- **Prior ADRs:** ADR-0130 (Ladder 37 Audit), ADR-0135 (Mission ES Ladder 37 Seam-Pack Closeout)

## Context

Ladder 37 is formally **CLOSED_FOR_LOCAL_GOVERNED_USE** (Audit + EO+EP+EQ+ER+ES MEASURED + seam-pack + closeout; Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric) via tip-seal #516 + tip-refresh #517 (freeze pin `6868856c` / EXPECTED_TIP). Ladders 17 through 37 remain CLOSED — **NEVER reopen**. **NEVER reopen L30–L37.** **NEVER reopen L37.**

Following the closure of Ladder 37, residual engineering gaps remain on top of the closed domain-event messaging fabric (L33), the process-manager / CQRS / dead-letter / compatibility fabric (L34), the temporal deadline / schedule wake / timeout compensation / honesty attestation fabric (L35), the admission / backpressure / bulkhead / capacity honesty fabric (L36), and the feature-flag / policy-pack / staged-activation / config-honesty fabric (L37):

1. **Credential-handle registry / binding**: Mission EO–ER seal flag/pack/config receipts (`EO-RCPT-*` … `ER-RCPT-*`) and assert Law VI (“never seal secrets”), but there is **no** Layer-0 credential-handle registry or opaque-handle binding surface under `src/core/composition/` (confirmed: zero `credential-handle` / `credential_handle` / `secret-handle` / `secret_handle` / `secret-zero` / `SECRET_ZERO` filename or content matches in composition). Existing Mission AU secret surfaces (`src/core/secrets/secret-runtime-broker.js`, `secret-leak-guard.js`, `env-gate.js`) are runtime/env-broker oriented — **not** a receipted Layer-0 composition credential-handle governance port chained to L33–L37.
2. **Secret-zero leak-deny / redaction at composition**: Closed ladders can publish events, orchestrate sagas, admit work, and activate config without a governed composition leak-deny / redaction port that fail-closes when plaintext secrets would enter composition receipts, logs, or federation-shaped bodies.
3. **Credential handle lifecycle / rotation governance**: Opaque handles lack a fail-closed staged rotate/revoke / lifecycle-seal surface that chains to L37 EQ staged activation and L33–L36 intakes without unsupervised live secret mutation.
4. **Credential honesty / handle attestation beyond soft-observe**: Handle and secret-zero claims must be attested with verifiable receipts that never embed secrets; soft-observe of freeze pins alone is not a credential-handle truth source. Distinct from EH (temporal), EM (capacity), and ER (config/flag) honesty.
5. **Seam-pack consolidation**: A unified CI seam-pack must verify the end-to-end chaining of ET ➔ EU ➔ EV ➔ EW.

Schemas remain strictly **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This audit does **not** tip-open Ladder 38, tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Open a **docs-only** Ladder 38 Maturity Gap Audit that declares central axis **Sovereign Credential-Handle & Secret-Zero Governance Fabric**.
2. Order proposed satellites **ET → EU → EV → EW → EX** as SPEC-0156…0160:
   - **Mission ET (SPEC-0156)**: Sovereign Credential-Handle Registry & Binding Port (`ET-RCPT-*`).
   - **Mission EU (SPEC-0157)**: Secret-Zero Leak-Deny & Redaction Governance Port (`EU-RCPT-*`).
   - **Mission EV (SPEC-0158)**: Credential Handle Lifecycle / Rotation Governance Port (`EV-RCPT-*`).
   - **Mission EW (SPEC-0159)**: Credential Honesty & Handle Attestation Port (`EW-RCPT-*`) — no new schema JSON; never seal secrets.
   - **Mission EX (SPEC-0160)**: Ladder 38 CI Seam-Pack Consolidation & Closeout (`EX-RCPT-*`).
3. Keep ADR-0136 as the audit decision record; do **not** implement Mission ET (nor EU–EX) in this change. Tip-open of Ladder 38 is **SEPARATE**. Reserve ADR-0137…0141 for satellites.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, `FUNDACION_ALWAYS_DENY`, audit ≠ GHE enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, never reopen L17–L37 (especially NEVER reopen L30–L37), schemas AT_CEILING held, freeze pin `6868856c` not rewritten, Law VI held (receipts only — never seal secrets).

### Chosen Axis Rationale

After L37 closed the feature-flag/toggle → policy-pack bind/evaluate → staged config activation → config honesty → seam-pack chain on top of L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure, the clearest **measured** residual Layer-0 gap is credential-handle / secret-zero governance: L37 ports assert Law VI (“Never seal secrets”) but expose **zero** composition credential-handle / secret-handle / secret-zero ports (confirmed by `git ls-tree` + content `rg` over `src/core/composition/`). Existing Mission AU broker/leak-guard/env-gate live under `src/core/secrets/` and are not receipted Layer-0 composition ports that bind opaque handles into the closed messaging → orchestration → temporal → admission → config fabric. The next local-governed ladder proposes those five satellites in that order. This package is the docs-only audit; implementation and tip-open are separate.

### Rejected Alternative Axes (evaluated, not chosen)

| Alternative residual theme | Why REJECTED as L38 axis |
| :--- | :--- |
| Human-gate / two-key / operator approval deepen beyond prior two-key consensus | Mission BO two-key consensus (L21) already MEASURED under `src/core/consensus/`; Mission CI HITL escalation (L25) already MEASURED; L37 policy gates already enforce `humanGateHeld` / `AUTO_SEAL_FORBIDDEN`. Residual deepen is real but not the clearest new Layer-0 zero-port residual vs credential-handle (zero composition matches). |
| External tool / MCP federation governance deepen beyond prior External Tool Federation | Already MEASURED as L25 Mission CG External Tool Federation (`src/core/federation/`) plus MCP surfaces under `src/core/mcp/`. Not a fresh Layer-0 composition residual after L37. |
| Observability / SLO / golden-signal honesty attestation beyond soft-observe | L29 Sovereign Observability & Evidence Economy already MEASURED; EH/EM/ER already seal temporal/capacity/config honesty. Soft-observe ≠ SLO is true but less tightly coupled to closed L37 config/flag fabric than credential-handle binding. Distinct from EH/EM/ER yet not strongest measured residual. |
| Multi-agent / fleet orchestration governance deepen beyond Composition Orchestrator / Fleet Registry | Mission CB Cross-Ladder Composition Orchestrator + fleet-activation under `src/core/projects/` already MEASURED. Not clearest residual post-L37. |
| Contract / API compatibility / consumer-driven contract governance | Mission data-contract-notary + L34 domain-event-compatibility already MEASURED; no new `docs/schemas/**/*.json` allowed (AT_CEILING). Not strongest residual. |
| Snapshot / checkpoint / recovery governance deepen | Already MEASURED (Mission AT custody snapshot + Mission BT workflow checkpoint FSM). Usually REJECT — not clearest new axis. |
| Supply-chain / artifact attestation / merkle deepen | Already MEASURED (artifact attestation + merkle ledger + L26 CN path). Usually REJECT. |
| Multi-tenant / workspace isolation boundaries | Repeatedly REJECTED (ADR-0055, ADR-0068); BA sandbox isolation already MEASURED. |
| Re-proposing L37 config/flag/policy-pack or L36 admission/backpressure | Already MEASURED as L37 EO–ES / L36 EJ–EN CLOSED — **NEVER reopen L36/L37**. |
| Elevating Mission AU secret-runtime-broker / leak-guard alone as full axis | Existing `src/core/secrets/*` are runtime/env surfaces (SPEC-0052 / AU), not a five-satellite Layer-0 composition credential-handle fabric chained to L33–L37. Fold AU concepts into ET/EU semantics rather than claiming AU reopen. |

## Alternatives Considered AND REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: audit seals local governed proposal only.
- Reopening Ladder 37 (or L30–L36) — REJECTED: L30–L37 are CLOSED — **NEVER reopen L30–L37**.
- Tip-opening Ladder 38, tip-refresh, tip-seal, or rewriting freeze `main_tip` in this package — REJECTED: tip-open is SEPARATE.
- Implementing satellites ET–EX directly in this audit package — REJECTED: audit is strictly docs-only.
- Adding new schemas JSON files — REJECTED: schemas locked AT_CEILING 35/35.
- External project write access — REJECTED: `FUNDACION_ALWAYS_DENY` (Δ=0).
- Sealing plaintext secrets into receipts — REJECTED: Law VI (receipts only; never seal secrets).
- Choosing Human-gate deepen, MCP/federation deepen, SLO/golden-signal, Fleet deepen, CDC/API-compat, Snapshot/checkpoint, Supply-chain/merkle, Multi-tenant, re-proposed L36/L37, or AU-alone as the L38 central axis — REJECTED: see Rejected Alternative Axes table (credential-handle/secret-zero has clearest measured residual post-L37).

## Consequences

- Positive: Clear, formal, ordered roadmap for Ladder 38 advancing opaque credential-handle binding, secret-zero leak-deny/redaction, handle lifecycle/rotation, and credential honesty attestation on the closed L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure + L37 config/flag fabric — without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets; receipts only), Law VII (professional English), Ladders 17–37 CLOSED, freeze pin `6868856c` not rewritten.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_38_AUDIT_2026-09-25.md`
- OpenSpec: `openspec/changes/eos-ladder-38-maturity-gap-audit/`
- Prior: ADR-0135 (Mission ES Closeout), ADR-0130 (Ladder 37 Audit)
