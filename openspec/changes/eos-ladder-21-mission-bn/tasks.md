# Tasks — Mission BN (SPEC-0071)

- [x] Layer-0 receipt module (`sentinel-heartbeat-receipt.js`)
- [x] Layer-0 policy gate (`sentinel-integrity-policy-gate.js`)
- [x] Layer-0 daemon facade (`continuous-integrity-sentinel-daemon.js`)
- [x] Hermetic tests (~16) covering happy / drift / quarantine / start-stop / chain / Law VI / NON-CLAIM
- [x] CRLF-safe patcher (`scripts/patch-mission-bn.mjs`)
- [x] OpenSpec change folder + ADR-0031 + evidence + release
- [x] BOX_GREEN / PACKAGE_SCRIPTS_NOTE / MISSION_BN_BOOTSTRAP.ps1
- [x] Pack `/workspace/Eos-mission-bn-payload.tgz`
- [ ] Host: bootstrap → patcher → test:mission-bn → slim≤145 → verify:strict → commit → push
