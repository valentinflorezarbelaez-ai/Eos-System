# Design — Mission FC / SPEC-0165

## Pattern

Mirror Mission EX (L38 seam-pack SPEC-0160 / ADR-0141) closely → `ladder39-seam-*` triad + hermetic FC1–FC17 suite.

## Soft-observe chain

EY External Event Ingress Registry → EZ Webhook Authenticity → FA Ingress Quarantine/Replay-Deny → FB Ingress Honesty Attestation → FC Seam-Pack closeout.

## Receipt seal

`FC-RCPT-*` with opaque `seamDigest` only (Law VI). Soft-observe pin `d1041230` (read-only; never rewrite freeze).

## Fail-closed DENY

Fundacion, tip-rewrite, L39-auto-close without humanGateHeld, tip-seal-in-product, schema-json add, PRODUCTION_READY flip, L30–L38 reopen, AU secrets runtime reopen, CloudAgent, GHE claim, hard-delete, mass-prune, secret leak.

## Non-goals

Tip-refresh / tip-seal / Formal L39 CLOSED / PRODUCTION_READY flip / schema-json add / EY–FB overwrite.
