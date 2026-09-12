# Tasks — Mission Z (SPEC-0031)

- [x] OpenSpec envelope eos-mission-z-governed-target-flight-sandbox (SPEC-0031)
- [x] Module src/core/sandbox/precondition-gatekeeper.js
- [x] Module src/core/sandbox/flight-rollback-engine.js
- [x] Module src/core/sandbox/target-flight-sandbox.js (HashChainedLedger + ITargetFlightSandbox)
- [x] Suite tests/eos-z-target-flight-sandbox.test.js (Z1–Z14 + Z16 PASS, Z15 SKIP)
- [x] scripts/patch-mission-z.mjs (test:target-flight / test:mission-z + slim exclude)
- [x] Release report with explicit Δ=0 / NON-CLAIM
- [x] write-barrier/* and external-write-gateway.js unchanged (inject/compose only)
- [x] Box harness ≥12 PASS (hermetic; no real Fundacion)
- [ ] verify:strict + slim≤145 + push (host bootstrap)
