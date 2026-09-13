# Tasks — Mission BC (SPEC-0060)

- [x] Implement `src/core/delivery/` modules (facade, policy-gate, receipt, boundary)
- [x] Hermetic tests BC1–BC18 (`tests/eos-bc-governed-patch-diff-apply-port.test.js`)
- [x] Patcher `scripts/patch-mission-bc.mjs` (scripts + SLIM exclude, CRLF-safe)
- [x] OpenSpec change folder + release doc + PACKAGE_SCRIPTS_NOTE + BOX_GREEN
- [x] Bootstrap `MISSION_BC_BOOTSTRAP.ps1` (tip StartsWith `6685eeb`, WARN-continue)
- [x] Law VI MODULE_DIR CLEAN; `node --check`; pack `.tgz`
- [ ] Host: run bootstrap → patch → tests → slim≤145 → verify:strict → commit → push
