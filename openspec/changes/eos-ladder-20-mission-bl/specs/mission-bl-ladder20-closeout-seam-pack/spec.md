# Spec — mission-bl-ladder20-closeout-seam-pack (SPEC-0069 / Mission BL)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0069 |
| Change | `openspec/changes/eos-ladder-20-mission-bl` |
| Kind | `eos-ladder20-closeout-seam-pack` |
| Axis | Sovereign Mission Continuity & Operator Fabric |
| Tests | `tests/eos-bl-ladder20-seam-pack.test.js` (BL1–BL20) |
| ADR | `docs/adrs/ADR-0028-mission-bl-ladder20-closeout-seam-pack.md` |
| Evidence | `docs/evidence/EOS_MISSION_BL_EVIDENCE_2026-09-14.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` |
| L17 / L18 / L19 | CLOSED (never reopen) |
| L20 | CLOSED_FOR_LOCAL_GOVERNED_USE after BL (never reopen L20 after closeout) |
| Hermetic | box harness against `_fixtures/`; host patches real ci.yml / package.json |

EARS patterns used in this spec (all four, exactly):

- Event-Driven: `WHEN <event>, THE SYSTEM SHALL <response>`
- State-Driven: `WHILE <state>, THE SYSTEM SHALL <response>`
- Error/Unwanted: `IF <anomalous condition>, THEN THE SYSTEM SHALL <response>`
- Ubiquitous: `THE SYSTEM SHALL <continuous behavior>`

## NON-CLAIM fence

This closeout **is not** and **shall not be advertised as**:

- a PRODUCTION_READY=YES flip
- GH Team/Enterprise enforcement / required-check billing upgrade
- a soak or continue-on-error pack
- a soft-fail seam-pack
- a rewrite of BH/BI/BJ/BK modules
- a CloudAgent path (Antigravity-first)
- a Fundacion writer
- a tip honesty SSOT refresh (deferred post-BL)
- a reopen of L17, L18, L19, or L20 after closeout

Mission lifecycle state machine ≠ full PM SaaS / ≠ Jira replacement.
Cross-session continuity & replay ≠ HA multi-region SaaS / ≠ distributed clustering.
Operator HUD ≠ full observability SaaS / ≠ Grafana/Datadog replacement.
Governed external write orchestrator ≠ unsupervised fleet deploy / ≠ K8s CD.
L20 seam-pack ≠ GH Team/Enterprise enforcement.

WHILE Ladder 20 closeout is recorded, THE SYSTEM SHALL keep PRODUCTION_READY=NO
and Fundacion Δ=0, SHALL mark Ladder 20 CLOSED_FOR_LOCAL_GOVERNED_USE, and
SHALL not claim GH Team/Enterprise enforcement.

## ADDED Requirements

### Requirement: Seam-pack requires Ladder 20 satellites

WHEN Ladder 20 satellites BH–BK exist, THE SYSTEM SHALL require their npm
test scripts in CI seam-pack fail-closed:

- `test:mission-bh` (Mission BH)
- `test:mission-bi` (Mission BI)
- `test:mission-bj` (Mission BJ)
- `test:mission-bk` (Mission BK)

after prior packs (including Ladder 12/13/14/15/16/17/18/19 when present).
THE SYSTEM SHALL keep Fundacion freeze (delta 0). THE SYSTEM SHALL NOT use
`continue-on-error: true` or soak.

IF any BH–BK seam-pack step fails, THEN THE SYSTEM SHALL fail the CI contract
without continue-on-error (no soak / no soft-fail).

#### Scenario: Satellite missing from ci.yml (BL1)

- GIVEN the Mission BL lock suite
- WHEN ci.yml is read after the patcher
- THEN each of the four `npm run <script>` lines is present
- AND the seam-pack job exists
- AND Fundacion freeze is present
- AND `continue-on-error: true` is absent
- AND soak is absent from the seam-pack body

#### Scenario: Any BH–BK seam-pack step fails (fail-closed)

- GIVEN CI seam-pack with Ladder 20 satellites
- WHEN any BH–BK npm test script fails
- THEN the CI contract SHALL fail (no soak / no continue-on-error)

### Requirement: Pack aliases + lock scripts

`package.json` SHALL expose:

- `test:native-suite-pack` extended with the four Ladder 20 CI scripts
- `test:ladder20-pack` chaining the four + `test:mission-bl`
- `test:mission-bl` / `test:bl20` / `test:l20` pointing at `tests/eos-bl-ladder20-seam-pack.test.js`
- `test:mission-lifecycle` / `test:cross-session-continuity` / `test:operator-dashboard-hud` / `test:governed-external-write` aliases (seeded if missing)
- Primary lock paths:
  - `test:mission-bh` → `tests/eos-bh-mission-lifecycle-state-machine.test.js`
  - `test:mission-bi` → `tests/eos-bi-cross-session-continuity-replay-fabric.test.js`
  - `test:mission-bj` → `tests/eos-bj-operator-dashboard-hud-fabric.test.js`
  - `test:mission-bk` → `tests/eos-bk-governed-external-write-orchestrator.test.js`

WHEN a primary satellite script is absent, THE SYSTEM SHALL seed it to the
lock path above and SHALL seed the matching alias.

#### Scenario: package.json satellites + aliases (BL2, BL5)

- GIVEN a host or fixture package.json after patcher
- WHEN scripts are read
- THEN the four primaries exist and point at BH/BI/BJ/BK lock files
- AND lifecycle/continuity/HUD/write aliases equal their primaries
- AND test:mission-bl / test:bl20 / test:l20 equal the BL lock command

#### Scenario: ladder20-pack chain (BL3)

- GIVEN package.json after patcher
- WHEN `test:ladder20-pack` is read
- THEN it equals `npm run test:mission-bh && npm run test:mission-bi && npm run test:mission-bj && npm run test:mission-bk && npm run test:mission-bl`

#### Scenario: native-suite-pack extended (BL4)

- GIVEN `test:native-suite-pack` is present
- WHEN the patcher has run
- THEN each of the four L20 scripts is included in the chain

### Requirement: Contract + assert needles + fragment

`docs/governance/CI_CD_CONTRACT.md` OR `docs/releases/CI_CD_CONTRACT.md` SHALL
document Mission BL / Ladder 20. `docs/governance/CI_CD_CONTRACT.ladder20-fragment.md`
SHALL exist. `scripts/ci/assert-gha-contract.js` SHOULD assert each satellite
needle when patched.

#### Scenario: Contract note + fragment (BL6)

- GIVEN the patched contract and the fragment file
- WHEN both are read
- THEN they mention Ladder 20 / Mission BL and PRODUCTION_READY=NO

### Requirement: Ladder 20 closeout honesty

`docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE,
CLOSED_FOR_LOCAL_GOVERNED_USE, BH+BI+BJ+BK+BL MEASURED, axis Sovereign Mission
Continuity & Operator Fabric, and NON-CLAIM that CI pass ≠ production /
≠ GH Team/Enterprise enforcement / ≠ GH billing /
lifecycle ≠ PM SaaS / continuity ≠ HA multi-region / HUD ≠ Grafana /
external write ≠ unsupervised fleet / K8s CD.
CLOSED_FOR_LOCAL_GOVERNED_USE SHALL NOT imply PRODUCTION_READY=YES.
L17 SHALL remain CLOSED (never reopen).
L18 SHALL remain CLOSED (never reopen).
L19 SHALL remain CLOSED (never reopen).
THE SYSTEM SHALL NOT revert Ladder 20 from CLOSED_FOR_LOCAL_GOVERNED_USE after closeout.
THE SYSTEM SHALL NOT reopen L20 after closeout.
Tip honesty ritual SHALL be deferred to post-BL tip refresh (not this mission).
Expected tip SHALL document StartsWith `dd225d9` (full `dd225d9b9ca8851110ed6b38513e35c0092e02ff`).

WHILE Ladder 20 closeout is recorded, THE SYSTEM SHALL keep CloudAgent out
(Antigravity-first) and SHALL keep PRODUCTION_READY=NO and Fundacion Δ=0.

#### Scenario: Closeout CLOSED_FOR_LOCAL_GOVERNED_USE (BL7, BL17, BL18)

- GIVEN the closeout document
- WHEN it is read
- THEN it contains CLOSED_FOR_LOCAL_GOVERNED_USE, COMPLETE_FOR_LOCAL_GOVERNED_USE,
  PRODUCTION_READY=NO, Fundacion Δ=0, BH–BK+BL MEASURED
- AND it does not claim a current unclosed status for Ladder 20
- AND L17, L18, and L19 are marked CLOSED never reopen

#### Scenario: Release + OpenSpec + ADR (BL8, BL9, BL18)

- GIVEN release, OpenSpec change folder, and ADR-0028
- WHEN they are read
- THEN SPEC-0069 is present
- AND ADR documents Decision, Consequences, NON-CLAIM, and rejected alts
  (soak/continue-on-error; PRODUCTION_READY=YES; reopening L20; soft-fail)

### Requirement: Slim ceiling held

Mission BL SHALL NOT raise TR-01. The lock basename
`eos-bl-ladder20-seam-pack.test.js` SHALL be registered in SLIM_SUITE_EXCLUDES.
BH/BI/BJ/BK satellite suites remain slim-excluded.

#### Scenario: Slim exclude (BL10)

- GIVEN scripts/test-runner.js after patcher
- WHEN SLIM_SUITE_EXCLUDES is read
- THEN eos-bl-ladder20-seam-pack.test.js is present

### Requirement: Receipt integrity + Layer 0 purity

THE SYSTEM SHALL require satellite lock suites to document receipt prefixes
BH-RCPT-* / BI-RCPT-* / BJ-RCPT-* / BK-RCPT-*.

THE SYSTEM SHALL keep Layer 0 purity fail-closed (no soft-fail in ci.yml;
FUNDACION_ALWAYS_DENY / Fundacion Δ=0 posture documented).

#### Scenario: Receipt prefixes present (BL19)

- GIVEN BH/BI/BJ/BK satellite lock test files
- WHEN each is read
- THEN each contains its BH-RCPT- / BI-RCPT- / BJ-RCPT- / BK-RCPT- prefix

#### Scenario: Layer 0 fail-closed (BL20)

- GIVEN closeout and ci.yml
- WHEN they are read
- THEN fail-closed / no continue-on-error / Fundacion Δ=0 markers are present
- AND soft-fail / continue-on-error:true are absent from ci.yml

### Requirement: CRLF-safe patcher + Law VI

`scripts/patch-mission-bl.mjs` SHALL use `[^\r\n]*` (not `[^\n]*`) for single-line
YAML/Markdown matchers and `[\s\S]` for multi-line Set matchers so Windows CRLF
hosts do not break idempotent patches.

THE SYSTEM SHALL NOT embed static provider-secret prefix literals in the
patcher, lock, closeout, release, fragment, ADR, or evidence (Law VI).
IF `src/` MODULE_DIR exists, THEN THE SYSTEM SHALL keep it CLEAN of those
literals as well.

#### Scenario: Patcher CRLF + Law VI (BL12, BL13)

- GIVEN the patcher source and envelope docs
- WHEN they are scanned
- THEN CRLF-safe matchers are present
- AND the runtime-constructed forbidden prefix is absent as a contiguous literal

### Requirement: Antigravity-first / no CloudAgent

THE SYSTEM SHALL keep CloudAgent out. Box work SHALL be Antigravity-first
(no CloudAgent launch; no git clone of Eos-).

#### Scenario: CloudAgent out (BL15)

- GIVEN closeout and release
- WHEN they are read
- THEN both mark Antigravity-first and CloudAgent out
