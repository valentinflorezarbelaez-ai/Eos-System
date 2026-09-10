import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runMissionOsEvdObservePack,
  formatObservePackReport,
  createAlignedObserveFixture,
  OBSERVE_PACK_SCHEMA,
  OBSERVE_PACK_NON_CLAIMS,
  OBSERVE_PACK_REQUIRED_PATHS
} from '../src/core/observability/mission-os-evd-observe-pack.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('T4 Mission OS / EVD observe pack', () => {
  it('CI-safe ritual PASS: coherence + sealEvd + tip ALIGNED + EVD evidence', () => {
    const report = runMissionOsEvdObservePack({ keepSandbox: true });
    try {
      assert.equal(report.schema, OBSERVE_PACK_SCHEMA);
      assert.equal(report.ok, true, JSON.stringify(report.failures));
      assert.equal(report.PRODUCTION_READY, 'NO');
      assert.equal(report.soak_claim, false);
      assert.ok(report.checks.some((c) => c.id === 'COHERENCE' && c.ok));
      assert.ok(report.checks.some((c) => c.id === 'TIP_ALIGNED' && c.ok));
      assert.ok(report.checks.some((c) => c.id === 'SEAL_EVD' && c.ok));
      assert.equal(report.coherence.ok, true);
      assert.equal(report.freeze_tip.match, true);
      assert.ok(report.sealed_evidence?.evidence_id);
      assert.match(report.sealed_evidence.evidence_id, /^EVD-T4-OBSERVE-/);
      assert.ok(report.sealed_evidence.custody_event_type);

      const text = formatObservePackReport(report);
      assert.match(text, /MISSION OS \/ EVD OBSERVE PACK/);
      assert.match(text, /TIP_ALIGNED/);
      assert.match(text, /SEAL_EVD/);
      assert.match(text, /NON-CLAIMS/);
      assert.match(text, /PRODUCTION_READY=NO/);
      assert.doesNotMatch(text, /PRODUCTION_READY=YES/);
    } finally {
      if (report.sandbox_root && report.sandbox_root !== '(cleaned)' && fs.existsSync(report.sandbox_root)) {
        fs.rmSync(report.sandbox_root, { recursive: true, force: true });
      }
    }
  });

  it('fail-closed when tip DIVERGE and requireAligned', () => {
    const fixture = createAlignedObserveFixture({
      tip: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    });
    try {
      const report = runMissionOsEvdObservePack({
        sandboxRoot: fixture.sandboxRoot,
        tip: fixture.tip,
        liveHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        requireAligned: true,
        keepSandbox: true
      });
      assert.equal(report.ok, false);
      assert.ok(report.failures.includes('TIP_ALIGNED'));
      const tipCheck = report.checks.find((c) => c.id === 'TIP_ALIGNED');
      assert.equal(tipCheck.ok, false);
      assert.equal(report.freeze_tip.match, false);
    } finally {
      fs.rmSync(fixture.sandboxRoot, { recursive: true, force: true });
    }
  });

  it('NON-CLAIMS reject soak-prod / PRODUCTION_READY flip', () => {
    assert.ok(OBSERVE_PACK_NON_CLAIMS.length >= 3);
    assert.ok(OBSERVE_PACK_NON_CLAIMS.some((n) => /NOT a production soak|≠ production soak|not a production soak/i.test(n)));
    assert.ok(OBSERVE_PACK_NON_CLAIMS.some((n) => /soak-prod|long-run/i.test(n)));
    assert.ok(OBSERVE_PACK_NON_CLAIMS.some((n) => /PRODUCTION_READY remains NO/i.test(n)));
  });

  it('package.json exposes test:t4 and observe:mission-os-evd', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['test:t4'],
      'node --test tests/eos-t4-mission-os-evd-observe-pack.test.js'
    );
    assert.equal(
      pkg.scripts['observe:mission-os-evd'],
      'node scripts/ci/mission-os-evd-observe-pack.js'
    );
  });

  it('verify-eos REQUIRED_PATHS locks T4 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    for (const rel of OBSERVE_PACK_REQUIRED_PATHS) {
      const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.match(src, new RegExp(escaped.replace(/\//g, '[\\\\/]')));
    }
  });

  it('Spanish release evidence exists with DoD + NON-CLAIM + PRODUCTION_READY=NO', () => {
    const notePath = path.join(
      rootDir,
      'docs',
      'releases',
      'EOS_T4_MISSION_OS_EVD_OBSERVE_PACK_2026-09-09.md'
    );
    assert.equal(fs.existsSync(notePath), true);
    const note = fs.readFileSync(notePath, 'utf8');
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-t4-mission-os-evd-observe-pack/);
    assert.match(note, /coherence|COHERENCE/i);
    assert.match(note, /sealEvd|SEAL_EVD|custody/i);
    assert.match(note, /ALIGNED|tip ALIGNED|TIP_ALIGNED/i);
    assert.match(note, /EVD/);
    assert.match(note, /soak|NON-CLAIM|no soak/i);
    assert.match(note, /Fundaci[oó]n|Delta\s*=\s*0/i);
    assert.match(note, /\b(Objetivo|Alcance|Entregables|Verificaci[oó]n|No-claims|Dictamen)\b/i);
    assert.match(note, /AT_CEILING|sin schemas JSON nuevos|no new docs\/schemas/i);
  });

  it('OBSERVE_PACK_REQUIRED_PATHS files exist on tip', () => {
    for (const rel of OBSERVE_PACK_REQUIRED_PATHS) {
      assert.equal(fs.existsSync(path.join(rootDir, rel)), true, `missing ${rel}`);
    }
  });
});