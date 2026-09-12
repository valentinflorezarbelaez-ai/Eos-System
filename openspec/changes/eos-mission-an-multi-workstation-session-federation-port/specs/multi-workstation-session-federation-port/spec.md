# Spec — Multi-Workstation Session Federation Port (SPEC-0045)

## Summary

Hermetic injectable federation port enabling sealed custody envelope
handoff/sync across ≥2 local peer workstations with fail-closed conflict
and tamper DENY. PRODUCTION_READY=NO. Fundacion ALWAYS DENY.

## EARS

- WHEN a durable AI session is exported for federation handoff, THE SYSTEM
  SHALL seal a portable custody envelope consumable by a peer workstation
  without mutating Fundacion.
- IF federation import detects tamper, tip mismatch, or conflicting custody
  heads, THE SYSTEM SHALL DENY import and emit a sealed receipt.
- WHILE federation sync is in progress, THE SYSTEM SHALL remain fail-closed
  (no partial apply; no silent merge of divergent session ledgers).

## Requirements

### R1 — Kind + readiness
- Kind MUST be `eos-multi-workstation-session-federation-port`
- `AN_PRODUCTION_READY` MUST equal `'NO'`

### R2 — Export handoff
- `exportHandoff(sessionId)` MUST return sealed envelope
  `{ envelopeId, fromWorkstation, sessionId, tipPin?, custodyDigest,
  payload, digest, sealedAt }` or DENY (`UNKNOWN_SESSION` /
  `FUNDACION_DENY` / `MISSING_DEP` / `SYNC_IN_PROGRESS`)

### R3 — Import handoff
- `importHandoff(envelope, { expectedTip? })` MUST verify digest; DENY on
  `TAMPER_DETECTED` / `TIP_MISMATCH` / `CUSTODY_CONFLICT` /
  `INVALID_ENVELOPE` / `FUNDACION_DENY`

### R4 — Sync fail-closed
- `syncPeer(peerId, envelopes|diff)` MUST verify all first; on any failure
  return `PARTIAL_APPLY_FORBIDDEN` with `applied: 0` (no partial apply;
  no silent merge)

### R5 — Fundacion
- NEVER write Fundacion paths; DENY if envelope targets Fundacion

### R6 — Law VI
- Zero static `sk-` literals; runtime synth only for sanitization tests

### R7 — NON-CLAIM
- ≠ cloud agent fleet / ≠ multi-tenant SaaS / ≠ CloudAgent /
  ≠ PRODUCTION_READY; not AO/AP/AQ/AR

### R8 — Hermetic CI
- ≥2 fake workstations via injectable maps/transports; no real LAN

## Fail-closed codes

`TAMPER_DETECTED`, `TIP_MISMATCH`, `CUSTODY_CONFLICT`,
`PARTIAL_APPLY_FORBIDDEN`, `UNKNOWN_SESSION`, `INVALID_ENVELOPE`,
`MISSING_DEP`, `FUNDACION_DENY`, `SYNC_IN_PROGRESS`
