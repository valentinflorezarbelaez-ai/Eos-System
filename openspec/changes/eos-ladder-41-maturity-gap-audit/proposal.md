# Proposal — Ladder 41 Maturity Gap Audit

## 1. Problem Statement

Following the successful closure of Ladder 40 (tip-seal #561 + tip-refresh #562; freeze pin `77fd2785`), the EOS control plane still lacks a formal local-governed charter for bidirectional delivery correlation registry / binding, round-trip / request-reply integrity governance, bidirectional mismatch quarantine / deny, and bidirectional delivery honesty / integrity attestation beyond soft-observe — without sealing plaintext callback secrets or raw correlation payloads (Law VI).

L39 ports govern inbound external event ingress authenticity; L40 ports govern outbound callback authenticity. Post-L40 inspection of `src/core/composition/` confirms **zero** filename **and** content matches for `correlation` / `bidirectional` / `round-trip` / `request-reply` / `delivery-integrity` across 63 composition `*-port.js` files (L39 ingress + L40 outbound ports are present; bidirectional delivery integrity ports are not). Existing Canary `WebhookPayloadDispatcher`, Fundacion notification HMAC specs, and `src/core/delivery/` patch/RC packaging are outbound/lab/project or packaging surfaces — not receipted Layer-0 composition bidirectional integrity ports. That is the clearest measured residual Layer-0 gap on top of closed L33 messaging + L34 orchestration/CQRS/DLQ/compat + L35 temporal + L36 admission/backpressure/bulkhead/capacity honesty + L37 config/flag/policy-pack + L38 credential-handle/secret-zero + L39 ingress/webhook authenticity + L40 outbound delivery/callback authenticity — joining the L39 ingress and L40 outbound fabrics with fail-closed integrity.

## 2. Proposed Changes

- Conduct a docs-only Maturity Gap Audit chartering Ladder 41: Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric.
- Order satellites (implementation and tip-open are **not** in this change):
  - **Mission FI (SPEC-0171 / ADR-0155)**: Bidirectional Delivery Correlation Registry & Binding Port (`FI-RCPT-*`).
  - **Mission FJ (SPEC-0172 / ADR-0156)**: Round-Trip / Request-Reply Integrity Governance Port (`FJ-RCPT-*`) — fail-closed integrity verify across L39+L40 opaque refs; Law VI held.
  - **Mission FK (SPEC-0173 / ADR-0157)**: Bidirectional Mismatch Quarantine / Deny Governance Port (`FK-RCPT-*`).
  - **Mission FL (SPEC-0174 / ADR-0158)**: Bidirectional Delivery Honesty & Integrity Attestation Port (`FL-RCPT-*`) — no new schema JSON; never seal secrets.
  - **Mission FM (SPEC-0175 / ADR-0159)**: Ladder 41 CI Seam-Pack Consolidation & Closeout (`FM-RCPT-*`).

## 3. Rejected Alternative Axes

- Supply-chain / dependency / SBOM attestation — REJECTED (artifact attestation + merkle MEASURED; same as L39/L40 disposition).
- Operator HITL / two-key escalation beyond BO — REJECTED (BO + CI MEASURED; L37–L40 `humanGateHeld` enforced; not clearest zero-port residual).
- Model/tool invocation (LLM tool-call receipt) — REJECTED (L25 CG + `src/core/mcp/` MEASURED; L39/L40 already REJECTED MCP deepen).
- Archive/export / disaster-recovery evidence — REJECTED (archive-replay + AT + BT MEASURED).
- Re-propose L40 outbound or L39 ingress — REJECTED (L39/L40 CLOSED; NEVER reopen).
- Canary/Fundacion outbound webhook alone — REJECTED (outbound/lab/project; fold into FI/FJ).
- Schema/contract evolution & compatibility governor deepen — REJECTED (compat + notary ports already MEASURED; AT_CEILING 35/35).
- Cross-ladder composition budget / mission-economy deepen — REJECTED (cross-ladder + evidence-economy already MEASURED).
- Operator reality / forensic / outbound console deepen beyond CE — REJECTED as full axis (observability console MEASURED; less tightly coupled than bidirectional join).
- Evidence export / notarization / merkle deepen beyond BZ — REJECTED (notary + attestation MEASURED).
- Sandbox / isolation / blast-radius deepen beyond BA — REJECTED (hexagonal/bulkhead + sandbox MEASURED).
- Observability / SLO / golden-signal honesty deepen — REJECTED as full axis (L29 + EH/EM/ER/EW/FB/FG partial).
- Multi-tenant / workspace isolation — REJECTED (prior ADR-0055/0068; BA MEASURED).
- Callback subscription / lifecycle alone — REJECTED as full axis (real zero-port; fold into FI; L39↔L40 join clearer).
- Multi-target outbound routing alone — REJECTED as full axis (real zero-port; L19 packaging; fold into FI/FJ).

## 4. Invariants & Non-Claims

- `PRODUCTION_READY: NO`.
- `Fundacion Δ=0` (`FUNDACION_ALWAYS_DENY`).
- Law VI: zero plain secrets; receipts only — never seal callback secrets or raw correlation payloads; consume L38 opaque handles + opaque L39/L40 refs.
- Schemas strictly held at `AT_CEILING 35/35`.
- Ladders 17–40 permanently CLOSED (NEVER reopen L30–L40).
- Tip-open / tip-refresh / tip-seal / freeze `main_tip` rewrite: **NOT in this change** (tip-open SEPARATE; freeze pin `77fd2785` observed only).
- Audit ≠ GHE. `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`.
