# Spec — mission-fc-ladder39-seam-pack (SPEC-0165)

## Requirement

Provide a fail-closed Ladder 39 CI seam-pack that soft-imports EY/EZ/FA/FB (observed true|false), seals `FC-RCPT-*` receipts with opaque digests only, and refuses Fundacion / tip-rewrite / L39-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY flip / L30–L38 reopen / AU secrets reopen.

## Acceptance

1. `npm run test:mission-fc` passes (~17 hermetic).
2. Soft-observe pin `d1041230` is read-only NON-CLAIM (no freeze rewrite in this package).
3. Ladder 39 remains OPEN; tip-refresh + tip-seal are SEPARATE.
4. Schemas AT_CEILING 35/35; PRODUCTION_READY=NO; Fundacion Δ=0; Law VI held.
