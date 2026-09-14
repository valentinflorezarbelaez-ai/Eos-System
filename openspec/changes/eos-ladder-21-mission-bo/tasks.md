# Tasks — Mission BO (SPEC-0072)

- [x] Layer-0 receipt module (`two-key-consensus-receipt.js`)
- [x] Layer-0 policy gate (`two-key-consensus-policy-gate.js`)
- [x] Layer-0 gate facade (`multi-agent-consensus-gate.js`)
- [x] Hermetic tests (~16) covering happy / self-verify / REJECTED / missing evidence / tamper / chain / Law VI / NON-CLAIM
- [x] CRLF-safe patcher (`scripts/patch-mission-bo.mjs`)
- [x] OpenSpec change folder + ADR-0032 + evidence + release
- [x] BOX_GREEN / PACKAGE_SCRIPTS_NOTE / MISSION_BO_BOOTSTRAP.ps1
- [x] Pack `/workspace/Eos-mission-bo-payload.tgz`
- [ ] Host: bootstrap → patcher → test:mission-bo → slim≤145 → verify:strict → commit → push
