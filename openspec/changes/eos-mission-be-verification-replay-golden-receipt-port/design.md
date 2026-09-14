# Design — Mission BE Verification Replay & Golden Receipt Port (SPEC-0062)

## Layout (`src/core/delivery/`) — NEW files; do not overwrite BC/BD

| Module | Role |
| --- | --- |
| `verification-replay-golden-receipt-port.js` | Facade: `createVerificationReplayGoldenReceiptPort`, `replay` |
| `replay-policy-gate.js` | DENY helpers (mismatch, custody break, Fundacion, invalid, HITL) |
| `replay-receipt.js` | Sealed replay receipt (`stableStringify` + `sha256Canonical`) |
| `golden-receipt-boundary.js` | Normalize golden/candidate digests, secret scrub, Fundacion detect, AJ/AL/BC/BD observe helpers |

## Phases

`VALIDATE → GATE → REPLAY → COMPARE → SEAL` (`BE_PHASE_ORDER`). Fail-closed
DENY always seals a receipt and skips REPLAY/COMPARE when gated (custody,
Fundacion, HITL, required seals, Law VI, empty/malformed). Digest mismatch
runs REPLAY+COMPARE then SEALs `DIGEST_MISMATCH` (or `DRIFT_DENY` when
`policy.treatMismatchAsDrift`).

## Injectable ports (compose only)

- `ports.ajLedger` / `ports.ledgerObserve` — AJ evidence ledger observe
- `ports.alReplay` / `ports.autonomyReplayObserve` — AL forensic/replay observe
- `ports.bcApply` / `ports.bdDelivery` — BC/BD seal observe

Do **not** vendor-copy AJ/AL/BC/BD modules into this payload. BC/BD siblings
MAY coexist in `src/core/delivery/` on main.

## Hermetic boundary

In-memory golden map + candidate sealed receipt objects (digests/payloads).
Replay recomputes a canonical digest from `{ kind, code, payload }` and
compares it to the golden digest. No `child_process`, no live
`verify:strict`, no SIEM, no network.

Custody fields on a candidate: `sealed === true`, non-empty `kind`, and
either a declared digest or a payload to recompute.

Multi-golden: select by id (`golden: 'gold-sat'` or `goldenId` / candidate
id) from the port's `goldens` map.

## Law VI

Runtime-concat vendor prefix for detect/redact. Scan **MODULE_DIR only**.
Prefer `env-fake-token-001` in tests.

## ADR & alternatives (pointer)

See `docs/adrs/ADR-0020-mission-be-verification-replay-golden-receipt-port.md`
(Accepted — local governed, 2026-09-13). Decision: hermetic in-process
replay→golden compare with VALIDATE → GATE → REPLAY → COMPARE → SEAL,
fail-closed mismatch/custody DENY, injectable AJ/AL/BC/BD observe ports,
Law VI MODULE_DIR-only.

Rejected (technical reasons in the ADR): (1) live re-run `verify:strict` in
CI as product (non-hermetic, claims a verification product); (2) SIEM
streaming port (NON-CLAIM); (3) rewriting AJ/AL into `delivery/` (breaks
isolation; compose via ports); (4) soft-match / continue-on-drift (dishonest
receipt; violates fail-closed). Evidence:
`docs/evidence/EOS_MISSION_BE_EVIDENCE_2026-09-13.md`.
