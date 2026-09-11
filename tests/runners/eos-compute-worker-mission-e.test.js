/**
 * @file eos-compute-worker-mission-e.test.js
 * @description SPEC-0010 Mission E — McpCapabilityRouter × compute worker integration.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  parseCheckboxTasks,
  buildComputePlan,
  executeComputeRun,
  sealComputeRunCustody,
  checkCapabilityAvailability,
  tasksToTaskText
} from '../../scripts/runners/eos-compute-worker.js';
import {
  parseCliArgs,
  runComputeWorkerCli,
  defaultPlannedWrites
} from '../../scripts/runners/eos-compute-worker-cli.js';
import { EvidenceCustody } from '../../src/core/sdd/evidence-custody.js';
import { McpCapabilityRouter } from '../../src/core/mcp/mcp-capability-router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_PACK = 'docs/harness/CONTEXT_PACK_TPC.md';
const CHANGE_ID = 'eos-mission-e-worker-mcp-integration';

const MOCK_AVAILABLE = {
  servers: {
    StitchMCP: { command: 'npx' },
    'chrome-devtools-mcp': { command: 'npx' },
    github: { command: 'npx' },
    engram: { command: 'engram' },
    'eos-local': { command: 'node' }
  }
};

function tempCustodyDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-e-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Wire MCP gate @needs(VCS)\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-e-builder',
    verifierId: 'mission-e-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
    ],
    availableConfig: MOCK_AVAILABLE,
    ...overrides
  });
}

test('Mission E: tasksToTaskText preserves @needs annotations', () => {
  const text = tasksToTaskText([
    { text: 'Do thing @needs(VCS, BROWSER_QA)', done: false },
    { text: 'Other', done: true }
  ]);
  assert.match(text, /@needs\(VCS, BROWSER_QA\)/);
  assert.match(text, /Other/);
});

test('Mission E: buildComputePlan attaches mcpEnvelope via resolveMcpEnvelope APPLY', () => {
  const plan = basePlan();
  assert.ok(plan.mcpEnvelope, 'mcpEnvelope required');
  assert.equal(plan.mcpEnvelope.schema, 'eos.mcp_capability_envelope.v1');
  assert.equal(plan.mcpEnvelope.phase, 'APPLY');
  assert.equal(plan.mcpEnvelope.profile, 'L1_LOCAL_GOVERNED');
  assert.equal(plan.mcpEnvelope.PRODUCTION_READY, 'NO');
  assert.equal(plan.mcpEnvelope.status, 'RESOLVED');
  assert.ok(plan.mcpEnvelope.resolvedServers.includes('github'));
  assert.equal(plan.PRODUCTION_READY, 'NO');
});

test('Mission E: checkCapabilityAvailability reflects envelope status', () => {
  const ok = checkCapabilityAvailability({ status: 'RESOLVED' });
  assert.equal(ok.ok, true);
  const bad = checkCapabilityAvailability({ status: 'DEFICIENT', missingRequiredServers: ['DATABASE'] });
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 'DEFICIENT');
  assert.equal(checkCapabilityAvailability(null).status, 'DEFICIENT');
});

test('Mission E: enforceMcp DEFICIENT aborts before applyDiff', async () => {
  const plan = basePlan({
    tasks: parseCheckboxTasks('- [ ] Needs DB @needs(DATABASE)\n')
  });
  assert.equal(plan.mcpEnvelope.status, 'DEFICIENT');

  let applyCalls = 0;
  const result = await executeComputeRun({
    plan,
    enforceMcp: true,
    applyDiff: async () => {
      applyCalls += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => {
      throw new Error('rollback must not run on MCP abort');
    },
    custodyBaseDir: tempCustodyDir()
  });

  assert.equal(applyCalls, 0);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'MCP_CAPABILITY_DEFICIENT');
  assert.equal(result.PRODUCTION_READY, 'NO');
  assert.ok(result.mcpEnvelope);
  assert.equal(result.mcpEnvelope.status, 'DEFICIENT');
});

test('Mission E: without enforceMcp, DEFICIENT plan still applies (opt-in gate)', async () => {
  const plan = basePlan({
    tasks: parseCheckboxTasks('- [ ] Needs DB @needs(DATABASE)\n')
  });
  assert.equal(plan.mcpEnvelope.status, 'DEFICIENT');
  let applyCalls = 0;
  const result = await executeComputeRun({
    plan,
    enforceMcp: false,
    applyDiff: async () => {
      applyCalls += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true, exitCode: 0 }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(applyCalls, 1);
  assert.equal(result.status, 'COMPLETED');
});

test('Mission E: sealComputeRunCustody payload includes mcp_envelope', () => {
  const plan = basePlan();
  const custody = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: tempCustodyDir()
  });
  const sealed = sealComputeRunCustody(plan, { ok: true }, { custody });
  assert.equal(sealed.event_type, 'VERIFY_RECEIPT');
  assert.ok(sealed.payload.mcp_envelope, 'mcp_envelope required on custody payload');
  assert.equal(sealed.payload.mcp_envelope.phase, 'APPLY');
  assert.ok(sealed.payload.receipt_hash);
});

test('Mission E CLI: parseCliArgs reads --mcp-check and --enforce-mcp', () => {
  const parsed = parseCliArgs([
    `--change=${CHANGE_ID}`,
    '--mcp-check',
    '--enforce-mcp'
  ]);
  assert.equal(parsed.changeId, CHANGE_ID);
  assert.equal(parsed.mcpCheck, true);
  assert.equal(parsed.enforceMcp, true);
});

test('Mission E CLI: --mcp-check prints projection exit 0', async () => {
  const lines = [];
  const outcome = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`, '--mcp-check'],
    {
      root: ROOT,
      availableConfig: MOCK_AVAILABLE,
      println: (s) => lines.push(s),
      plannedWrites: defaultPlannedWrites(CHANGE_ID)
    }
  );
  assert.equal(outcome.exitCode, 0);
  assert.equal(outcome.result.status, 'MCP_CHECK');
  assert.ok(outcome.result.mcpEnvelope);
  assert.ok(lines.length >= 1);
  assert.match(lines[0], /eos\.mcp_capability_envelope\.v1/);
});

test('Mission E CLI: --enforce-mcp with DEFICIENT fixture root → exit 4', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-e-cli-'));
  const changeDir = path.join(tmp, 'openspec', 'changes', CHANGE_ID);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(
    path.join(changeDir, 'tasks.md'),
    '# Tasks\n\n- [ ] Provision schema @needs(DATABASE)\n',
    'utf8'
  );

  let applyCalls = 0;
  const outcome = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`, '--enforce-mcp'],
    {
      root: tmp,
      availableConfig: MOCK_AVAILABLE, // no DATABASE servers
      applyDiff: async () => {
        applyCalls += 1;
        return { applied: true };
      },
      runVerifier: async () => ({ ok: true }),
      rollbackDiff: async () => ({ rolledBack: true }),
      custodyBaseDir: tempCustodyDir(),
      plannedWrites: defaultPlannedWrites(CHANGE_ID)
    }
  );

  assert.equal(outcome.exitCode, 4);
  assert.equal(outcome.error, 'MCP_CAPABILITY_DEFICIENT');
  assert.equal(outcome.result.status, 'MCP_CAPABILITY_DEFICIENT');
  assert.equal(applyCalls, 0);
});

test('Mission E: RESOLVED + enforceMcp proceeds to COMPLETED', async () => {
  const plan = basePlan();
  assert.equal(plan.mcpEnvelope.status, 'RESOLVED');
  const custody = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: tempCustodyDir()
  });
  const result = await executeComputeRun({
    plan,
    enforceMcp: true,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true, exitCode: 0 }),
    custody
  });
  assert.equal(result.status, 'COMPLETED');
  assert.ok(result.custodyReceipt.payload.mcp_envelope);
});
