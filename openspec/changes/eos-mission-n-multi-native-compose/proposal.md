# Proposal — Mission N: Multi-native tool composition (SPEC-0019)

## Why
Missions I/L/M each wired one native into `executeComputeRun`. Operators need a single-run compose of Gemini → Stitch → Browser QA with preserved order, shared custody hashes, and fail-closed mid-chain infra aborts.

## What
1. Additive compose API on eos-compute-worker: `MULTI_NATIVE_COMPOSE_ORDER` + `buildMultiNativeComposeToolCalls(opts)`.
2. SPEC-0019 comment on the existing sequential dispatch loop (no new dispatcher).
3. Suite `eos-compute-worker-mission-n.test.js` (≥10 hermetic PASS); slim-exclude; `test:compute-worker-n`.
4. OpenSpec + release report.

## DoD
Branch `grok/mission-n-multi-native-compose` from main@5c5a1bd; tests green; SLIM≤145; verify:strict EXIT 0.
