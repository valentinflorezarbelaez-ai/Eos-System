# Tasks — Mission BD (SPEC-0061)

- [x] Implement `src/core/delivery/` BD modules (facade, policy-gate, receipt, boundary)
- [x] Hermetic tests BD1–BD18 (`tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js`)
- [x] Patcher `scripts/patch-mission-bd.mjs` (scripts + SLIM exclude, CRLF-safe)
- [x] OpenSpec change folder + release doc + PACKAGE_SCRIPTS_NOTE + BOX_GREEN
- [x] Bootstrap `MISSION_BD_BOOTSTRAP.ps1` (tip StartsWith `cc3b3bb`, WARN-continue)
- [x] Law VI MODULE_DIR CLEAN; `node --check`; pack `.tgz`
- [ ] Host: run bootstrap → patch → tests → slim≤145 → verify:strict → commit → push
