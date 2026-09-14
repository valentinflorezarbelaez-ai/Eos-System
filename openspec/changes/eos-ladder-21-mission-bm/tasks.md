# Tasks — Mission BM (SPEC-0070)

- [x] Layer-0 receipt module (`agent-action-receipt.js`)
- [x] Layer-0 policy gate (`agent-identity-policy-gate.js`)
- [x] Layer-0 attestation port facade (`agent-identity-attestation-port.js`)
- [x] Hermetic tests (~16) covering happy / DENY / chain / Law VI / NON-CLAIM
- [x] CRLF-safe patcher (`scripts/patch-mission-bm.mjs`)
- [x] OpenSpec change folder + ADR-0030 + evidence + release
- [x] BOX_GREEN / PACKAGE_SCRIPTS_NOTE / MISSION_BM_BOOTSTRAP.ps1
- [x] Pack `/workspace/Eos-mission-bm-payload.tgz`
- [ ] Host: bootstrap → patcher → test:mission-bm → slim≤145 → verify:strict → commit → push
