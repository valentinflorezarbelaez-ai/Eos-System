# Spec — Mission FM Ladder 41 CI Seam-Pack Consolidation & Closeout (SPEC-0175)

**Soft-observe pin:** `f5948926` · **Observed tip at authoring:** `fa153c33` · **PRODUCTION_READY:** NO

## Requirement: Seam receipt is sealed and verifiable

The system SHALL build a nine-field `FM-RCPT-*` receipt carrying an opaque `seamDigest`, `fundacionDelta: 0`, `productionReady: 'NO'`, and a verifiable `receiptHash`.

### Scenario: canonical receipt shape
- **WHEN** a seam receipt is built with a decision
- **THEN** it contains exactly the canonical nine seal fields plus `freezeObserve`, `ceilingHold` and `seamHold`
- **AND** `verifyLadder41SeamReceipt` returns `{ ok: true }`

### Scenario: tamper detection
- **WHEN** `decision`, `receiptHash`, `fundacionDelta` or `productionReady` is mutated after sealing
- **THEN** verification SHALL fail closed

## Requirement: Seam digest is opaque-only (Law VI)

The system SHALL compute `seamDigest` over chain booleans, chain labels, spec ordinals and the seam class only.

### Scenario: secret pollution is ignored
- **WHEN** `password`, `token` or `rawRequestPayload` are added to the seam metadata
- **THEN** the digest SHALL remain identical to the unpolluted digest

## Requirement: Satellites are soft-observed, never hard-required

The system SHALL expose `softObserveFi/Fj/Fk/Fl` that report `present: true|false`.

### Scenario: slim checkout
- **WHEN** a satellite module is absent
- **THEN** the helper SHALL return `present: false` and SHALL NOT throw

## Requirement: Closeout fails closed without a human gate

The system SHALL DENY an L41 closeout claim that lacks `humanGateHeld`.

### Scenario: auto-close attempt
- **WHEN** a plan requests L41 closeout without `humanGateHeld`
- **THEN** the policy gate SHALL return `DENY` with `L41_AUTO_CLOSE_FORBIDDEN`

## Requirement: Tip-seal is refused inside the product package

The system SHALL DENY any tip-seal claim made by the FM package.

### Scenario: tip-seal in product
- **WHEN** a plan requests `tipSeal` or claims Formal L41 CLOSED
- **THEN** the policy gate SHALL return `DENY` with `TIP_SEAL_IN_PRODUCT_FORBIDDEN`

## Requirement: Governance refusals are absolute

The system SHALL DENY Fundacion targets, secret-looking fields, plain secret tokens, hard delete, mass prune, PRODUCTION_READY flip, L30–L40 reopen, tip rewrite, schema-json add, network write, GHE claims, live HTTP egress, wall-clock authority and satellite-as-seam elevation.

### Scenario: each violation has a dedicated code
- **WHEN** any single governance violation is injected
- **THEN** the gate SHALL return `DENY` with that violation's dedicated code
- **AND** no PASS receipt SHALL be sealed

## Requirement: Chain and trail integrity

The system SHALL chain `FM-RCPT-*` receipts with `prevReceiptHash` and verify the whole trail.

### Scenario: chained receipts
- **WHEN** two seam decisions are sealed in sequence
- **THEN** `verifyTrail()` SHALL report `ok: true` with `verifiedCount: 2`

### Scenario: broken chain
- **WHEN** a receipt in the trail is mutated
- **THEN** `verifyTrail()` SHALL fail closed and name the offending index
