import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditFusionControlPlane,
  FUSION_CP_REQUIRED_PATHS
} from '../scripts/lib/fusion-cp-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function loadHud() {
  return import('../src/core/observability/operator-hud.js');
}

describe('N4 HUD + fusion-cp post-G7/M6 lock', () => {
  it('VERIFY_SURFACE_TYPES includes evd-seal-path and N4 fusion smoke types (exact verify strings)', async () => {
    const hud = await loadHud();
    for (const type of [
      'evd-seal-path',
      'fusion-cp-coherence',
      'fusion-cp-pre-push',
      'evidence-custody',
      'engram-contract',
      'fusion-cp-lock',
      'fusion-cp-gameday'
    ]) {
      assert.ok(hud.VERIFY_SURFACE_TYPES.includes(type), `missing surface type ${type}`);
    }
    // Guard: do not invent non-emitted names
    assert.equal(hud.VERIFY_SURFACE_TYPES.includes('EvdSealPath'), false);
    assert.equal(hud.VERIFY_SURFACE_TYPES.includes('fusion-cp'), false);
  });

  it('HUD summarizes evd-seal-path from fixture verify JSON', async () => {
    const hud = await loadHud();
    const report = {
      status: 'PASS',
      strictMode: true,
      checks: [
        { path: 'EvdSealPath', status: 'VERIFIED', type: 'evd-seal-path' },
        { path: 'MissionOsCoherence', status: 'VERIFIED', type: 'fusion-cp-coherence' },
        { path: 'PrePushHook', status: 'VERIFIED', type: 'fusion-cp-pre-push' }
      ],
      failures: [],
      warnings: []
    };
    const surfaces = hud.summarizeVerifySurfaces(report);
    assert.equal(surfaces['evd-seal-path'].status, 'VERIFIED');
    assert.equal(surfaces['evd-seal-path'].passed, 1);
    assert.equal(surfaces['fusion-cp-coherence'].status, 'VERIFIED');
    assert.equal(surfaces['fusion-cp-pre-push'].status, 'VERIFIED');
  });

  it('FUSION_CP_REQUIRED_PATHS locks ADR-0015/0016 + coherence + pre-push', () => {
    assert.ok(
      FUSION_CP_REQUIRED_PATHS.includes(
        'docs/architecture/adrs/ADR-0015-evidence-custody-canonical-ledger.md'
      )
    );
    assert.ok(
      FUSION_CP_REQUIRED_PATHS.includes(
        'docs/architecture/adrs/ADR-0016-engram-local-ssot-contract.md'
      )
    );
    assert.ok(
      FUSION_CP_REQUIRED_PATHS.includes('src/core/observability/mission-os-coherence.js')
    );
    assert.ok(FUSION_CP_REQUIRED_PATHS.includes('scripts/pre-push-hook.js'));
    // Retain prior M1 locks
    assert.ok(
      FUSION_CP_REQUIRED_PATHS.includes(
        'docs/architecture/adrs/ADR-0013-write-barrier-sandbox.md'
      )
    );
    assert.ok(
      FUSION_CP_REQUIRED_PATHS.includes(
        'docs/architecture/adrs/ADR-0014-mission-loop-mcp-enforcement.md'
      )
    );
  });

  it('PASS: auditFusionControlPlane on live tip includes N4 smoke types', () => {
    const result = auditFusionControlPlane(rootDir);
    assert.equal(result.ok, true, JSON.stringify(result.failures));
    assert.equal(result.failures.length, 0);
    assert.ok(result.checks.some((c) => c.type === 'fusion-cp-coherence'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-cp-pre-push'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-cp-write-barrier'));
    assert.ok(
      result.checks.some(
        (c) =>
          c.type === 'fusion-cp-lock' &&
          c.path.includes('ADR-0015-evidence-custody-canonical-ledger.md')
      )
    );
    assert.ok(
      result.checks.some(
        (c) =>
          c.type === 'fusion-cp-lock' &&
          c.path.includes('ADR-0016-engram-local-ssot-contract.md')
      )
    );
    assert.ok(
      result.checks.some(
        (c) =>
          c.type === 'fusion-cp-lock' &&
          c.path.includes('mission-os-coherence.js')
      )
    );
    assert.ok(
      result.checks.some(
        (c) => c.type === 'fusion-cp-lock' && c.path.includes('pre-push-hook.js')
      )
    );
  });

  it('DENY fail-closed when ADR-0015 path missing from required set', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n4-cp-'));
    try {
      const result = auditFusionControlPlane(tmp);
      assert.equal(result.ok, false);
      assert.ok(result.failures.some((f) => f.path.includes('ADR-0015')));
      assert.ok(result.failures.some((f) => f.path.includes('ADR-0016')));
      assert.ok(result.failures.some((f) => f.path.includes('mission-os-coherence.js')));
      assert.ok(result.failures.some((f) => f.path.includes('pre-push-hook.js')));
      assert.ok(result.failures.every((f) => f.type === 'fusion-cp-lock'));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('verify-eos REQUIRED_PATHS + fusion audit wires N4 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    assert.match(src, /\.\.\.FUSION_CP_REQUIRED_PATHS/);
    assert.match(src, /auditFusionControlPlane\(rootDir\)/);
    assert.match(src, /type: 'evd-seal-path'/);
    assert.match(src, /tests\/eos-n4-hud-fusion-cp-lock\.test\.js/);
    assert.match(src, /EOS_N4_HUD_FUSION_CP_POST_G7_2026-09-08\.md/);
  });

  it('package.json exposes test:n4', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['test:n4'], 'node --test tests/eos-n4-hud-fusion-cp-lock.test.js');
  });

  it('release note exists and asserts PRODUCTION_READY=NO', () => {
    const note = fs.readFileSync(
      path.join(rootDir, 'docs', 'releases', 'EOS_N4_HUD_FUSION_CP_POST_G7_2026-09-08.md'),
      'utf8'
    );
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-n4-hud-fusion-cp-lock/);
    assert.match(note, /evd-seal-path/);
    assert.match(note, /ADR-0015/);
    assert.match(note, /ADR-0016/);
    assert.match(note, /mission-os-coherence/);
    assert.match(note, /pre-push-hook/);
  });
});
