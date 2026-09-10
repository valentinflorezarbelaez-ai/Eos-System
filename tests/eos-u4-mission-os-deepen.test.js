import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runMissionOsDeepen,
  formatDeepenReport,
  assertAtsLoopHonesty,
  buildDeepenHudFragment,
  DEEPEN_SCHEMA,
  DEEPEN_NON_CLAIMS,
  DEEPEN_REQUIRED_PATHS
} from '../src/core/observability/mission-os-deepen.js';
import { createAlignedObserveFixture } from '../src/core/observability/mission-os-evd-observe-pack.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('U4 Mission OS deepen (post T4)', () => {
  it('CI-safe deepen PASS: T4 baseline + ATS honesty + custody recurrent + HUD wiring', () => {
    const report = runMissionOsDeepen({ keepSandbox: true });
    try {
      assert.equal(report.schema, DEEPEN_SCHEMA);
      assert.equal(report.ok, true, JSON.stringify(report.failures));
      assert.equal(report.PRODUCTION_READY, 'NO');
      assert.equal(report.soak_claim, false);
      assert.ok(report.checks.some((c) => c.id === 'T4_BASELINE' && c.ok));
      assert.ok(report.checks.some((c) => c.id === 'ATS_LOOP_HONESTY' && c.ok));
      assert.ok(report.checks.some((c) => c.id === 'CUSTODY_CHAIN_RECURRENT' && c.ok));
      assert.ok(report.checks.some((c) => c.id === 'HUD_WIRING' && c.ok));
      assert.equal(report.t4_baseline?.ok, true);
      assert.ok(report.ats_loop_honesty?.relations_ok >= 1);
      assert.ok(report.custody_chain?.verify?.count >= 2);
      assert.equal(report.hud_fragment?.PRODUCTION_READY, 'NO');
      assert.equal(report.hud_fragment?.soak_claim, false);
      assert.equal(report.hud_fragment?.tip?.match, true);

      const text = formatDeepenReport(report);
      assert.match(text, /MISSION OS DEEPEN/);
      assert.match(text, /T4_BASELINE/);
      assert.match(text, /ATS_LOOP_HONESTY/);
      assert.match(text, /CUSTODY_CHAIN_RECURRENT/);
      assert.match(text, /HUD_WIRING/);
      assert.match(text, /NON-CLAIMS/);
      assert.match(text, /PRODUCTION_READY=NO/);
      assert.doesNotMatch(text, /PRODUCTION_READY=YES/);
    } finally {
      if (report.sandbox_root && report.sandbox_root !== '(cleaned)' && fs.existsSync(report.sandbox_root)) {
        fs.rmSync(report.sandbox_root, { recursive: true, force: true });
      }
    }
  });

  it('assertAtsLoopHonesty returns OBSERVED honesty pack', () => {
    const honesty = assertAtsLoopHonesty();
    assert.equal(honesty.ok, true);
    assert.ok(honesty.relations_ok >= 7);
    assert.ok(honesty.control_ats_only >= 4);
    assert.match(honesty.roles_claim, /does not replace ATS|does NOT replace ATS/i);
  });

  it('fail-closed when tip DIVERGE and requireAligned', () => {
    const fixture = createAlignedObserveFixture({
      tip: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    });
    try {
      const report = runMissionOsDeepen({
        sandboxRoot: fixture.sandboxRoot,
        tip: fixture.tip,
        liveHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        requireAligned: true,
        keepSandbox: true
      });
      assert.equal(report.ok, false);
      assert.ok(
        report.failures.includes('T4_BASELINE') || report.failures.includes('HUD_WIRING'),
        JSON.stringify(report.failures)
      );
    } finally {
      fs.rmSync(fixture.sandboxRoot, { recursive: true, force: true });
    }
  });

  it('HUD fragment wires observe pack + deepen + hud modules; no soak claim', () => {
    const fixture = createAlignedObserveFixture();
    try {
      const frag = buildDeepenHudFragment(fixture.sandboxRoot, { liveHead: fixture.tip });
      assert.equal(frag.PRODUCTION_READY, 'NO');
      assert.equal(frag.soak_claim, false);
      assert.equal(frag.tip.match, true);
      assert.match(frag.bindings.observe_pack_module, /mission-os-evd-observe-pack/);
      assert.match(frag.bindings.deepen_module, /mission-os-deepen/);
      assert.match(frag.bindings.hud_module, /operator-hud/);
    } finally {
      fs.rmSync(fixture.sandboxRoot, { recursive: true, force: true });
    }
  });

  it('NON-CLAIMS reject soak-prod / PRODUCTION_READY flip', () => {
    assert.ok(DEEPEN_NON_CLAIMS.length >= 4);
    assert.ok(DEEPEN_NON_CLAIMS.some((n) => /NOT a production soak|≠ soak-prod|not a production soak/i.test(n)));
    assert.ok(DEEPEN_NON_CLAIMS.some((n) => /soak-prod|long-run/i.test(n)));
    assert.ok(DEEPEN_NON_CLAIMS.some((n) => /PRODUCTION_READY remains NO/i.test(n)));
  });

  it('package.json exposes test:u4 and observe:mission-os-deepen', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['test:u4'], 'node --test tests/eos-u4-mission-os-deepen.test.js');
    assert.equal(
      pkg.scripts['observe:mission-os-deepen'],
      'node scripts/ci/mission-os-deepen.js'
    );
  });

  it('verify-eos REQUIRED_PATHS locks U4 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    for (const rel of DEEPEN_REQUIRED_PATHS) {
      const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.match(src, new RegExp(escaped.replace(/\//g, '[\\\\/]')));
    }
  });

  it('Spanish release evidence exists with DoD + NON-CLAIM + PRODUCTION_READY=NO', () => {
    const notePath = path.join(rootDir, 'docs', 'releases', 'EOS_U4_MISSION_OS_DEEPEN_2026-09-09.md');
    assert.equal(fs.existsSync(notePath), true);
    const note = fs.readFileSync(notePath, 'utf8');
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-u4-mission-os-deepen/);
    assert.match(note, /ATS|coherence|honesty/i);
    assert.match(note, /custody|EVD|seal/i);
    assert.match(note, /HUD|wiring/i);
    assert.match(note, /soak|NON-CLAIM|no soak/i);
    assert.match(note, /Fundaci[oó]n|Delta\s*=\s*0/i);
    assert.match(note, /\b(Objetivo|Alcance|Entregables|Verificaci[oó]n|No-claims|Dictamen)\b/i);
    assert.match(note, /AT_CEILING|sin schemas JSON nuevos|no new docs\/schemas/i);
    assert.match(note, /post T4|beyond T4|post-T4|≠soak|deepen/i);
  });

  it('DEEPEN_REQUIRED_PATHS files exist on tip', () => {
    for (const rel of DEEPEN_REQUIRED_PATHS) {
      assert.equal(fs.existsSync(path.join(rootDir, rel)), true, `missing ${rel}`);
    }
  });
});
