# Design — Mission BI Cross-Session Continuity & Replay Fabric (SPEC-0066)

## Overview

Hermetic Layer-0 fabric under `src/core/continuity/` that:

1. **Captures** verified session checkpoints (snapshot + SHA-256 hash)
2. **Handoffs** across session ids with sealed `BI-RCPT-*` receipts
3. **Replays** historical events deterministically against sealed checkpoint
4. **DENYs** fail-closed on missing/divergent/tampered checkpoints, malformed
   payloads, empty ids, Fundacion paths

Compose AT (continuity), AI (multi-session), W (session), AL (replay) via
**injectable ports/stubs only** — never vendor-copy or rewrite those sources.

## Canonical seal (nine fields)

`{ receiptId, sessionId, missionId, checkpointHash, handoffStatus,
   replayVerified, timestamp, status, prevReceiptHash }`

`stableStringify` (sorted keys) + `sha256` via `node:crypto`.

## Ports

```
ports.atContinuity  — optional call-through on capture/handoff/replay
ports.aiMultiSession — optional call-through on handoff
ports.wSession       — optional call-through on capture/handoff
ports.alReplay       — optional call-through on handoff-notify/replay
```

## Fail-closed codes

`MALFORMED_PAYLOAD`, `EMPTY_SESSION_ID`, `EMPTY_MISSION_ID`,
`MISSING_CHECKPOINT`, `CHECKPOINT_DIVERGENCE`, `INVALID_HANDOFF`,
`REPLAY_DIVERGENCE`, `TAMPERED_CHECKPOINT`, `FUNDACION_DENY`, plus OK
codes `CAPTURE_OK` / `HANDOFF_OK` / `REPLAY_OK`.

## Constraints

- PRODUCTION_READY=NO · Fundacion Δ=0 · Law VI CLEAN on MODULE_DIR only
- Hermetic: in-memory; no network; no real fs; no child_process
- L17/L18/L19 CLOSED never reopen; L20 OPEN (BH MEASURED; BI in progress;
  BJ–BL pending)
- NON-CLAIM: ≠ HA multi-region SaaS · ≠ Raft/distributed clustering ·
  ≠ PRODUCTION_READY=YES
