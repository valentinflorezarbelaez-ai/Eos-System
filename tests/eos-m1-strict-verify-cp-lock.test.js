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
const repoRoot = path.resolve(__dirname, '..');

describe('M1 strict-verify fusion control-plane lock', () => {
  it('exports the required fusion CP path set', () => {
    assert.ok(FUSION_CP_REQUIRED_PATHS.length >= 8);
    assert.ok(FUSION_CP_REQUIRED_PATHS.includes('src/core/write-barrier/index.js'));
    assert.ok(FUSION_CP_REQUIRED_PATHS.includes('src/core/mcp/mission-loop-runtime.js'));
    assert.ok(FUSION_CP_REQUIRED_PATHS.includes('config/mcp/eos-mcp.ssot.json'));
    assert.ok(FUSION_CP_REQUIRED_PATHS.includes('src/core/adversarial/long-run-gameday-harness.js'));
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

  it('PASS: auditFusionControlPlane on live repo tip', () => {
    const result = auditFusionControlPlane(repoRoot);
    assert.equal(result.ok, true);
    assert.equal(result.failures.length, 0);
    assert.ok(result.checks.some((c) => c.type === 'fusion-cp-write-barrier'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-cp-mission-loop'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-cp-mcp-ssot'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-cp-gameday'));
  });

  it('DENY fail-closed when a required fusion path is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-m1-cp-'));
    try {
      const result = auditFusionControlPlane(tmp);
      assert.equal(result.ok, false);
      assert.ok(result.failures.length > 0);
      assert.ok(result.failures.every((f) => f.type === 'fusion-cp-lock'));
      assert.ok(result.failures.some((f) => f.message.includes('missing')));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('verify-eos.js wires fusion lock import + REQUIRED_PATHS spread + smoke', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'scripts', 'verify-eos.js'), 'utf8');
    assert.match(src, /fusion-cp-lock/);
    assert.match(src, /\.\.\.FUSION_CP_REQUIRED_PATHS/);
    assert.match(src, /auditFusionControlPlane\(rootDir\)/);
    assert.match(src, /3g4\. M1 Fusion control-plane lock/);
  });

  it('package.json exposes test:m1', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['test:m1']);
    assert.match(pkg.scripts['test:m1'], /eos-m1-strict-verify-cp-lock\.test\.js/);
  });
});