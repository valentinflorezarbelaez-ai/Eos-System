# Delta — ladder7-tip-refresh

## ADDED Requirements

### Requirement: Tip SSOT triad pinned post L7 audit

The system SHALL pin freeze `main_tip`, matrix `evaluated_tip`, and `test:m4` EXPECTED_TIP to the same full SHA of main after Ladder 7 audit merge #74 (`1d1b224cb41d32aa7de6519af7a7a48b5968f87f`).

#### Scenario: test:m4 green after tip refresh

- GIVEN freeze and matrix declare the S1 pinned tip
- WHEN `npm run test:m4` runs
- THEN all tip SSOT assertions PASS and PRODUCTION_READY remains NO

### Requirement: Matrix rows for R1–R6 + L7

The capability matrix SHALL include COMPLETE/MEASURED rows for Ladder6 tip refresh (R1), CI seam-pack Q-tests (R2), Doctor/fusion-light L5 (R3), AT_CEILING schema gate (R4), Deferred writers Choice B (R5), Complexity verify closeout (R6), and Ladder 7 LIDR harness adoption + audit.

#### Scenario: needles present

- GIVEN the S1 tip refresh commit
- WHEN test:m4 scans RELEASE_CAPABILITY_MATRIX.md
- THEN each R1–R6 and L7 needle is present

### Requirement: Honesty of L6 close vs L7 pin

Freeze historical notes SHALL document both L6 close tip `e431e2c` and prior R1 pin `4753240` separately from the S1 pin `1d1b224`.

#### Scenario: no silent tip rewrite claim

- GIVEN an operator reads freeze historical notes
- WHEN comparing tips
- THEN L6 close, prior R1 pin, and S1 pin are distinguishable
