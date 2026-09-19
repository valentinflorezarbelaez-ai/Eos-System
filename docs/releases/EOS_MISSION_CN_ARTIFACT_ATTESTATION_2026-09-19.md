# EOS Mission CN Release Note — Governed Artifact / SBOM Attestation Port (SPEC-0097)

**Date:** 2026-09-19 (America/Bogota)  
**Mission:** CN / SPEC-0097  
**Ladder:** 26 Satellite 3  
**Status:** CODE_READY (box); host apply / PR pending  
**PRODUCTION_READY:** NO  

## Summary

Adds Layer-0 Governed Artifact / SBOM Attestation Port under `src/core/artifacts/`:
`attest(plan)` → PASS|DENY with sealed `CN-RCPT-*` receipts,
Fundacion ALWAYS_DENY, Law VI secret scan, hermetic artifactId↔sbomDigest
(+ optional CM bindDigest / CL linkDigest). Digests only — no tarball I/O.
Extends BF themes; does NOT reopen L19. ≠ commercial SBOM SaaS / ≠ Sigstore / ≠ GHE.

## Scripts

- `npm run test:mission-cn`
- `npm run test:artifact-attestation`

## Host wiring

```
node scripts/patch-mission-cn.mjs
```

## Pins (honesty)

| Pin | Value |
| --- | --- |
| Live HEAD (after tip #361) | `1671ca8200844401847469c3b4ccd6a0fb6a7d43` |
| Freeze pin (UNCHANGED, Mission CM #360) | `e6d2ecf7e22d201d516bffe94c1bb56c8da7b5bf` |

## NON-CLAIMS

- ≠ commercial SBOM SaaS / ≠ Sigstore product / ≠ public registry / ≠ SLSA commercial
- ≠ GHE / ≠ Fundacion writes / PRODUCTION_READY=NO / ≠ tip-refresh / ≠ CO–CP
