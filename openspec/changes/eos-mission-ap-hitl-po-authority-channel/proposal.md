# Proposal — Mission AP: HITL / PO Authority Channel Hardening (SPEC-0047)

## Why

Ladder 16 audit ranks **HITL / PO Authority Channel Hardening** as the third
L16 satellite (after AN, AO). AI HITL threshold + AK constitution gate give
basic escalate; there is no hardened **authority channel** for long-horizon
autonomy (PO/HITL decisions with receipts, replay-link, timeout DENY) —
without claiming GH branch-protection enforcement / org IAM / approval SaaS.

## What

1. `src/core/authority/hitl-po-authority-channel.js` —
   `createHitlPoAuthorityChannel`; kind
   `eos-hitl-po-authority-channel`;
   `openRequest` / `decide(approve|deny)` / `tickTimeout` /
   `tryAdvanceDependentCycle` / `getState` / `sealReceipt`; injectable
   `{ ledger, scheduler, constitutionGate?, now, hash, receiptSealer? }`;
   fail-closed `HITL_REQUIRED` / `AUTHORITY_DENIED` /
   `AUTHORITY_TIMEOUT` / `AUTHORITY_OPEN` / `MISSING_DEP` /
   `INVALID_REQUEST` / `SECRET_LEAK_FORBIDDEN` / `LEDGER_LINK_FAIL` /
   `SCHEDULER_BLOCKED`; `AP_PRODUCTION_READY='NO'`.
2. Thin `src/core/authority/authority-receipt.js` — seal helpers + ledger tip linkage.
3. Suite `tests/eos-ap-hitl-po-authority-channel.test.js`
   (AP1–AP17) hermetic; **no static vendor-key prefix substring**
   (runtime synth); slim-exclude;
   `npm run test:hitl-po-authority` / `test:mission-ap`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-ap-hitl-po-authority-channel` from main tip
starting with `b7929e6` (StartsWith OK); tests green (~14–18 PASS, 0 FAIL);
SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0;
no AI commit attribution; no CloudAgent; zero new npm deps; do NOT implement
AQ/AR; hermetic fakes only; timeout → DENY (no auto-approve).

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AQ EVD Export / AR L16 closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- GH required-check / branch-protection enforcement
- Org IAM product / PRODUCTION_READY approval SaaS
- CloudAgent
- Static vendor API key literals in source/tests
- Auto-approve on timeout
