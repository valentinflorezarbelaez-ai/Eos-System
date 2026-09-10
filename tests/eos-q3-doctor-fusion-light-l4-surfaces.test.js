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

const L4_DOCTOR_IDS = ['HOOKS_INSTALL', 'MCP_CATALOG', 'MISSION_LOCAL_EVD'];
const L4_FUSION_LIGHT_IDS = ['HOOKS_INSTALL', 'MCP_CATALOG', 'MISSION_LOCAL_EVD'];

describe('Q3 doctor / fusion-light Ladder4 lock surfaces', () => {
  it('POST_FUSION_CRITICAL_PATHS observes hooks-install + mcp-catalog + mission-local', () => {
    const ids = POST_FUSION_CRITICAL_PATHS.map((p) => p.id);
    for (const id of L4_DOCTOR_IDS) {
      assert.ok(ids.includes(id), `doctor missing L4 id ${id}`);
    }
    const byId = Object.fromEntries(POST_FUSION_CRITICAL_PATHS.map((p) => [p.id, p.rel]));
    assert.equal(byId.HOOKS_INSTALL, 'scripts/lib/hooks-install-smoke.js');
    assert.equal(byId.MCP_CATALOG, 'scripts/lib/mcp-catalog-lock.js');
    assert.equal(byId.MISSION_LOCAL_EVD, 'tests/eos-p4-mission-local-evd-seal.test.js');
  });

  it('DOCTOR_NON_CLAIMS asserts doctor ≠ verify:strict and PRODUCTION_READY=NO', () => {
    assert.ok(Array.isArray(DOCTOR_NON_CLAIMS) && DOCTOR_NON_CLAIMS.length >= 2);
    assert.ok(DOCTOR_NON_CLAIMS.some((n) => /NOT verify:strict/i.test(n)));
    assert.ok(DOCTOR_NON_CLAIMS.some((n) => /PRODUCTION_READY/i.test(n)));
  });

  it('repo tip: doctor PASS includes L4 surface checks', () => {
    const report = runOperatorDoctor({
      root: rootDir,
      skipPurpose: true,
      skipMcpFile: true
    });
    assert.equal(report.ok, true, JSON.stringify(report.failed));
    for (const id of L4_DOCTOR_IDS) {
      const row = report.checks.find((c) => c.id === id);
      assert.ok(row, `missing doctor check ${id}`);
      assert.equal(row.ok, true, `${id} failed: ${row.detail}`);
    }
    const text = formatDoctorReport(report);
    assert.match(text, /HOOKS_INSTALL/);
    assert.match(text, /MCP_CATALOG/);
    assert.match(text, /MISSION_LOCAL_EVD/);
    assert.match(text, /NON-CLAIM|not verify:strict/i);
  });

  it('fail-closed when HOOKS_INSTALL path missing', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-q3-hooks-'));
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

        'EOS-MISSION-CONTROL/CURRENT_MISSION.json'
      ];
      for (const rel of files) {
        const abs = path.join(fixture, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, rel.endsWith('.json') ? '{"mission_id":"Q3"}' : '// stub\n');
      }
      fs.writeFileSync(
        path.join(fixture, 'package.json'),
        JSON.stringify({ name: 'eos-q3', type: 'module', scripts: { 'eos:doctor': 'node bin/eos-doctor.js' } })
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
      assert.ok(report.failed.includes('HOOKS_INSTALL'), JSON.stringify(report.failed));
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('FUSION_LIGHT_PATH_IDS optional L4 subset includes hooks/mcp/mission-local', () => {
    for (const id of L4_FUSION_LIGHT_IDS) {
      assert.ok(FUSION_LIGHT_PATH_IDS.includes(id), `fusion-light missing L4 id ${id}`);
    }
    const doctorRels = POST_FUSION_CRITICAL_PATHS
      .filter((p) => FUSION_LIGHT_PATH_IDS.includes(p.id))
      .map((p) => p.rel);
    assert.deepEqual([...FUSION_LIGHT_REQUIRED_PATHS], doctorRels);
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('scripts/lib/hooks-install-smoke.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('scripts/lib/mcp-catalog-lock.js'));
    assert.ok(FUSION_LIGHT_REQUIRED_PATHS.includes('tests/eos-p4-mission-local-evd-seal.test.js'));
  });

  it('auditFusionLight PASS on tip with L4 light checks + NON-CLAIM residual', () => {
    const result = auditFusionLight(rootDir);
    assert.equal(result.ok, true, JSON.stringify(result.failures));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-hooks-install'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-mcp-catalog'));
    assert.ok(result.checks.some((c) => c.type === 'fusion-light-mission-local'));
    assert.ok(result.nonClaims.some((n) => /NOT verify:strict/i.test(n)));
    assert.ok(
      FUSION_LIGHT_NON_CLAIMS.some((n) => /hooks-install|mcp-catalog|mission-local/i.test(n)) ||
        result.nonClaims.some((n) => /hooks-install|mcp-catalog|mission-local/i.test(n)),
      'NON-CLAIM should mention L4 observe is not full verify lock'
    );
  });

  it('package.json exposes test:q3', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['test:q3'],
      'node --test tests/eos-q3-doctor-fusion-light-l4-surfaces.test.js'
    );
  });

  it('verify-eos REQUIRED_PATHS locks Q3 deliverables', () => {
    const src = fs.readFileSync(path.join(rootDir, 'scripts', 'verify-eos.js'), 'utf8');
    assert.match(src, /tests\/eos-q3-doctor-fusion-light-l4-surfaces\.test\.js/);
    assert.match(src, /EOS_Q3_DOCTOR_FUSION_LIGHT_L4_SURFACES_2026-09-09\.md/);
  });

  it('Spanish release evidence exists with NON-CLAIM + PRODUCTION_READY=NO', () => {
    const notePath = path.join(
      rootDir,
      'docs',
      'releases',
      'EOS_Q3_DOCTOR_FUSION_LIGHT_L4_SURFACES_2026-09-09.md'
    );
    assert.equal(fs.existsSync(notePath), true);
    const note = fs.readFileSync(notePath, 'utf8');
    assert.match(note, /PRODUCTION_READY[:*\s]+NO/);
    assert.match(note, /cursor\/eos-q3-doctor-fusion-light-l4-surfaces/);
    assert.match(note, /doctor/i);
    assert.match(note, /fusion-light/i);
    assert.match(note, /hooks-install|HOOKS_INSTALL/);
    assert.match(note, /mcp-catalog|MCP_CATALOG/);
    assert.match(note, /mission-local|MISSION_LOCAL/);
    assert.match(note, /NON-CLAIM|no es verify:strict|≠ verify:strict|no equivale/i);
    assert.match(note, /Fundaci[oó]n|Delta\s*=\s*0/i);
    assert.match(note, /\b(Objetivo|Alcance|Entregables|Verificaci[oó]n|No-claims|Dictamen)\b/i);
  });
});
