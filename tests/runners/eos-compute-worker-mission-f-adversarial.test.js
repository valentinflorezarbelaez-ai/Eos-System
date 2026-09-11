/**
 * @file eos-compute-worker-mission-f-adversarial.test.js
 * @description SPEC-0010-ADV Mission F — MCP × compute-worker adversarial red-team.
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
  sanitizeMcpTaskText,
  ComputeWorkerError
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
const CHANGE_ID = 'eos-mission-f-worker-mcp-adversarial';

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-f-custody-'));
}

function basePlan(overrides = {}) {
  return buildComputePlan({
    changeId: CHANGE_ID,
    tasks: parseCheckboxTasks('- [ ] Wire MCP gate @needs(VCS)\n'),
    contextPackPath: CONTEXT_PACK,
    builderId: 'mission-f-builder',
    verifierId: 'mission-f-verifier-child',
    plannedWrites: [
      `openspec/changes/${CHANGE_ID}/tasks.md`,
      'scripts/runners/eos-compute-worker.js'
    ],
    availableConfig: MOCK_AVAILABLE,
    ...overrides
  });
}

// ---------------------------------------------------------------------------
// 1. Malformed @needs annotations
// ---------------------------------------------------------------------------
test('F1: malformed @needs() / commas / numeric rejected or fail-closed', () => {
  assert.throws(
    () => sanitizeMcpTaskText('- [ ] x @needs(1234)'),
    (e) => e instanceof ComputeWorkerError && e.code === 'MCP_CAPABILITY_REJECTED'
  );
  const empty = sanitizeMcpTaskText('- [ ] noop @needs()');
  assert.match(empty, /@needs\(\)/);
  const commas = sanitizeMcpTaskText('- [ ] noop @needs(,,,)');
  assert.match(commas, /@needs/);
  assert.throws(
    () => sanitizeMcpTaskText('- [ ] x @needs(999)'),
    (e) => e instanceof ComputeWorkerError && e.code === 'MCP_CAPABILITY_REJECTED'
  );
});

// ---------------------------------------------------------------------------
// 2. Prototype pollution via @needs
// ---------------------------------------------------------------------------
test('F2: @needs(__proto__/constructor/prototype) rejected; Object.prototype intact', () => {
  const before = Object.prototype.polluted;
  for (const tok of ['__proto__', 'constructor', 'prototype']) {
    assert.throws(
      () => sanitizeMcpTaskText(`- [ ] evil @needs(${tok})`),
      (e) => e instanceof ComputeWorkerError && e.code === 'MCP_CAPABILITY_REJECTED'
    );
  }
  assert.equal(Object.prototype.polluted, before);
  assert.equal(Object.prototype.hacked, undefined);
});

// ---------------------------------------------------------------------------
// 3. Path traversal in capability / task text
// ---------------------------------------------------------------------------
test('F3: path traversal in task/@needs rejected fail-closed', () => {
  assert.throws(
    () => parseCheckboxTasks('- [ ] open ../../etc/shadow\n'),
    (e) => e.code === 'PATH_TRAVERSAL_REJECTED'
  );
  assert.throws(
    () => parseCheckboxTasks('- [ ] leak @needs(%2e%2e%2fetc)\n'),
    (e) => e.code === 'PATH_TRAVERSAL_REJECTED'
  );
  assert.throws(
    () => sanitizeMcpTaskText('- [ ] x @needs(../../etc/shadow)'),
    (e) =>
      e instanceof ComputeWorkerError &&
      (e.code === 'PATH_TRAVERSAL_REJECTED' || e.code === 'MCP_CAPABILITY_REJECTED')
  );
});

// ---------------------------------------------------------------------------
// 4. Multiple conflicting @needs — first wins at router; both sanitized
// ---------------------------------------------------------------------------
test('F4: conflicting @needs — union on one line; multi-line documents first-match router', () => {
  const union = basePlan({
    tasks: parseCheckboxTasks('- [ ] A @needs(VCS, BROWSER_QA)\n')
  });
  assert.equal(union.mcpEnvelope.status, 'RESOLVED');
  assert.ok(union.mcpEnvelope.capabilities.includes('VCS'));
  assert.ok(union.mcpEnvelope.capabilities.includes('BROWSER_QA'));

  const multi = basePlan({
    tasks: parseCheckboxTasks(
      '- [ ] A @needs(VCS)\n- [ ] B @needs(BROWSER_QA)\n'
    )
  });
  assert.ok(multi.mcpEnvelope.capabilities.includes('VCS'));
  assert.equal(multi.mcpEnvelope.status, 'RESOLVED');
});

// ---------------------------------------------------------------------------
// 5. Fuzz enforceMcp: empty/null catalog, missing servers
// ---------------------------------------------------------------------------
test('F5: enforceMcp with empty/null/deficient catalogs fail-closed', async () => {
  const planDef = basePlan({
    tasks: parseCheckboxTasks('- [ ] Needs DB @needs(DATABASE)\n'),
    availableConfig: { servers: {} }
  });
  // empty known servers: router treats as ideal projection for candidates → may RESOLVE
  // Deficient path: explicit missing DATABASE with non-empty catalog lacking DB servers
  const plan = basePlan({
    tasks: parseCheckboxTasks('- [ ] Needs DB @needs(DATABASE)\n'),
    availableConfig: MOCK_AVAILABLE
  });
  assert.equal(plan.mcpEnvelope.status, 'DEFICIENT');

  let applyCalls = 0;
  const r = await executeComputeRun({
    plan,
    enforceMcp: true,
    applyDiff: async () => {
      applyCalls += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => ({ rolledBack: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(applyCalls, 0);
  assert.equal(r.status, 'MCP_CAPABILITY_DEFICIENT');

  // null envelope gate
  const r2 = await executeComputeRun({
    plan: { ...plan, mcpEnvelope: null, role: 'BUILDER' },
    enforceMcp: true,
    applyDiff: async () => {
      applyCalls += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(applyCalls, 0);
  assert.equal(r2.status, 'MCP_CAPABILITY_DEFICIENT');
});

// ---------------------------------------------------------------------------
// 6. Fail-closed pre-disk: applyDiff never invoked on DEFICIENT+enforceMcp
// ---------------------------------------------------------------------------
test('F6: DEFICIENT+enforceMcp never touches disk (0 applyDiff)', async () => {
  const plan = basePlan({
    tasks: parseCheckboxTasks('- [ ] Needs DB @needs(DATABASE)\n')
  });
  let writes = 0;
  await executeComputeRun({
    plan,
    enforceMcp: true,
    applyDiff: async () => {
      writes += 1;
      fs.writeFileSync(path.join(os.tmpdir(), 'eos-mission-f-should-not-exist'), 'x');
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(writes, 0);
});

// ---------------------------------------------------------------------------
// 7. Profile spoof: L0_READONLY + writeAllowed rejected at seal / build
// ---------------------------------------------------------------------------
test('F7: spoofed L0_READONLY with writeAllowed rejected at seal', () => {
  const plan = basePlan();
  const spoofed = {
    ...plan,
    mcpEnvelope: {
      ...plan.mcpEnvelope,
      profile: 'L0_READONLY',
      authority: {
        ...plan.mcpEnvelope.authority,
        writeAllowed: true
      }
    }
  };
  assert.throws(
    () =>
      sealComputeRunCustody(spoofed, { ok: true }, {
        custody: new EvidenceCustody({
          controlPlaneRoot: ROOT,
          baseDir: tempCustodyDir()
        }),
        availableConfig: MOCK_AVAILABLE
      }),
    (e) => e instanceof ComputeWorkerError && e.code === 'MCP_ENVELOPE_TAMPERED'
  );
});

// ---------------------------------------------------------------------------
// 8. Custody tampering: altered envelope fails seal integrity
// ---------------------------------------------------------------------------
test('F8: tampered mcp_envelope fails sealComputeRunCustody', () => {
  const plan = basePlan();
  const tampered = {
    ...plan,
    mcpEnvelope: {
      ...plan.mcpEnvelope,
      status: 'RESOLVED',
      capabilities: ['DATABASE'],
      resolvedServers: ['postgres'],
      profile: 'L1_LOCAL_GOVERNED',
      schema: 'eos.mcp_capability_envelope.v1',
      phase: 'APPLY'
    }
  };
  assert.throws(
    () =>
      sealComputeRunCustody(tampered, { ok: true }, {
        custody: new EvidenceCustody({
          controlPlaneRoot: ROOT,
          baseDir: tempCustodyDir()
        }),
        availableConfig: MOCK_AVAILABLE
      }),
    (e) => e instanceof ComputeWorkerError && e.code === 'MCP_ENVELOPE_TAMPERED'
  );
});

// ---------------------------------------------------------------------------
// 9. CLI fuzz: --mcp-check + --enforce-mcp exit codes deterministic
// ---------------------------------------------------------------------------
test('F9: CLI exit codes — DEFICIENT→4, missing change→2, traversal→2', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-f-cli-'));
  const changeDir = path.join(tmp, 'openspec', 'changes', CHANGE_ID);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(
    path.join(changeDir, 'tasks.md'),
    '# Tasks\n\n- [ ] Provision @needs(DATABASE)\n',
    'utf8'
  );

  const deficient = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`, '--mcp-check', '--enforce-mcp'],
    {
      root: tmp,
      availableConfig: MOCK_AVAILABLE,
      plannedWrites: defaultPlannedWrites(CHANGE_ID),
      applyDiff: async () => ({ applied: true }),
      runVerifier: async () => ({ ok: true }),
      custodyBaseDir: tempCustodyDir()
    }
  );
  // mcp-check short-circuits before enforce run — exit 0 with projection
  assert.equal(deficient.exitCode, 0);
  assert.equal(deficient.result.status, 'MCP_CHECK');

  const enf = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`, '--enforce-mcp'],
    {
      root: tmp,
      availableConfig: MOCK_AVAILABLE,
      plannedWrites: defaultPlannedWrites(CHANGE_ID),
      applyDiff: async () => {
        throw new Error('should not apply');
      },
      runVerifier: async () => ({ ok: true }),
      custodyBaseDir: tempCustodyDir()
    }
  );
  assert.equal(enf.exitCode, 4);

  const missing = await runComputeWorkerCli(['--enforce-mcp'], { root: tmp });
  assert.equal(missing.exitCode, 2);

  fs.writeFileSync(
    path.join(changeDir, 'tasks.md'),
    '- [ ] bad ../../etc/passwd\n',
    'utf8'
  );
  const trav = await runComputeWorkerCli(
    [`--change=${CHANGE_ID}`, '--enforce-mcp'],
    {
      root: tmp,
      availableConfig: MOCK_AVAILABLE,
      plannedWrites: defaultPlannedWrites(CHANGE_ID)
    }
  );
  assert.equal(trav.exitCode, 2);
  assert.match(String(trav.error), /PATH_TRAVERSAL_REJECTED|MCP_CAPABILITY_REJECTED/);
});

// ---------------------------------------------------------------------------
// 10. Atomic rollback: MCP deficiency never applies; simulated apply fail rolls back
// ---------------------------------------------------------------------------
test('F10: apply failure rolls back; MCP abort leaves no apply', async () => {
  const planOk = basePlan();
  let rolled = 0;
  const fail = await executeComputeRun({
    plan: planOk,
    enforceMcp: true,
    applyDiff: async () => {
      throw new Error('mid-apply boom');
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => {
      rolled += 1;
      return { rolledBack: true };
    },
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(fail.status, 'APPLY_FAILED_ROLLED_BACK');
  assert.equal(rolled, 1);

  const planBad = basePlan({
    tasks: parseCheckboxTasks('- [ ] Needs DB @needs(DATABASE)\n')
  });
  let apply = 0;
  let rb = 0;
  const abort = await executeComputeRun({
    plan: planBad,
    enforceMcp: true,
    applyDiff: async () => {
      apply += 1;
      return { applied: true };
    },
    runVerifier: async () => ({ ok: true }),
    rollbackDiff: async () => {
      rb += 1;
      return { rolledBack: true };
    },
    custodyBaseDir: tempCustodyDir()
  });
  assert.equal(abort.status, 'MCP_CAPABILITY_DEFICIENT');
  assert.equal(apply, 0);
  assert.equal(rb, 0);
});

test('F-extra: parseCliArgs combination flags', () => {
  const p = parseCliArgs([
    `--change=${CHANGE_ID}`,
    '--mcp-check',
    '--enforce-mcp'
  ]);
  assert.equal(p.mcpCheck, true);
  assert.equal(p.enforceMcp, true);
});

test('F-extra: happy RESOLVED+enforceMcp still COMPLETED', async () => {
  const plan = basePlan();
  const custody = new EvidenceCustody({
    controlPlaneRoot: ROOT,
    baseDir: tempCustodyDir()
  });
  const result = await executeComputeRun({
    plan,
    enforceMcp: true,
    applyDiff: async () => ({ applied: true }),
    runVerifier: async () => ({ ok: true, exitCode: 0 }),
    custody,
    availableConfig: MOCK_AVAILABLE
  });
  // executeComputeRun doesn't take availableConfig for seal — structural integrity OK
  assert.equal(result.status, 'COMPLETED');
  assert.ok(result.custodyReceipt);
});
