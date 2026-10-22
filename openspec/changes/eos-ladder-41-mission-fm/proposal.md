# Proposal — Mission FM Ladder 41 CI Seam-Pack Consolidation & Closeout (SPEC-0175)

**Status:** READY · authorized · post-#581 merge (`f5948926`) + tip-refresh post-#581 (`fa153c33`).

## Why

After L41 OPEN + Audit MEASURED (ADR-0154) and its four satellites — FI MEASURED (#566 / ADR-0155), FJ MEASURED (#577 / ADR-0156), FK MEASURED (#578 / ADR-0157), FL MEASURED (#581 / ADR-0158) — Ladder 41 has four ports and four receipt families but **no end-to-end chaining proof** and **no consolidated seam-pack**. FM is the last satellite: it soft-observes FI ➔ FJ ➔ FK ➔ FL, proves the chain composes fail-closed, and seals an `FM-RCPT-*` seam receipt — without tip-sealing, closing L41, flipping PRODUCTION_READY, adding schema JSON, or reopening L30–L40.

## What changes

- New Layer-0 triad under `src/core/composition/`:
  - `ladder41-seam-receipt.js` — sealed `FM-RCPT-*` with opaque `seamDigest` + freeze soft-observe `f5948926`
  - `ladder41-seam-policy-gate.js` — fail-closed seam/closeout preconditions + Law VI refusal
  - `ladder41-seam-port.js` — `Ladder41SeamPort` facade + `softObserveFi/Fj/Fk/Fl` soft-imports (observed `true|false`)
- Hermetic suite `tests/eos-fm-ladder41-seam-pack.test.js` (FM1–FM17)
- `test:ladder41-seam` / `test:mission-fm` / `test:ladder41-pack` scripts; slim-excluded to hold TR-01 ≤ 145
- OpenSpec change `eos-ladder-41-mission-fm`, ADR-0159

## Non-goals

- **Tip-seal L41 CLOSED** (SEPARATE act after FM merge + tip-refresh)
- Tip-refresh / freeze pin rewrite in this package; PRODUCTION_READY flip; schema JSON add
- Re-implementing or overwriting FI/FJ/FK/FL; elevating any satellite as the seam port
- Sealing secrets or raw payloads (Law VI); live HTTP egress; wall-clock authority
- Reopening L30–L40; GHE claims; CloudAgent; mass prune; Fundacion writes

## Soft-observe chain

```
FI Bidirectional Delivery Correlation Registry   (SPEC-0171 / ADR-0155)
  ➔ FJ Round-Trip / Request-Reply Integrity       (SPEC-0172 / ADR-0156)
  ➔ FK Bidirectional Mismatch Quarantine / Deny   (SPEC-0173 / ADR-0157)
  ➔ FL Bidirectional Delivery Honesty Attestation (SPEC-0174 / ADR-0158)
  ➔ FM Ladder 41 CI Seam-Pack Consolidation       (SPEC-0175 / ADR-0159)
```

Soft-import each satellite when present (observed `true|false`); never hard-fail on absence — the seam must stay green on a slim checkout.

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit · FI · FJ · FK · FL MEASURED · FM this satellite) — CLOSED only via SEPARATE tip-seal |
| Axis | Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric |
| Freeze pin | `f5948926` (post-#581 merge; soft-observe only) |
| Observed main tip at authoring | `fa153c33` (tip-refresh post-#581 merge) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — opaque refs + seamDigest only; never seal or copy payload bytes |
| PASS | seam-pack ≠ tip-seal ≠ Formal L41 CLOSED ≠ PRODUCTION_READY ≠ GHE |
| Authorization | PO authorized 2026-10-22 to open the FM specification (docs-first) |
