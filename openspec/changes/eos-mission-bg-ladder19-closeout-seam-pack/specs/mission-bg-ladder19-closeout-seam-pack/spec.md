# Spec — mission-bg-ladder19-closeout-seam-pack (SPEC-0064 / Mission BG)

## Meta

| Field | Value |
| --- | --- |
| Spec id | SPEC-0064 |
| Change | `openspec/changes/eos-mission-bg-ladder19-closeout-seam-pack` |
| Kind | `eos-ladder19-closeout-seam-pack` |
| Axis | Sovereign Delivery & Verification Fabric |
| Tests | `tests/eos-bg-ladder19-seam-pack.test.js` (BG1–BG18) |
| ADR | `docs/adrs/ADR-0022-mission-bg-ladder19-closeout-seam-pack.md` |
| Evidence | `docs/evidence/EOS_MISSION_BG_EVIDENCE_2026-09-14.md` |
| PRODUCTION_READY | `NO` |
| Fundacion Δ | `0` |
| L17 / L18 | CLOSED (never reopen) |
| L19 | CLOSED_FOR_LOCAL_GOVERNED_USE after BG (never reopen L19 after closeout) |
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
- a rewrite of BC/BD/BE/BF modules
- a CloudAgent path (Antigravity-first)
- a Fundacion writer
- a tip honesty SSOT refresh (deferred post-BG)
- a reopen of L17, L18, or L19 after closeout

Governed patch / diff apply ≠ unsupervised auto-merge SaaS / ≠ GH Actions replacement.
Multi-worktree / multi-target delivery ≠ multi-tenant cloud fleet / ≠ K8s CD.
Verification replay / golden receipts ≠ SIEM product / ≠ billing accuracy SaaS.
Local RC packaging / artifact notary ≠ PRODUCTION_READY=YES / ≠ public registry / ≠ GH Releases.
L19 seam-pack ≠ GH Team/Enterprise enforcement.

WHILE Ladder 19 closeout is recorded, THE SYSTEM SHALL keep PRODUCTION_READY=NO
and Fundacion Δ=0, SHALL mark Ladder 19 CLOSED_FOR_LOCAL_GOVERNED_USE, and
SHALL not claim GH Team/Enterprise enforcement.

## ADDED Requirements

### Requirement: Seam-pack requires Ladder 19 satellites

WHEN Ladder 19 satellites BC–BF exist, THE SYSTEM SHALL require their npm
test scripts in CI seam-pack fail-closed:

- `test:governed-patch-apply` (Mission BC)
- `test:multi-target-delivery` (Mission BD)
- `test:verification-replay` (Mission BE)
- `test:local-rc-packaging` (Mission BF)

after prior packs (including Ladder 12/13/14/15/16/17/18 when present).
THE SYSTEM SHALL keep Fundacion freeze (delta 0). THE SYSTEM SHALL NOT use
`continue-on-error: true` or soak.

IF any BC–BF seam-pack job fails, THEN THE SYSTEM SHALL fail the CI contract
(no soak / no continue-on-error / no soft-fail).

#### Scenario: Satellite missing from ci.yml (BG1)

- GIVEN the Mission BG lock suite
- WHEN ci.yml is read after the patcher
- THEN each of the four `npm run <script>` lines is present
- AND the seam-pack job exists
- AND Fundacion freeze is present
- AND `continue-on-error: true` is absent
- AND soak is absent from the seam-pack body

#### Scenario: Any BC–BF seam-pack job fails (fail-closed)

- GIVEN CI seam-pack with Ladder 19 satellites
- WHEN any BC–BF npm test script fails
- THEN the CI contract SHALL fail (no soak / no continue-on-error)

### Requirement: Pack aliases + lock scripts

`package.json` SHALL expose:

- `test:native-suite-pack` extended with the four Ladder 19 CI scripts
- `test:ladder19-pack` chaining the four + `test:mission-bg`
- `test:mission-bg` / `test:bg19` / `test:l19` pointing at `tests/eos-bg-ladder19-seam-pack.test.js`
- `test:mission-bc` / `test:mission-bd` / `test:mission-be` / `test:mission-bf` aliases (seeded if missing)
- Primary lock paths:
  - `test:governed-patch-apply` → `tests/eos-bc-governed-patch-diff-apply-port.test.js`
  - `test:multi-target-delivery` → `tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js`
  - `test:verification-replay` → `tests/eos-be-verification-replay-golden-receipt-port.test.js`
  - `test:local-rc-packaging` → `tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js`

WHEN a primary satellite script is absent, THE SYSTEM SHALL seed it to the
lock path above and SHALL seed the matching `test:mission-bc/bd/be/bf` alias.

#### Scenario: package.json satellites + aliases (BG2, BG5)

- GIVEN a host or fixture package.json after patcher
- WHEN scripts are read
- THEN the four primaries exist and point at BC/BD/BE/BF lock files
- AND mission-bc/bd/be/bf aliases equal their primaries
- AND test:mission-bg / test:bg19 / test:l19 equal the BG lock command

#### Scenario: ladder19-pack chain (BG3)

- GIVEN package.json after patcher
- WHEN `test:ladder19-pack` is read
- THEN it includes test:governed-patch-apply, test:multi-target-delivery,
  test:verification-replay, test:local-rc-packaging, and test:mission-bg

#### Scenario: native-suite-pack extended (BG4)

- GIVEN `test:native-suite-pack` is present
- WHEN the patcher has run
- THEN each of the four L19 scripts is included in the chain

### Requirement: Contract + assert needles + fragment

`docs/governance/CI_CD_CONTRACT.md` OR `docs/releases/CI_CD_CONTRACT.md` SHALL
document Mission BG / Ladder 19. `docs/governance/CI_CD_CONTRACT.ladder19-fragment.md`
SHALL exist. `scripts/ci/assert-gha-contract.js` SHOULD assert each satellite
needle when patched.

#### Scenario: Contract note + fragment (BG6)

- GIVEN the patched contract and the fragment file
- WHEN both are read
- THEN they mention Ladder 19 / Mission BG and PRODUCTION_READY=NO

### Requirement: Ladder 19 closeout honesty

`docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md` SHALL state
PRODUCTION_READY=NO, Fundacion Δ=0, COMPLETE_FOR_LOCAL_GOVERNED_USE,
CLOSED_FOR_LOCAL_GOVERNED_USE, BC+BD+BE+BF+BG MEASURED, axis Sovereign Delivery
& Verification Fabric, and NON-CLAIM that CI pass ≠ production /
≠ GH Team/Enterprise enforcement / ≠ GH billing /
governed patch ≠ auto-merge SaaS / multi-target ≠ cloud fleet / K8s CD /
verification replay ≠ SIEM / RC packaging ≠ PRODUCTION_READY=YES / registry / GH Releases.
CLOSED_FOR_LOCAL_GOVERNED_USE SHALL NOT imply PRODUCTION_READY=YES.
L17 SHALL remain CLOSED (never reopen).
L18 SHALL remain CLOSED (never reopen).
THE SYSTEM SHALL NOT revert Ladder 19 from CLOSED_FOR_LOCAL_GOVERNED_USE after closeout.
THE SYSTEM SHALL NOT reopen L19 after closeout.
Tip honesty ritual SHALL be deferred to post-BG tip refresh (not this mission).
Expected tip SHALL document StartsWith `37a36e9` (full `37a36e9f0ed9dab61b3d997edd777e49d2eb7a16`).

WHILE Ladder 19 closeout is recorded, THE SYSTEM SHALL keep CloudAgent out
(Antigravity-first).

#### Scenario: Closeout CLOSED_FOR_LOCAL_GOVERNED_USE (BG7, BG17, BG18)

- GIVEN the closeout document
- WHEN it is read
- THEN it contains CLOSED_FOR_LOCAL_GOVERNED_USE, COMPLETE_FOR_LOCAL_GOVERNED_USE,
  PRODUCTION_READY=NO, Fundacion Δ=0, BC–BF+BG MEASURED
- AND it does not claim a current unclosed status for Ladder 19
- AND L17 and L18 are marked CLOSED never reopen

#### Scenario: Release + OpenSpec + ADR (BG8, BG9, BG18)

- GIVEN release, OpenSpec change folder, and ADR-0022
- WHEN they are read
- THEN SPEC-0064 is present
- AND ADR documents Decision, Consequences, NON-CLAIM, and rejected alts
  (soak/continue-on-error; GH required-check billing; reopening L19; soft-fail)

### Requirement: Slim ceiling held

Mission BG SHALL NOT raise TR-01. The lock basename
`eos-bg-ladder19-seam-pack.test.js` SHALL be registered in SLIM_SUITE_EXCLUDES.
BC/BD/BE/BF satellite suites remain slim-excluded.

#### Scenario: Slim exclude (BG10)

- GIVEN scripts/test-runner.js after patcher
- WHEN SLIM_SUITE_EXCLUDES is read
- THEN eos-bg-ladder19-seam-pack.test.js is present

### Requirement: CRLF-safe patcher + Law VI

`scripts/patch-mission-bg.mjs` SHALL use `[^\r\n]*` (not `[^\n]*`) for single-line
YAML/Markdown matchers and `[\s\S]` for multi-line Set matchers so Windows CRLF
hosts do not break idempotent patches.

THE SYSTEM SHALL NOT embed static provider-secret prefix literals in the
patcher, lock, closeout, release, fragment, ADR, or evidence (Law VI).
IF `src/` MODULE_DIR exists, THEN THE SYSTEM SHALL keep it CLEAN of those
literals as well.

#### Scenario: Patcher CRLF + Law VI (BG12, BG13)

- GIVEN the patcher source and envelope docs
- WHEN they are scanned
- THEN CRLF-safe matchers are present
- AND the runtime-constructed forbidden prefix is absent as a contiguous literal

### Requirement: Antigravity-first / no CloudAgent

THE SYSTEM SHALL keep CloudAgent out. Box work SHALL be Antigravity-first
(no CloudAgent launch; no git clone of Eos-).

#### Scenario: CloudAgent out (BG15)

- GIVEN closeout and release
- WHEN they are read
- THEN both mark Antigravity-first and CloudAgent out
