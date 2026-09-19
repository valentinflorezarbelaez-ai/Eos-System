# EOS Mission CN Evidence — Governed Artifact / SBOM Attestation Port (SPEC-0097)

**Date:** 2026-09-19 (America/Bogota, UTC-5)  
**Mission:** CN / SPEC-0097  
**Status:** MISSION_CN_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/artifacts/artifact-attestation-receipt.js` | Nine-field `CN-RCPT-*` SHA-256 seal |
| `src/core/artifacts/artifact-attestation-policy-gate.js` | Fail-closed attest gate |
| `src/core/artifacts/artifact-attestation-port.js` | `attest` / `verifyTrail` / store |
| `tests/eos-cn-artifact-attestation-port.test.js` | Hermetic suite (18) |
| `scripts/patch-mission-cn.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0058-…` | Architecture decision |
| `openspec/changes/eos-ladder-26-mission-cn/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-cn-artifact-attestation-port.test.js
# tests 18 / pass 18 / fail 0
```

```
node --check src/core/artifacts/artifact-attestation-*.js
node --check tests/eos-cn-artifact-attestation-port.test.js
# clean
```

## Pins

- Live main HEAD (after tip #361): `1671ca8200844401847469c3b4ccd6a0fb6a7d43`
- Freeze pin (Mission CM #360): `e6d2ecf7e22d201d516bffe94c1bb56c8da7b5bf`

## Honesty

- L17–L25 CLOSED — never reopen; NEVER reopen L25; do not reopen L19 BF
- L26 OPEN (Audit + CL + CM MEASURED · CN in progress · CO–CP pending)
- No tip-refresh; no Fundacion; no CO–CP in this package
- Law VI; L0 node:crypto; digests only
