# Proposal — Mission DP: Sovereign Vertical Slice & Screaming Architecture Port (SPEC-0126)

## 1. Problem Statement

Complex codebases often suffer from anemic domain structures and technical groupings that obscure business meaning. Inspired by Gentleman Programming and LIDR Academy, EOS requires screaming architecture where:
- Code structure directly reflects business features and use cases.
- Cross-slice leakage is prevented fail-closed.
- Slices communicate only via public ports.

## 2. Proposed Changes

- Implement Layer-0 receipt generator `src/core/composition/vertical-slice-receipt.js` producing sealed canonical 9-field `DP-RCPT-*` receipts.
- Implement Layer-0 policy gate `src/core/composition/vertical-slice-policy-gate.js` enforcing zero cross-slice leakage, pure Node.js built-ins in Layer 0, Law VI secret scanning, and Fundacion write barrier (`FUNDACION_ALWAYS_DENY`).
- Implement Layer-0 port `src/core/composition/vertical-slice-port.js` with cryptographic trail verification.
- Implement test suite `tests/eos-dp-vertical-slice-port.test.js` with 17 hermetic tests.
- Register `test:mission-dp` and `test:vertical-slice` in `package.json`.
- Exclude test suite from slim runner in `scripts/test-runner.js`.

## 3. Invariants & Non-Claims

- `PRODUCTION_READY: NO`.
- `Fundacion Δ=0`.
- Law VI: zero plain secrets.
- Schemas strictly held at `AT_CEILING 35/35`.
