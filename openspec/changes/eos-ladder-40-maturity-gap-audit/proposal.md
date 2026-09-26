# Proposal — Ladder 40 Maturity Gap Audit

## 1. Problem Statement

Following the successful closure of Ladder 39 (tip-seal #546 + tip-refresh #547; freeze pin `b3ce343d`), the EOS control plane still lacks a formal local-governed charter for outbound delivery / callback target registry / binding, outbound callback authenticity / signature-sign (via L38 opaque handles), outbound delivery quarantine / retry-deny & ack, and outbound delivery honesty / receipt attestation beyond soft-observe — without sealing plaintext callback secrets (Law VI).

L39 ports govern inbound external event ingress registry, webhook authenticity/signature-verify, ingress quarantine/replay-deny, and ingress honesty. Post-L39 inspection of `src/core/composition/` confirms **zero** filename matches for `outbound` / `callback` / `egress` / `delivery-receipt` / `webhook-egress` / `signed-callback` across 58 composition `*-port.js` files (L39 ingress ports are present; outbound delivery authenticity ports are not). Existing Canary `WebhookPayloadDispatcher`, Fundacion notification HMAC specs, and `src/core/delivery/` patch/RC packaging are outbound/lab/project or packaging surfaces — not receipted Layer-0 composition outbound callback authenticity ports. That is the clearest measured residual Layer-0 gap on top of closed L33 messaging + L34 orchestration/CQRS/DLQ/compat + L35 temporal + L36 admission/backpressure/bulkhead/capacity honesty + L37 config/flag/policy-pack + L38 credential-handle/secret-zero + L39 ingress/webhook authenticity — the symmetric completion of the L39 ingress fabric.

## 2. Proposed Changes

- Conduct a docs-only Maturity Gap Audit chartering Ladder 40: Sovereign Outbound Delivery & Callback Authenticity Governance Fabric.
- Order satellites (implementation and tip-open are **not** in this change):
  - **Mission FD (SPEC-0166 / ADR-0149)**: Sovereign Outbound Delivery / Callback Target Registry & Binding Port (`FD-RCPT-*`).
  - **Mission FE (SPEC-0167 / ADR-0150)**: Outbound Callback Authenticity / Signature-Sign Governance Port (`FE-RCPT-*`) — consumes L38 opaque handles; never seal callback secrets; symmetric to L39 EZ verify.
  - **Mission FF (SPEC-0168 / ADR-0151)**: Outbound Delivery Quarantine / Retry-Deny & Ack Governance Port (`FF-RCPT-*`).
  - **Mission FG (SPEC-0169 / ADR-0152)**: Outbound Delivery Honesty & Receipt Attestation Port (`FG-RCPT-*`) — no new schema JSON; never seal secrets.
  - **Mission FH (SPEC-0170 / ADR-0153)**: Ladder 40 CI Seam-Pack Consolidation & Closeout (`FH-RCPT-*`).

## 3. Rejected Alternative Axes

- Supply-chain / dependency / SBOM attestation — REJECTED (artifact attestation + merkle MEASURED; same as L38/L39 disposition).
- Operator HITL / two-key escalation beyond BO — REJECTED (BO + CI MEASURED; L37–L39 `humanGateHeld` enforced; not clearest zero-port residual).
- Model/tool invocation (LLM tool-call receipt) — REJECTED (L25 CG + `src/core/mcp/` MEASURED; L38/L39 already REJECTED MCP deepen).
- Archive/export / disaster-recovery evidence — REJECTED (archive-replay + AT + BT MEASURED).
- Re-propose L39 ingress/webhook or L38 credential-handle — REJECTED (L38/L39 CLOSED; NEVER reopen).
- Canary/Fundacion outbound webhook alone — REJECTED (outbound/lab/project; fold into FD/FE).
- Schema/contract evolution & compatibility governor deepen — REJECTED (compat + notary ports already MEASURED).
- Cross-ladder composition budget / mission-economy deepen — REJECTED (cross-ladder + evidence-economy already MEASURED).
- Operator reality / forensic console deepen beyond CE — REJECTED as full axis (less tightly coupled than outbound symmetry).
- Evidence export / notarization / merkle deepen beyond BZ — REJECTED (notary + attestation MEASURED).
- Sandbox / isolation / blast-radius deepen beyond BA — REJECTED (hexagonal/bulkhead + sandbox MEASURED).
- Observability / SLO / golden-signal honesty deepen — REJECTED as full axis (L29 + EH/EM/ER/EW/FB partial).
- Multi-tenant / workspace isolation — REJECTED (prior ADR-0055/0068; BA MEASURED).

## 4. Invariants & Non-Claims

- `PRODUCTION_READY: NO`.
- `Fundacion Δ=0` (`FUNDACION_ALWAYS_DENY`).
- Law VI: zero plain secrets; receipts only — never seal callback secrets; consume L38 opaque handles.
- Schemas strictly held at `AT_CEILING 35/35`.
- Ladders 17–39 permanently CLOSED (NEVER reopen L30–L39).
- Tip-open / tip-refresh / tip-seal / freeze `main_tip` rewrite: **NOT in this change** (tip-open SEPARATE; freeze pin `b3ce343d` observed only).
- Audit ≠ GHE. `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`.
