import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditSentinelFdir,
  SENTINEL_FDIR_REQUIRED_PATHS
} from '../scripts/lib/sentinel-fdir-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function loadHud() {
  return import('../src/core/observability/operator-hud.js');
}

describe('N6 Sentinel/FDIR strict-verify lock', () => {
  it('SENTINEL_FDIR_REQUIRED_PATHS locks eos-sentinel + daemon + fdir + ontology', () => {
    assert.ok(SENTINEL_FDIR_REQUIRED_PATHS.includes('bin/eos-sentinel.js'));
    assert.ok(SENTINEL_FDIR_REQUIRED_PATHS.includes('src/core/sentinel-daemon.js'));
    assert.ok(SENTINEL_FDIR_REQUIRED_PATHS.includes('src/core/fdir.js'));
    assert.ok(SENTINEL_FDIR_REQUIRED_PATHS.includes('src/core/fdir-ontology.js'));
    assert.equal(SENTINEL_FDIR_REQUIRED_PATHS.length, 4);
  });

  it('PASS: auditSentinelFdir on live tip includes path + light smoke types', () => {
    const result = auditSentinelFdir(rootDir);
    assert.equal(result.ok, true, JSON.stringify(result.failures));
    assert.equal(result.failures.length, 0);
    assert.ok(result.checks.some((c) => c.type === 'sentinel-fdir-lock'));
    assert.ok(result.checks.some((c) => c.type === 'sentinel-fdir-daemon'));
    assert.ok(result.checks.some((c) => c.type === 'sentinel-fdir-engine'));
    assert.ok(result.checks.some((c) => c.type === 'sentinel-fdir-ontology'));
    assert.ok(
      result.checks.some(
        (c) => c.type === 'sentinel-fdir-lock' && c.path.includes('bin/eos-sentinel.js')
      )
    );
    assert.ok(
      result.checks.some(
        (c) => c.type === 'sentinel-fdir-lock' && c.path.includes('fdir-ontology.js')
      )
    );
  });

  it('DENY fail-closed when sentinel/fdir paths missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-n6-sf-'));
    try {
      const result = auditSentinelFdir(tmp);
      assert.equal(result.ok, false);
      assert.ok(result.failures.every((f) => f.type === 'sentinel-fdir-lock'));
      assert.ok(result.failures.some((f) => f.path.includes('eos-sentinel.js')));
      assert.ok(result.failures.some((f) => f.path.includes('sentinel-daemon.js')));
      assert.ok(result.failures.some((f) => f.path.includes('fdir.js')));
      assert.ok(result.failures.some((f) => f.path.includes('fdir-ontology.js')));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('VERIFY_SURFACE_TYPES includes N6 sentinel-fdir smoke types', async () => {
    const hud = await loadHud();
    for (const type of [
      'sentinel-fdir-lock',
      'sentinel-fdir-daemon',
      'sentinel-fdir-engine',
      'sentinel-fdir-ontology'
    ]) {
      assert.ok(hud.VERIFY_SURFACE_TYPES.includes(type), `missing surface type ${type}`);
    }
  });

  it('HUD observes defense wiring (optional OBSERVED section)', async () => {
    const hud = await loadHud();
    const snap = hud.collectOperatorHud({
      baseDir: rootDir,
      skipVerify: true
    });
    assert.ok(snap.defense, 'defense field missing from HUD snapshot');
    assert.equal(snap.defense.epistemic, hud.HUD_EPISTEMIC.OBSERVED);
    assert.equal(snap.defense.bin_present, true);
    assert.equal(snap.defense.daemon_present, true);
    assert.equal(snap.defense.fdir_present, true);
    assert.equal(snap.defense.ontology_present, true);
    const text = hud.renderOperatorHud(snap);
    assert.match(text, /DEFENSE/);
    assert.match(text, /sentinel|FDIR/i);
  });

  it('verify-eos REQUIRED_PATHS + audit wires N6 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    assert.match(src, /\.\.\.SENTINEL_FDIR_REQUIRED_PATHS/);
    assert.match(src, /auditSentinelFdir\(rootDir\)/);
    assert.match(src, /scripts\/lib\/sentinel-fdir-lock\.js/);
    assert.match(src, /tests\/eos-n6-sentinel-fdir-lock\.test\.js/);
    assert.match(src, /EOS_N6_SENTINEL_FDIR_STRICT_LOCK_2026-09-08\.md/);
  });

  it('package.json exposes test:n6', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['test:n6'], 'node --test tests/eos-n6-sentinel-fdir-lock.test.js');
  });

  it('release note exists and asserts PRODUCTION_READY=NO', () => {
    const note = fs.readFileSync(
      path.join(rootDir, 'docs', 'releases', 'EOS_N6_SENTINEL_FDIR_STRICT_LOCK_2026-09-08.md'),
      'utf8'
    );
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-n6-sentinel-fdir-lock/);
    assert.match(note, /sentinel-fdir-lock/);
    assert.match(note, /eos-sentinel/);
    assert.match(note, /fdir-ontology/);
    assert.match(note, /Ladder 3/);
  });
});
