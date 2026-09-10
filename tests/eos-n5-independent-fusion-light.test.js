import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  auditFusionLight,
  fusionLightDisabledReport,
  FUSION_LIGHT_REQUIRED_PATHS,
  FUSION_LIGHT_NON_CLAIMS,
  FUSION_LIGHT_PATH_IDS
} from '../scripts/lib/independent-fusion-light.js';
import { IndependentVerificationHarness } from '../scripts/engine/independent-verification-harness.js';
import { POST_FUSION_CRITICAL_PATHS } from '../src/core/runtime/operator-doctor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const harnessScript = path.join(rootDir, 'scripts/engine/independent-verification-harness.js');

function spawnIndependentCli(args) {
  return spawnSync(process.execPath, [harnessScript, '--verify-independent', ...args], {
    cwd: rootDir,
    encoding: 'utf8'
  });
}

function parseCliPayload(stdout) {
  const start = String(stdout).search(/[{[]/);
  assert.ok(start >= 0, `CLI did not emit JSON: ${stdout}`);
  return JSON.parse(String(stdout).slice(start));
}

describe('N5 independent verifier fusion-light', () => {
  it('FUSION_LIGHT_REQUIRED_PATHS reuses doctor custody/engram/fusion-cp/evd-seal + Q3 L4 + R3 L5 + T3 L7 + U3 T4–T8', () => {
    assert.deepEqual([...FUSION_LIGHT_PATH_IDS], ['FUSION_CP', 'CUSTODY', 'ENGRAM', 'EVD_SEAL', 'HOOKS_INSTALL', 'MCP_CATALOG', 'MISSION_LOCAL_EVD', 'MISSION_ARTIFACT_WRITE', 'P6_INVENTORY_LOCK', 'CONTEXT_PACK', 'LOOP_ENGINEERING', 'WORKTREE_POLICY', 'SPECBOOT_CYCLE', 'MCP_TOOL_KEEP', 'MODEL_ROUTING_RATCHET', 'MISSION_OS_EVD', 'KEEP_PO_PRUNE_HOLD', 'COMPLEXITY_CEILING_HOLD', 'AGY_WORKSTATION', 'DIRTY_DEFER_TRIAGE']);
    const doctorRels = POST_FUSION_CRITICAL_PATHS
      .filter((p) => FUSION_LIGHT_PATH_IDS.includes(p.id))
      .map((p) => p.rel);
    assert.deepEqual([...FUSION_LIGHT_REQUIRED_PATHS], doctorRels);
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('src/core/sdd/evidence-custody.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('src/core/memory/engram-contract.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('scripts/lib/fusion-cp-lock.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('src/core/sdd/evd-seal-path.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('scripts/lib/hooks-install-smoke.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('scripts/lib/mcp-catalog-lock.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('tests/eos-p4-mission-local-evd-seal.test.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('src/core/runtime/mission-artifact-write.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('scripts/lib/p6-inventory-lock.js'));
  });

  it('PASS: auditFusionLight on live tip verifies path + light import types', () => {
    const result = auditFusionLight(rootDir);
    assert.equal(result.ok, true, JSON.stringify(result.failures));
    assert.equal(result.enabled, true);
    assert.equal(result.mode, 'fusion-light');
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-path'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-custody'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-engram'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-fusion-cp'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-evd-seal'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-hooks-install'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-mcp-catalog'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-mission-local'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-mission-artifact'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-p6-inventory'));
    assert.ok(result.nonClaims.length >= FUSION_LIGHT_NON_CLAIMS.length);
    assert.ok(result.nonClaims.some((n) => /NOT verify:strict/i.test(n)));
  });

  it('DENY fail-closed when fusion-light paths missing from control-plane root', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n5-fl-'));
    try {
      const result = auditFusionLight(tmp);
      assert.equal(result.ok, false);
      assert.ok(result.failures.every((f) => f.type === 'fusion-light-path'));
      assert.ok(result.failures.some((f) => f.path.includes('evidence-custody.js')));
      assert.ok(result.failures.some((f) => f.path.includes('engram-contract.js')));
      assert.ok(result.failures.some((f) => f.path.includes('fusion-cp-lock.js')));
      assert.ok(result.failures.some((f) => f.path.includes('evd-seal-path.js')));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('harness default fusionLight ON fails closed when control-plane missing pack', () => {
    const harness = new IndependentVerificationHarness();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n5-h-'));
    try {
      const res = harness.runIndependentValidationSuite({
        controlPlaneRoot: tmp,
        fusionLight: true
      });
      assert.equal(res.fusionLight.enabled, true);
      assert.equal(res.fusionLight.ok, false);
      assert.equal(res.harnessPassed, false);
      assert.ok(Array.isArray(res.nonClaims));
      assert.ok(res.nonClaims.some((n) => /NOT verify:strict/i.test(n)));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('harness live tip passes with fusionLight section + NON-CLAIM residual', () => {
    const harness = new IndependentVerificationHarness();
    const res = harness.runIndependentValidationSuite({ fusionLight: true });
    assert.equal(res.harnessPassed, true, JSON.stringify(res.fusionLight?.failures));
    assert.equal(res.fusionLight.ok, true);
    assert.equal(res.fusionLight.enabled, true);
    assert.match(res.version, /n5-fusion-light/);
    assert.ok(res.nonClaims.some((n) => /NOT production readiness/i.test(n)));
  });

  it('--no-fusion-light emits explicit NON-CLAIM and does not light-check pack', () => {
    const disabled = fusionLightDisabledReport();
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.ok, true);
    assert.ok(disabled.nonClaims.some((n) => /DISABLED/i.test(n)));

    const harness = new IndependentVerificationHarness();
    const res = harness.runIndependentValidationSuite({ fusionLight: false });
    assert.equal(res.fusionLight.enabled, false);
    assert.equal(res.fusionLight.ok, true);
    assert.equal(res.harnessPassed, true);
    assert.ok(res.nonClaims.some((n) => /DISABLED/i.test(n)));
  });

  it('CLI verify:independent default (fusion-light ON) exits 0 and reports pack', () => {
    const result = spawnIndependentCli([]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = parseCliPayload(result.stdout);
    assert.equal(payload.harnessPassed, true);
    assert.equal(payload.fusionLight.enabled, true);
    assert.equal(payload.fusionLight.ok, true);
    assert.ok(payload.fusionLight.checks.some((c) => c.type === 'fusion-light-custody'));
  });

  it('CLI --no-fusion-light exits 0 with DISABLED NON-CLAIM', () => {
    const result = spawnIndependentCli(['--no-fusion-light']);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = parseCliPayload(result.stdout);
    assert.equal(payload.fusionLight.enabled, false);
    assert.ok(payload.nonClaims.some((n) => /DISABLED/i.test(n)));
  });

  it('CLI fails closed when --control-plane-root lacks fusion pack', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n5-cli-'));
    try {
      const result = spawnIndependentCli(['--control-plane-root', tmp]);
      assert.equal(result.status, 1, result.stderr || result.stdout);
      const payload = parseCliPayload(result.stdout);
      assert.equal(payload.harnessPassed, false);
      assert.equal(payload.fusionLight.ok, false);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('package.json exposes test:n5; verify:independent entry unchanged', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['test:n5'], 'node --test tests/eos-n5-independent-fusion-light.test.js');
    assert.match(pkg.scripts['verify:independent'], /independent-verification-harness\.js/);
  });

  it('verify-eos REQUIRED_PATHS + docs lock N5 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    assert.match(src, /scripts\/lib\/independent-fusion-light\.js/);
    assert.match(src, /tests\/eos-n5-independent-fusion-light\.test\.js/);
    assert.match(src, /EOS_N5_INDEPENDENT_VERIFIER_FUSION_LIGHT_2026-09-08\.md/);
  });

  it('release note exists and asserts PRODUCTION_READY=NO + fail-closed design', () => {
    const note = fs.readFileSync(
      path.join(rootDir, 'docs', 'releases', 'EOS_N5_INDEPENDENT_VERIFIER_FUSION_LIGHT_2026-09-08.md'),
      'utf8'
    );
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-n5-independent-fusion-light/);
    assert.match(note, /fusion-light/);
    assert.match(note, /fail-closed/i);
    assert.match(note, /NON-CLAIM/);
    assert.match(note, /EvidenceCustody|evidence-custody/);
  });

  it('independent standard documents fusion-light + NON-CLAIM (docs match behavior)', () => {
    const std = fs.readFileSync(
      path.join(rootDir, 'docs', 'governance', 'EOS_INDEPENDENT_EMPIRICAL_VALIDATION_STANDARD.md'),
      'utf8'
    );
    assert.match(std, /fusion-light/i);
    assert.match(std, /NON-CLAIM/);
    assert.match(std, /evidence-custody|EvidenceCustody/i);
    assert.doesNotMatch(std, /verify:independent covers full verify:strict/i);
  });
});