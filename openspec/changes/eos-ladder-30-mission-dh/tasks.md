# Tasks — Mission DH Quarantine / Soft-Remove Execution Port

- [x] Receipt module (`src/core/composition/quarantine-execution-receipt.js`, `DH-RCPT-*`, nine-field seal + freeze soft-observe 06af7278 + quarantinedPaths + manifestDigest + ceilingHold)
- [x] Policy gate (`src/core/composition/quarantine-execution-policy-gate.js`, fail-closed; DG receipt linkage / hard-delete refuse / unapproved path refuse / mass-prune refuse / tip-pin / PR flip / GHE / L30 / L29 / Fundacion / Law VI refuse)
- [x] Port (`src/core/composition/quarantine-execution-port.js`, govern/evaluate/getDecision/verifyTrail; soft-observe freeze; link DG receipt; non-destructive isolation)
- [x] Hermetic tests (`tests/eos-dh-quarantine-execution-port.test.js`, ~17 happy + refuse matrix)
- [x] CRLF-safe patcher (`scripts/patch-mission-dh.mjs`)
- [x] ADR-0090 + evidence + release
- [x] OpenSpec change eos-ladder-30-mission-dh
- [x] Host `npm run test:mission-dh` + `verify:strict`
- [-] Tip-refresh / tip-pin rewrite — NOT this mission
- [-] L30 closeout — NOT this mission (DI–DJ pending)
