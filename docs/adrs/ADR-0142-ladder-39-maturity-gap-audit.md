# ADR-0142 — Ladder 39 Maturity Gap Audit

- **Status:** Proposed — local governed (Ladder 39 Audit; docs-only)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign External Event Ingress & Webhook Authenticity Governance Fabric)
- **Spec:** LADDER-39-MATURITY-AUDIT (satellites SPEC-0161–0165 proposed)
- **Prior ADRs:** ADR-0136 (Ladder 38 Audit), ADR-0141 (Mission EX Ladder 38 Seam-Pack Closeout)

## Context

Ladder 38 is formally **CLOSED_FOR_LOCAL_GOVERNED_USE** (Audit + ET+EU+EV+EW+EX MEASURED + seam-pack + closeout; Sovereign Credential-Handle & Secret-Zero Governance Fabric) via tip-seal #531 + tip-refresh #532 (freeze pin `fbd3c28a` / EXPECTED_TIP). Ladders 17 through 38 remain CLOSED — **NEVER reopen**. **NEVER reopen L30–L38.** **NEVER reopen L38.**

Following the closure of Ladder 38, residual engineering gaps remain on top of the closed domain-event messaging fabric (L33), the process-manager / CQRS / dead-letter / compatibility fabric (L34), the temporal deadline / schedule wake / timeout compensation / honesty attestation fabric (L35), the admission / backpressure / bulkhead / capacity honesty fabric (L36), the feature-flag / policy-pack / staged-activation / config-honesty fabric (L37), and the credential-handle / secret-zero / handle-lifecycle / credential-honesty fabric (L38):

1. **External event ingress registry / binding**: Closed ladders publish domain events (L33 `domain-event-publisher`), consume idempotently, and bind opaque credential handles (L38 ET–EW), but there is **no** Layer-0 composition port for registering inbound external event / webhook sources under `src/core/composition/` (confirmed: zero `webhook` / `event-ingress` / `event_ingress` / `ingress-authent` filename or content matches in composition; 53 composition `*-port.js` files). Existing Canary `WebhookPayloadDispatcher` and Fundacion notification specs are outbound / lab / project surfaces — **not** a receipted Layer-0 composition ingress registry chained to L33–L38.
2. **Webhook authenticity / signature verify governance**: Inbound HMAC / signature verification that consumes L38 opaque credential handles (Law VI — never seal plaintext webhook secrets) has **zero** composition ports. Agent-identity attestation HMAC under `src/core/attestation/` is agent-session oriented, not external webhook authenticity.
3. **Ingress quarantine / replay-deny & ordering**: Forged, replayed, or out-of-order external payloads lack a fail-closed composition quarantine / replay-deny surface chained to L34 dead-letter quarantine and L36 admission without unsupervised live ingress mutation.
4. **Ingress honesty / authenticity attestation beyond soft-observe**: Authenticity and ingress-source claims must be attested with verifiable receipts that never embed webhook secrets; soft-observe of freeze pins alone is not an ingress-authenticity truth source. Distinct from EH (temporal), EM (capacity), ER (config/flag), and EW (credential/handle) honesty.
5. **Seam-pack consolidation**: A unified CI seam-pack must verify the end-to-end chaining of EY ➔ EZ ➔ FA ➔ FB.

Schemas remain strictly **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This audit does **not** tip-open Ladder 39, tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Open a **docs-only** Ladder 39 Maturity Gap Audit that declares central axis **Sovereign External Event Ingress & Webhook Authenticity Governance Fabric**.
2. Order proposed satellites **EY → EZ → FA → FB → FC** as SPEC-0161…0165:
   - **Mission EY (SPEC-0161)**: Sovereign External Event Ingress Registry & Binding Port (`EY-RCPT-*`).
   - **Mission EZ (SPEC-0162)**: Webhook Authenticity / Signature-Verify Governance Port (`EZ-RCPT-*`) — consumes L38 opaque handles; never seal webhook secrets.
   - **Mission FA (SPEC-0163)**: Ingress Quarantine / Replay-Deny & Ordering Governance Port (`FA-RCPT-*`).
   - **Mission FB (SPEC-0164)**: Ingress Honesty & Authenticity Attestation Port (`FB-RCPT-*`) — no new schema JSON; never seal secrets.
   - **Mission FC (SPEC-0165)**: Ladder 39 CI Seam-Pack Consolidation & Closeout (`FC-RCPT-*`).
3. Keep ADR-0142 as the audit decision record; do **not** implement Mission EY (nor EZ–FC) in this change. Tip-open of Ladder 39 is **SEPARATE**. Reserve ADR-0143…0147 for satellites.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, `FUNDACION_ALWAYS_DENY`, audit ≠ GHE enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, never reopen L17–L38 (especially NEVER reopen L30–L38), schemas AT_CEILING held, freeze pin `fbd3c28a` not rewritten, Law VI held (receipts only — never seal secrets).

### Chosen Axis Rationale

After L38 closed the credential-handle registry → secret-zero leak-deny → handle lifecycle → credential honesty → seam-pack chain on top of L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure + L37 config/flag, the clearest **measured** residual Layer-0 gap is external event ingress / webhook authenticity governance: L33 domain-event ports are outbound/internal messaging, L38 ports bind opaque handles but expose **zero** composition webhook / event-ingress / ingress-authenticity ports (confirmed by directory inventory + content search over `src/core/composition/`). Existing Canary outbound dispatcher and Fundacion notification webhook specs are not receipted Layer-0 composition ingress authenticity ports that bind verified external events into the closed messaging → orchestration → temporal → admission → config → credential-handle fabric. The next local-governed ladder proposes those five satellites in that order. This package is the docs-only audit; implementation and tip-open are separate.

### Rejected Alternative Axes (evaluated, not chosen)

| Alternative residual theme | Why REJECTED as L39 axis |
| :--- | :--- |
| Supply-chain / dependency / SBOM attestation ports | Already MEASURED (`src/core/artifacts/artifact-attestation-*` + merkle ledger + L26 CN path). Zero composition SBOM filenames is real but not a fresh Layer-0 residual vs ingress authenticity (also zero, and never MEASURED as composition ingress). Usually REJECT — same disposition as L38 audit. |
| Operator HITL / two-key escalation beyond existing BO | Mission BO two-key consensus (L21) already MEASURED under `src/core/consensus/`; Mission CI HITL escalation (L25) already MEASURED; L37/L38 policy gates already enforce `humanGateHeld` / `AUTO_SEAL_FORBIDDEN`. Residual deepen is real but not the clearest new Layer-0 zero-port residual vs ingress authenticity. |
| Model/tool invocation governance (LLM tool-call receipt fabric) | Already MEASURED as L25 Mission CG External Tool Federation (`src/core/federation/`) plus MCP surfaces under `src/core/mcp/`. Composition has zero llm/tool-call ports, but L38 audit already REJECTED MCP/federation deepen as not a fresh residual. Same disposition. |
| Archive/export / disaster-recovery evidence fabric | Mission archive-replay under `src/core/archive/` plus Mission AT custody snapshot + Mission BT workflow checkpoint already MEASURED. Snapshot/checkpoint/recovery usually REJECT (same as L38). |
| Re-proposing L38 credential-handle/secret-zero or L37 config/flag | Already MEASURED as L38 ET–EX / L37 EO–ES CLOSED — **NEVER reopen L37/L38**. |
| Elevating Canary WebhookPayloadDispatcher / Fundacion outbound notifications alone as full axis | Existing Canary/Fundacion webhook surfaces are outbound/lab/project — not a five-satellite Layer-0 composition ingress authenticity fabric chained to L33–L38. Fold outbound lessons into EY/EZ semantics rather than claiming Canary/Fundacion reopen. |
| Observability / SLO / golden-signal honesty deepen | L29 + EH/EM/ER/EW already seal honesty classes; less tightly coupled to post-L38 credential-handle fabric than ingress authenticity that consumes L38 handles for webhook HMAC. |
| Multi-tenant / workspace isolation boundaries | Repeatedly REJECTED (ADR-0055, ADR-0068); BA sandbox isolation already MEASURED. |

## Alternatives Considered AND REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: audit seals local governed proposal only.
- Reopening Ladder 38 (or L30–L37) — REJECTED: L30–L38 are CLOSED — **NEVER reopen L30–L38**.
- Tip-opening Ladder 39, tip-refresh, tip-seal, or rewriting freeze `main_tip` in this package — REJECTED: tip-open is SEPARATE.
- Implementing satellites EY–FC directly in this audit package — REJECTED: audit is strictly docs-only.
- Adding new schemas JSON files — REJECTED: schemas locked AT_CEILING 35/35.
- External project write access — REJECTED: `FUNDACION_ALWAYS_DENY` (Δ=0).
- Sealing plaintext webhook secrets into receipts — REJECTED: Law VI (receipts only; never seal secrets; use L38 opaque handles).
- Choosing Supply-chain/SBOM, HITL/two-key deepen, LLM tool-call deepen, Archive/DR, re-proposed L37/L38, Canary/Fundacion-alone, SLO deepen, or Multi-tenant as the L39 central axis — REJECTED: see Rejected Alternative Axes table (ingress/webhook authenticity has clearest measured residual post-L38).

## Consequences

- Positive: Clear, formal, ordered roadmap for Ladder 39 advancing external ingress registry/binding, webhook authenticity/signature-verify (via L38 opaque handles), ingress quarantine/replay-deny, and ingress honesty attestation on the closed L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure + L37 config/flag + L38 credential-handle fabric — without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets; receipts only), Law VII (professional English), Ladders 17–38 CLOSED, freeze pin `fbd3c28a` not rewritten.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_39_AUDIT_2026-09-25.md`
- OpenSpec: `openspec/changes/eos-ladder-39-maturity-gap-audit/`
- Prior: ADR-0141 (Mission EX Closeout), ADR-0136 (Ladder 38 Audit)
