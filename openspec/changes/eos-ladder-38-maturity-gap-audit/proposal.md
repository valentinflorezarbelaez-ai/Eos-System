# Proposal — Ladder 38 Maturity Gap Audit

## 1. Problem Statement

Following the successful closure of Ladder 37 (tip-seal #516 + tip-refresh #517; freeze pin `6868856c`), the EOS control plane still lacks a formal local-governed charter for credential-handle registry / binding, secret-zero leak-deny / redaction at composition, credential handle lifecycle / rotation, and credential honesty / handle attestation beyond soft-observe — without sealing plaintext secrets (Law VI).

L37 ports assert Law VI (“Never seal secrets”) while prioritizing feature-flag / policy-pack / staged-activation / config-honesty. Post-L37 inspection of `src/core/composition/` confirms **zero** filename or content matches for `credential-handle` / `credential_handle` / `secret-handle` / `secret_handle` / `secret-zero` / `SECRET_ZERO`. Existing Mission AU secret-runtime-broker / leak-guard / env-gate live under `src/core/secrets/` and are not receipted Layer-0 composition credential-handle ports. That is the clearest measured residual Layer-0 gap on top of closed L33 messaging + L34 orchestration/CQRS/DLQ/compat + L35 temporal + L36 admission/backpressure/bulkhead/capacity honesty + L37 config/flag/policy-pack.

## 2. Proposed Changes

- Conduct a docs-only Maturity Gap Audit chartering Ladder 38: Sovereign Credential-Handle & Secret-Zero Governance Fabric.
- Order satellites (implementation and tip-open are **not** in this change):
  - **Mission ET (SPEC-0156 / ADR-0137)**: Sovereign Credential-Handle Registry & Binding Port (`ET-RCPT-*`).
  - **Mission EU (SPEC-0157 / ADR-0138)**: Secret-Zero Leak-Deny & Redaction Governance Port (`EU-RCPT-*`).
  - **Mission EV (SPEC-0158 / ADR-0139)**: Credential Handle Lifecycle / Rotation Governance Port (`EV-RCPT-*`).
  - **Mission EW (SPEC-0159 / ADR-0140)**: Credential Honesty & Handle Attestation Port (`EW-RCPT-*`) — no new schema JSON; never seal secrets.
  - **Mission EX (SPEC-0160 / ADR-0141)**: Ladder 38 CI Seam-Pack Consolidation & Closeout (`EX-RCPT-*`).

## 3. Rejected Alternative Axes

- Human-gate / two-key / operator approval deepen — REJECTED (BO + CI MEASURED; L37 `humanGateHeld` enforced; not clearest zero-port residual).
- External tool / MCP federation deepen — REJECTED (L25 CG + `src/core/mcp/` MEASURED).
- Observability / SLO / golden-signal honesty — REJECTED as full axis (L29 + EH/EM/ER partial; less tightly coupled to L37).
- Multi-agent / fleet orchestration deepen — REJECTED (CB + fleet-activation MEASURED).
- Contract / API compatibility / CDC — REJECTED (data-contract-notary + domain-event-compatibility MEASURED; schemas AT_CEILING).
- Snapshot / checkpoint / recovery — REJECTED (already MEASURED AT+BT).
- Supply-chain / merkle attestation — REJECTED (already MEASURED).
- Multi-tenant / workspace isolation — REJECTED (prior ADR-0055/0068; BA MEASURED).
- Re-propose L37 config/flag or L36 admission — REJECTED (L36/L37 CLOSED; NEVER reopen).
- Mission AU broker/leak-guard alone — REJECTED (runtime/env; fold into ET/EU).

## 4. Invariants & Non-Claims

- `PRODUCTION_READY: NO`.
- `Fundacion Δ=0` (`FUNDACION_ALWAYS_DENY`).
- Law VI: zero plain secrets; receipts only — never seal secrets.
- Schemas strictly held at `AT_CEILING 35/35`.
- Ladders 17–37 permanently CLOSED (NEVER reopen L30–L37).
- Tip-open / tip-refresh / tip-seal / freeze `main_tip` rewrite: **NOT in this change** (tip-open SEPARATE; freeze pin `6868856c` observed only).
- Audit ≠ GHE. `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`.
