# Proposal — Mission AL: Autonomy Replay & Forensic Observer (SPEC-0043)

## Why

Ladder 15 audit ranks **Autonomy Replay & Forensic Observer** as the
fourth L15 satellite (after AI+AJ+AK MEASURED). AB telemetry +
per-mission receipts give point-in-time visibility; there is no
deterministic hermetic replay / forensic observer over AI sessions ×
AF cycles × AJ EVD ledger for local post-mortem audit. Optional
cost/attribution observe (AE ECR) must remain observe-only
(≠ billing).

User axis: reproducción determinista de trazas de ejecución autónoma,
auditoría forense post-mortem, observabilidad forense sin mutación de
estado.

## What

1. `src/core/observability/autonomy-replay-forensic-observer.js` —
   `createAutonomyReplayForensicObserver`; kind
   `eos-autonomy-replay-forensic-observer`; `replay` /
   `exportForensicTimeline` / `observeAttribution` /
   `verifyReplayInputs` / `sealReceipt`; injectable
   `{ ledger, sessionStore, hash, now, ecrCounters? }`; fail-closed
   `REPLAY_ABORT` / `CHAIN_BROKEN` / `INCOMPLETE_INPUTS` /
   `TIMELINE_NOT_FOUND` / `SILENT_GAP_FORBIDDEN` / `MISSING_DEP` /
   `FUNDACION_DENY` / `INVALID_TIMELINE`;
   `AL_PRODUCTION_READY='NO'`; observe-only (no append/save).
2. Thin `src/core/observability/forensic-timeline-export.js` — pure
   export/format helpers.
3. Suite `tests/eos-al-autonomy-replay-forensic-observer.test.js`
   (AL1–AL16) hermetic; **no static vendor-key prefix substring**
   (runtime synth); slim-exclude; `npm run test:autonomy-replay-forensic-observer`
   / `test:mission-al`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-al-autonomy-replay-forensic-observer` from main tip
starting with `8cf5538` (StartsWith OK); tests green (~12–16 PASS, 0 FAIL);
SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0;
no CloudAgent; zero new npm deps; do NOT implement AM; no live network in CI;
replay does not mutate live autonomy state.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AM CI Seam-Pack Closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- SIEM product / billing accuracy
- Live autonomy mutation during replay
- Live network / CloudAgent
- Static vendor API key literals in source/tests
