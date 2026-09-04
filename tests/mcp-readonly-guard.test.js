import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EosMcpServer, CANONICAL_TOOLS } from '../src/mcp-server.js';
import { MissionLedger } from '../scripts/engine/mission-ledger.js';

test('GUARD-01: EOS_MODE=read-only blocks eos.ledger.update_feature', async () => {
  const server = new EosMcpServer();
  const env = { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_2', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };

  const res = await server.handleToolCall('eos.ledger.update_feature', {
    missionId: 'MIS-GUARD-01',
    featureId: 'FEAT-01',
    newStatus: 'PASS'
  }, env);

  assert.equal(res.status, 'DENIED');
  assert.equal(res.executed, false);
  assert.equal(res.sideEffects, 'NONE');
  assert.equal(res.reason, 'READ_ONLY_MODE_BLOCKS_LEDGER_WRITE');
});

test('GUARD-02: EOS_AUTONOMY_LEVEL=LEVEL_0 blocks eos.mission.recover', async () => {
  const server = new EosMcpServer();
  const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_0', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };

  const res = await server.handleToolCall('eos.mission.recover', {
    missionId: 'MIS-GUARD-02'
  }, env);

  assert.equal(res.status, 'DENIED');
  assert.equal(res.executed, false);
  assert.equal(res.sideEffects, 'NONE');
  assert.match(res.reason, /^INSUFFICIENT_AUTONOMY_LEVEL/);
});

test('GUARD-03: Invalid EOS_MODE or EOS_AUTONOMY_LEVEL returns DENIED with explicit reason', async () => {
  const server = new EosMcpServer();

  const res1 = await server.handleToolCall('eos.context.compile', {
    mission: { id: 'M1', type: 'TEST', goal: 'G1' },
    contract: { autonomyLevel: 'LEVEL_0', maxBudgetTokens: 1000 }
  }, { EOS_MODE: 'INVALID_SUPER_MODE', EOS_AUTONOMY_LEVEL: 'LEVEL_0' });

  assert.equal(res1.status, 'DENIED');
  assert.equal(res1.executed, false);
  assert.match(res1.reason, /INVALID_GOVERNANCE_CONFIGURATION: Unrecognized EOS_MODE/);

  const res2 = await server.handleToolCall('eos.context.compile', {
    mission: { id: 'M1', type: 'TEST', goal: 'G1' },
    contract: { autonomyLevel: 'LEVEL_0', maxBudgetTokens: 1000 }
  }, { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'MALICIOUS_ROOT_LEVEL' });

  assert.equal(res2.status, 'DENIED');
  assert.equal(res2.executed, false);
  assert.match(res2.reason, /INVALID_GOVERNANCE_CONFIGURATION: Unrecognized or denied EOS_AUTONOMY_LEVEL/);
});

test('GUARD-04: Denied calls do NOT mutate ledger state or create any disk files', async () => {
  const testMissionId = 'GUARD-NO-MUTATION-' + Date.now();
  const ledgerDir = path.resolve('tests/fixtures/guard-test-ledger');

  // Custom isolated ledger instance
  const isolatedLedger = new MissionLedger({
    baseDir: ledgerDir,
    legacyDir: path.join(ledgerDir, 'legacy')
  });
  const server = new EosMcpServer(isolatedLedger);

  const res = await server.handleToolCall('eos.ledger.update_feature', {
    missionId: testMissionId,
    featureId: 'FEAT-X',
    newStatus: 'PASS'
  }, { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0' });

  assert.equal(res.status, 'DENIED');
  assert.equal(res.executed, false);

  // Assert zero files were created for this mission ID
  const featureListPath = path.join(ledgerDir, `feature_list_${testMissionId}.json`);
  const runLogPath = path.join(ledgerDir, `run_log_${testMissionId}.jsonl`);
  assert.equal(fs.existsSync(featureListPath), false, 'Feature list must not be created on denial');
  assert.equal(fs.existsSync(runLogPath), false, 'Run log must not be created on denial');
});

test('GUARD-05: Read-only tools execute cleanly in read-only and LEVEL_0', async () => {
  const server = new EosMcpServer();
  const env = { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };

  // 1. eos.authority.check
  const authRes = await server.handleToolCall('eos.authority.check', {
    requiredLevel: 'LEVEL_0',
    grantedLevel: 'LEVEL_0'
  }, env);
  assert.equal(authRes.status, 'SUCCESS');
  assert.equal(authRes.executed, true);
  assert.equal(authRes.auth.authorized, true);

  // 2. eos.context.compile
  const contextRes = await server.handleToolCall('eos.context.compile', {
    mission: { id: 'MIS-RO-01', type: 'TEST', goal: 'Read-only context compile' },
    contract: { autonomyLevel: 'LEVEL_0', maxBudgetTokens: 2000 }
  }, env);
  assert.equal(contextRes.status, 'SUCCESS');
  assert.equal(contextRes.executed, true);
  assert.ok(contextRes.receipt.sha256);

  // 3. eos.ledger.get_features (read-only lookup)
  const getFeaturesRes = await server.handleToolCall('eos.ledger.get_features', {
    missionId: 'MIS-NONEXISTENT'
  }, env);
  assert.equal(getFeaturesRes.status, 'SUCCESS');
  assert.equal(getFeaturesRes.executed, true);
  assert.equal(getFeaturesRes.features, null);
});

test('GUARD-06: Permitted write tools succeed when mode is read-write and autonomy is LEVEL_1+', async () => {
  const testMissionId = 'GUARD-PERMITTED-' + Date.now();
  const ledgerDir = path.resolve('tests/fixtures/guard-test-ledger');
  fs.mkdirSync(path.join(ledgerDir, 'legacy'), { recursive: true });

  const isolatedLedger = new MissionLedger({
    baseDir: ledgerDir,
    legacyDir: path.join(ledgerDir, 'legacy')
  });
  isolatedLedger.initializeMission(testMissionId, [{ id: 'F1', name: 'Feature 1', status: 'PENDING' }]);

  const server = new EosMcpServer(isolatedLedger);
  const env = { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_1', EOS_ALLOW_EXTERNAL_SIDE_EFFECTS: 'false' };

  const res = await server.handleToolCall('eos.ledger.update_feature', {
    missionId: testMissionId,
    featureId: 'F1',
    newStatus: 'IN_PROGRESS'
  }, env);

  assert.equal(res.status, 'SUCCESS');
  assert.equal(res.executed, true);
  assert.equal(res.sideEffects, 'LEDGER_WRITE');
  assert.equal(res.feature.status, 'IN_PROGRESS');

  // Clean up test ledger
  fs.rmSync(ledgerDir, { recursive: true, force: true });
});

test('GUARD-07: Provider tools stay NOT_CONFIGURED; discover is wired', async () => {
  const server = new EosMcpServer();

  const res1 = await server.handleToolCall('eos.workspace.discover', {}, { EOS_MODE: 'read-only', EOS_AUTONOMY_LEVEL: 'LEVEL_0' });
  assert.equal(res1.status, 'SUCCESS');
  assert.equal(res1.executed, true);

  const res2 = await server.handleToolCall('eos.provider.route', {}, { EOS_MODE: 'read-write', EOS_AUTONOMY_LEVEL: 'LEVEL_4' });
  assert.equal(res2.status, 'NOT_CONFIGURED');
  assert.equal(res2.executed, false);
  assert.equal(res2.sideEffects, 'NONE');
});

test('GUARD-08: All 78 canonical tools have sideEffects and requiredAuthority metadata defined', () => {
  assert.equal(CANONICAL_TOOLS.length, 78);
  for (const tool of CANONICAL_TOOLS) {
    assert.ok(tool.name, 'Tool must have name');
    assert.ok(tool.category, 'Tool must have category');
    assert.ok(tool.sideEffects, `Tool ${tool.name} must have sideEffects defined`);
    assert.ok(tool.requiredAuthority, `Tool ${tool.name} must have requiredAuthority defined`);
  }
});
