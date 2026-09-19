# ADR-0074 — Ladder 28 Maturity Gap Audit

- **Status:** Proposed — local governed (Ladder 28 Audit; docs-only)
- **Date:** 2026-09-19 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric)
- **Spec:** LADDER-28-MATURITY-AUDIT (satellites SPEC-0105–0109 proposed)
- **Prior ADR:** ADR-0073 (Mission CU Ladder 27 seam-pack closeout)

## Context

Ladder 27 is formally **CLOSED_FOR_LOCAL_GOVERNED_USE** (CQ+CR+CS+CT+CU MEASURED + seam-pack + closeout; Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric) via Mission CU #383 and tip-seal #384 pinning freeze main_tip to `58193bc80735c588f0aa09e2c136afa3980c4a51` (`58193bc8`). Freeze currently says **Do NOT open Ladder 28**. L17–L26 remain CLOSED — **NEVER reopen**. **NEVER reopen L27.**

After L27 continuity ports + CU seam-pack, residual Layer-0 gaps remain:

1. Post-L26 B Doctor/HUD honesty (ADR-0063 / #369) remains **fragment surfaces**, not a Layer-0 ritual composition port binding honesty chips to CQ–CT observe.
2. CU seam-pack is CI require/smoke composition — **not** operator-facing CQ↔CR↔CS↔CT orchestration beyond seam.
3. Billing-blocked local verify / operator runbook ritual hardening **beyond CQ** remains unfinished.
4. Freeze NON-CLAIMs expose Mission OS / control-plane L0 residual honesty gaps without a governed honesty port.
5. No L28 seam-pack closeout.
6. Complexity prune inventory (A) is docs-only without delete authorization — hygiene residual; Valentin asked for prune plan **AFTER** this audit; **not** the strongest sole axis.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`.

## Decision

1. Open a **docs-only** Ladder 28 Maturity Gap Audit that declares central axis **Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric**.
2. Order proposed satellites **CV → CW → CX → CY → CZ** as SPEC-0105…0109.
3. Keep ADR-0074 as the audit decision record; do **not** implement Mission CV (or CW–CZ) in this change.
4. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins here (SEPARATE tip-open after audit merge). Freeze pin stays on CU tip `58193bc8` until tip-open.
5. Do **not** claim Ladder 28 OPEN until that separate tip-open formally opens it. Respect freeze **Do NOT open Ladder 28** hold in this package.
6. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, audit ≠ GHE enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, never reopen L17–L27, schemas AT_CEILING held, no prune deletes in this audit.

### Chosen axis rationale (summary)

Prefer Operator Control-Plane Composition & HUD/Doctor Ritual Fabric over sole Complexity Governance & Prune Execution because residual NON-CLAIMs after L27 closeout + tip-seal #384 are a **control-plane composition** gap: L27 continuity ports are MEASURED and CU CI seam exists, but operators still cannot compose Doctor/HUD honesty + cross-port orchestration + billing-blocked local-verify runbook + Mission OS L0 honesty into governed Layer-0 ports. Complexity prune (A) stays deferred (inventory ≠ delete auth; prune plan AFTER audit) rather than the whole ladder.

## Alternatives considered AND REJECTED

### A. Sovereign Complexity Governance & Prune Execution Fabric as sole axis
**Rejected as sole axis.** Post-L26 A inventory is MEASURED/landed with dispositions proposed, but inventory ≠ delete authorization; Valentin separately requested prune plan AFTER this audit. Executing prune under PO gates is valuable hygiene, not the strongest residual Layer-0 fabric while B honesty remains fragmented and CU is CI-only composition. Thin PO-gated plan-port satellite may appear later outside default CV–CZ deletes.

### B. Reopening L27 to extend Operator Continuity / CU seam fabric
**Rejected.** L27 is CLOSED — **NEVER reopen L27.**

### C. Sole Billing-Blocked CI / Evidence Ritual Runbook Hardening as whole axis
**Rejected as sole axis.** Valuable CX satellite under control-plane composition, but insufficient alone — misses HUD/Doctor ritual composition and cross-port orchestration residuals.

### D. Sole Cross-Port CQ↔CR↔CS↔CT Orchestration as whole axis
**Rejected as sole axis.** Valuable CW satellite, but without HUD/Doctor ritual + Mission OS honesty the control-plane composition story is incomplete.

### E. Flipping PRODUCTION_READY with this audit
**Rejected.** Audit seals local governed proposal only.

### F. Adding new docs/schemas JSON for composition
**Rejected.** Schemas AT_CEILING 35/35 — use inline/fixtures only.

### G. Claiming L28 OPEN / rewriting freeze tip pins in this package
**Rejected.** Freeze says Do NOT open Ladder 28; tip-open is SEPARATE after audit merge; freeze pin stays `58193bc8`.

## Consequences

- **Positive:** Ordered L28 proposal; honest residual inventory binding B honesty + CU-beyond orchestration + billing runbook + Mission OS L0 honesty; SpecBoot-ready CV entry criteria; ADR number free after ADR-0073.
- **Negative:** Audit does not implement satellites; tip-open still required before Mission CV / before claiming L28 OPEN; A prune execution remains deferred.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L17–L27 never reopen; Antigravity-first; no tip-pin rewrite in this package; schemas AT_CEILING; do not start Mission CV here; audit ≠ L28 OPEN; no prune deletes.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_28_AUDIT_2026-09-19.md`
- OpenSpec: `openspec/changes/eos-ladder-28-maturity-gap-audit/`
- Prior: ADR-0073 (CU); ADR-0068 (L27 audit); ADR-0063 (B Doctor/HUD); L27 closeout; tip-seal #384 / tip-refresh post-#383
