# Spec — Mission BF Local Release Candidate Packaging & Artifact Notary Port (SPEC-0063)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0063 |
| Change | `openspec/changes/eos-mission-bf-local-rc-packaging-artifact-notary-port` |
| Kind | `eos-local-rc-packaging-artifact-notary-port` |
| Axis | Sovereign Delivery & Verification Fabric |
| Facade | `src/core/delivery/local-rc-packaging-artifact-notary-port.js` |
| Tests | `tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js` (BF1–BF18) |
| ADR | `docs/adrs/ADR-0021-mission-bf-local-rc-packaging-artifact-notary-port.md` |
| Evidence | `docs/evidence/EOS_MISSION_BF_EVIDENCE_2026-09-14.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` (ALWAYS_DENY) |
| L17 / L18 | CLOSED (never reopen) |
| L19 | OPEN (BC+BD+BE MEASURED; BF in progress; BG pending) |
| Hermetic | in-process artifact digests only — no real tarball fs, no GH Releases, no registry, no network, no CloudAgent |

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

- a PRODUCTION_READY=YES flip
- a public registry publish
- a GH Releases product
- BG (L19 seam-pack)
- a real tarball / network publisher
- a Fundacion writer (`fundacionDelta=0`, ALWAYS_DENY)
- a CloudAgent path (Antigravity-first)

WHILE any packaging (VALIDATE, GATE, PACKAGE, NOTARIZE, or SEAL) is in
progress, THE SYSTEM SHALL keep `productionReadyYesFlip`,
`publicRegistryPublish`, `ghReleasesProduct`, `cloudAgent`, and
`usesCloudAgent` false, SHALL keep `notBg` true, SHALL keep `bgPending`
true, and SHALL keep `bcMeasured`, `bdMeasured`, and `beMeasured` true with
`bcStatus: BC MEASURED`, `bdStatus: BD MEASURED`, and `beStatus: BE MEASURED`.

## ADDED Requirements

### Requirement: Happy-path package + sealed notary receipt

WHEN `packageAndNotarize({ artifacts })` is invoked with a well-formed
non-empty allowlisted artifact list, THE SYSTEM SHALL return `ok: true`,
`code: PACKAGED`, and SHALL attach a sealed receipt whose `receiptDigest`
is a 64-character lowercase hex SHA-256 over a `stableStringify` canonical
body and whose `receiptId` starts with `BF-RCPT-`.

WHEN the same artifacts, clock, and hash function are supplied twice, THE
SYSTEM SHALL emit the same `receipt.receiptDigest`.

#### Scenario: Happy-path package+notary (BF2)

- GIVEN a port created with default hermetic options
- AND two well-formed artifacts `{ id, digest, path?, sealed: true }`
- WHEN `packageAndNotarize({ artifacts: [a1, a2] })` is invoked
- THEN `ok` is `true` and `code` is `PACKAGED`
- AND `hermetic` is `true` and `realTarball` is `false`
- AND `registry` is `false` and `ghReleases` is `false` and `network` is `false`
- AND `receipt.sealed` is `true` and `receipt.receiptId` starts with `BF-RCPT-`
- AND `receipt.receiptDigest` matches `^[a-f0-9]{64}$`
- AND `receipt.productionReadyYesFlip` is `false`
- AND `artifactCount` is `2`
- AND `phases` includes `VALIDATE`, `GATE`, `PACKAGE`, `NOTARIZE`, `SEAL`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Deterministic receipt digest for identical input (BF12)

- GIVEN two independently constructed ports sharing a fixed `now` and a hash
  that canonicalizes the receipt body without `seq` / `at`
- AND the same well-formed artifact list
- WHEN `packageAndNotarize` is invoked once on each port
- THEN both results have `ok: true` and `code: PACKAGED`
- AND both `receipt.sealed` are `true`
- AND both `receipt.receiptDigest` values are identical 64-hex strings
- AND `stableStringify({ b: 2, a: 1 })` equals `stableStringify({ a: 1, b: 2 })`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: PRODUCTION_READY=YES implication DENY

IF policy or request implies `PRODUCTION_READY=YES` (including
`flipProductionReady: true`), THEN THE SYSTEM SHALL DENY with
`code: PRODUCTION_READY_YES_DENY`, SHALL keep `PRODUCTION_READY: NO`, and
SHALL seal a receipt.

#### Scenario: PRODUCTION_READY=YES implication DENY (BF3)

- GIVEN a well-formed artifact list
- WHEN `packageAndNotarize({ artifacts, policy: { PRODUCTION_READY: 'YES' } })`
  is invoked
- THEN `ok` is `false` and `deny` is `true`
- AND `code` is `PRODUCTION_READY_YES_DENY`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Public registry / GH Releases publish intent DENY

IF request or policy signals public registry publish or GH Releases publish
intent, THEN THE SYSTEM SHALL DENY with `code: REGISTRY_PUBLISH_DENY` or
`code: GH_RELEASES_DENY` respectively and SHALL seal a receipt.

#### Scenario: Public registry / GH Releases intent DENY (BF4)

- GIVEN a well-formed artifact list
- WHEN `packageAndNotarize({ artifacts, publishRegistry: true })` is invoked
- THEN `ok` is `false` and `code` is `REGISTRY_PUBLISH_DENY`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `packageAndNotarize({ artifacts, ghReleases: true })` is invoked
- THEN `ok` is `false` and `code` is `GH_RELEASES_DENY`
- AND `receipt.sealed` is `true`

### Requirement: Fundacion ALWAYS_DENY

IF the request touches Fundacion (`fundacion: true`, `writeFundacion`, or a
Fundacion path), THEN THE SYSTEM SHALL DENY with `code: FUNDACION_DENY` and
SHALL keep `fundacionDelta: 0`.

THE SYSTEM SHALL expose `writeFundacion()` as an ALWAYS_DENY surface.

#### Scenario: Fundacion path DENY (BF5)

- GIVEN a well-formed artifact list
- WHEN `packageAndNotarize({ artifacts, fundacion: true })` is invoked
- THEN `ok` is `false` and `code` is `FUNDACION_DENY`
- AND `receipt.sealed` is `true`
- AND `fundacionDelta` is `0`
- AND `PRODUCTION_READY` is `NO`

### Requirement: Empty / malformed artifacts DENY

IF artifacts is empty, missing, or malformed (missing id/digest, flagged
`malformed`), THEN THE SYSTEM SHALL DENY with `EMPTY_ARTIFACTS`,
`EMPTY_REQUEST`, or `MALFORMED_ARTIFACTS` and SHALL seal a receipt.

#### Scenario: Empty/malformed artifacts DENY (BF6)

- GIVEN a port with default options
- WHEN `packageAndNotarize({ artifacts: [] })` is invoked
- THEN `ok` is `false` and `code` is `EMPTY_ARTIFACTS`
- AND `receipt.sealed` is `true`
- WHEN `packageAndNotarize({ artifacts: [{ malformed: true }] })` is invoked
- THEN `code` is `MALFORMED_ARTIFACTS`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Missing required BC/BD/BE seals DENY

IF policy requires apply / delivery / replay seals and they are missing or
invalid, THEN THE SYSTEM SHALL DENY with `APPLY_SEAL_DENY`,
`DELIVERY_SEAL_DENY`, or `REPLAY_SEAL_DENY` and SHALL seal a receipt.

#### Scenario: Missing required seals DENY (BF7)

- GIVEN a port with `requireApplySeal: true`
- AND a well-formed artifact list with no apply seal
- WHEN `packageAndNotarize({ artifacts })` is invoked
- THEN `ok` is `false` and `code` is `APPLY_SEAL_DENY`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Law VI MODULE_DIR-only CLEAN

THE SYSTEM SHALL keep MODULE_DIR (`src/core/delivery`) free of contiguous
forbidden provider-prefix literals. Law VI audits SHALL scan MODULE_DIR only
and SHALL NOT scan `tests/`.

WHILE packaging is in progress, THE SYSTEM SHALL scrub secret-looking keys
and substrings from receipts and getState dumps.

#### Scenario: Law VI MODULE_DIR CLEAN (BF8)

- GIVEN MODULE_DIR = `src/core/delivery`
- WHEN a Law VI scan runs over MODULE_DIR `.js` / `.mjs` files only
- THEN zero contiguous forbidden provider-prefix literals are found
- AND `PRODUCTION_READY` remains `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Secret scrub / no leakage (BF9)

- GIVEN an artifact whose meta carries `apiKey: env-fake-token-001`
- WHEN `packageAndNotarize` succeeds
- THEN the sealed receipt JSON SHALL NOT contain `env-fake-token-001`
- AND `sanitizeBfPayload` redacts `apiKey` / `authorization` to `[REDACTED]`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Injectable AQ/BC/BD/BE compose (no vendor rewrite)

WHEN injectable `aqNotary` / `bcApply` / `bdDelivery` / `beReplay` ports are
supplied, THE SYSTEM SHALL observe them during NOTARIZE and SHALL report
`*Injected` / `*Observed` flags. THE SYSTEM SHALL NOT vendor-copy AQ/AJ/AL
source into MODULE_DIR (BC/BD/BE siblings MAY coexist).

#### Scenario: Injectable compose fakes (BF10)

- GIVEN ports with observe fakes for aq/bc/bd/be
- WHEN `packageAndNotarize({ artifacts })` succeeds
- THEN `aqInjected`, `bcInjected`, `bdInjected`, `beInjected` are `true`
- AND observe fakes were called with `kind` = BF_KIND
- AND MODULE_DIR does not contain AQ/AJ/AL vendor filenames
- AND BF sources do not import `evidence/` or `developer-engine/`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: getState counters and throwOnDeny

WHEN packaging succeeds and fails across calls, THE SYSTEM SHALL expose
accurate `packageCount` / `okCount` / `denyCount` via `getState()`.

IF `throwOnDeny: true` and a DENY occurs, THEN THE SYSTEM SHALL throw
`LocalRcPackagingArtifactNotaryError`.

#### Scenario: getState counters (BF11)

- GIVEN one successful and one DENY packaging call
- WHEN `getState()` is read
- THEN `packageCount` is `2`, `okCount` is `1`, `denyCount` is `1`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: throwOnDeny optional (BF13)

- GIVEN a port with `throwOnDeny: true`
- WHEN packaging with `PRODUCTION_READY: 'YES'` policy is invoked
- THEN a `LocalRcPackagingArtifactNotaryError` is thrown
- AND `BF_CODES` is frozen
- AND `PRODUCTION_READY` remains `NO`

### Requirement: NON-CLAIM + ladder markers + phases + custody

THE SYSTEM SHALL keep NON-CLAIM strings (`PRODUCTION_READY=YES`,
`public registry publish`, `GH Releases product`, `not BG`) in module
comments and health flags false for claim surfaces.

WHILE L17 and L18 remain CLOSED, THE SYSTEM SHALL expose
`l17NeverReopen` / `l18NeverReopen` true and SHALL acknowledge
BC+BD+BE MEASURED without claiming BG.

WHEN packaging succeeds, THE SYSTEM SHALL enforce phase order
VALIDATE → GATE → PACKAGE → NOTARIZE → SEAL. IF gated DENY occurs, THEN
PACKAGE/NOTARIZE SHALL be skipped and SEAL SHALL still run.

IF an explicitly broken seal (`sealed: false` / `ok: false`) is supplied,
THEN THE SYSTEM SHALL DENY with `CUSTODY_BREAK`. Multi-artifact manifests
SHALL be order-independent (stable sorted digests).

#### Scenario: NON-CLAIM strings (BF14)

- GIVEN BF module sources under MODULE_DIR
- WHEN NON-CLAIM comments are inspected
- THEN they mention `PRODUCTION_READY=YES`, `public registry publish`,
  `GH Releases product`, and `not BG`
- AND health flags `productionReadyYesFlip`, `publicRegistryPublish`,
  `ghReleasesProduct` are `false`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: L17/L18 never-reopen (BF15)

- GIVEN a port health surface
- WHEN `health()` is read
- THEN `ladder17` and `ladder18` are `CLOSED`
- AND `l17NeverReopen` and `l18NeverReopen` are `true`
- AND facade comments match `L17 CLOSED never reopen` / `L18 CLOSED never reopen` / `L19 OPEN`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: not BG; BC+BD+BE MEASURED (BF16)

- GIVEN a port health / getState surface
- WHEN health and getState are read
- THEN `notBg` is `true` and `bgPending` is `true`
- AND `bcMeasured`, `bdMeasured`, `beMeasured` are `true`
- AND statuses are `BC MEASURED` / `BD MEASURED` / `BE MEASURED`
- AND facade comments match `BC+BD+BE MEASURED` and `not BG`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Phases order (BF17)

- GIVEN a successful packaging call
- WHEN phases are inspected
- THEN phases equal `[VALIDATE, GATE, PACKAGE, NOTARIZE, SEAL]`
- AND a Fundacion DENY includes VALIDATE + GATE + SEAL only
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Custody break + multi-artifact stable digests (BF18)

- GIVEN an explicitly broken apply seal `{ sealed: false, ok: false }`
- WHEN `packageAndNotarize` is invoked
- THEN `ok` is `false` and `code` is `CUSTODY_BREAK`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN the same three artifacts are packaged in two different input orders
- THEN both `manifestDigest` values are identical
- AND `artifactIds` are sorted stably
