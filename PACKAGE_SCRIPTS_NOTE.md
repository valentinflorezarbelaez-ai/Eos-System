# Mission BL — package.json / slim / harness note (SPEC-0069)

Applied idempotently by `scripts/patch-mission-bl.mjs` on the host worktree.

## Scripts added / ensured

```json
"test:mission-bh": "node --test tests/eos-bh-mission-lifecycle-state-machine.test.js",
"test:mission-lifecycle": "node --test tests/eos-bh-mission-lifecycle-state-machine.test.js",
"test:mission-bi": "node --test tests/eos-bi-cross-session-continuity-replay-fabric.test.js",
"test:cross-session-continuity": "node --test tests/eos-bi-cross-session-continuity-replay-fabric.test.js",
"test:mission-bj": "node --test tests/eos-bj-operator-dashboard-hud-fabric.test.js",
"test:operator-dashboard-hud": "node --test tests/eos-bj-operator-dashboard-hud-fabric.test.js",
"test:mission-bk": "node --test tests/eos-bk-governed-external-write-orchestrator.test.js",
"test:governed-external-write": "node --test tests/eos-bk-governed-external-write-orchestrator.test.js",
"test:mission-bl": "node --test tests/eos-bl-ladder20-seam-pack.test.js",
"test:bl20": "node --test tests/eos-bl-ladder20-seam-pack.test.js",
"test:l20": "node --test tests/eos-bl-ladder20-seam-pack.test.js",
"test:ladder20-pack": "npm run test:mission-bh && npm run test:mission-bi && npm run test:mission-bj && npm run test:mission-bk && npm run test:mission-bl"
```

`test:native-suite-pack` is extended with the four L20 CI scripts when present.

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bl-ladder20-seam-pack.test.js',
```

CRLF-safe insert: patcher uses `[\s\S]` + `[^\r\n]*` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

## Box harness self-verify (NO host clone)

Box tests are hermetic against `_fixtures/` stubs. Host bootstrap patches
**real** `ci.yml` / `package.json`. Do not conflate.

```bash
rm -rf /workspace/mission-bl-harness
mkdir -p /workspace/mission-bl-harness/{.github/workflows,scripts/ci,docs/adrs,docs/evidence,docs/governance,docs/releases,tests,openspec/changes}
PAYLOAD=/workspace/Eos-mission-bl-payload
# stubs → harness paths
cp $PAYLOAD/_fixtures/ci.yml.stub /workspace/mission-bl-harness/.github/workflows/ci.yml
cp $PAYLOAD/_fixtures/package.json.stub /workspace/mission-bl-harness/package.json
cp $PAYLOAD/_fixtures/test-runner.js.stub /workspace/mission-bl-harness/scripts/test-runner.js
cp $PAYLOAD/_fixtures/CI_CD_CONTRACT.md.stub /workspace/mission-bl-harness/docs/governance/CI_CD_CONTRACT.md
cp $PAYLOAD/_fixtures/assert-gha-contract.js.stub /workspace/mission-bl-harness/scripts/ci/assert-gha-contract.js
# satellite stubs for BL19 receipt integrity
cp $PAYLOAD/_fixtures/satellite-stubs/*.js /workspace/mission-bl-harness/tests/
# ship payload artifacts
cp $PAYLOAD/scripts/patch-mission-bl.mjs /workspace/mission-bl-harness/scripts/
cp $PAYLOAD/tests/eos-bl-ladder20-seam-pack.test.js /workspace/mission-bl-harness/tests/
cp $PAYLOAD/docs/releases/*.md /workspace/mission-bl-harness/docs/releases/
cp $PAYLOAD/docs/governance/CI_CD_CONTRACT.ladder20-fragment.md /workspace/mission-bl-harness/docs/governance/
cp $PAYLOAD/docs/adrs/*.md /workspace/mission-bl-harness/docs/adrs/
cp $PAYLOAD/docs/evidence/*.md /workspace/mission-bl-harness/docs/evidence/
cp -a $PAYLOAD/openspec/changes/eos-ladder-20-mission-bl /workspace/mission-bl-harness/openspec/changes/
cd /workspace/mission-bl-harness
node scripts/patch-mission-bl.mjs
node --test tests/eos-bl-ladder20-seam-pack.test.js
# Target: N PASS / 0 FAIL (BL1–BL20)
```

Honesty: `verify:strict` is **not** measured on box without full worktree.

## Envelope copy (bootstrap)

`MISSION_BL_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/releases/EOS_LADDER_20_CLOSEOUT_2026-09-14.md`
- `docs/releases/EOS_MISSION_BL_LADDER20_SEAM_PACK_2026-09-14.md`
- `docs/governance/CI_CD_CONTRACT.ladder20-fragment.md`
- `docs/adrs/ADR-0028-mission-bl-ladder20-closeout-seam-pack.md`
- `docs/evidence/EOS_MISSION_BL_EVIDENCE_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only closeout; does not flip PRODUCTION_READY.

## CI fail-closed notes

- seam-pack runs the 4 L20 satellites with **no** `continue-on-error`
- **no** soak steps
- Fundacion freeze (delta 0) retained after satellite runs
- PRODUCTION_READY=NO forever this mission
- FUNDACION_ALWAYS_DENY
- L17 CLOSED — never reopen
- L18 CLOSED — never reopen
- L19 CLOSED — never reopen
- L20 CLOSED_FOR_LOCAL_GOVERNED_USE after BL — never reopen L20 after closeout
- No rewrite of BH/BI/BJ/BK modules — compose via CI scripts only
- Tip honesty ritual deferred to post-BL tip refresh
- Receipt integrity: BH-RCPT-* / BI-RCPT-* / BJ-RCPT-* / BK-RCPT-*
