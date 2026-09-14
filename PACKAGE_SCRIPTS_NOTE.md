# Mission BG — package.json / slim / harness note (SPEC-0064)

Applied idempotently by `scripts/patch-mission-bg.mjs` on the host worktree.

## Scripts added / ensured

```json
"test:governed-patch-apply": "node --test tests/eos-bc-governed-patch-diff-apply-port.test.js",
"test:mission-bc": "node --test tests/eos-bc-governed-patch-diff-apply-port.test.js",
"test:multi-target-delivery": "node --test tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js",
"test:mission-bd": "node --test tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js",
"test:verification-replay": "node --test tests/eos-be-verification-replay-golden-receipt-port.test.js",
"test:mission-be": "node --test tests/eos-be-verification-replay-golden-receipt-port.test.js",
"test:local-rc-packaging": "node --test tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js",
"test:mission-bf": "node --test tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js",
"test:mission-bg": "node --test tests/eos-bg-ladder19-seam-pack.test.js",
"test:bg19": "node --test tests/eos-bg-ladder19-seam-pack.test.js",
"test:l19": "node --test tests/eos-bg-ladder19-seam-pack.test.js",
"test:ladder19-pack": "npm run test:governed-patch-apply && npm run test:multi-target-delivery && npm run test:verification-replay && npm run test:local-rc-packaging && npm run test:mission-bg"
```

`test:native-suite-pack` is extended with the four L19 CI scripts when present.

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bg-ladder19-seam-pack.test.js',
```

CRLF-safe insert: patcher uses `[\s\S]` + `[^\r\n]*` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

## Box harness self-verify (NO host clone)

Box tests are hermetic against `_fixtures/` stubs. Host bootstrap patches
**real** `ci.yml` / `package.json`. Do not conflate.

```bash
rm -rf /workspace/mission-bg-harness
mkdir -p /workspace/mission-bg-harness/{.github/workflows,scripts/ci,docs/adrs,docs/evidence,docs/governance,docs/releases,tests,openspec/changes}
PAYLOAD=/workspace/Eos-mission-bg-payload
# stubs → harness paths
cp $PAYLOAD/_fixtures/ci.yml.stub /workspace/mission-bg-harness/.github/workflows/ci.yml
cp $PAYLOAD/_fixtures/package.json.stub /workspace/mission-bg-harness/package.json
cp $PAYLOAD/_fixtures/test-runner.js.stub /workspace/mission-bg-harness/scripts/test-runner.js
cp $PAYLOAD/_fixtures/CI_CD_CONTRACT.md.stub /workspace/mission-bg-harness/docs/governance/CI_CD_CONTRACT.md
cp $PAYLOAD/_fixtures/assert-gha-contract.js.stub /workspace/mission-bg-harness/scripts/ci/assert-gha-contract.js
# ship payload artifacts
cp $PAYLOAD/scripts/patch-mission-bg.mjs /workspace/mission-bg-harness/scripts/
cp $PAYLOAD/tests/eos-bg-ladder19-seam-pack.test.js /workspace/mission-bg-harness/tests/
cp $PAYLOAD/docs/releases/*.md /workspace/mission-bg-harness/docs/releases/
cp $PAYLOAD/docs/governance/CI_CD_CONTRACT.ladder19-fragment.md /workspace/mission-bg-harness/docs/governance/
cp $PAYLOAD/docs/adrs/*.md /workspace/mission-bg-harness/docs/adrs/
cp $PAYLOAD/docs/evidence/*.md /workspace/mission-bg-harness/docs/evidence/
cp -a $PAYLOAD/openspec/changes/eos-mission-bg-ladder19-closeout-seam-pack /workspace/mission-bg-harness/openspec/changes/
cd /workspace/mission-bg-harness
node scripts/patch-mission-bg.mjs
node --test tests/eos-bg-ladder19-seam-pack.test.js
# Target: N PASS / 0 FAIL (BG1–BG18)
```

## Envelope copy (bootstrap)

`MISSION_BG_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md`
- `docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md`
- `docs/governance/CI_CD_CONTRACT.ladder19-fragment.md`
- `docs/adrs/ADR-0022-mission-bg-ladder19-closeout-seam-pack.md`
- `docs/evidence/EOS_MISSION_BG_EVIDENCE_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only closeout; does not flip PRODUCTION_READY.

## CI fail-closed notes

- seam-pack runs the 4 L19 satellites with **no** `continue-on-error`
- **no** soak steps
- Fundacion freeze (delta 0) retained after satellite runs
- PRODUCTION_READY=NO forever this mission
- L17 CLOSED — never reopen
- L18 CLOSED — never reopen
- L19 CLOSED_FOR_LOCAL_GOVERNED_USE after BG — never reopen L19 after closeout
- No rewrite of BC/BD/BE/BF modules — compose via CI scripts only
- Tip honesty ritual deferred to post-BG tip refresh
