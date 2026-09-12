# Design — Mission AL (SPEC-0043)

## Architecture

```
createAutonomyReplayForensicObserver({
  ledger,            // AJ-like: query / verifyChain / entries (read-only used)
  sessionStore,      // AI-like: load / list / getSession (read-only used)
  hash?, now?,
  ecrCounters?, attributionSource?,  // AE ECR observe-only
  requireLedger?=true, requireSessionStore?=true,
  attributionObserve?=true,
  receiptSealer?, onReceipt?, throwOnAbort?
})
  replay(timelineId|filter)     // deterministic re-walk; NO append/save
  exportForensicTimeline(...)   // post-mortem audit export
  observeAttribution(filter?)   // ECR aggregates; ≠ billing claim
  verifyReplayInputs(...)       // fail-closed incomplete / chain-broken
  sealReceipt(outcome)
    kind:'eos-autonomy-replay-forensic-observer', PRODUCTION_READY:'NO'
```

AL is an **observe-only forensic observer**. It clones ledger/session
inputs into a local walk buffer. It MUST NEVER call `ledger.append` or
`sessionStore.save`.

## Fail-closed codes

| Condition | Code |
|-----------|------|
| Generic replay abort | `REPLAY_ABORT` |
| Ledger verifyChain fail / digest mismatch | `CHAIN_BROKEN` |
| Missing sessions / unreadable entries / unsealed | `INCOMPLETE_INPUTS` |
| Filter matches no sealed timeline | `TIMELINE_NOT_FOUND` |
| Seq / prevDigest silent gap | `SILENT_GAP_FORBIDDEN` |
| Missing / invalid injectables | `MISSING_DEP` |
| Fundacion export/replay target | `FUNDACION_DENY` |
| Non-object / invalid filter | `INVALID_TIMELINE` |

## EARS (from L15 audit)

- WHEN a sealed multi-session timeline exists in the EVD ledger, THE
  SYSTEM SHALL support hermetic replay that reproduces cycle ordering
  and deny/allow outcomes.
- IF replay inputs are incomplete or chain-broken, THE SYSTEM SHALL
  abort replay and report forensic failure (no silent gaps).
- WHILE attribution observe mode is enabled, THE SYSTEM SHALL
  aggregate AE ECR counters without claiming billing accuracy or
  PRODUCTION_READY.

## Law VI

- Detect / redact api_key / token / authorization / secret / password
- Vendor-style key substrings via runtime-built regex (never static
  vendor-key prefix literals — AF11 lesson)
- Receipts / exports / getState never echo secrets
- `rg`-style check: src+tests contain zero vendor-key prefix substring

## Controls

| ID | Control |
|----|---------|
| AL1 | kind + PRODUCTION_READY NO + NON-CLAIM |
| AL2 | hermetic multi-session replay ordering + deny/allow |
| AL3 | chain-broken abort |
| AL4 | incomplete inputs abort |
| AL5 | silent gap forbidden |
| AL6 | forensic export shape |
| AL7 | attribution observe without billing claim |
| AL8 | replay does NOT mutate ledger/session |
| AL9 | PRODUCTION_READY NO locked |
| AL10 | Law VI runtime synth + rg-clean |
| AL11 | NON-CLAIM markers |
| AL12 | Fundacion deny |
| AL13 | MISSING_DEP |
| AL14 | TIMELINE_NOT_FOUND / INVALID_TIMELINE |
| AL15 | hermetic + codes |
| AL16 | verify PASS + throwOnAbort + AM not implemented |
