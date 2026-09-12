# Proposal — Mission M: Browser QA compute-worker tool bridge (SPEC-0018)

## Why
Mission K delivered hermetic Browser QA; Mission L wired Stitch into the worker. Next: expose `browser_qa_run` as a native compute-worker toolCall (eos-browser-qa), with custody and fail-closed infra errors.

## What
1. Tool surface helpers on browser-qa-runner + native routing in eos-compute-worker.
2. Injectable `browserQaClientImpl` for hermetic CI.
3. Suite `eos-compute-worker-mission-m.test.js`; slim-exclude; `test:compute-worker-m`.
4. Release report.

## DoD
Branch `grok/mission-m-browser-qa-worker-bridge` from main@43a5059; tests green; SLIM≤145; verify:strict EXIT 0.
