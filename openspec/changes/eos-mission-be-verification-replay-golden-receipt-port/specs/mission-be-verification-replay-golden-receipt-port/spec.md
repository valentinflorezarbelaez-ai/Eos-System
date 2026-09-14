# Spec — Mission BE Verification Replay & Golden Receipt Port (SPEC-0062)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0062 |
| Change | `openspec/changes/eos-mission-be-verification-replay-golden-receipt-port` |
| Kind | `eos-verification-replay-golden-receipt-port` |
| Axis | Sovereign Delivery & Verification Fabric |
| Facade | `src/core/delivery/verification-replay-golden-receipt-port.js` |
| Tests | `tests/eos-be-verification-replay-golden-receipt-port.test.js` (BE1–BE18) |
| ADR | `docs/adrs/ADR-0020-mission-be-verification-replay-golden-receipt-port.md` |
| Evidence | `docs/evidence/EOS_MISSION_BE_EVIDENCE_2026-09-13.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` (ALWAYS_DENY) |
| L17 / L18 | CLOSED (never reopen) |
| L19 | OPEN (BC+BD MEASURED; BE in progress; BF–BG pending) |
| Hermetic | in-process golden map + candidate objects only — no live `verify:strict`, no SIEM, no network, no CloudAgent |

EARS patterns used in this spec (all four, exactly):

- Event-Driven: `WHEN <event>, THE SYSTEM SHALL <response>`
- State-Driven: `WHILE <state>, THE SYSTEM SHALL <response>`
- Error/Unwanted: `IF <anomalous condition>, THEN THE SYSTEM SHALL <response>`
- Ubiquitous: `THE SYSTEM SHALL <continuous behavior>`

State invariants required on every Scenario THEN/AND unless a DENY path
explicitly names a different `code`: `ok`, `code`, `receipt.sealed`,
`fundacionDelta`, `PRODUCTION_READY`.

## NON-CLAIM fence

This port **is not** and **shall not be advertised as**:

- a SIEM product
- a billing accuracy SaaS
- a PRODUCTION_READY verification product
- BF (local RC packaging & artifact notary) or BG (L19 seam-pack)
- a live `verify:strict` re-runner / CI product
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

WHILE any replay (VALIDATE, GATE, REPLAY, COMPARE, or SEAL) is in progress,
THE SYSTEM SHALL keep `siemProduct`, `billingAccuracySaas`,
`productionReadyVerificationProduct`, `cloudAgent`, and `usesCloudAgent`
false, SHALL keep `notBf` / `notBg` true, SHALL keep `bfPending` /
`bgPending` true, and SHALL keep `bcMeasured` and `bdMeasured` true with
`bcStatus: BC MEASURED` and `bdStatus: BD MEASURED`.

## ADDED Requirements

### Requirement: Happy-path match with sealed replay receipt

WHEN `replay({ candidate, golden })` is invoked with a well-formed sealed
candidate whose recomputed canonical digest equals the golden digest, THE
SYSTEM SHALL return `ok: true`, `code: MATCHED`, `match: true`, and SHALL
attach a sealed receipt whose `receiptDigest` is a 64-character lowercase
hex SHA-256 over a `stableStringify` canonical body.

WHEN the same candidate, golden, clock, and hash function are supplied twice,
THE SYSTEM SHALL emit the same `receipt.receiptDigest`.

#### Scenario: Happy-path match (BE2)

- GIVEN a port created with golden `gold-vs` whose digest matches the
  candidate canonical body `{ kind, code, payload }`
- AND a well-formed sealed candidate `{ kind, code, payload, sealed: true, digest }`
- WHEN `replay({ candidate, golden: 'gold-vs' })` is invoked
- THEN `ok` is `true` and `code` is `MATCHED`
- AND `match` is `true` and `hermetic` is `true`
- AND `realVerifyStrict` is `false` and `siem` is `false` and `network` is `false`
- AND `receipt.sealed` is `true` and `receipt.receiptId` starts with `BE-RCPT-`
- AND `receipt.receiptDigest` matches `^[a-f0-9]{64}$`
- AND `receipt.siemProduct` is `false`
- AND `goldenId` is `gold-vs`
- AND `phases` includes `VALIDATE`, `GATE`, `REPLAY`, `COMPARE`, `SEAL`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Deterministic receipt digest for identical input (BE12)

- GIVEN two independently constructed ports sharing a fixed `now` and a hash
  that canonicalizes the receipt body without `seq` / `at`
- AND the same sealed candidate and golden `gold-vs`
- WHEN `replay` is invoked once on each port
- THEN both results have `ok: true` and `code: MATCHED`
- AND both `receipt.sealed` are `true`
- AND both `receipt.receiptDigest` values are identical 64-hex strings
- AND `stableStringify({ b: 2, a: 1 })` equals `stableStringify({ a: 1, b: 2 })`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Digest mismatch / drift DENY

IF the recomputed candidate digest does not equal the golden digest, THEN
THE SYSTEM SHALL DENY with `code: DIGEST_MISMATCH` (or `DRIFT_DENY` when
`policy.treatMismatchAsDrift` is true), SHALL set `match: false`, and SHALL
seal a receipt.

#### Scenario: Digest mismatch DENY (BE3)

- GIVEN a port with golden `gold-vs`
- AND a sealed candidate whose `payload` has been changed so the recomputed
  digest diverges
- WHEN `replay` is invoked
- THEN `ok` is `false` and `deny` / `denied` are `true`
- AND `match` is `false`
- AND `code` is `DIGEST_MISMATCH`
- AND `receipt.sealed` is `true`
- AND `receipt.code` is `DIGEST_MISMATCH`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Custody break DENY

IF a candidate is missing required custody fields (`sealed === true`,
non-empty `kind`, and digest or payload), THEN THE SYSTEM SHALL DENY with
`code: CUSTODY_BREAK`, SHALL skip REPLAY/COMPARE, and SHALL seal a receipt.

#### Scenario: Missing sealed / kind custody DENY (BE4)

- GIVEN a port with golden `gold-vs`
- AND a well-formed golden pair
- WHEN `replay` is invoked with `candidate.sealed === false`
- THEN `ok` is `false` and `deny` is `true`
- AND `code` is `CUSTODY_BREAK`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `replay` is invoked with a candidate that has `sealed: true` and
  payload/digest but no `kind`
- THEN `code` is `CUSTODY_BREAK`
- AND `receipt.sealed` is `true`

### Requirement: Fundacion ALWAYS_DENY

IF the request sets `fundacion: true`, `writeFundacion: true`, names a
Fundacion path, or `writeFundacion` is invoked, THEN THE SYSTEM SHALL DENY
with `code: FUNDACION_DENY`, SHALL keep `fundacionDelta` at `0`, SHALL NOT
claim a match, and SHALL still seal a receipt.

#### Scenario: Fundacion path DENY (BE5)

- GIVEN a port with golden `gold-vs`
- AND a well-formed sealed candidate
- AND a request with `fundacion: true`
- WHEN `replay` is invoked
- THEN `ok` is `false` and `deny` / `denied` are `true`
- AND `code` is `FUNDACION_DENY`
- AND `fundacionDelta` is `0`
- AND `receipt.sealed` is `true`
- AND `receipt.code` is `FUNDACION_DENY`
- AND `PRODUCTION_READY` is `NO`

#### Scenario: writeFundacion surface ALWAYS_DENY (BE5)

- GIVEN a live port
- WHEN `writeFundacion({ path: '/Fundacion/secret' })` is invoked
- THEN `ok` is `false`
- AND `code` is `FUNDACION_DENY`
- AND `fundacionDelta` is `0`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`

### Requirement: Missing or invalid required BC/BD seals DENY when policy requires

IF `requireApplySeal` is true and the request supplies no apply seal or an
invalid apply seal, THEN THE SYSTEM SHALL DENY with `code: APPLY_SEAL_DENY`
and SHALL seal a receipt.

IF `requireDeliverySeal` is true and the request supplies no delivery seal
or an invalid delivery seal, THEN THE SYSTEM SHALL DENY with
`code: DELIVERY_SEAL_DENY` and SHALL seal a receipt.

IF the required seal is valid `{ ok: true, sealed: true, digest }`, THEN
THE SYSTEM SHALL allow the request to proceed to REPLAY.

#### Scenario: Missing/invalid apply seal DENY; valid seal matches (BE6)

- GIVEN a port constructed with `requireApplySeal: true` and golden `gold-vs`
- AND a well-formed sealed candidate
- AND no `applySeal` field on the request
- WHEN `replay` is invoked
- THEN `ok` is `false`
- AND `code` is `APPLY_SEAL_DENY`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `replay` is invoked with `applySeal: { ok: false, sealed: false }`
- THEN `code` is `APPLY_SEAL_DENY`
- AND `receipt.sealed` is `true`
- WHEN a subsequent `replay` is invoked with `applySeal: { ok: true, sealed: true, digest }`
- THEN `ok` is `true` and `code` is `MATCHED`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Missing delivery seal DENY; valid seal matches (BE6)

- GIVEN a port constructed with `requireDeliverySeal: true` and golden `gold-vs`
- AND a well-formed sealed candidate
- WHEN `replay` is invoked without `deliverySeal`
- THEN `ok` is `false`
- AND `code` is `DELIVERY_SEAL_DENY`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `replay` is invoked with `deliverySeal: { ok: true, sealed: true, digest }`
- THEN `ok` is `true` and `code` is `MATCHED`
- AND `receipt.sealed` is `true`

### Requirement: Malformed candidate / golden DENY

IF the candidate is missing required sealed-receipt fields or is otherwise
malformed, THEN THE SYSTEM SHALL DENY with `code: MALFORMED_CANDIDATE` and
SHALL seal a receipt.

IF the golden is malformed, missing, or not found in the in-memory map,
THEN THE SYSTEM SHALL DENY with `code: MALFORMED_GOLDEN` and SHALL seal a
receipt.

#### Scenario: Malformed candidate and golden (BE7)

- GIVEN a port with golden `gold-vs`
- WHEN `replay` is invoked with `candidate: { malformed: true }`
- THEN `ok` is `false`
- AND `code` is `MALFORMED_CANDIDATE`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `replay` is invoked with `candidate: {}`
- THEN `code` is `MALFORMED_CANDIDATE`
- AND `receipt.sealed` is `true`
- WHEN `replay` is invoked with a well-formed candidate and `golden: { malformed: true }`
- THEN `ok` is `false`
- AND `code` is `MALFORMED_GOLDEN`
- AND `receipt.sealed` is `true`

### Requirement: Empty request DENY and multi-golden select by id

IF `replay` is invoked with an empty object (no candidate and no golden),
THEN THE SYSTEM SHALL DENY with `code: EMPTY_REQUEST` and SHALL seal a
receipt.

WHEN multiple goldens are registered on the port and `golden` is a string
id, THE SYSTEM SHALL select that golden and, on digest match, return
`code: MATCHED` with `goldenId` equal to the selected id.

#### Scenario: Empty request DENY (BE18)

- GIVEN a port with goldens `gold-vs` and `gold-sat`
- WHEN `replay({})` is invoked
- THEN `ok` is `false` and `deny` is `true`
- AND `code` is `EMPTY_REQUEST`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Multi-golden select by id (BE18)

- GIVEN a port with goldens `gold-vs` (verify-strict) and `gold-sat` (satellite)
- AND a well-formed satellite candidate whose digest matches `gold-sat`
- WHEN `replay({ candidate, golden: 'gold-sat' })` is invoked
- THEN `ok` is `true` and `code` is `MATCHED`
- AND `match` is `true`
- AND `goldenId` is `gold-sat`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `replay` is invoked with the verify-strict candidate and `golden: 'gold-vs'`
- THEN `ok` is `true` and `goldenId` is `gold-vs`
- AND `receipt.sealed` is `true`

### Requirement: NON-CLAIM while verification replay is active

WHILE verification replay is active, THE SYSTEM SHALL not claim SIEM product
completeness or billing accuracy SaaS coverage, SHALL keep
`productionReadyVerificationProduct` false, and SHALL keep `notBf` / `notBg`
true with BC+BD MEASURED acknowledged.

#### Scenario: Health and module NON-CLAIM markers (BE14, BE16)

- GIVEN a port constructed with defaults
- AND BE sources under MODULE_DIR
- WHEN `health()` is read and BE sources are scanned for NON-CLAIM strings
- THEN `health.siemProduct` is `false`
- AND `health.billingAccuracySaas` is `false`
- AND `health.productionReadyVerificationProduct` is `false`
- AND `health.PRODUCTION_READY` is `NO`
- AND `health.notBf` and `health.notBg` are `true`
- AND `health.bfPending` and `health.bgPending` are `true`
- AND `health.bcMeasured` and `health.bdMeasured` are `true`
- AND `health.bcStatus` is `BC MEASURED` and `health.bdStatus` is `BD MEASURED`
- AND BE sources contain `SIEM product`, `billing accuracy SaaS`,
  `PRODUCTION_READY verification product`, `not BF/BG`, and `BC+BD MEASURED`
- AND `fundacionDelta` is `0`

### Requirement: Readiness, Fundacion delta, and closed ladders

THE SYSTEM SHALL set `PRODUCTION_READY` to `NO` on the port, receipt,
policy-gate, and boundary kinds.

THE SYSTEM SHALL keep `fundacionDelta` at `0` and Fundacion at
`ALWAYS_DENY`.

THE SYSTEM SHALL keep ladder 17 and ladder 18 `CLOSED` with
`l17NeverReopen` and `l18NeverReopen` true, and SHALL keep ladder 19 `OPEN`
(BC+BD MEASURED; BE in progress; BF–BG pending).

#### Scenario: Kind and readiness health (BE1)

- GIVEN a port created with defaults
- WHEN `kind`, `PRODUCTION_READY`, and `health()` are read
- THEN `kind` is `eos-verification-replay-golden-receipt-port`
- AND `PRODUCTION_READY` is `NO` on the port, `BE_PRODUCTION_READY`, and health
- AND `health.fundacionDelta` is `0`
- AND `health.ladder17` is `CLOSED` and `health.ladder18` is `CLOSED`
- AND `health.ladder19` is `OPEN`
- AND `health.l17NeverReopen` and `health.l18NeverReopen` are `true`
- AND `health.axis` is `Sovereign Delivery & Verification Fabric`
- AND `health.axisMeasured` is `AX–BB MEASURED`
- AND `health.bcMeasured` and `health.bdMeasured` are `true`
- AND `BE_PHASE_ORDER` is `[VALIDATE, GATE, REPLAY, COMPARE, SEAL]`
- AND `receipt.sealed` is not required on this pre-replay read
- AND `ok` on health is `true`

#### Scenario: L17/L18 never-reopen markers (BE15)

- GIVEN the facade module `verification-replay-golden-receipt-port.js`
- WHEN `health()` is read and the facade source is inspected
- THEN `health.ladder17` is `CLOSED` and `health.ladder18` is `CLOSED`
- AND `health.l17NeverReopen` and `health.l18NeverReopen` are `true`
- AND the facade source matches `L17 CLOSED never reopen`
- AND the facade source matches `L18 CLOSED never reopen`
- AND the facade source matches `L19 OPEN`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Law VI MODULE_DIR-only scan CLEAN

THE SYSTEM SHALL restrict Law VI provider-prefix audits to MODULE_DIR
`src/core/delivery` and SHALL NOT scan `tests/` as part of that audit.

WHILE MODULE_DIR is the Law VI audit root, THE SYSTEM SHALL keep every
`.js` / `.mjs` file in that directory free of contiguous forbidden provider
key-prefix literals (prefixes reconstructed at runtime only).

IF a reconstructed forbidden provider prefix appears in the candidate or
golden body, THEN THE SYSTEM SHALL DENY with `code: LAW_VI_DENY`, SHALL
seal a receipt, and SHALL NOT echo the secret into the receipt.

WHEN a candidate carries secret-shaped metadata keys, THE SYSTEM SHALL
redact those values from the sealed receipt (`[REDACTED]`).

#### Scenario: MODULE_DIR Law VI CLEAN (BE8)

- GIVEN MODULE_DIR is `src/core/delivery`
- AND a forbidden prefix assembled at runtime (never stored as a contiguous
  literal in MODULE_DIR)
- WHEN every `.js` / `.mjs` file under MODULE_DIR is scanned
- THEN the directory basename is `delivery`
- AND at least four BE modules exist
- AND no MODULE_DIR source matches the reconstructed prefix
- AND `PRODUCTION_READY` remains `NO`
- AND `fundacionDelta` remains `0`

#### Scenario: Secret scrub and Law VI leak DENY (BE9)

- GIVEN a port with golden `gold-vs`
- AND a well-formed sealed candidate whose `meta.apiKey` is `env-fake-token-001`
- WHEN `replay` is invoked
- THEN `ok` is `true` and `code` is `MATCHED`
- AND `receipt.sealed` is `true`
- AND the receipt JSON does not contain `env-fake-token-001`
- AND `sanitizeBePayload` redacts `apiKey` and `authorization` to `[REDACTED]`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `replay` is invoked with a candidate payload containing a reconstructed
  forbidden vendor prefix
- THEN `ok` is `false`
- AND `code` is `LAW_VI_DENY`
- AND `receipt.sealed` is `true`
- AND the receipt JSON does not contain the vendor prefix

### Requirement: Injectable AJ/AL/BC/BD compose ports; no source rewrite

WHEN optional `ports.ajLedger` / `ports.ledgerObserve`,
`ports.alReplay` / `ports.autonomyReplayObserve`, `ports.bcApply`, and
`ports.bdDelivery` are supplied, THE SYSTEM SHALL call each observe hook
during a successful match and SHALL set the corresponding
`ajInjected` / `alInjected` / `bcInjected` / `bdInjected` and
`ajObserved` / `alObserved` / `bcObserved` / `bdObserved` flags.

THE SYSTEM SHALL NOT vendor-copy or import AJ / AL / AN / AX / BA source
modules into `src/core/delivery`. BC/BD sibling modules MAY coexist in the
same directory on main. BE sources SHALL NOT import `developer-engine/` or
`evidence/` paths.

#### Scenario: Compose fakes called; AJ/AL not vendored (BE10)

- GIVEN a port with injectable `ajLedger.observe`, `alReplay.observe`,
  `bcApply.observe`, and `bdDelivery.observe` fakes that record `ctx.kind`
- AND a well-formed sealed candidate matching golden `gold-vs`
- WHEN `replay` is invoked
- THEN `ok` is `true` and `code` is `MATCHED`
- AND `ajInjected`, `alInjected`, `bcInjected`, and `bdInjected` are `true`
- AND `ajObserved`, `alObserved`, `bcObserved`, and `bdObserved` are `true`
- AND each fake was called at least once with `ctx.kind` equal to `BE_KIND`
- AND MODULE_DIR does not contain
  `evidence-economy-ledger.js`,
  `evidence-cost-tracker.js`,
  `autonomy-replay-forensic-observer.js`,
  `forensic-timeline-export.js`,
  `multi-workstation-session-federation-port.js`,
  `local-sandbox-container-port.js`,
  `sovereign-developer-engine.js`,
  `sandbox-boundary.js`, or
  `isolation-receipt.js`
- AND BE sources do not import `developer-engine/` or `evidence/` paths
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Phases VALIDATE → GATE → REPLAY → COMPARE → SEAL enforced

WHEN a happy-path `replay` completes, THE SYSTEM SHALL record
`phases` exactly as `[VALIDATE, GATE, REPLAY, COMPARE, SEAL]`.

WHEN a request is denied at GATE (custody, Fundacion, HITL, required seals,
or Law VI), THE SYSTEM SHALL still end `phases` with `SEAL` and SHALL NOT
include `REPLAY` or `COMPARE`.

#### Scenario: Happy-path phase order (BE17)

- GIVEN a port with golden `gold-vs`
- AND a well-formed matching candidate
- WHEN `replay` is invoked
- THEN `ok` is `true` and `code` is `MATCHED`
- AND `phases` equals `[VALIDATE, GATE, REPLAY, COMPARE, SEAL]`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Deny skips REPLAY/COMPARE and still SEALs (BE17)

- GIVEN a port with golden `gold-vs`
- AND a candidate with `sealed: false`
- WHEN `replay` is invoked
- THEN `ok` is `false` and `code` is `CUSTODY_BREAK`
- AND `phases` includes `VALIDATE` and `GATE` and `SEAL`
- AND `phases[phases.length - 1]` is `SEAL`
- AND `phases` does not include `REPLAY`
- AND `phases` does not include `COMPARE`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: getState counters and throwOnDeny

WHEN `replay` has been invoked at least once, THE SYSTEM SHALL expose
`getState()` counters `replayCount`, `okCount`, `denyCount`, and
`matchCount` that match the outcomes, with `PRODUCTION_READY: NO` and
NON-CLAIM flags.

IF the port was constructed with `throwOnDeny: true` and a request is denied,
THEN THE SYSTEM SHALL throw `VerificationReplayGoldenReceiptError` and SHALL
keep `BE_CODES` frozen.

#### Scenario: getState ok/deny counters (BE11)

- GIVEN a port with golden `gold-vs`
- AND one successful matching replay
- AND one denied mismatch replay
- WHEN `getState()` is read
- THEN `replayCount` is `2`
- AND `okCount` is `1`
- AND `denyCount` is `1`
- AND `matchCount` is `1`
- AND `PRODUCTION_READY` is `NO`
- AND `siemProduct` is `false`
- AND `kind` is `eos-verification-replay-golden-receipt-port`
- AND `fundacionDelta` is `0`

#### Scenario: throwOnDeny raises typed error (BE13)

- GIVEN a port constructed with `throwOnDeny: true` and golden `gold-vs`
- AND a candidate whose payload diverges from the golden
- WHEN `replay` is invoked
- THEN the call throws `VerificationReplayGoldenReceiptError`
- AND `BE_CODES` is frozen
- AND `BE_CODES.MATCHED` is `MATCHED`
- AND `BE_CODES.DIGEST_MISMATCH` is `DIGEST_MISMATCH`
- AND `BE_CODES.CUSTODY_BREAK` is `CUSTODY_BREAK`
- AND `BE_CODES.FUNDACION_DENY` is `FUNDACION_DENY`
- AND `BE_CODES.HITL_DENY` is `HITL_DENY`
- AND `BE_CODES.APPLY_SEAL_DENY` is `APPLY_SEAL_DENY`
- AND `BE_CODES.DELIVERY_SEAL_DENY` is `DELIVERY_SEAL_DENY`
- AND `BE_CODES.LAW_VI_DENY` is `LAW_VI_DENY`
- AND `BE_CODES.MALFORMED_CANDIDATE` is `MALFORMED_CANDIDATE`
- AND `BE_CODES.EMPTY_REQUEST` is `EMPTY_REQUEST`
- AND `PRODUCTION_READY` remains `NO`
- AND `fundacionDelta` remains `0`
