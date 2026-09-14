# ADR-0019 — Mission BD Multi-Worktree / Multi-Target Delivery Port

- **Status:** Accepted — local governed
- **Date:** 2026-09-13
- **Deciders:** EOS local governed use (Sovereign Delivery & Verification Fabric)
- **Spec:** SPEC-0061

## Context

Mission BC (SPEC-0060, #275, tip `cc3b3bb475f3648dfb2c05520ab7229feb70f23c`)
MEASURED a hermetic governed patch-diff apply port. The next seam on the same
axis is a **governed multi-target delivery port**: place one sealed artifact
onto one or more allowlisted local worktree / target roots and emit a sealed
receipt.

The seam must stay hermetic and fail-closed. Real `git worktree` orchestration,
remote CD, Kubernetes rollouts, and a PRODUCTION_READY delivery product are
out of scope. AN federation, AX/BA isolation, and BC apply-seal already exist
as sibling missions; BD must **compose** those via injectable observe ports
and must **not** rewrite their source into this payload.

L17 and L18 remain CLOSED (never reopen; AX–BB MEASURED). L19 stays OPEN
(BC MEASURED; BD in progress; BE–BG pending). PRODUCTION_READY stays `NO`.
Fundacion Δ stays `0`.

## Decision

1. Add four **new** modules under `src/core/delivery/` that coexist with BC
   siblings (do not overwrite BC):
   - `multi-worktree-multi-target-delivery-port.js` — facade
     (`createMultiWorktreeMultiTargetDeliveryPort`, `deliver`)
   - `delivery-policy-gate.js` — allowlist / Fundacion / isolation /
     apply-seal / invalid DENY
   - `delivery-receipt.js` — `stableStringify` + `sha256Canonical` sealed
     receipt (`BD-RCPT-*`)
   - `delivery-target-boundary.js` — normalize, Fundacion detect, secret
     scrub, observe helpers
2. Enforce phases **VALIDATE → GATE → DELIVER → SEAL**. DENY always SEALs
   and skips DELIVER.
3. Deliver hermetically into an in-memory virtual-root map (`wt-alpha`,
   `wt-beta`, `worktree/alpha`, `memory://fixture`, …). No `child_process`,
   no real `git worktree`, no remote CD, no CloudAgent.
4. Fail-closed: any single failing target DENYs the **whole** request
   (`partial: false`, `receipt.deliveredTargets: []`).
5. Compose AN/BA/BC via optional injectable ports only
   (`anFederation` / `federationObserve`, `baIsolation` / `axEngine`,
   `bcApply` / `applySeal`). Do not vendor-copy AN/AX/BA sources into
   `delivery/`. BC siblings MAY already live in that directory on main.
6. Law VI audits scan **MODULE_DIR only** (`src/core/delivery`). Never scan
   `tests/`. Never embed contiguous forbidden provider-prefix literals.
7. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   and the NON-CLAIM set (no cloud fleet / no Kubernetes CD / no
   PRODUCTION_READY delivery product / not BE/BF/BG).

## Alternatives considered AND REJECTED

### A. Real `git worktree` orchestration

**Rejected.** Binding `deliver` to `git worktree add` / `git checkout` would
make the port host-stateful, non-hermetic, and unsafe to run inside
`node --test`. It would also couple SPEC-0061 to a particular clone layout
and break Antigravity-first box measurement. Virtual roots already prove
allowlist, Fundacion, isolation, and fail-closed multi-target semantics
without touching the filesystem.

### B. Kubernetes / CD pipeline port

**Rejected.** A K8s rollout, Helm, or GitHub Actions CD adapter would
claim a multi-tenant cloud fleet and a remote delivery product. That is
exactly the NON-CLAIM surface (`kubernetesCd=false`,
`multiTenantCloudFleet=false`, `productionReadyDeliveryProduct=false`).
BD is a local governed seam, not a cluster deployer.

### C. Rewriting AN / BA / BC into the delivery port

**Rejected.** Vendor-copying or inlining AN federation, AX/BA isolation,
or BC apply-seal source into `src/core/delivery/` would break mission
isolation, duplicate Law VI surface, and overwrite BC siblings that
already occupy that directory. BD10 explicitly forbids AN/AX/BA filenames
and imports; BC modules may coexist. Compose via injectable observe ports.

### D. Soak / continue-on-error multi-target partial success

**Rejected.** A “deliver what you can” policy would let one failing target
leave others placed and would advertise `partial: true`. That violates
fail-closed governance: the receipt would claim a delivery that did not
fully complete. Mid-loop isolation failures already snapshot-rollback
virtual roots. Whole-request DENY with empty `deliveredTargets` is the
only honest outcome.

## Consequences

- Callers get a single `deliver({ artifact, targets, … })` API with sealed
  receipts on both success and DENY.
- Tests BD1–BD18 can run hermetically on box and host (`18/18`).
- SLIM stays ≤145 by excluding the BD satellite from `SLIM_SUITE_EXCLUDES`.
- Host `verify:strict` remains the gate (measured 914/0 on the code commit).
- BE/BF/BG stay unclaimed; PRODUCTION_READY stays `NO`.
- Envelope rigor (this ADR, EARS+BDD spec, evidence artifact) is required
  before merge of PR #276; the code commit `e2cc34b` does not by itself
  close the envelope.

## NON-CLAIM

This port is **not**:

- a multi-tenant cloud fleet
- a Kubernetes CD pipeline
- a PRODUCTION_READY delivery product
- BE, BF, or BG
- a real `git worktree` manager
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

L17 CLOSED never reopen. L18 CLOSED never reopen (AX–BB MEASURED).
L19 OPEN (BC MEASURED; BD in progress; BE–BG pending).

## Links

- SPEC-0061 — this change
- OpenSpec:
  `openspec/changes/eos-mission-bd-multi-worktree-multi-target-delivery-port/`
- Spec:
  `openspec/changes/eos-mission-bd-multi-worktree-multi-target-delivery-port/specs/mission-bd-multi-worktree-multi-target-delivery-port/spec.md`
- Tests: `tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js` (BD1–BD18)
- Evidence: `docs/evidence/EOS_MISSION_BD_EVIDENCE_2026-09-13.md`
- Release: `docs/releases/EOS_MISSION_BD_MULTI_WORKTREE_MULTI_TARGET_DELIVERY_2026-09-13.md`
- Branch: `grok/mission-bd-multi-worktree-multi-target-delivery-port`
- Code commit: `e2cc34b4474ae72b435aa583d99e98ea0b5a1e6c`
- Base tip: `cc3b3bb475f3648dfb2c05520ab7229feb70f23c` (#275)
- PR: #276 (open; merge pending)
