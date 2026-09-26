# ADR-0154 — Ladder 41 Maturity Gap Audit

- **Status:** Proposed — local governed (Ladder 41 Audit; docs-only)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric)
- **Spec:** LADDER-41-MATURITY-AUDIT (satellites SPEC-0171–0175 proposed)
- **Prior ADRs:** ADR-0148 (Ladder 40 Audit), ADR-0153 (Mission FH Ladder 40 Seam-Pack Closeout)

## Context

Ladder 40 is formally **CLOSED_FOR_LOCAL_GOVERNED_USE** (Audit + FD+FE+FF+FG+FH MEASURED + seam-pack + closeout; Sovereign Outbound Delivery & Callback Authenticity Governance Fabric) via tip-seal #561 + tip-refresh #562 (freeze pin `77fd2785` / EXPECTED_TIP). Ladders 17 through 40 remain CLOSED — **NEVER reopen**. **NEVER reopen L30–L40.** **NEVER reopen L40.**

Following the closure of Ladder 40, residual engineering gaps remain on top of the closed domain-event messaging fabric (L33), the process-manager / CQRS / dead-letter / compatibility fabric (L34), the temporal deadline / schedule wake / timeout compensation / honesty attestation fabric (L35), the admission / backpressure / bulkhead / capacity honesty fabric (L36), the feature-flag / policy-pack / staged-activation / config-honesty fabric (L37), the credential-handle / secret-zero / handle-lifecycle / credential-honesty fabric (L38), the external event ingress / webhook authenticity / ingress quarantine / ingress honesty fabric (L39), and the outbound delivery / callback authenticity / outbound quarantine / outbound honesty fabric (L40):

1. **Bidirectional delivery correlation registry / binding**: Closed ladders seal inbound ingress authenticity (L39 EY–FB) and outbound callback authenticity (L40 FD–FG) as **separate one-directional fabrics**, but there is **no** Layer-0 composition port for registering opaque ingress-receipt ↔ outbound-delivery correlations under `src/core/composition/` (confirmed: zero `correlation` / `bidirectional` / `round-trip` / `request-reply` / `delivery-integrity` filename **and** content matches in composition; 63 composition `*-port.js` files). Existing L39 + L40 ports are present (ingress + outbound) but do not bind round-trip integrity across the two fabrics. Existing `src/core/delivery/` covers patch/RC packaging delivery — **not** Layer-0 bidirectional delivery correlation.
2. **Round-trip / request-reply integrity governance**: Fail-closed verification that an outbound delivery claim matches a correlated ingress receipt (or expected reply class) has **zero** composition ports. Soft-observe of freeze pins alone is not a bidirectional integrity truth source.
3. **Bidirectional mismatch quarantine / deny**: Broken, poisoned, or unmatched correlation pairs lack a fail-closed composition quarantine / deny surface chained to L34 dead-letter quarantine, L35 temporal deadlines, L36 admission, L39 ingress quarantine, and L40 outbound quarantine without unsupervised live egress/ingress mutation.
4. **Bidirectional delivery honesty / integrity attestation beyond soft-observe**: Round-trip integrity claims must be attested with verifiable receipts that never embed callback secrets or raw correlation payloads; soft-observe of freeze pins alone is not a bidirectional-delivery truth source. Distinct from EH (temporal), EM (capacity), ER (config/flag), EW (credential/handle), FB (ingress authenticity), and FG (outbound delivery) honesty.
5. **Seam-pack consolidation**: A unified CI seam-pack must verify the end-to-end chaining of FI ➔ FJ ➔ FK ➔ FL.

Schemas remain strictly **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This audit does **not** tip-open Ladder 41, tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Open a **docs-only** Ladder 41 Maturity Gap Audit that declares central axis **Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric**.
2. Order proposed satellites **FI → FJ → FK → FL → FM** as SPEC-0171…0175:
   - **Mission FI (SPEC-0171)**: Bidirectional Delivery Correlation Registry & Binding Port (`FI-RCPT-*`).
   - **Mission FJ (SPEC-0172)**: Round-Trip / Request-Reply Integrity Governance Port (`FJ-RCPT-*`) — fail-closed integrity verify across L39 ingress + L40 outbound opaque refs; Law VI held.
   - **Mission FK (SPEC-0173)**: Bidirectional Mismatch Quarantine / Deny Governance Port (`FK-RCPT-*`).
   - **Mission FL (SPEC-0174)**: Bidirectional Delivery Honesty & Integrity Attestation Port (`FL-RCPT-*`) — no new schema JSON; never seal secrets.
   - **Mission FM (SPEC-0175)**: Ladder 41 CI Seam-Pack Consolidation & Closeout (`FM-RCPT-*`).
3. Keep ADR-0154 as the audit decision record; do **not** implement Mission FI (nor FJ–FM) in this change. Tip-open of Ladder 41 is **SEPARATE**. Reserve ADR-0155…0159 for satellites.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, `FUNDACION_ALWAYS_DENY`, audit ≠ GHE enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, never reopen L17–L40 (especially NEVER reopen L30–L40), schemas AT_CEILING held, freeze pin `77fd2785` not rewritten, Law VI held (receipts only — never seal secrets; opaque handles/refs only).

### Chosen Axis Rationale

After L40 closed the outbound delivery target registry → callback authenticity/signature-sign → outbound quarantine/retry-deny & ack → outbound honesty → seam-pack chain on top of L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure + L37 config/flag + L38 credential-handle + L39 ingress authenticity, the clearest **measured** residual Layer-0 gap is bidirectional delivery integrity / correlation governance: L39 ports govern **inbound** authenticity only, L40 ports govern **outbound** authenticity only, and composition exposes **zero** correlation / bidirectional / round-trip / request-reply / delivery-integrity ports (confirmed by directory inventory + content search over `src/core/composition/`; 63 `*-port.js` files include L39 `external-event-ingress-registry-port`, `webhook-authenticity-port`, `ingress-quarantine-replay-deny-port`, `ingress-honesty-attestation-port`, `ladder39-seam-port` **and** L40 `outbound-delivery-callback-registry-port`, `outbound-callback-authenticity-port`, `outbound-delivery-quarantine-retry-deny-port`, `outbound-delivery-honesty-attestation-port`, `ladder40-seam-port` — none are bidirectional delivery correlation / integrity ports). Existing Canary outbound dispatcher, Fundacion notification webhook specs, and `src/core/delivery/` patch/RC packaging (including L19 multi-worktree multi-target delivery) are not receipted Layer-0 composition bidirectional integrity ports that bind ingress authenticity into outbound delivery authenticity with fail-closed mismatch quarantine. The next local-governed ladder proposes those five satellites in that order. This package is the docs-only audit; implementation and tip-open are separate.

### Rejected Alternative Axes (evaluated, not chosen)

| Alternative residual theme | Why REJECTED as L41 axis |
| :--- | :--- |
| Supply-chain / dependency / SBOM attestation ports | Already MEASURED (`src/core/artifacts/artifact-attestation-*` + merkle ledger + L26 CN path). Usually REJECT — same disposition as L39/L40 audits. |
| Operator HITL / two-key escalation beyond existing BO | Mission BO two-key consensus (L21) already MEASURED under `src/core/consensus/`; Mission CI HITL escalation (L25) already MEASURED; L37–L40 policy gates already enforce `humanGateHeld` / `AUTO_SEAL_FORBIDDEN`. Residual deepen is real but not the clearest new Layer-0 zero-port residual vs bidirectional delivery integrity. |
| Model/tool invocation governance (LLM tool-call receipt fabric) | Already MEASURED as L25 Mission CG External Tool Federation (`src/core/federation/`) plus MCP surfaces under `src/core/mcp/`. Same disposition as L39/L40. |
| Archive/export / disaster-recovery evidence fabric | Mission archive-replay under `src/core/archive/` plus Mission AT custody snapshot + Mission BT workflow checkpoint already MEASURED. Snapshot/checkpoint/recovery usually REJECT (same as L39/L40). |
| Re-proposing L40 outbound / L39 ingress authenticity | Already MEASURED as L40 FD–FH / L39 EY–FC CLOSED — **NEVER reopen L39/L40**. |
| Elevating Canary WebhookPayloadDispatcher / Fundacion outbound notifications alone as full axis | Existing Canary/Fundacion webhook surfaces are outbound/lab/project — not a five-satellite Layer-0 composition bidirectional integrity fabric chained to L33–L40. Fold lessons into FI/FJ semantics rather than claiming Canary/Fundacion reopen. |
| Schema/contract evolution & compatibility governor deepen | `domain-event-compatibility-port` + `data-contract-notary-port` already MEASURED on composition; deepen is real but not zero-port residual vs bidirectional correlation (schemas AT_CEILING 35/35 — no new schemas). |
| Cross-ladder composition budget / mission-economy deepen beyond L24 | `cross-ladder-composition-port` + `evidence-economy-custody-ledger-port` already MEASURED; not the clearest post-L40 residual. |
| Operator reality / forensic / outbound console deepen beyond CE | `src/core/observability/operator-reality-console-*` already MEASURED (not composition Layer-0); less tightly chained to the closed L33–L40 messaging→ingress→outbound fabric than bidirectional correlation that joins L39+L40. |
| Evidence export / notarization / merkle deepen beyond BZ | `data-contract-notary-port` + artifact attestation / merkle already MEASURED; deepen usually REJECT. |
| Sandbox / isolation / blast-radius deepen beyond BA | `hexagonal-boundary-isolation-port` + `resource-isolation-bulkhead-port` + `src/core/sandbox/` already MEASURED. |
| Observability / SLO / golden-signal honesty deepen | L29 + EH/EM/ER/EW/FB/FG already seal honesty classes; less tightly coupled to post-L40 ingress+outbound fabric than bidirectional integrity that joins both. |
| Multi-tenant / workspace isolation boundaries | Repeatedly REJECTED (ADR-0055, ADR-0068); BA sandbox isolation already MEASURED. |
| Callback subscription / lifecycle deepen alone as full axis | Zero composition `subscription` hits are real, but subscription lifecycle is a narrower residual that can fold into FI binding semantics; bidirectional correlation that joins L39+L40 is the clearer measured residual spanning both closed fabrics. |
| Multi-target outbound routing governance alone as full axis | Zero composition `multi-target` / `fan-out` hits are real; L19 `src/core/delivery/multi-worktree-multi-target-delivery-port.js` is patch/RC packaging — not Layer-0 composition callback routing. Prefer fold routing lessons into FI/FJ rather than elevating multi-target alone over the L39↔L40 join residual. |

## Alternatives Considered AND REJECTED

- Flipping `PRODUCTION_READY` to `YES` — REJECTED: audit seals local governed proposal only.
- Reopening Ladder 40 (or L30–L39) — REJECTED: L30–L40 are CLOSED — **NEVER reopen L30–L40**.
- Tip-opening Ladder 41, tip-refresh, tip-seal, or rewriting freeze `main_tip` in this package — REJECTED: tip-open is SEPARATE.
- Implementing satellites FI–FM directly in this audit package — REJECTED: audit is strictly docs-only.
- Adding new schemas JSON files — REJECTED: schemas locked AT_CEILING 35/35.
- External project write access — REJECTED: `FUNDACION_ALWAYS_DENY` (Δ=0).
- Sealing plaintext callback secrets or raw correlation payloads into receipts — REJECTED: Law VI (receipts only; never seal secrets; use L38 opaque handles + opaque ingress/outbound refs).
- Choosing Supply-chain/SBOM, HITL/two-key deepen, LLM tool-call deepen, Archive/DR, re-proposed L39/L40, Canary/Fundacion-alone, schema-compat deepen, mission-economy deepen, forensic/console deepen, notarization deepen, sandbox deepen, SLO deepen, Multi-tenant, subscription-alone, or multi-target-alone as the L41 central axis — REJECTED: see Rejected Alternative Axes table (bidirectional delivery integrity / correlation has clearest measured residual post-L40).

## Consequences

- Positive: Clear, formal, ordered roadmap for Ladder 41 advancing bidirectional delivery correlation registry/binding, round-trip / request-reply integrity governance, bidirectional mismatch quarantine/deny, and bidirectional delivery honesty attestation on the closed L33 messaging + L34 orchestration + L35 temporal + L36 admission/backpressure + L37 config/flag + L38 credential-handle + L39 ingress authenticity + L40 outbound delivery authenticity fabric — without sealing secrets; joining the L39 ingress and L40 outbound fabrics with fail-closed integrity.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets; receipts only; opaque handles/refs), Law VII (professional English), Ladders 17–40 CLOSED, freeze pin `77fd2785` not rewritten.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_41_AUDIT_2026-09-25.md`
- OpenSpec: `openspec/changes/eos-ladder-41-maturity-gap-audit/`
- Prior: ADR-0153 (Mission FH Closeout), ADR-0148 (Ladder 40 Audit)
