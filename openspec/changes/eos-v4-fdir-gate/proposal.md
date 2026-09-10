# Proposal — eos-v4-fdir-gate

## Goal
Implement Ladder 10 V4: FDIR Sentinel & Graph Healing Gate in CI.
Verify dynamic resilience of `EOSSentinelDaemon`, `EOSFDIROntology`, and `EOSFDIR` against adversarial fault injections (corrupted baselines, orphan links, invalid node taxonomy) and wire automated verification into CI seam-pack.

## Context & Problem
EOS Constitution §5 mandates:
1. 24/7 heartbeat monitoring by `EOSSentinelDaemon` guarding control plane baselines via SHA-256 signatures.
2. Clinical firewalling by `EOSFDIROntology` isolating and purging orphan links (`ORPHAN_LINK_PURGED`) and invalid taxonomy nodes.

Prior to V4, `tests/eos-n6-sentinel-fdir-lock.test.js` verified module existence and surface locks, but dynamic adversarial execution (fail-closed response to corrupt graphs and drift) was not locked as a dedicated gate runner in the CI seam pack.

## Proposed Changes
1. **Adversarial Gate Runner (`scripts/ci/fdir-sentinel-adversarial-gate.js`)**:
   - Executes dynamic tests in memory/mock environments with zero side effects on repository files.
   - Tests `EOSFDIROntology.auditarYSanarGrafo()` on orphan links and taxonomy anomalies.
   - Tests `EOSSentinelDaemon` conscious heartbeat execution, ontology integration, and cryptographic ledger sealing (`SENTINEL-ONTOLOGY-SANED`).
   - Tests `EOSFDIR` fail-closed behavior on unbacked drift recovery.
   - Emits structured JSON/text report with `schema: eos.fdir_sentinel_adversarial_gate.v1` and `PRODUCTION_READY=NO`.
2. **Comprehensive Test Suite (`tests/eos-v4-fdir-sentinel-adversarial.test.js`)**:
   - Tests all adversarial recovery scenarios.
   - Verifies gate report structure, exit codes, and non-mutation.
3. **CI & Governance Wiring**:
   - Add `"test:v4": "node --test tests/eos-v4-fdir-sentinel-adversarial.test.js"` to `package.json`.
   - Wire `npm run test:v4` into `.github/workflows/ci.yml` seam-pack.
   - Document in `docs/governance/CI_CD_CONTRACT.md`.

## Non-Claims & Constraints
- `PRODUCTION_READY`: Remains **NO**.
- `Fundacion` and `App de Fuerza`: `Delta=0`.
- Complexity Budget: `AT_CEILING` (35/35 schemas) strictly preserved.
