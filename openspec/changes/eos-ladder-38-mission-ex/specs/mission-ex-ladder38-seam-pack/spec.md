# Spec — Mission EX Ladder 38 Seam-Pack (SPEC-0160)

## Purpose

Fail-closed CI seam-pack consolidating ET→EU→EV→EW into EX-RCPT-* closeout satellite for Ladder 38.

## Requirements

1. Soft-import ET/EU/EV/EW when present; soft-fail safe; observed true|false.
2. Seal EX-RCPT-* with soft-observe freeze pinShort `b09467a2` (EW merge #527); do not rewrite freeze tip.
3. Refuse Fundacion writes, tip rewrite, L30–L37 reopen, unsupervised L38 auto-close, tip-seal-in-product, schema-json add, PRODUCTION_READY flip, CloudAgent, GHE claim, mass prune, hard delete, AU secrets runtime reopen, secret material.
4. Ladder 38 remains OPEN — tip-seal SEPARATE after EX merge + tip-refresh.
5. PRODUCTION_READY=NO. Fundacion Δ=0. Schemas AT_CEILING 35/35. Law VI.
6. Hermetic only — no live secret store or remote vault.
7. Distinct from ES L37 seam / EN L36 seam / EI L35 seam / AU secrets runtime.
