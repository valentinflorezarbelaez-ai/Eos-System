# EOS N2 EVD scripts+bin seal - 2026-09-08

**Branch:** cursor/eos-n2-evd-scripts-bin-seal
**Base main tip:** 07ddc18d779d5fb511a12cc3be57269e6c1d793b (N1 #47 merged)
**Scope:** N2 ONLY (Ladder 3 H2) - EOS-only EVD custody audit beyond src/
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)

## Gap (H2 / DoD N2)

auditCanonicalEvdWritePaths previously walked src/ only. Canonical docs/evidence writers under scripts/ and bin/ could raw-write and skip sealEvd / EvidenceCustody while verify:strict still PASSED.

## Inventory (pre-fix)

| Path | Role | Disposition |
| --- | --- | --- |
| scripts/run-engineering-loop.js | raw EVD-ENGINEERING-LOOP-LIVE-001 | ROUTED via sealEvd |
| bin/eos-orchestrator.js generateEvidence | raw EVIDENCE_DIR docs/evidence | ROUTED via sealEvd |
| scripts/exam-clean-clone.js | raw EVD-FINAL-READINESS-CLEAN-CLONE | ROUTED via sealEvd (honest extra) |
| scripts/exams/exam2-bypass-battery.js | report subdir without EVD id write | OUT OF SCOPE for EVD detector |
| scripts/hooks/evidence-logger.js | EOS-MISSION-CONTROL stream | OUT OF SCOPE |
| mission-local | .missions evidence | OUT OF SCOPE (G7) |

## Fix design

1. Extend auditCanonicalEvdWritePaths scan roots to src + scripts + bin (EVD_AUDIT_SCAN_ROOTS)
2. Broaden sourceWritesCanonicalEvd for L3-suspect patterns
3. Route known raw writers through sealEvd SSOT (no parallel ledger)
4. Synthetic fixtures under scripts/ and bin/ are rejected as EVD_BYPASS_WRITE
5. Mission-local still excluded

## Deliverables

- src/core/sdd/evd-seal-path.js -- N2 scan roots + detector
- bin/eos-orchestrator.js and scripts writers routed
- This release note + freeze gate N2 note
- tests/eos-n2-evd-scripts-bin-seal.test.js and package script test:n2

## Verify

npm run test:n2
npm run test:g7
npm run verify:strict

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No N3+ in this branch.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.
