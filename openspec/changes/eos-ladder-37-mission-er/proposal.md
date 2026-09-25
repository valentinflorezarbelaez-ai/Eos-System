# Proposal — Mission ER Config Honesty & Flag Attestation (SPEC-0154)

## Why

After L37 OPEN + Audit MEASURED (ADR-0130 gap #4) + EO MEASURED + EP MEASURED + EQ MEASURED + tip-refresh #511 (`7ee4bd49`), Ladder 37 needs its fourth satellite: a Layer-0 port that seals config/flag honesty attestation into `ER-RCPT-*` receipts — without live remote flag store authority, wall-clock authority, tip-refresh authority, unsupervised mutation, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L36, auto-closing L37, or network writes. Soft-observe of freeze pins alone is NOT a config truth source. EO flag toggle / EP pack binding / EQ staged activation / EM capacity honesty / EH temporal honesty are distinct axes; ER is attestation only and does not flip flags or activate config.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `config-honesty-attestation-receipt.js` — sealed `ER-RCPT-*` + freeze soft-observe `7ee4bd49` + attestationHold
  - `config-honesty-attestation-policy-gate.js` — fail-closed govern preconditions
  - `config-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-er-config-honesty-attestation.test.js` (ER1–ER17)
- CRLF-safe surgical patcher `scripts/patch-mission-er.mjs`
- OpenSpec change, ADR-0134

## Non-goals

- Live remote flag store / wall-clock authority / tip-refresh authority / unsupervised mutation; EO-as-attestation / EP-as-attestation / EQ-as-attestation / EM capacity / EH temporal; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L37 auto-close; L30–L36 reopen; tip-refresh; CloudAgent; mass prune; tip-seal; ES product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L36 | CLOSED — NEVER reopen |
| L37 | OPEN (Audit MEASURED · EO MEASURED · EP MEASURED · EQ MEASURED · ER this · ES pending) |
| Axis | Config Honesty & Flag Attestation Port |
| Freeze pin | `7ee4bd49` (EQ #510 merge / EXPECTED_TIP after tip-refresh #511; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | hermetic config/flag honesty attestation ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO/EP/EQ/EM/EH |
| Soft-observe | Soft-observe freeze pins alone ≠ config truth |
| Tip-refresh | NOT this package (SEPARATE next) |
