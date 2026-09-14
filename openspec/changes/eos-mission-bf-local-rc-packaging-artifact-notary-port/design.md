# Design — Mission BF Local Release Candidate Packaging & Artifact Notary Port (SPEC-0063)

## Layout (`src/core/delivery/`) — NEW files; do not overwrite BC/BD/BE

| Module | Role |
| --- | --- |
| `local-rc-packaging-artifact-notary-port.js` | Facade: `createLocalRcPackagingArtifactNotaryPort`, `packageAndNotarize` |
| `rc-packaging-policy-gate.js` | DENY helpers (PR-YES, registry, GH Releases, Fundacion, HITL, invalid, empty, seals, custody) |
| `notary-receipt.js` | Sealed notary receipt (`stableStringify` + `sha256Canonical`, `BF-RCPT-*`) |
| `rc-package-boundary.js` | Normalize artifact entries, manifest digests, secret scrub, Fundacion detect, AQ/BC/BD/BE observe stubs |

## Phases

`VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL` (`BF_PHASE_ORDER`). Fail-closed
DENY always seals a receipt and skips PACKAGE/NOTARIZE when gated (PR-YES,
registry/GH Releases, Fundacion, HITL, required seals, Law VI, empty/malformed,
custody). Happy path packages an in-memory allowlisted digest manifest, observes
injectable AQ/BC/BD/BE ports, then SEALs `PACKAGED`.

## Injectable ports (compose only)

- `ports.aqNotary` / `ports.aqNotaryObserve` — AQ evidence export/notary observe
- `ports.bcApply` / `ports.bdDelivery` / `ports.beReplay` — BC/BD/BE seal observe

Do **not** vendor-copy AQ/BC/BD/BE modules into this payload. BC/BD/BE siblings
MAY coexist in `src/core/delivery/` on main.

## Hermetic boundary

In-memory artifact list `{ id, digest, path? }` → sorted canonical manifest →
sha256 digest. No `fs` tarball write, no GH Releases API, no npm/registry
publish, no network.

Custody: optional `requireCustody` on artifact entries (`sealed` + `id` +
`digest`); explicit broken seals (`sealed:false` / `ok:false`) DENY with
`CUSTODY_BREAK`. Multi-artifact manifests are order-independent (sort by id).

## Law VI

Runtime-concat vendor prefix for detect/redact. Scan **MODULE_DIR only**.
Prefer `env-fake-token-001` in tests.

## ADR & alternatives (pointer)

See `docs/adrs/ADR-0021-mission-bf-local-rc-packaging-artifact-notary-port.md`
(Accepted — local governed, 2026-09-14). Decision: hermetic in-process RC
packaging + artifact notary with VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL,
fail-closed PR-YES / registry / GH Releases / Fundacion DENY, injectable
AQ/BC/BD/BE observe ports, Law VI MODULE_DIR-only.

Rejected (technical reasons in the ADR): (1) live GH Releases publish port
(non-hermetic, claims GH Releases product); (2) public npm/registry publish as
product (NON-CLAIM); (3) rewriting AQ into `delivery/` (breaks isolation;
compose via ports); (4) soft-allow PRODUCTION_READY=YES flip (dishonest;
violates fail-closed). Evidence:
`docs/evidence/EOS_MISSION_BF_EVIDENCE_2026-09-14.md`.
