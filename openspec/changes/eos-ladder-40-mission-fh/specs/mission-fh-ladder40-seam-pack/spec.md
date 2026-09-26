# Spec — mission-fh-ladder40-seam-pack (SPEC-0170)

## Requirement

Provide a fail-closed Ladder 40 CI seam-pack that soft-imports FD/FE/FF/FG (observed true|false), seals `FH-RCPT-*` receipts with opaque digests only, and refuses Fundacion / tip-rewrite / L40-auto-close / tip-seal-in-product / schema-json / PRODUCTION_READY flip / L30–L39 reopen / AU secrets reopen.

## Acceptance

1. `npm run test:mission-fh` passes (~17 hermetic).
2. Soft-observe pin `1376ac54` is read-only NON-CLAIM (no freeze rewrite in this package).
3. Ladder 40 remains OPEN; tip-refresh + tip-seal are SEPARATE.
4. Schemas AT_CEILING 35/35; PRODUCTION_READY=NO; Fundacion Δ=0; Law VI held.
