# Proposal — Mission AN: Multi-Workstation / Session Federation Port (SPEC-0045)

## Why

Ladder 16 audit ranks **Multi-Workstation / Session Federation Port** as the
first L16 satellite. AI Multi-Session Autonomy Coordinator operates on a
**single-workstation custody plane**; there is no federation port for
sync/handoff of sovereign sessions across local workstations of the same
operator — fail-closed, without cloud fleet or Fundacion writes.

## What

1. `src/core/federation/multi-workstation-session-federation-port.js` —
   `createMultiWorkstationSessionFederationPort`; kind
   `eos-multi-workstation-session-federation-port`;
   `exportHandoff` / `importHandoff` / `syncPeer` / `verifyEnvelope` /
   `sealReceipt`; injectable `{ workstationId, sessionStore, hash, now,
   ledgerAppend?, peerTransport? }`; fail-closed
   `TAMPER_DETECTED` / `TIP_MISMATCH` / `CUSTODY_CONFLICT` /
   `PARTIAL_APPLY_FORBIDDEN` / `UNKNOWN_SESSION` / `INVALID_ENVELOPE` /
   `MISSING_DEP` / `FUNDACION_DENY` / `SYNC_IN_PROGRESS`;
   `AN_PRODUCTION_READY='NO'`.
2. Thin `src/core/federation/federation-custody-envelope.js` — seal/verify
   helpers for portable custody envelopes.
3. Suite `tests/eos-an-multi-workstation-session-federation.test.js`
   (AN1–AN16) hermetic ≥2 fake workstations; **no static vendor-key
   prefix substring** (runtime synth); slim-exclude;
   `npm run test:multi-workstation-federation` / `test:mission-an`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-an-multi-workstation-session-federation-port` from main
tip starting with `2123ca2` (StartsWith OK); tests green (~12–16 PASS, 0 FAIL);
SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0;
no AI commit attribution; no CloudAgent; zero new npm deps; do NOT implement
AO/AP/AQ/AR; no real LAN in CI.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AO Provider Failover / AP HITL Authority / AQ EVD Export / AR L16 closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- Cloud agent fleet / multi-tenant SaaS
- Real LAN / CloudAgent
- Static vendor API key literals in source/tests
