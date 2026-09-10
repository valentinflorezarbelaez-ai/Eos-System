import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runOperatorDoctor,
  formatDoctorReport,
  POST_FUSION_CRITICAL_PATHS,
  DOCTOR_NON_CLAIMS
} from '../src/core/runtime/operator-doctor.js';
import {
  auditFusionLight,
  FUSION_LIGHT_PATH_IDS,
  FUSION_LIGHT_REQUIRED_PATHS,
  FUSION_LIGHT_NON_CLAIMS
} from '../scripts/lib/independent-fusion-light.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const T4_T8_DOCTOR_IDS = [
  'MISSION_OS_EVD',
  'KEEP_PO_PRUNE_HOLD',
  'COMPLEXITY_CEILING_HOLD',
  'AGY_WORKSTATION',
  'DIRTY_DEFER_TRIAGE'
];
const T4_T8_FUSION_LIGHT_IDS = [...T4_T8_DOCTOR_IDS];

const T4_T8_RELS = {
  MISSION_OS_EVD: 'src/core/observability/mission-os-evd-observe-pack.js',
  KEEP_PO_PRUNE_HOLD: 'scripts/lib/keep-po-prune-hold-lock.js',
  COMPLEXITY_CEILING_HOLD: 'scripts/lib/complexity-ceiling-hold-lock.js',
  AGY_WORKSTATION: 'scripts/lib/agy-workstation-lock.js',
  DIRTY_DEFER_TRIAGE: 'scripts/lib/dirty-defer-triage-lock.js'
};

describe('U3 doctor / fusion-light T4–T8 lock surfaces', () => {
  it('POST_FUSION_CRITICAL_PATHS observes T4–T8 locks', () => {
    const ids = POST_FUSION_CRITICAL_PATHS.map((p) => p.id);
    for (const id of T4_T8_DOCTOR_IDS) {
      assert.ok(ids.includes(id), `doctor missing T4–T8 id ${id}`);
    }
    const byId = Object.fromEntries(POST_FUSION_CRITICAL_PATHS.map((p) => [p.id, p.rel]));
    for (const [id, rel] of Object.entries(T4_T8_RELS)) {
      assert.equal(byId[id], rel, `rel mismatch for ${id}`);
    }
  });

  it('DOCTOR_NON_CLAIMS asserts doctor ≠ verify:strict and T4–T8 observe residual', () => {
    assert.ok(Array.isArray(DOCTOR_NON_CLAIMS) && DOCTOR_NON_CLAIMS.length >= 2);
    assert.ok(DOCTOR_NON_CLAIMS.some((n) => /NOT verify:strict/i.test(n)));
    assert.ok(DOCTOR_NON_CLAIMS.some((n) => /PRODUCTION_READY/i.test(n)));
    assert.ok(
      DOCTOR_NON_CLAIMS.some((n) => /mission-os|keep-po|ceiling|agy-workstation|dirty-defer/i.test(n)),
      'NON-CLAIM should mention T4–T8 surfaces are not full verify audits'
    );
  });

  it('repo tip: doctor PASS includes T4–T8 surface checks', () => {
    const report = runOperatorDoctor({
      root: rootDir,
      skipPurpose: true,
      skipMcpFile: true
    });
    assert.equal(report.ok, true, JSON.stringify(report.failed));
    for (const id of T4_T8_DOCTOR_IDS) {
      const row = report.checks.find((c) => c.id === id);
      assert.ok(row, `missing doctor check ${id}`);
      assert.equal(row.ok, true, `${id} failed: ${row.detail}`);
    }
    const text = formatDoctorReport(report);
    assert.match(text, /MISSION_OS_EVD/);
    assert.match(text, /KEEP_PO_PRUNE_HOLD/);
    assert.match(text, /DIRTY_DEFER_TRIAGE/);
    assert.match(text, /NON-CLAIM|not verify:strict/i);
  });

  it('fail-closed when KEEP_PO_PRUNE_HOLD path missing', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-u3-keep-'));
    try {
      const files = [
        'bin/eos.js',
        'bin/eos-doctor.js',
        'src/mcp-server.js',
        'scripts/verify-eos.js',
        'scripts/lib/fusion-cp-lock.js',
        'src/core/sdd/evidence-custody.js',
        'src/core/memory/engram-contract.js',
        'src/core/sdd/evd-seal-path.js',
        'scripts/pre-push-hook.js',
        'src/core/runtime/operator-doctor.js',
        'scripts/lib/hooks-install-smoke.js',
        'scripts/lib/mcp-catalog-lock.js',
        'tests/eos-p4-mission-local-evd-seal.test.js',
        'src/core/runtime/mission-artifact-write.js',
        'scripts/lib/p6-inventory-lock.js',
        'scripts/lib/context-pack-lock.js',
        'scripts/lib/loop-engineering-lock.js',
        'scripts/lib/worktree-policy-lock.js',
        'scripts/lib/specboot-cycle-lock.js',
        'scripts/lib/mcp-tool-keep-lock.js',
        'scripts/lib/model-routing-ratchet-lock.js',
        'src/core/observability/mission-os-evd-observe-pack.js',
        'scripts/lib/complexity-ceiling-hold-lock.js',
        'scripts/lib/agy-workstation-lock.js',
        'scripts/lib/dirty-defer-triage-lock.js',
        'EOS-MISSION-CONTROL/CURRENT_MISSION.json'
      ];
      for (const rel of files) {
        const abs = path.join(fixture, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, rel.endsWith('.json') ? '{"mission_id":"U3"}' : '// stub\n');
      }
      fs.writeFileSync(
        path.join(fixture, 'package.json'),
        JSON.stringify({ name: 'eos-u3', type: 'module', scripts: { 'eos:doctor': 'node bin/eos-doctor.js' } })
      );
      fs.mkdirSync(path.join(fixture, '.cursor'), { recursive: true });
      fs.writeFileSync(
        path.join(fixture, '.cursor', 'mcp.json'),
        JSON.stringify({ mcpServers: { 'eos-local': { command: 'node', args: ['src/mcp-server.js'], cwd: fixture } } })
      );
      const report = runOperatorDoctor({
        root: fixture,
        skipPurpose: true,
        skipRuntimeEngines: true
      });
      assert.equal(report.ok, false);
      assert.ok(report.failed.includes('KEEP_PO_PRUNE_HOLD'), JSON.stringify(report.failed));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('FUSION_LIGHT_PATH_IDS optional T4–T8 subset includes locks', () => {
    for (const id of T4_T8_FUSION_LIGHT_IDS) {
      assert.ok(FUSION_LIGHT_PATH_IDS.includes(id), `fusion-light missing T4–T8 id ${id}`);
    }
    const doctorRels = POST_FUSION_CRITICAL_PATHS
      .filter((p) => FUSION_LIGHT_PATH_IDS.includes(p.id))
      .map((p) => p.rel);
    assert.deepEqual([...FUSION_LIGHT_REQUIRED_PATHS], doctorRels);
    for (const rel of Object.values(T4_T8_RELS)) {
      assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes(rel), `fusion-light missing ${rel}`);
    }
  });

  it('auditFusionLight PASS on tip with T4–T8 light checks + NON-CLAIM residual', () => {
    const result = auditFusionLight(rootDir);
    assert.equal(result.ok, true, JSON.stringify(result.failures));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-mission-os-evd'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-keep-po-prune-hold'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-complexity-ceiling-hold'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-agy-workstation'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-dirty-defer-triage'));
    assert.ok(result.nonClaims.some((n) => /NOT verify:strict/i.test(n)));
    assert.ok(
      FUSION_LIGHT_NON_CLAIMS.some((n) => /mission-os|keep-po|ceiling|agy-workstation|dirty-defer/i.test(n)) ||
        result.nonClaims.some((n) => /mission-os|keep-po|ceiling|agy-workstation|dirty-defer/i.test(n)),
      'NON-CLAIM should mention T4–T8 observe is not full verify lock'
    );
  });

  it('package.json exposes test:u3', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['test:u3'],
      'node --test tests/eos-u3-doctor-fusion-light-t4-t8.test.js'
    );
  });

  it('verify-eos REQUIRED_PATHS locks U3 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    assert.match(src, /tests\/eos-u3-doctor-fusion-light-t4-t8\.test\.js/);
    assert.match(src, /EOS_U3_DOCTOR_FUSION_LIGHT_T4_T8_2026-09-09\.md/);
  });

  it('Spanish release evidence exists with NON-CLAIM + PRODUCTION_READY=NO', () => {
    const notePath = path.join(
      rootDir,
      'docs',
      'releases',
      'EOS_U3_DOCTOR_FUSION_LIGHT_T4_T8_2026-09-09.md'
    );
    assert.equal(fs.existsSync(notePath), true);
    const note = fs.readFileSync(notePath, 'utf8');
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-u3-doctor-fusion-light-t4-t8/);
    assert.match(note, /doctor/i);
    assert.match(note, /fusion-light/i);
    assert.match(note, /MISSION_OS_EVD|mission-os-evd/);
    assert.match(note, /KEEP_PO|keep-po/);
    assert.match(note, /CEILING|ceiling/);
    assert.match(note, /AGY_WORKSTATION|agy-workstation/);
    assert.match(note, /DIRTY_DEFER|dirty-defer/);
    assert.match(note, /NON-CLAIM|no es verify:strict|≠ verify:strict|no equivale/i);
    assert.match(note, /Fundaci[oó]n|Delta\s*=\s*0/i);
    assert.match(note, /\b(Objetivo|Alcance|Entregables|Verificaci[oó]n|No-claims|Dictamen)\b/i);
  });
});
