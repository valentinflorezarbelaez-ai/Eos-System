# Design — Mission BD Multi-Worktree / Multi-Target Delivery Port (SPEC-0061)

## Layout (`src/core/delivery/`) — NEW files; do not overwrite BC

| Module | Role |
| --- | --- |
| `multi-worktree-multi-target-delivery-port.js` | Facade: `createMultiWorktreeMultiTargetDeliveryPort`, `deliver` |
| `delivery-policy-gate.js` | Allowlist / Fundacion / isolation / apply-seal / invalid DENY helpers |
| `delivery-receipt.js` | Sealed receipt (`stableStringify` + `sha256Canonical`) |
| `delivery-target-boundary.js` | Worktree/target normalize, Fundacion detect, secret scrub, BA isolation observe helpers |

## Phases

`VALIDATE → GATE → DELIVER → SEAL` (`BD_PHASE_ORDER`). Fail-closed DENY always
seals a receipt and skips DELIVER when gated. Multi-target partial fail rolls
back virtual roots and DENYs (no partial success claim).

## Injectable ports (compose only)

- `ports.anFederation` / `ports.federationObserve` — AN observe (compose)
- `ports.baIsolation` / `ports.axEngine` — BA/AX isolation/engine observe
- `ports.bcApply` / `ports.applySeal` — BC apply seal observe

Do **not** vendor-copy AN/AX/BA/BC modules into this payload.

## Hermetic delivery

Sealed artifact object (or blob string) → in-memory virtual-root map under
allowlisted worktree / target ids (or `memory://`). No `child_process`, no
`git worktree`, no remote CD.

## Law VI

Runtime-concat vendor prefix for detect/redact. Scan **MODULE_DIR only**.
Prefer `env-fake-token-001` in tests.

## ADR & alternatives (pointer)

See `docs/adrs/ADR-0019-mission-bd-multi-worktree-multi-target-delivery-port.md`
(Accepted — local governed, 2026-09-13). Decision: hermetic in-process
virtual-root `deliver` with VALIDATE → GATE → DELIVER → SEAL, fail-closed
whole-request DENY, injectable AN/BA/BC observe ports, Law VI MODULE_DIR-only.

Rejected (technical reasons in the ADR): (1) real `git worktree` orchestration
(non-hermetic, host-stateful, unsafe in `node --test`); (2) Kubernetes / CD
pipeline port (claims cloud fleet / remote delivery product — NON-CLAIM);
(3) rewriting AN/BA/BC source into `delivery/` (breaks isolation; BC siblings
already coexist); (4) soak / continue-on-error partial success (dishonest
receipt; violates fail-closed). Evidence:
`docs/evidence/EOS_MISSION_BD_EVIDENCE_2026-09-13.md`.

