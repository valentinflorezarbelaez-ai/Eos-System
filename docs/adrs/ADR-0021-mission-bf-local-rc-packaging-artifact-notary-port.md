# ADR-0021 — Mission BF Local Release Candidate Packaging & Artifact Notary Port

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Delivery & Verification Fabric)
- **Spec:** SPEC-0063

## Context

Mission BC (SPEC-0060), BD (SPEC-0061), and BE (SPEC-0062) MEASURED hermetic
apply, multi-target delivery, and verification-replay ports with sealed
receipts. AQ evidence export & notarization is MEASURED as an observe surface.
The next seam on the same axis (L19 audit SPEC-0063) is a **Local Release
Candidate Packaging & Artifact Notary Port**: hermetically package allowlisted
artifact digests into an in-memory RC manifest, seal a notary receipt, and
fail-closed on PRODUCTION_READY=YES implication, public registry / GH Releases
publish intent, Fundacion, empty/malformed artifacts, missing required seals,
and custody break.

The seam must stay hermetic. Live GH Releases publish, public npm/registry
publish as a product, rewriting AQ into delivery, and soft-allowing a
PRODUCTION_READY=YES flip are out of scope. AQ/BC/BD/BE already exist as
sibling missions; BF must **compose** those via injectable observe ports and
must **not** rewrite their source into this payload.

L17 and L18 remain CLOSED (never reopen; AX–BB MEASURED). L19 stays OPEN
(BC+BD+BE MEASURED; BF in progress; BG pending). PRODUCTION_READY stays `NO`.
Fundacion Δ stays `0`.

Base tip (expected): `c753cdcaef62b20b7f4c98b8140237713460d3ee`
(StartsWith `c753cdc`; #278 Mission BE MEASURED). WARN-continue — tip-278 may
land after; OK to continue with actual origin/main.

## Decision

1. Add four **new** modules under `src/core/delivery/` that coexist with
   BC/BD/BE siblings (do not overwrite BC/BD/BE):
   - `local-rc-packaging-artifact-notary-port.js` — facade
     (`createLocalRcPackagingArtifactNotaryPort`, `packageAndNotarize`)
   - `rc-packaging-policy-gate.js` — PR-YES / registry / GH Releases /
     Fundacion / HITL / invalid / empty / seals / custody DENY
   - `notary-receipt.js` — `stableStringify` + `sha256Canonical` sealed
     receipt (`BF-RCPT-*`)
   - `rc-package-boundary.js` — normalize artifacts, manifest digests,
     Fundacion detect, secret scrub, observe helpers
2. Enforce phases **VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL**. DENY at
   GATE always SEALs and skips PACKAGE/NOTARIZE.
3. Package hermetically: in-memory allowlisted `{ id, digest, path? }` list →
   sorted canonical manifest → sha256 digest. No tarball fs, no GH Releases,
   no registry, no network, no CloudAgent.
4. Fail-closed: PRODUCTION_READY=YES implication, public registry / GH
   Releases publish intent, Fundacion, missing required BC/BD/BE seals,
   empty/malformed artifacts, custody break, HITL unapproved. No soft-allow
   PR flip.
5. Compose AQ/BC/BD/BE via optional injectable ports only
   (`aqNotary` / `aqNotaryObserve`, `bcApply` / `bdDelivery` / `beReplay`).
   Do not vendor-copy AQ sources into `delivery/`. BC/BD/BE siblings MAY
   already live in that directory on main.
6. Law VI audits scan **MODULE_DIR only** (`src/core/delivery`). Never scan
   `tests/`. Never embed contiguous forbidden provider-prefix literals.
7. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   and the NON-CLAIM set (no PRODUCTION_READY=YES flip / no public registry
   publish / no GH Releases product / not BG).

## Alternatives considered AND REJECTED

### A. Live GH Releases publish port

**Rejected.** Binding `packageAndNotarize` to a real GitHub Releases upload
(API token, network, asset attach) would make the port host-stateful,
non-hermetic, and unsafe to run inside `node --test`. It would also claim a
GH Releases product — exactly the NON-CLAIM surface
(`ghReleasesProduct=false`, `ghReleases=false`). In-memory allowlisted digest
manifests already prove packaging/notary custody without talking to GitHub.

### B. Public npm/registry publish as product

**Rejected.** A public npm (or other registry) publish adapter would claim
public registry publish completeness and a PRODUCTION_READY distribution
path. That is the NON-CLAIM fence (`publicRegistryPublish=false`,
`registry=false`). BF is a local governed RC packaging + notary seam, not a
registry product.

### C. Rewriting AQ into the delivery port

**Rejected.** Vendor-copying or inlining AQ evidence-export/notarization
source into `src/core/delivery/` would break mission isolation, duplicate Law
VI surface, and put wrong-package filenames next to BC/BD/BE siblings. BF10
explicitly forbids AQ/AJ/AL filenames and `evidence/` / `developer-engine/`
imports. Compose via injectable observe ports. Do not rewrite BC/BD/BE either.

### D. Soft-allow PRODUCTION_READY=YES flip

**Rejected.** A policy that lets `PRODUCTION_READY: 'YES'` (or
`flipProductionReady: true`) seal `ok: true` / `PACKAGED` would advertise a
production-ready claim this port is explicitly forbidden from making. That
violates fail-closed governance and the NON-CLAIM fence
(`productionReadyYesFlip=false`, `PRODUCTION_READY='NO'`). Whole-request DENY
with `PRODUCTION_READY_YES_DENY` is the only honest outcome.

## Consequences

- Callers get a single `packageAndNotarize({ artifacts, … })` API with sealed
  receipts on both PACKAGED and DENY.
- Tests BF1–BF18 can run hermetically on box (`18/18`).
- SLIM stays ≤145 by excluding the BF satellite from `SLIM_SUITE_EXCLUDES`.
- Host `verify:strict` remains the gate (TBD until bootstrap).
- BG stays unclaimed; PRODUCTION_READY stays `NO`.
- Envelope rigor (this ADR, EARS+BDD spec, evidence artifact) ships in the
  first payload — not post-hoc.

## NON-CLAIM

This port is **not**:

- a PRODUCTION_READY=YES flip
- a public registry publish
- a GH Releases product
- BG
- a real tarball / network publisher
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

L17 CLOSED never reopen. L18 CLOSED never reopen (AX–BB MEASURED).
L19 OPEN (BC+BD+BE MEASURED; BF in progress; BG pending).

## Links

- SPEC-0063 — this change
- OpenSpec:
  `openspec/changes/eos-mission-bf-local-rc-packaging-artifact-notary-port/`
- Spec:
  `openspec/changes/eos-mission-bf-local-rc-packaging-artifact-notary-port/specs/mission-bf-local-rc-packaging-artifact-notary-port/spec.md`
- Tests: `tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js` (BF1–BF18)
- Evidence: `docs/evidence/EOS_MISSION_BF_EVIDENCE_2026-09-14.md`
- Release: `docs/releases/EOS_MISSION_BF_LOCAL_RC_PACKAGING_ARTIFACT_NOTARY_2026-09-14.md`
- Branch: `grok/mission-bf-local-rc-packaging-artifact-notary-port`
- Host SHA: TBD until bootstrap
- Base tip: `c753cdcaef62b20b7f4c98b8140237713460d3ee` (#278 · BE MEASURED)
- PR: TBD until bootstrap
