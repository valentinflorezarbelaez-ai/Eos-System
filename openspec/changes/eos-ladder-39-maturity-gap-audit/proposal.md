# Proposal — Ladder 39 Maturity Gap Audit

## 1. Problem Statement

Following the successful closure of Ladder 38 (tip-seal #531 + tip-refresh #532; freeze pin `fbd3c28a`), the EOS control plane still lacks a formal local-governed charter for external event ingress registry / binding, webhook authenticity / signature-verify (via L38 opaque handles), ingress quarantine / replay-deny & ordering, and ingress honesty / authenticity attestation beyond soft-observe — without sealing plaintext webhook secrets (Law VI).

L38 ports bind opaque credential handles and enforce secret-zero leak-deny while prioritizing handle registry / lifecycle / credential honesty. Post-L38 inspection of `src/core/composition/` confirms **zero** filename or content matches for `webhook` / `event-ingress` / `event_ingress` / `ingress-authent` across 53 composition `*-port.js` files. Existing Canary `WebhookPayloadDispatcher` and Fundacion notification HMAC specs are outbound/lab/project surfaces — not receipted Layer-0 composition ingress authenticity ports. That is the clearest measured residual Layer-0 gap on top of closed L33 messaging + L34 orchestration/CQRS/DLQ/compat + L35 temporal + L36 admission/backpressure/bulkhead/capacity honesty + L37 config/flag/policy-pack + L38 credential-handle/secret-zero.

## 2. Proposed Changes

- Conduct a docs-only Maturity Gap Audit chartering Ladder 39: Sovereign External Event Ingress & Webhook Authenticity Governance Fabric.
- Order satellites (implementation and tip-open are **not** in this change):
  - **Mission EY (SPEC-0161 / ADR-0143)**: Sovereign External Event Ingress Registry & Binding Port (`EY-RCPT-*`).
  - **Mission EZ (SPEC-0162 / ADR-0144)**: Webhook Authenticity / Signature-Verify Governance Port (`EZ-RCPT-*`) — consumes L38 opaque handles; never seal webhook secrets.
  - **Mission FA (SPEC-0163 / ADR-0145)**: Ingress Quarantine / Replay-Deny & Ordering Governance Port (`FA-RCPT-*`).
  - **Mission FB (SPEC-0164 / ADR-0146)**: Ingress Honesty & Authenticity Attestation Port (`FB-RCPT-*`) — no new schema JSON; never seal secrets.
  - **Mission FC (SPEC-0165 / ADR-0147)**: Ladder 39 CI Seam-Pack Consolidation & Closeout (`FC-RCPT-*`).

## 3. Rejected Alternative Axes

- Supply-chain / dependency / SBOM attestation — REJECTED (artifact attestation + merkle MEASURED; same as L38 disposition).
- Operator HITL / two-key escalation beyond BO — REJECTED (BO + CI MEASURED; L37/L38 `humanGateHeld` enforced; not clearest zero-port residual).
- Model/tool invocation (LLM tool-call receipt) — REJECTED (L25 CG + `src/core/mcp/` MEASURED; L38 already REJECTED MCP deepen).
- Archive/export / disaster-recovery evidence — REJECTED (archive-replay + AT + BT MEASURED).
- Re-propose L38 credential-handle or L37 config/flag — REJECTED (L37/L38 CLOSED; NEVER reopen).
- Canary/Fundacion outbound webhook alone — REJECTED (outbound/lab/project; fold into EY/EZ).
- Observability / SLO / golden-signal honesty deepen — REJECTED as full axis (L29 + EH/EM/ER/EW partial).
- Multi-tenant / workspace isolation — REJECTED (prior ADR-0055/0068; BA MEASURED).

## 4. Invariants & Non-Claims

- `PRODUCTION_READY: NO`.
- `Fundacion Δ=0` (`FUNDACION_ALWAYS_DENY`).
- Law VI: zero plain secrets; receipts only — never seal webhook secrets; consume L38 opaque handles.
- Schemas strictly held at `AT_CEILING 35/35`.
- Ladders 17–38 permanently CLOSED (NEVER reopen L30–L38).
- Tip-open / tip-refresh / tip-seal / freeze `main_tip` rewrite: **NOT in this change** (tip-open SEPARATE; freeze pin `fbd3c28a` observed only).
- Audit ≠ GHE. `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`.
