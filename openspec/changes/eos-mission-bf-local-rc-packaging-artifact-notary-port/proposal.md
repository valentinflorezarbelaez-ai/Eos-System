# Proposal — Mission BF Local Release Candidate Packaging & Artifact Notary Port (SPEC-0063)

## Why

Sovereign Delivery & Verification Fabric (L19) needs a **governed**, fail-closed
Local Release Candidate Packaging & Artifact Notary Port that hermetically
packages allowlisted artifact digests into an in-memory RC manifest and seals
a notary receipt — without claiming a PRODUCTION_READY=YES flip, public
registry publish, or GH Releases product.

## Prior art (compose, do not rewrite)

- **BC (SPEC-0060) MEASURED** — hermetic governed patch-diff apply port +
  sealed apply receipts.
- **BD (SPEC-0061) MEASURED** — hermetic multi-worktree / multi-target delivery
  port + sealed delivery receipts (ADR-0019).
- **BE (SPEC-0062) MEASURED** — hermetic verification replay & golden receipt
  port + sealed replay receipts (ADR-0020).
- **AQ evidence export & notarization MEASURED** — observe surface BF must
  compose via injectable ports.

Seam justification: L19 audit (SPEC-0063) records the gap — no typed local RC
packaging + artifact notary over allowlisted digests. AQ gives notary observe;
BC+BD+BE give sealed artifacts. BF is the packaging/notary port, not a rewrite
of those trees.

## What

- `packageAndNotarize({ artifacts, policy, aqNotaryObserve, applySeal, deliverySeal, replaySeal, ports })`
  → VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL
- Hermetic in-process artifact list `{ id, digest, path? }` → canonical
  manifest digest (NO real tarball fs / NO GH Releases / NO registry / NO network)
- Fail-closed DENY on PRODUCTION_READY=YES implication, public registry /
  GH Releases publish intent, Fundacion, empty/malformed artifacts, missing
  required BC/BD/BE seals, custody break
- Sealed sha256 notary receipts (`BF-RCPT-*`)
- Optional injectable `aqNotary` / `aqNotaryObserve` + `bcApply` /
  `bdDelivery` / `beReplay` (compose AQ/BC/BD/BE; do not rewrite)

## NON-CLAIM / constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; Antigravity-first
- L17 CLOSED never reopen; L18 CLOSED never reopen (AX–BB MEASURED)
- L19 OPEN (BC+BD+BE MEASURED; BF in progress; BG pending)
- Axis: Sovereign Delivery & Verification Fabric
- Law VI audit scans **MODULE_DIR only** (`src/core/delivery`)
- ≠ PRODUCTION_READY=YES flip / ≠ public registry publish /
  ≠ GH Releases product / not BG

## Out of scope

BG; rewriting AQ/BC/BD/BE; Fundacion writes; CloudAgent; real tarball fs;
public registry / GH Releases publish; flipping PRODUCTION_READY;
soft-allow PR-YES flip.
