# ADR-0148 — Ladder 40 Maturity Gap Audit

- **Status:** Proposed — local governed (Ladder 40 Audit; docs-only)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Outbound Delivery & Callback Authenticity Governance Fabric)
- **Spec:** LADDER-40-MATURITY-AUDIT (satellites SPEC-0166–0170 proposed)
- **Prior ADRs:** ADR-0142 (Ladder 39 Audit), ADR-0147 (Mission FC Ladder 39 Seam-Pack Closeout)

## Context

Ladder 39 is formally **CLOSED_FOR_LOCAL_GOVERNED_USE** (Audit + EY+EZ+FA+FB+FC MEASURED + seam-pack + closeout; Sovereign External Event Ingress & Webhook Authenticity Governance Fabric) via tip-seal #546 + tip-refresh #547 (freeze pin `b3ce343d` / EXPECTED_TIP). Ladders 17 through 39 remain CLOSED — **NEVER reopen**. **NEVER reopen L30–L39.** **NEVER reopen L39.**

Following the closure of Ladder 39, residual engineering gaps remain on top of the closed domain-event messaging fabric (L33), the process-manager / CQRS / dead-letter / compatibility fabric (L34), the temporal deadline / schedule wake / timeout compensation / honesty attestation fabric (L35), the admission / backpressure / bulkhead / capacity honesty fabric (L36), the feature-flag / policy-pack / staged-activation / config-honesty fabric (L37), the credential-handle / secret-zero / handle-lifecycle / credential-honesty fabric (L38), and the external event ingress / webhook authenticity / ingress quarantine / ingress honesty fabric (L39):

1. **Outbound delivery / callback target registry / binding**: Closed ladders register inbound external event sources (L39 `external-event-ingress-registry`) and verify inbound webhook authenticity (L39 `webhook-authenticity`), but there is **no** Layer-0 composition port for registering outbound delivery / HTTP callback / webhook-egress targets under `src/core/composition/` (confirmed: zero `outbound` / `callback` / `egress` / `delivery-receipt` / `webhook-egress` / `signed-callback` filename matches in composition; 58 composition `*-port.js` files). Existing Canary `WebhookPayloadDispatcher` and Fundacion notification specs remain outbound / lab / project surfaces — **not** a receipted Layer-0 composition outbound delivery registry chained to L33–L39. Existing `src/core/delivery/` covers patch/RC packaging delivery — **not** HTTP callback / webhook-egress authenticity.
2. **Outbound callback authenticity / signature-sign governance**: Outbound HMAC / signature signing that consumes L38 opaque credential handles (Law VI — never seal plaintext callback secrets) has **zero** composition ports. L39 EZ verifies inbound signatures; the symmetric outbound sign/seal surface is absent.
3. **Outbound delivery quarantine / retry-deny & ack**: Failed, poisoned, or un-acknowledged outbound deliveries lack a fail-closed composition quarantine / retry-deny / ack surface chained to L34 dead-letter quarantine, L35 temporal deadlines, and L36 admission without unsupervised live egress mutation.
4. **Outbound delivery honesty / receipt attestation beyond soft-observe**: Delivery-success and callback-authenticity claims must be attested with verifiable receipts that never embed callback secrets; soft-observe of freeze pins alone is not an outbound-delivery truth source. Distinct from EH (temporal), EM (capacity), ER (config/flag), EW (credential/handle), and FB (ingress authenticity) honesty.
5. **Seam-pack consolidation**: A unified CI seam-pack must verify the end-to-end chaining of FD ➔ FE ➔ FF ➔ FG.

Schemas remain strictly **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This audit does **not** tip-open Ladder 40, tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Open a **docs-only** Ladder 40 Maturity Gap Audit that declares central axis **Sovereign Outbound Delivery & Callback Authenticity Governance Fabric**.
2. Order proposed satellites **FD → FE → FF → FG → FH** as SPEC-0166…0170:
   - **Mission FD (SPEC-0166)**: Sovereign Outbound Delivery / Callback Target Registry & Binding Port (`FD-RCPT-*`).
   - **Mission FE (SPEC-0167)**: Outbound Callback Authenticity / Signature-Sign Governance Port (`FE-RCPT-*`) — consumes L38 opaque handles; never seal callback secrets; symmetric to L39 EZ verify.
   - **Mission FF (SPEC-0168)**: Outbound Delivery Quarantine / Retry-Deny & Ack Governance Port (`FF-RCPT-*`).
   - **Mission FG (SPEC-0169)**: Outbound Delivery Honesty & Receipt Attestation Port (`FG-RCPT-*`) — no new schema JSON; never seal secrets.
   - **Mission FH (SPEC-0170)**: Ladder 40 CI Seam-Pack Consolidation & Closeout (`FH-RCPT-*`).
3. Keep ADR-0148 as the audit decision record; do **not** implement Mission FD (nor FE–FH) in this change. Tip-open of Ladder 40 is **SEPARATE**. Reserve ADR-0149…0153 for satellites.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, `FUNDACION_ALWAYS_DENY`, audit ≠ GHE enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, never reopen L17–L39 (especially NEVER reopen L30–L39), schemas AT_CEILING held, freeze pin `b3ce343d` not rewritten, Law VI held (receipts only — never seal secrets).

### Chosen Axis Rationale

After L39 closed the external event ingress registry → webhook authenticity/signature-verify → ingress quarantine/replay-deny → ingress honesty → seam-pack chain on top of L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure + L37 config/flag + L38 credential-handle, the clearest **measured** residual Layer-0 gap is outbound delivery / callback authenticity governance: L39 ports govern **inbound** authenticity only, L33 domain-event ports are outbound/internal messaging (not signed HTTP callback egress), and composition exposes **zero** outbound / callback / egress / delivery-authenticity / signed-callback ports (confirmed by directory inventory + content search over `src/core/composition/`; 58 `*-port.js` files include L39 `external-event-ingress-registry-port`, `webhook-authenticity-port`, `ingress-quarantine-replay-deny-port`, `ingress-honesty-attestation-port`, `ladder39-seam-port` — none are outbound delivery authenticity ports). Existing Canary outbound dispatcher, Fundacion notification webhook specs, and `src/core/delivery/` patch/RC packaging are not receipted Layer-0 composition outbound callback authenticity ports that bind signed egress into the closed messaging → orchestration → temporal → admission → config → credential-handle → ingress fabric. The next local-governed ladder proposes those five satellites in that order. This package is the docs-only audit; implementation and tip-open are separate.

### Rejected Alternative Axes (evaluated, not chosen)

| Alternative residual theme | Why REJECTED as L40 axis |
| :--- | :--- |
| Supply-chain / dependency / SBOM attestation ports | Already MEASURED (`src/core/artifacts/artifact-attestation-*` + merkle ledger + L26 CN path). Usually REJECT — same disposition as L38/L39 audits. |
| Operator HITL / two-key escalation beyond existing BO | Mission BO two-key consensus (L21) already MEASURED under `src/core/consensus/`; Mission CI HITL escalation (L25) already MEASURED; L37–L39 policy gates already enforce `humanGateHeld` / `AUTO_SEAL_FORBIDDEN`. Residual deepen is real but not the clearest new Layer-0 zero-port residual vs outbound delivery authenticity. |
| Model/tool invocation governance (LLM tool-call receipt fabric) | Already MEASURED as L25 Mission CG External Tool Federation (`src/core/federation/`) plus MCP surfaces under `src/core/mcp/`. Same disposition as L38/L39. |
| Archive/export / disaster-recovery evidence fabric | Mission archive-replay under `src/core/archive/` plus Mission AT custody snapshot + Mission BT workflow checkpoint already MEASURED. Snapshot/checkpoint/recovery usually REJECT (same as L38/L39). |
| Re-proposing L39 ingress/webhook authenticity or L38 credential-handle | Already MEASURED as L39 EY–FC / L38 ET–EX CLOSED — **NEVER reopen L38/L39**. |
| Elevating Canary WebhookPayloadDispatcher / Fundacion outbound notifications alone as full axis | Existing Canary/Fundacion webhook surfaces are outbound/lab/project — not a five-satellite Layer-0 composition outbound delivery authenticity fabric chained to L33–L39. Fold outbound lessons into FD/FE semantics rather than claiming Canary/Fundacion reopen. |
| Schema/contract evolution & compatibility governor deepen | `domain-event-compatibility-port` + `data-contract-notary-port` already MEASURED on composition; deepen is real but not zero-port residual vs outbound callback authenticity. |
| Cross-ladder composition budget / mission-economy deepen beyond L24 | `cross-ladder-composition-port` + `evidence-economy-custody-ledger-port` already MEASURED; not the clearest post-L39 residual. |
| Operator reality / forensic console deepen beyond CE | No composition forensic ports, but less tightly chained to the closed L33–L39 messaging→ingress fabric than the symmetric outbound delivery residual. Prefer outbound symmetry. |
| Evidence export / notarization / merkle deepen beyond BZ | `data-contract-notary-port` + artifact attestation / merkle already MEASURED; deepen usually REJECT. |
| Sandbox / isolation / blast-radius deepen beyond BA | `hexagonal-boundary-isolation-port` + `resource-isolation-bulkhead-port` + `src/core/sandbox/` already MEASURED. |
| Observability / SLO / golden-signal honesty deepen | L29 + EH/EM/ER/EW/FB already seal honesty classes; less tightly coupled to post-L39 ingress fabric than outbound delivery that mirrors L39 and consumes L38 handles for callback HMAC. |
| Multi-tenant / workspace isolation boundaries | Repeatedly REJECTED (ADR-0055, ADR-0068); BA sandbox isolation already MEASURED. |

## Alternatives Considered AND REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: audit seals local governed proposal only.
- Reopening Ladder 39 (or L30–L38) — REJECTED: L30–L39 are CLOSED — **NEVER reopen L30–L39**.
- Tip-opening Ladder 40, tip-refresh, tip-seal, or rewriting freeze `main_tip` in this package — REJECTED: tip-open is SEPARATE.
- Implementing satellites FD–FH directly in this audit package — REJECTED: audit is strictly docs-only.
- Adding new schemas JSON files — REJECTED: schemas locked AT_CEILING 35/35.
- External project write access — REJECTED: `FUNDACION_ALWAYS_DENY` (Δ=0).
- Sealing plaintext callback secrets into receipts — REJECTED: Law VI (receipts only; never seal secrets; use L38 opaque handles).
- Choosing Supply-chain/SBOM, HITL/two-key deepen, LLM tool-call deepen, Archive/DR, re-proposed L38/L39, Canary/Fundacion-alone, schema-compat deepen, mission-economy deepen, forensic deepen, notarization deepen, sandbox deepen, SLO deepen, or Multi-tenant as the L40 central axis — REJECTED: see Rejected Alternative Axes table (outbound delivery / callback authenticity has clearest measured residual post-L39).

## Consequences

- Positive: Clear, formal, ordered roadmap for Ladder 40 advancing outbound delivery target registry/binding, callback authenticity/signature-sign (via L38 opaque handles), outbound quarantine/retry-deny & ack, and outbound delivery honesty attestation on the closed L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure + L37 config/flag + L38 credential-handle + L39 ingress authenticity fabric — without sealing secrets; symmetric completion of the L39 ingress fabric.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets; receipts only), Law VII (professional English), Ladders 17–39 CLOSED, freeze pin `b3ce343d` not rewritten.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_40_AUDIT_2026-09-25.md`
- OpenSpec: `openspec/changes/eos-ladder-40-maturity-gap-audit/`
- Prior: ADR-0147 (Mission FC Closeout), ADR-0142 (Ladder 39 Audit)
