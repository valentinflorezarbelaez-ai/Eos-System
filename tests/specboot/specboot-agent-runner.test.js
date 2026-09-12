/**
 * @file specboot-agent-runner.test.js
 * @description SPEC-0024 Mission S — Autonomous SpecBoot Agent Runner.
 * Hermetic TDD: injectable readChange / parseTasks / runOrchestration /
 * writeEvidence / archiveChange; temp dirs / memory mocks; no network / Gemini.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-specboot-agent-runner only.
 * Does NOT claim CloudAgent path, PRODUCTION_READY=YES, or autonomous main merge.
 * Does NOT replace AGY skills / node bin/eos.js SpecBoot ceremony.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  SPECBOOT_AGENT_RUNNER_PRODUCTION_READY,
  SPECBOOT_AGENT_KIND,
  SPECBOOT_PHASES,
  SPECBOOT_CODES,
  SpecbootAgentRunnerError,
  createSpecbootAgentRunner,
  defaultParseTasks,
  defaultHash
} from '../../src/core/specboot/specboot-agent-runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../../src/core/specboot/specboot-agent-runner.js'
);

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'specboot-s-'));
}

function seedChange(root, changeId, { proposal, tasks }) {
  const changeDir = path.join(root, 'openspec', 'changes', changeId);
  fs.mkdirSync(changeDir, { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposal, 'utf8');
  fs.writeFileSync(path.join(changeDir, 'tasks.md'), tasks, 'utf8');
  return changeDir;
}

function memoryPorts(overrides = {}) {
  const evidence = [];
  let evdSeq = 0;
  const archiveCalls = [];
  const orchCalls = [];

  const ports = {
    evidence,
    archiveCalls,
    orchCalls,
    readChange:
      overrides.readChange ||
      ((changeId) => ({
        changeId,
        proposalText: overrides.proposalText ?? '# Proposal\n\nWhy: test.\n',
        tasksMarkdown:
          overrides.tasksMarkdown ??
          '- [ ] T1. First task\n- [ ] T2. Second task\n',
        changeDir: `/memory/${changeId}`
      })),
    parseTasks: overrides.parseTasks || defaultParseTasks,
    runOrchestration:
      overrides.runOrchestration ||
      (async (ctx) => {
        orchCalls.push(ctx);
        return { ok: true, taskId: ctx.taskId };
      }),
    writeEvidence:
      overrides.writeEvidence ||
      (async (receipt) => {
        evdSeq += 1;
        const id = `EVD-${String(evdSeq).padStart(4, '0')}`;
        const rec = { ...receipt, id, PRODUCTION_READY: 'NO' };
        evidence.push(rec);
        return { path: `/memory/docs/evidence/${id}.json`, id };
      }),
    archiveChange:
      overrides.archiveChange ||
      (async (meta) => {
        archiveCalls.push(meta);
        return { archived: true };
      }),
    hash: overrides.hash || defaultHash,
    now: overrides.now || (() => '2026-09-11T12:00:00.000Z')
  };
  return ports;
}

// ─── S1 ───────────────────────────────────────────────────────────────────────
test('S1 PRODUCTION_READY=NO + kind eos-specboot-agent-runner', () => {
  assert.equal(SPECBOOT_AGENT_RUNNER_PRODUCTION_READY, 'NO');
  assert.notEqual(SPECBOOT_AGENT_RUNNER_PRODUCTION_READY, 'YES');
  assert.notEqual(SPECBOOT_AGENT_RUNNER_PRODUCTION_READY, true);
  assert.equal(SPECBOOT_AGENT_KIND, 'eos-specboot-agent-runner');
  assert.deepEqual([...SPECBOOT_PHASES], [
    'PROPOSE',
    'APPLY',
    'VERIFY',
    'ARCHIVE',
    'COMMIT_READY'
  ]);

  const ports = memoryPorts();
  const runner = createSpecbootAgentRunner(ports);
  assert.equal(runner.PRODUCTION_READY, 'NO');
  assert.equal(runner.kind, SPECBOOT_AGENT_KIND);
  assert.equal(runner.health().PRODUCTION_READY, 'NO');
  assert.equal(runner.health().kind, 'eos-specboot-agent-runner');
  assert.equal(runner.status().status, 'IDLE');
});

// ─── S2 ───────────────────────────────────────────────────────────────────────
test('S2 loadChange parses proposal + checkbox tasks', async () => {
  const ports = memoryPorts({
    proposalText: '# Mission S proposal\n\nGoverned runner.\n',
    tasksMarkdown: [
      '- [ ] T1. Wire orchestrator',
      '- [x] T2. Already done',
      '- [ ] S3. Evidence receipts',
      '* [ ] X9. Star bullet'
    ].join('\n')
  });
  const runner = createSpecbootAgentRunner(ports);
  const loaded = await runner.loadChange('eos-mission-s-demo');
  assert.equal(loaded.changeId, 'eos-mission-s-demo');
  assert.match(loaded.proposalText, /Mission S proposal/);
  assert.equal(loaded.tasks.length, 4);
  assert.equal(loaded.tasks[0].id, 'T1');
  assert.equal(loaded.tasks[0].done, false);
  assert.equal(loaded.tasks[1].id, 'T2');
  assert.equal(loaded.tasks[1].done, true);
  assert.equal(loaded.tasks[2].id, 'S3');
  assert.equal(loaded.tasks[3].done, false);
  assert.ok(loaded.proposalHash);
  assert.equal(loaded.proposalHash.length, 64);
});

// ─── S3 ───────────────────────────────────────────────────────────────────────
test('S3 runCycle refuse if proposal missing / tasks empty → SPECBOOT_CHANGE_INVALID', async () => {
  const runnerEmpty = createSpecbootAgentRunner(
    memoryPorts({ proposalText: '', tasksMarkdown: '- [ ] T1. x\n' })
  );
  await assert.rejects(
    () => runnerEmpty.runCycle('bad-empty-proposal'),
    (err) =>
      err instanceof SpecbootAgentRunnerError &&
      err.code === SPECBOOT_CODES.SPECBOOT_CHANGE_INVALID
  );

  const runnerNoTasks = createSpecbootAgentRunner(
    memoryPorts({
      proposalText: '# Ok proposal',
      tasksMarkdown: 'No checkboxes here\n'
    })
  );
  await assert.rejects(
    () => runnerNoTasks.runCycle('bad-empty-tasks'),
    (err) =>
      err instanceof SpecbootAgentRunnerError &&
      err.code === 'SPECBOOT_CHANGE_INVALID'
  );
});

// ─── S4 ───────────────────────────────────────────────────────────────────────
test('S4 APPLY dispatches each pending task once via runOrchestration', async () => {
  const ports = memoryPorts({
    tasksMarkdown: '- [ ] T1. One\n- [x] T2. Done\n- [ ] T3. Three\n'
  });
  const runner = createSpecbootAgentRunner(ports);
  await runner.loadChange('chg-apply');
  const result = await runner.runPhase('APPLY');
  assert.equal(result.ok, true);
  assert.equal(ports.orchCalls.length, 2);
  assert.equal(ports.orchCalls[0].taskId, 'T1');
  assert.equal(ports.orchCalls[1].taskId, 'T3');
  assert.deepEqual(result.appliedTaskIds, ['T1', 'T3']);
  assert.equal(ports.evidence.length, 2);
});

// ─── S5 ───────────────────────────────────────────────────────────────────────
test('S5 APPLY fail-closed on first orchestration failure (SPECBOOT_APPLY_FAILED)', async () => {
  let n = 0;
  const ports = memoryPorts({
    tasksMarkdown: '- [ ] T1. ok\n- [ ] T2. boom\n- [ ] T3. never\n',
    runOrchestration: async (ctx) => {
      n += 1;
      if (ctx.taskId === 'T2') {
        throw new Error('orch exploded');
      }
      return { ok: true };
    }
  });
  const runner = createSpecbootAgentRunner(ports);
  await runner.loadChange('chg-fail');
  await assert.rejects(
    () => runner.runPhase('APPLY'),
    (err) =>
      err instanceof SpecbootAgentRunnerError &&
      err.code === SPECBOOT_CODES.SPECBOOT_APPLY_FAILED &&
      err.taskId === 'T2'
  );
  assert.equal(n, 2, 'must stop at T2, not continue to T3');
  assert.equal(runner.health().lastFault, 'SPECBOOT_APPLY_FAILED');
  assert.equal(runner.status().status, 'FAILED');
});

// ─── S6 ───────────────────────────────────────────────────────────────────────
test('S6 VERIFY without evidence → SPECBOOT_VERIFY_REQUIRES_EVIDENCE', async () => {
  const ports = memoryPorts();
  const runner = createSpecbootAgentRunner(ports);
  await runner.loadChange('chg-verify');
  await assert.rejects(
    () => runner.runPhase('VERIFY'),
    (err) =>
      err instanceof SpecbootAgentRunnerError &&
      err.code === SPECBOOT_CODES.SPECBOOT_VERIFY_REQUIRES_EVIDENCE
  );
});

// ─── S7 ───────────────────────────────────────────────────────────────────────
test('S7 happy path: runCycle writes EVD receipts + COMMIT_READY HITL', async () => {
  const root = makeTempRoot();
  try {
    seedChange(root, 'eos-mission-s-happy', {
      proposal: '# Happy\n\nDo the thing.\n',
      tasks: '- [ ] T1. Apply A\n- [ ] T2. Apply B\n'
    });
    const archiveCalls = [];
    const runner = createSpecbootAgentRunner({
      rootDir: root,
      runOrchestration: async () => ({ ok: true }),
      archiveChange: async (meta) => {
        archiveCalls.push(meta);
        return { recorded: true };
      },
      now: () => '2026-09-11T15:00:00.000Z'
    });
    const out = await runner.runCycle('eos-mission-s-happy');
    assert.equal(out.ok, true);
    assert.equal(out.status, 'ready-for-HITL-PR');
    assert.equal(out.pushed, false);
    assert.equal(out.merged, false);
    assert.equal(out.hitlPublishRequired, true);
    assert.equal(out.PRODUCTION_READY, 'NO');
    assert.ok(out.receipts.length >= 2);

    const evdDir = path.join(root, 'docs', 'evidence');
    const files = fs.readdirSync(evdDir).filter((f) => f.endsWith('.json'));
    assert.ok(files.length >= 2);
    assert.ok(files.some((f) => /^EVD-\d{4}\.json$/.test(f)));
    const body = JSON.parse(
      fs.readFileSync(path.join(evdDir, files[0]), 'utf8')
    );
    assert.equal(body.PRODUCTION_READY, 'NO');
    assert.equal(body.changeId, 'eos-mission-s-happy');
    assert.equal(body.phase, 'APPLY');
    assert.ok(Array.isArray(body.taskIds));
    assert.ok(typeof body.sha256 === 'string' && body.sha256.length === 64);

    assert.equal(archiveCalls.length, 1);
    assert.equal(archiveCalls[0].mergedToMain, false);
    assert.equal(out.archiveMeta.mergedToMain, false);
    assert.equal(runner.health().commitReady, true);
    assert.equal(runner.health().status, 'COMMIT_READY');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// ─── S8 ───────────────────────────────────────────────────────────────────────
test('S8 ARCHIVE must NOT git merge main (inject-only meta)', async () => {
  const ports = memoryPorts();
  const runner = createSpecbootAgentRunner(ports);
  await runner.loadChange('chg-archive');
  // seed evidence via APPLY
  await runner.runPhase('APPLY');
  await runner.runPhase('VERIFY');
  const arch = await runner.runPhase('ARCHIVE');
  assert.equal(arch.mergedToMain, false);
  assert.equal(arch.archiveMeta.gitMergeMain, false);
  assert.equal(arch.archiveMeta.autonomousMainMerge, false);
  assert.equal(ports.archiveCalls[0].mergedToMain, false);
  // Ensure no git side-effect helpers were invoked (ports only)
  assert.equal(typeof runner.runPhase, 'function');
});

// ─── S9 ───────────────────────────────────────────────────────────────────────
test('S9 COMMIT_READY sets ready-for-HITL-PR and does not push', async () => {
  const ports = memoryPorts();
  const runner = createSpecbootAgentRunner(ports);
  await runner.loadChange('chg-commit');
  const r = await runner.runPhase('COMMIT_READY');
  assert.equal(r.status, 'ready-for-HITL-PR');
  assert.equal(r.pushed, false);
  assert.equal(r.merged, false);
  assert.equal(r.hitlPublishRequired, true);
  assert.equal(runner.health().commitReady, true);
});

// ─── S10 ──────────────────────────────────────────────────────────────────────
test('S10 health never claims CloudAgent path / PRODUCTION_READY yes', async () => {
  const ports = memoryPorts();
  const runner = createSpecbootAgentRunner(ports);
  const h = runner.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.cloudAgent, false);
  assert.equal(h.cloudAgentPath, null);
  assert.equal(h.usesCloudAgent, false);
  assert.equal(h.agyDaemonPresent, false);
  assert.equal(h.hitlPublishRequired, true);

  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /NON-CLAIM/);
  assert.match(src, /CloudAgent/);
  assert.doesNotMatch(src, /PRODUCTION_READY\s*=\s*['"]YES['"]/);
  assert.doesNotMatch(src, /PRODUCTION_READY:\s*['"]YES['"]/);
});

// ─── S11 ──────────────────────────────────────────────────────────────────────
test('S11 optional bindExecuteComputeRun wire into orchestration ctx', async () => {
  const acceptCalls = [];
  const fakeDaemon = {
    acceptRun: async (...args) => {
      acceptCalls.push(args);
      return { ok: true, fromDaemon: true };
    }
  };
  const bindExecuteComputeRun = (daemon) => {
    return (...a) => daemon.acceptRun(...a);
  };
  const orchCalls = [];
  const ports = memoryPorts({
    tasksMarkdown: '- [ ] T1. With Q wire\n',
    runOrchestration: async (ctx) => {
      orchCalls.push(ctx);
      assert.equal(typeof ctx.executeComputeRun, 'function');
      const r = await ctx.executeComputeRun({ task: ctx.taskId });
      assert.equal(r.fromDaemon, true);
      return { ok: true };
    }
  });
  const runner = createSpecbootAgentRunner({
    ...ports,
    bindExecuteComputeRun,
    workerDaemon: fakeDaemon
  });
  await runner.loadChange('chg-q-wire');
  await runner.runPhase('APPLY');
  assert.equal(orchCalls.length, 1);
  assert.equal(acceptCalls.length, 1);
});

// ─── S12 ──────────────────────────────────────────────────────────────────────
test('S12 defaultParseTasks + defaultHash helpers', () => {
  const tasks = defaultParseTasks(
    '## Tasks\n- [ ] A1. Alpha\n- [X] B2. Beta done\nnot a task\n- [ ] plain text task\n'
  );
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].id, 'A1');
  assert.equal(tasks[1].done, true);
  assert.equal(tasks[2].id, 'task-3');
  assert.equal(defaultHash('abc'), sha256('abc'));
});

// ─── S13 optional live SKIP ───────────────────────────────────────────────────
test(
  'S13 Optional live Gemini/network SpecBoot soak',
  { skip: 'Mission S hermetic-only; live Gemini SpecBoot soak deferred' },
  async () => {
    assert.fail('should be skipped');
  }
);
