# Proposal — Mission L: Stitch compute-worker tool bridge (SPEC-0017)

## Why
Mission J delivered the hermetic Stitch bridge but deferred worker wiring. Mirror Mission I (Gemini native tools) so `stitch_*` / `eos-stitch` toolCalls run inside `executeComputeRun` before applyDiff, with custody and fail-closed rollback.

## What
1. Native Stitch routing in `eos-compute-worker.js` via `executeStitchTool`.
2. Injectable `stitchClientImpl` for hermetic CI.
3. Suite `eos-compute-worker-mission-l.test.js`; slim-exclude; `test:compute-worker-l`.
4. Release report.

## DoD
Branch `grok/mission-l-stitch-worker-bridge` from main@9a19072; tests green; SLIM≤145; verify:strict EXIT 0.
