# ADR-0027 — Mission BK Governed External Write Orchestrator

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Mission Continuity & Operator Fabric)
- **Spec:** SPEC-0068

## Context

Ladder 20 audit (ADR-0023) ordered BH→BL under axis **Sovereign Mission
Continuity & Operator Fabric**. L17/L18/L19 remain
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened. L20 is OPEN
(BH+BI+BJ MEASURED; BK in progress; BL pending closeout).

Mission BH shipped the Mission Lifecycle State Machine (SPEC-0065 /
ADR-0024). Mission BI shipped Cross-Session Continuity & Replay Fabric
(SPEC-0066 / ADR-0025). Mission BJ shipped Operator Dashboard / HUD Fabric
(SPEC-0067 / ADR-0026). Mission BK needs a typed, hermetic **Governed
External Write Orchestrator** that validates six preconditions, denies
Fundacion, allowlists paths, composes T-gate / write-barrier / BC / BD
via ports, and seals OK/DENY/ROLLBACK receipts — without claiming
unsupervised fleet deploy, K8s/ArgoCD CD, or PRODUCTION_READY=YES.

Base tip (expected): `ad643845cc4d008629b6660301fcf4b0c6cb4d74`
(StartsWith `ad64384`; post-#292 tip · BJ MEASURED). WARN-continue.

## Decision

1. Add three **new** modules under `src/core/orchestration/` (compose;
   do not rewrite sibling write-barrier / delivery / T-gate modules):
   - `governed-external-write-receipt.js` — sealed `BK-RCPT-*` receipts
   - `governed-external-write-policy-gate.js` — FUNDACION_ALWAYS_DENY /
     allowlist / Level 2 / path containment / malformed / preconditions
   - `governed-external-write-orchestrator.js` — facade
     (`createGovernedExternalWriteOrchestrator`, `validatePreconditions`,
     `executeGovernedWrite`, `rollbackWrite`)
2. Compose T-gate / write-barrier / BC / BD via injectable ports/stubs ONLY —
   do not rewrite or vendor-copy their sources.
3. Seal every outcome (OK / DENY / ROLLBACK) with canonical eight-field
   SHA-256 body; chain `prevReceiptHash`. On partial failure, automatic
   rollback + sealed rollback receipt.
4. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   Antigravity-first, Law VI CLEAN on BK-owned `governed-external-write-*`
   files only (siblings may coexist — BI/AT/BJ lesson).
5. Exclude hermetic BK tests from SLIM (≤145) via CRLF-safe patcher.

## Alternatives considered AND REJECTED

### A. Direct unguarded fs writes

**Rejected.** Writing directly to target project trees (or Fundacion /
Documents paths) with `fs.writeFileSync` / real disk mutation would break
hermetic `node --test`, violate Fundacion Δ=0 ALWAYS_DENY, and soft-allow
unguarded external mutation without receipts. Technical reason: NON-CLAIM
`hermetic=true`; simulate apply/delivery via injectable ports ONLY; never
import `node:fs` in Layer-0 BK modules.

### B. Monolithic write script without rollback receipts

**Rejected.** A single fire-and-forget write script without sealed
`BK-RCPT-*` receipts, precondition bitmask, or automatic rollback on
partial failure would soft-allow incomplete external writes and erase
custody. Technical reason: fail-closed DENY + sealed failure/rollback
receipt is the only honest outcome for missing preconditions / Fundacion /
partial port failure.

### C. Cloud/K8s CD daemon

**Rejected.** Shipping a Kubernetes / ArgoCD / fleet CD daemon (or
CloudAgent-driven deploy loop) would claim unsupervised fleet deploy /
K8s CD product completeness, require network listeners and cluster
credentials, and break Antigravity-first. Technical reason: NON-CLAIM
`unsupervisedFleetDeploy=false` / `k8sArgoCd=false` / `cloudAgent=false`;
orchestrator is local in-memory governed write custody, not a CD product.

## Consequences

- Payload ships ADR-0027 + evidence + OpenSpec (epistemic parity with BH/BI/BJ).
- Host bootstrap copies modules/tests/openspec/docs/patcher; runs
  `test:mission-bk`; holds SLIM≤145; runs verify:strict honestly (no fake
  check-count invention; prefer measured 914/0 pattern).
- BL remains pending closeout; L17/L18/L19 stay CLOSED forever relative to this ladder.
- BH+BI+BJ remain MEASURED (acknowledged); PRODUCTION_READY stays NO.

## NON-CLAIM

- ≠ unsupervised fleet deploy
- ≠ K8s / ArgoCD CD
- ≠ PRODUCTION_READY=YES
- ≠ reopening L17 / L18 / L19
- ≠ BL implementation in this change
