# EOS G7 EVD custody seal path - 2026-09-08

Branch: cursor/eos-g7-evd-custody-seal-path
Base main tip: 97b1965
PRODUCTION_READY: NO
Fundacion: Delta=0
Merge: NO

## Gap
EVD writers outside ContractEvidenceSealer could skip EvidenceCustody.
After ROI4 sealer is wired; other docs/evidence writers could skip chaining.

## Inventory
- contract-evidence-sealer.js: canonical writer (ROI4 wired)
- kernel.js generarReciboEvidencia: BYPASS (fixed via sealEvd)
- evidence-custody.js: ROI4 facade
- mcp-mission-bridge / governed-task-executor: mission-local OUT OF SCOPE
- HUD/RTM/dossier/JOCC/onboarder: readers

## Fix design
1. sealEvd SSOT in src/core/sdd/evd-seal-path.js
2. non-dryRun write = file + EvidenceCustody.sealEvdRecord
3. no custody = EVD_CUSTODY_REQUIRED fail-closed
4. denyEvdBypass = EVD_BYPASS_DENY
5. auditCanonicalEvdWritePaths static allowlist (SSOT only)
6. sealer + kernel routed through sealEvd
7. no parallel ledger (reuse ROI4)

## Deliverables
- src/core/sdd/evd-seal-path.js
- Sealer + kernel routed through SSOT
- tests/eos-g7-evd-custody-seal-path.test.js
## Non-claims
- PRODUCTION_READY=NO
- Fundacion Delta=0
- DEFER dirty; no merge without PO

## Verify
npm run test:g7
npm run verify:strict


- project-pipeline-runner.js #emitEvidence: BYPASS (fixed via sealEvd)
- mcp-server.js docs/evidence write: BYPASS (fixed via sealEvd)

