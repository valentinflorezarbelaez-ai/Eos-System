# Design — Tip Refresh post-#309

Mirror post-audit tip refresh pattern (post-#297 L21 audit tip refresh):
- Update freeze `main_tip` to `e74d3fcb56995a63e1202f28175f67ac4f3959d3`
- Update matrix `evaluated_tip` to `e74d3fcb56995a63e1202f28175f67ac4f3959d3`
- Update `scripts/lib/dirty-defer-triage-lock.js`
- Update `tests/eos-m4-release-ssot-tip.test.js`
- Publish `docs/releases/EOS_TIP_REFRESH_POST_309_2026-09-14.md`
- Assert L17–L21 CLOSED (never reopen) and Ladder 22 OPEN (BR–BV pending)
