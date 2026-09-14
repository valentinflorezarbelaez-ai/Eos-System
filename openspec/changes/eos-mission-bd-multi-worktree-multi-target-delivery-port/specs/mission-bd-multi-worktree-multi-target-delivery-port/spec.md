# Spec — Mission BD Multi-Worktree / Multi-Target Delivery Port (SPEC-0061)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0061 |
| Change | `openspec/changes/eos-mission-bd-multi-worktree-multi-target-delivery-port` |
| Kind | `eos-multi-worktree-multi-target-delivery-port` |
| Axis | Sovereign Delivery & Verification Fabric |
| Facade | `src/core/delivery/multi-worktree-multi-target-delivery-port.js` |
| Tests | `tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js` (BD1–BD18) |
| ADR | `docs/adrs/ADR-0019-mission-bd-multi-worktree-multi-target-delivery-port.md` |
| Evidence | `docs/evidence/EOS_MISSION_BD_EVIDENCE_2026-09-13.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` (ALWAYS_DENY) |
| L17 / L18 | CLOSED (never reopen) |
| L19 | OPEN (BC MEASURED; BD in progress; BE–BG pending) |
| Hermetic | in-process virtual roots only — no real `git worktree`, no remote CD, no CloudAgent |

EARS patterns used in this spec (all four, exactly):

- Event-Driven: `WHEN <event>, THE SYSTEM SHALL <response>`
- State-Driven: `WHILE <state>, THE SYSTEM SHALL <response>`
- Error/Unwanted: `IF <anomalous condition>, THEN THE SYSTEM SHALL <response>`
- Ubiquitous: `THE SYSTEM SHALL <continuous behavior>`

State invariants required on every Scenario THEN/AND unless a DENY path
explicitly names a different `code`: `ok`, `code`, `receipt.sealed`,
`fundacionDelta`, `PRODUCTION_READY`.

## ADDED Requirements

### Requirement: Happy-path multi-target deliver with sealed receipt

WHEN `deliver({ artifact, targets })` is invoked with a well-formed sealed
artifact and two or more allowlisted target ids, THE SYSTEM SHALL place the
artifact onto in-memory virtual roots for every listed target, SHALL return
`ok: true` and `code: DELIVERED`, and SHALL attach a sealed receipt whose
`receiptDigest` is a 64-character lowercase hex SHA-256 over a
`stableStringify` canonical body.

WHEN the same artifact, targets, clock, and hash function are supplied twice,
THE SYSTEM SHALL emit the same `receipt.receiptDigest`.

#### Scenario: Happy-path multi-target deliver (BD2)

- GIVEN a port created with default allowlist `wt-alpha`, `wt-beta`
- AND a well-formed sealed artifact `{ kind: sealed-artifact, id, digest, payload }`
- WHEN `deliver({ artifact, targets: [wt-alpha, wt-beta] })` is invoked
- THEN `ok` is `true` and `code` is `DELIVERED`
- AND `delivered` is `true` and `hermetic` is `true`
- AND `realGitWorktree` is `false` and `remoteCd` is `false`
- AND `receipt.sealed` is `true` and `receipt.receiptId` starts with `BD-RCPT-`
- AND `receipt.receiptDigest` matches `^[a-f0-9]{64}$`
- AND `receipt.multiTenantCloudFleet` is `false`
- AND `deliveredTargets` equals `[wt-alpha, wt-beta]`
- AND `roots[wt-alpha].placed` and `roots[wt-beta].placed` are `true`
- AND `phases` includes `VALIDATE`, `GATE`, `DELIVER`, `SEAL`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Deterministic receipt digest for identical input (BD12)

- GIVEN two independently constructed ports sharing a fixed `now` and a hash
  that canonicalizes the receipt body without `seq` / `at`
- AND the same sealed artifact and targets `[wt-alpha, wt-beta]`
- WHEN `deliver` is invoked once on each port
- THEN both results have `ok: true` and `code: DELIVERED`
- AND both `receipt.sealed` are `true`
- AND both `receipt.receiptDigest` values are identical 64-hex strings
- AND `stableStringify({ b: 2, a: 1 })` equals `stableStringify({ a: 1, b: 2 })`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Fundacion ALWAYS_DENY

IF the request sets `fundacion: true`, `writeFundacion: true`, names a
Fundacion path as a target, or `writeFundacion` is invoked, THEN THE SYSTEM
SHALL DENY with `code: FUNDACION_DENY`, SHALL keep `fundacionDelta` at `0`,
SHALL NOT place any artifact, and SHALL still seal a receipt.

#### Scenario: Fundacion path DENY (BD3)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact
- AND a request with `targets: ['Fundacion/secret-wt']` and `fundacion: true`
- WHEN `deliver` is invoked
- THEN `ok` is `false` and `deny` / `denied` are `true`
- AND `code` is `FUNDACION_DENY`
- AND `fundacionDelta` is `0`
- AND `receipt.sealed` is `true`
- AND `receipt.code` is `FUNDACION_DENY`
- AND `PRODUCTION_READY` is `NO`

#### Scenario: writeFundacion surface ALWAYS_DENY (BD18)

- GIVEN a live port
- WHEN `writeFundacion({ path: '/Fundacion/secret' })` is invoked
- THEN `ok` is `false`
- AND `code` is `FUNDACION_DENY`
- AND `fundacionDelta` is `0`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`

### Requirement: Outside-allowlist DENY

IF any requested target is not a member of the effective allowlist (default
or request-supplied), THEN THE SYSTEM SHALL DENY with `code: ALLOWLIST_DENY`,
SHALL skip the DELIVER phase, SHALL set `delivered: false` and
`partial: false`, and SHALL seal a receipt.

#### Scenario: Target outside allowlist DENY (BD4)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact
- AND `targets: ['evil/not-listed']`
- WHEN `deliver` is invoked
- THEN `ok` is `false` and `deny` is `true`
- AND `code` is `ALLOWLIST_DENY`
- AND `receipt.sealed` is `true`
- AND `delivered` is `false`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: BA isolation violation DENY via injectable port

IF an injectable `ports.baIsolation` (or `ports.isolationObserve`) observe
returns `{ ok: false }` or `{ violation: true }`, THEN THE SYSTEM SHALL DENY
with `code: ISOLATION_DENY`, SHALL seal a receipt, and SHALL NOT claim a
partial delivery.

IF the same injectable observe returns `{ ok: true, violation: false }`, THEN
THE SYSTEM SHALL proceed and MAY return `code: DELIVERED`.

#### Scenario: Isolation observe violation DENY (BD5)

- GIVEN a port whose `ports.baIsolation.observe` returns `{ ok: false, violation: true, reason: 'escape' }`
- AND a well-formed sealed artifact targeted at `wt-alpha`
- WHEN `deliver` is invoked
- THEN `ok` is `false` and `deny` is `true`
- AND `code` is `ISOLATION_DENY`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Isolation observe clean still delivers (BD5)

- GIVEN a port whose `ports.baIsolation.observe` returns `{ ok: true, violation: false }`
- AND a well-formed sealed artifact targeted at `wt-alpha`
- WHEN `deliver` is invoked
- THEN `ok` is `true`
- AND `code` is `DELIVERED`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Missing or invalid BC apply seal DENY when required

IF `requireApplySeal` is true and the request supplies no apply seal or an
invalid apply seal (`ok`/`sealed` not both true), THEN THE SYSTEM SHALL DENY
with `code: APPLY_SEAL_DENY` and SHALL seal a receipt.

IF `requireApplySeal` is true and a valid `{ ok: true, sealed: true, digest }`
apply seal is supplied, THEN THE SYSTEM SHALL allow the request to proceed to
DELIVER.

#### Scenario: Missing apply seal DENY (BD6)

- GIVEN a port constructed with `requireApplySeal: true`
- AND a well-formed sealed artifact targeted at `wt-alpha`
- AND no `applySeal` field on the request
- WHEN `deliver` is invoked
- THEN `ok` is `false`
- AND `code` is `APPLY_SEAL_DENY`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Invalid apply seal DENY; valid seal delivers (BD6)

- GIVEN a port constructed with `requireApplySeal: true`
- AND a well-formed sealed artifact targeted at `wt-alpha`
- WHEN `deliver` is invoked with `applySeal: { ok: false, sealed: false }`
- THEN `code` is `APPLY_SEAL_DENY`
- AND `receipt.sealed` is `true`
- AND `ok` is `false`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN a subsequent `deliver` is invoked with `applySeal: { ok: true, sealed: true, digest }`
- THEN `ok` is `true` and `code` is `DELIVERED`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Empty targets and malformed artifact DENY

IF `targets` is empty after normalize, THEN THE SYSTEM SHALL DENY with
`code: INVALID_REQUEST` and SHALL seal a receipt.

IF the artifact is missing required sealed-artifact fields or is otherwise
malformed, THEN THE SYSTEM SHALL DENY with `code: MALFORMED_ARTIFACT` and
SHALL seal a receipt.

#### Scenario: Empty targets DENY (BD7)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact
- AND `targets: []`
- WHEN `deliver` is invoked
- THEN `ok` is `false`
- AND `code` is `INVALID_REQUEST`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Malformed artifact DENY (BD7)

- GIVEN a port with the default allowlist
- AND `targets: [wt-alpha]`
- WHEN `deliver` is invoked with `artifact: { malformed: true }`
- THEN `ok` is `false`
- AND `code` is `MALFORMED_ARTIFACT`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `deliver` is invoked with `artifact: {}`
- THEN `code` is `MALFORMED_ARTIFACT`
- AND `receipt.sealed` is `true`

### Requirement: Multi-target partial fail is whole-request DENY

IF a multi-target request contains at least one failing target (outside
allowlist, Fundacion, isolation, Law VI, or apply-seal), THEN THE SYSTEM SHALL
DENY the whole request, SHALL set `partial: false` and `delivered: false`,
SHALL leave `receipt.deliveredTargets` empty, and SHALL NOT claim partial
success.

#### Scenario: Mixed allowlisted plus evil target fail-closed (BD18)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact
- AND `targets: [wt-alpha, 'evil/not-listed']`
- WHEN `deliver` is invoked
- THEN `ok` is `false` and `deny` / `denied` are `true`
- AND `code` is `ALLOWLIST_DENY`
- AND `delivered` is `false` and `partial` is `false`
- AND `receipt.sealed` is `true`
- AND `receipt.deliveredTargets` equals `[]`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: NON-CLAIM while delivery is in progress

WHILE a delivery (VALIDATE, GATE, DELIVER, or SEAL) is in progress, THE
SYSTEM SHALL keep `multiTenantCloudFleet`, `kubernetesCd`,
`productionReadyDeliveryProduct`, `cloudAgent`, and `usesCloudAgent` false,
SHALL keep `notBe` / `notBf` / `notBg` true, SHALL keep `bePending` /
`bfPending` / `bgPending` true, and SHALL keep `bcMeasured` true with
`bcStatus: BC MEASURED`.

#### Scenario: Health and module NON-CLAIM markers (BD14, BD16)

- GIVEN a port constructed with defaults
- AND MODULE_DIR sources under `src/core/delivery`
- WHEN `health()` is read and MODULE_DIR is scanned for NON-CLAIM strings
- THEN `health.multiTenantCloudFleet` is `false`
- AND `health.kubernetesCd` is `false`
- AND `health.productionReadyDeliveryProduct` is `false`
- AND `health.PRODUCTION_READY` is `NO`
- AND `health.notBe`, `health.notBf`, and `health.notBg` are `true`
- AND `health.bePending`, `health.bfPending`, and `health.bgPending` are `true`
- AND `health.bcMeasured` is `true` and `health.bcStatus` is `BC MEASURED`
- AND MODULE_DIR source contains `cloud fleet`, `Kubernetes CD`,
  `PRODUCTION_READY delivery product`, `not BE/BF/BG`, and `BC MEASURED`
- AND `fundacionDelta` is `0`

### Requirement: Readiness, Fundacion delta, and closed ladders

THE SYSTEM SHALL set `PRODUCTION_READY` to `NO` on the port, receipt,
policy-gate, and boundary kinds.

THE SYSTEM SHALL keep `fundacionDelta` at `0` and Fundacion at
`ALWAYS_DENY`.

THE SYSTEM SHALL keep ladder 17 and ladder 18 `CLOSED` with
`l17NeverReopen` and `l18NeverReopen` true, and SHALL keep ladder 19 `OPEN`
(BC MEASURED; BD in progress; BE–BG pending).

#### Scenario: Kind and readiness health (BD1)

- GIVEN a port created with defaults
- WHEN `kind`, `PRODUCTION_READY`, and `health()` are read
- THEN `kind` is `eos-multi-worktree-multi-target-delivery-port`
- AND `PRODUCTION_READY` is `NO` on the port, `BD_PRODUCTION_READY`, and health
- AND `health.fundacionDelta` is `0`
- AND `health.ladder17` is `CLOSED` and `health.ladder18` is `CLOSED`
- AND `health.ladder19` is `OPEN`
- AND `health.l17NeverReopen` and `health.l18NeverReopen` are `true`
- AND `health.axis` is `Sovereign Delivery & Verification Fabric`
- AND `health.axisMeasured` is `AX–BB MEASURED`
- AND `health.bcMeasured` is `true`
- AND `BD_PHASE_ORDER` is `[VALIDATE, GATE, DELIVER, SEAL]`
- AND `receipt.sealed` is not required on this pre-deliver read
- AND `ok` on health is `true`

#### Scenario: L17/L18 never-reopen markers (BD15)

- GIVEN the facade module `multi-worktree-multi-target-delivery-port.js`
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

IF a reconstructed forbidden provider prefix appears in the artifact body,
THEN THE SYSTEM SHALL DENY with `code: LAW_VI_DENY`, SHALL seal a receipt,
and SHALL NOT echo the secret into the receipt.

WHEN a deliverable artifact carries secret-shaped metadata keys, THE SYSTEM
SHALL redact those values from the sealed receipt (`[REDACTED]`).

#### Scenario: MODULE_DIR Law VI CLEAN (BD8)

- GIVEN MODULE_DIR is `src/core/delivery`
- AND a forbidden prefix assembled at runtime (never stored as a contiguous
  literal in MODULE_DIR)
- WHEN every `.js` / `.mjs` file under MODULE_DIR is scanned
- THEN the directory basename is `delivery`
- AND at least four BD modules exist
- AND no MODULE_DIR source matches the reconstructed prefix
- AND `PRODUCTION_READY` remains `NO`
- AND `fundacionDelta` remains `0`

#### Scenario: Secret scrub and Law VI leak DENY (BD9)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact whose `meta.apiKey` is `env-fake-token-001`
- WHEN `deliver` is invoked for `wt-alpha`
- THEN `ok` is `true` and `code` is `DELIVERED`
- AND `receipt.sealed` is `true`
- AND the receipt JSON does not contain `env-fake-token-001`
- AND `sanitizeBdPayload` redacts `apiKey` and `authorization` to `[REDACTED]`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `deliver` is invoked with an artifact payload containing a reconstructed
  forbidden vendor prefix
- THEN `ok` is `false`
- AND `code` is `LAW_VI_DENY`
- AND `receipt.sealed` is `true`
- AND the receipt JSON does not contain the vendor prefix

### Requirement: Injectable AN/BA/BC compose ports; no source rewrite

WHEN optional `ports.anFederation` / `ports.federationObserve`,
`ports.baIsolation` / `ports.axEngine`, and `ports.bcApply` /
`ports.applySeal` are supplied, THE SYSTEM SHALL call each observe hook
during a successful deliver and SHALL set the corresponding
`anInjected` / `baInjected` / `bcInjected` and
`anObserved` / `baObserved` / `bcObserved` flags.

THE SYSTEM SHALL NOT vendor-copy or import AN / AX / BA source modules into
`src/core/delivery`. BC sibling modules MAY coexist in the same directory on
main (BD10 fix: MODULE_DIR is the delivery package, not an exclusive BD
namespace).

#### Scenario: Compose fakes called; AN/AX/BA not vendored (BD10)

- GIVEN a port with injectable `anFederation.observe`, `baIsolation.observe`,
  and `bcApply.observe` fakes that record `ctx.kind`
- AND a well-formed sealed artifact targeted at `[wt-alpha, wt-beta]`
- WHEN `deliver` is invoked
- THEN `ok` is `true` and `code` is `DELIVERED`
- AND `anInjected`, `baInjected`, and `bcInjected` are `true`
- AND `anObserved`, `baObserved`, and `bcObserved` are `true`
- AND each fake was called at least once with `ctx.kind` equal to `BD_KIND`
- AND MODULE_DIR does not contain
  `multi-workstation-session-federation-port.js`,
  `local-sandbox-container-port.js`,
  `sovereign-developer-engine.js`,
  `sandbox-boundary.js`, or
  `isolation-receipt.js`
- AND BD sources do not import AN/AX/BA source paths
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Phases VALIDATE → GATE → DELIVER → SEAL enforced

WHEN a happy-path `deliver` completes, THE SYSTEM SHALL record
`phases` exactly as `[VALIDATE, GATE, DELIVER, SEAL]`.

WHEN a request is denied at GATE (allowlist, Fundacion, isolation, apply seal,
or Law VI), THE SYSTEM SHALL still end `phases` with `SEAL` and SHALL NOT
include `DELIVER`.

#### Scenario: Happy-path phase order (BD17)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact targeted at `[wt-alpha, wt-beta]`
- WHEN `deliver` is invoked
- THEN `ok` is `true` and `code` is `DELIVERED`
- AND `phases` equals `[VALIDATE, GATE, DELIVER, SEAL]`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

#### Scenario: Deny skips DELIVER and still SEALs (BD17)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact
- AND `targets: ['evil/x']`
- WHEN `deliver` is invoked
- THEN `ok` is `false` and `code` is `ALLOWLIST_DENY`
- AND `phases` includes `VALIDATE` and `GATE` and `SEAL`
- AND `phases[phases.length - 1]` is `SEAL`
- AND `phases` does not include `DELIVER`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`

### Requirement: Single-target deliver still works

WHEN `deliver` is invoked with exactly one allowlisted target (including
`memory://fixture/…` and the one-shot `deliver(req, opts)` helper), THE
SYSTEM SHALL return `ok: true`, `code: DELIVERED`, and a sealed receipt
listing that single target.

#### Scenario: Single-target and memory:// and one-shot helper (BD18)

- GIVEN a port with the default allowlist
- AND a well-formed sealed artifact
- WHEN `deliver` is invoked with `targets: [wt-alpha]`
- THEN `ok` is `true` and `code` is `DELIVERED`
- AND `delivered` is `true`
- AND `deliveredTargets` equals `[wt-alpha]`
- AND `receipt.sealed` is `true`
- AND `PRODUCTION_READY` is `NO`
- AND `fundacionDelta` is `0`
- WHEN `deliver` is invoked with `targets: ['memory://fixture/x']`
- THEN `ok` is `true` and `code` is `DELIVERED`
- AND `receipt.sealed` is `true`
- WHEN the one-shot `deliver(req, { now })` helper is invoked with
  `targets: ['worktree/alpha']`
- THEN `code` is `DELIVERED`
- AND `receipt.sealed` is `true`

### Requirement: getState counters and throwOnDeny

WHEN `deliver` has been invoked at least once, THE SYSTEM SHALL expose
`getState()` counters `deliverCount`, `okCount`, and `denyCount` that match
the outcomes, with `PRODUCTION_READY: NO` and NON-CLAIM flags.

IF the port was constructed with `throwOnDeny: true` and a request is denied,
THEN THE SYSTEM SHALL throw `MultiWorktreeMultiTargetDeliveryError` and SHALL
keep `BD_CODES` frozen.

#### Scenario: getState ok/deny counters (BD11)

- GIVEN a port with the default allowlist
- AND one successful deliver to `wt-alpha`
- AND one denied deliver to `evil/nope`
- WHEN `getState()` is read
- THEN `deliverCount` is `2`
- AND `okCount` is `1`
- AND `denyCount` is `1`
- AND `PRODUCTION_READY` is `NO`
- AND `multiTenantCloudFleet` is `false`
- AND `kind` is `eos-multi-worktree-multi-target-delivery-port`
- AND `fundacionDelta` is `0`

#### Scenario: throwOnDeny raises typed error (BD13)

- GIVEN a port constructed with `throwOnDeny: true`
- AND a well-formed sealed artifact targeted at `evil/nope`
- WHEN `deliver` is invoked
- THEN the call throws `MultiWorktreeMultiTargetDeliveryError`
- AND `BD_CODES` is frozen
- AND `BD_CODES.DELIVERED` is `DELIVERED`
- AND `BD_CODES.FUNDACION_DENY` is `FUNDACION_DENY`
- AND `BD_CODES.ALLOWLIST_DENY` is `ALLOWLIST_DENY`
- AND `BD_CODES.ISOLATION_DENY` is `ISOLATION_DENY`
- AND `BD_CODES.APPLY_SEAL_DENY` is `APPLY_SEAL_DENY`
- AND `BD_CODES.LAW_VI_DENY` is `LAW_VI_DENY`
- AND `BD_CODES.MALFORMED_ARTIFACT` is `MALFORMED_ARTIFACT`
- AND `PRODUCTION_READY` remains `NO`
- AND `fundacionDelta` remains `0`
