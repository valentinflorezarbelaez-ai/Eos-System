/**
 * @file interactive-developer-shell.test.js
 * @description SPEC-0029 Mission X — Interactive Developer Shell / REPL.
 * Hermetic TDD: simulated streams (PassThrough) + injectable Mission W coordinator.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-developer-shell-repl only.
 * Does NOT claim Claude Code clone / PRODUCTION_READY=YES / Fundacion Δ flip.
 * Does NOT mutate Mission W — orchestrates via injection only.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEVELOPER_SHELL_PRODUCTION_READY,
  DEVELOPER_SHELL_KIND,
  DEVELOPER_SHELL_STATES,
  DEVELOPER_SHELL_CODES,
  InteractiveDeveloperShellError,
  createInteractiveDeveloperShell,
  formatHudLine,
  formatRemediationLine,
  formatTransitionLine
} from '../../src/cli/interactive-developer-shell.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../../src/cli/interactive-developer-shell.js'
);

function collectOutput() {
  const out = new PassThrough();
  const chunks = [];
  out.on('data', (c) => chunks.push(String(c)));
  return {
    stream: out,
    text: () => chunks.join(''),
    lines: () =>
      chunks
        .join('')
        .split(/\n/)
        .filter((l) => l.length > 0 && !l.startsWith('eos>'))
  };
}

/** Minimal Mission W–shaped coordinator mock. */
function mockCoordinator({
  failOpen = false,
  failRun = false,
  remediate = false,
  remediationAttempts = 2
} = {}) {
  let state = 'IDLE';
  let sessionId = null;
  let sealedEvd = null;
  let changesRun = 0;
  let remediationsInvoked = 0;
  const calls = { open: 0, run: 0, close: 0 };

  return {
    calls,
    kind: 'eos-sovereign-session-coordinator',
    PRODUCTION_READY: 'NO',
    maxRemediationAttempts: 3,
    get state() {
      return state;
    },
    get sessionId() {
      return sessionId;
    },
    getState() {
      return state;
    },
    async openSession(ctx = {}) {
      calls.open += 1;
      if (failOpen) {
        state = 'ESCALATED_HITL';
        return {
          ok: false,
          status: 'ESCALATED_HITL',
          hitlRequired: true,
          code: 'SESSION_DEPENDENCY',
          PRODUCTION_READY: 'NO'
        };
      }
      sessionId = ctx.sessionId || `mock-${ctx.changeId || 'x'}`;
      state = 'SESSION_ACTIVE';
      return {
        ok: true,
        status: 'SESSION_ACTIVE',
        state,
        sessionId,
        code: 'SESSION_OPENED',
        PRODUCTION_READY: 'NO',
        kind: 'eos-sovereign-session-coordinator'
      };
    },
    async startSession(ctx) {
      return this.openSession(ctx);
    },
    async runChange(change) {
      calls.run += 1;
      changesRun += 1;
      if (failRun && !remediate) {
        state = 'ESCALATED_HITL';
        return {
          ok: false,
          status: 'ESCALATED_HITL',
          hitlRequired: true,
          changeId: change.changeId,
          code: 'SESSION_ESCALATED_HITL',
          PRODUCTION_READY: 'NO'
        };
      }
      if (remediate) {
        remediationsInvoked += 1;
        return {
          ok: true,
          status: 'REMEDIATED',
          state,
          changeId: change.changeId,
          code: 'SESSION_REMEDIATION_RESOLVED',
          remediation: { attempts: remediationAttempts, status: 'RESOLVED' },
          PRODUCTION_READY: 'NO'
        };
      }
      return {
        ok: true,
        status: 'OK',
        state,
        changeId: change.changeId,
        code: 'SESSION_CHANGE_OK',
        PRODUCTION_READY: 'NO'
      };
    },
    async closeSession() {
      calls.close += 1;
      state = 'CLOSING';
      sealedEvd = {
        id: `EVD-${sessionId}`,
        sha256: 'a'.repeat(64),
        bodySha256: 'a'.repeat(64),
        custody: {
          algorithm: 'sha256',
          digest: 'a'.repeat(64),
          receiptCount: 1,
          changesRun,
          remediationsInvoked
        }
      };
      state = 'COMPLETED';
      return {
        ok: true,
        status: 'COMPLETED',
        state,
        sessionId,
        sealedEvd: {
          id: sealedEvd.id,
          sha256: sealedEvd.sha256,
          custody: sealedEvd.custody
        },
        code: 'SESSION_COMPLETED',
        PRODUCTION_READY: 'NO',
        kind: 'eos-sovereign-session-coordinator'
      };
    },
    async seal() {
      return this.closeSession();
    },
    health() {
      return {
        state,
        kind: 'eos-sovereign-session-coordinator',
        PRODUCTION_READY: 'NO',
        sessionId,
        changesRun,
        remediationsInvoked,
        ports: {
          workerDaemon: true,
          sentinel: true,
          specboot: true,
          remediation: true,
          writeGateway: false
        },
        fundacionDelta: 0
      };
    },
    getSealedEvd() {
      return sealedEvd;
    }
  };
}

function makeShell(overrides = {}) {
  const output = collectOutput();
  const input = new PassThrough();
  let coord = overrides.coordinator;
  const coordinatorFactory =
    overrides.coordinatorFactory ||
    (() => {
      if (!coord) coord = mockCoordinator(overrides.coordOpts || {});
      return coord;
    });

  const shell = createInteractiveDeveloperShell({
    stdin: input,
    stdout: output.stream,
    color: overrides.color !== undefined ? overrides.color : false,
    coordinatorFactory:
      overrides.noCoordinator === true ? undefined : coordinatorFactory,
    createSovereignSessionCoordinator: overrides.createSovereignSessionCoordinator,
    doctor: overrides.doctor,
    maxRemediationAttempts: overrides.maxRemediationAttempts,
    ...('extra' in overrides ? overrides.extra : {})
  });

  return { shell, input, output, getCoord: () => coord };
}

// ─── X1 help / exit ──────────────────────────────────────────────────────────
test('X1 /help and /exit', async () => {
  const { shell, output } = makeShell();
  shell.start();
  const help = await shell.handleLine('/help');
  assert.equal(help.ok, true);
  assert.match(output.text(), /\/start <changeId>/);
  assert.match(output.text(), /NOT a Claude Code clone/);

  const exited = await shell.handleLine('/exit');
  assert.equal(exited.ok, true);
  assert.equal(exited.code, DEVELOPER_SHELL_CODES.SHELL_STOPPED);
  assert.equal(shell.getState(), DEVELOPER_SHELL_STATES.STOPPED);
});

// ─── X2 /start opens session ─────────────────────────────────────────────────
test('X2 /start <changeId> opens sovereign session', async () => {
  const { shell, output, getCoord } = makeShell();
  shell.start();
  const r = await shell.handleLine('/start eos-mission-x-developer-shell-repl');
  assert.equal(r.ok, true);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_SESSION_OPENED);
  assert.equal(r.changeId, 'eos-mission-x-developer-shell-repl');
  assert.equal(shell.getState(), DEVELOPER_SHELL_STATES.SESSION_OPEN);
  assert.equal(getCoord().calls.open, 1);
  assert.match(output.text(), /session opened/);
});

// ─── X3 /run triggers specboot ───────────────────────────────────────────────
test('X3 /run triggers SpecBoot via coordinator.runChange', async () => {
  const { shell, getCoord } = makeShell();
  shell.start();
  await shell.handleLine('/start change-x3');
  const r = await shell.handleLine('/run');
  assert.equal(r.ok, true);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_CHANGE_OK);
  assert.equal(getCoord().calls.run, 1);
  assert.equal(shell.getState(), DEVELOPER_SHELL_STATES.SESSION_OPEN);
});

// ─── X4 /status renders HUD ──────────────────────────────────────────────────
test('X4 /status renders HUD', async () => {
  const { shell, output } = makeShell();
  shell.start();
  await shell.handleLine('/start change-x4');
  const r = await shell.handleLine('/status');
  assert.equal(r.ok, true);
  assert.ok(r.hud);
  assert.match(r.hud, /EOS-SHELL/);
  assert.match(r.hud, /SESSION_OPEN|change-x4/);
  assert.match(output.text(), /EOS-SHELL/);
});

// ─── X5 /close seals EVD ─────────────────────────────────────────────────────
test('X5 /close seals EVD', async () => {
  const { shell, getCoord } = makeShell();
  shell.start();
  await shell.handleLine('/start change-x5');
  await shell.handleLine('/run');
  const r = await shell.handleLine('/close');
  assert.equal(r.ok, true);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_SESSION_CLOSED);
  assert.ok(r.sealedEvd);
  assert.match(r.sealedEvd.sha256, /^[a-f0-9]{64}$/);
  assert.equal(r.sealedEvd.custody.algorithm, 'sha256');
  assert.equal(getCoord().calls.close, 1);
  assert.equal(shell.getState(), DEVELOPER_SHELL_STATES.READY);
});

// ─── X6 /doctor ──────────────────────────────────────────────────────────────
test('X6 /doctor uses injectable doctor port', async () => {
  let called = 0;
  const { shell } = makeShell({
    doctor: () => {
      called += 1;
      return {
        ok: true,
        status: 'OK',
        fundacionDelta: 0,
        hermetic: true,
        lines: ['integrity: pass']
      };
    }
  });
  shell.start();
  const r = await shell.handleLine('/doctor');
  assert.equal(r.ok, true);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_DOCTOR_OK);
  assert.equal(called, 1);
  assert.equal(r.doctor.fundacionDelta, 0);
});

// ─── X7 remediation attempt HUD line ─────────────────────────────────────────
test('X7 remediation attempt HUD line on /run', async () => {
  const { shell, output } = makeShell({
    coordOpts: { remediate: true, remediationAttempts: 2 }
  });
  shell.start();
  await shell.handleLine('/start change-x7');
  const r = await shell.handleLine('/run');
  assert.equal(r.ok, true);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_CHANGE_REMEDIATED);
  const text = output.text();
  assert.match(text, /\[Remediation attempt 1\/3\]/);
  assert.match(text, /\[Remediation attempt 2\/3\]/);
});

// ─── X8 unknown command fail-closed ──────────────────────────────────────────
test('X8 unknown command → error line fail-closed', async () => {
  const { shell, output } = makeShell();
  shell.start();
  const r = await shell.handleLine('/nope');
  assert.equal(r.ok, false);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_UNKNOWN_COMMAND);
  assert.match(output.text(), /unknown command/i);
});

// ─── X9 /run without /start fail-closed ──────────────────────────────────────
test('X9 /run without /start refuse fail-closed', async () => {
  const { shell, output } = makeShell();
  shell.start();
  const r = await shell.handleLine('/run');
  assert.equal(r.ok, false);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_NO_SESSION);
  assert.match(output.text(), /requires an open session/i);
});

// ─── X10 /quit alias ─────────────────────────────────────────────────────────
test('X10 /quit alias stops shell', async () => {
  const { shell } = makeShell();
  shell.start();
  const r = await shell.handleLine('/quit');
  assert.equal(r.ok, true);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_STOPPED);
  assert.equal(shell.state, DEVELOPER_SHELL_STATES.STOPPED);
});

// ─── X11 kind + PRODUCTION_READY ─────────────────────────────────────────────
test('X11 kind + PRODUCTION_READY constants and health', async () => {
  assert.equal(DEVELOPER_SHELL_PRODUCTION_READY, 'NO');
  assert.equal(DEVELOPER_SHELL_KIND, 'eos-developer-shell-repl');
  const { shell } = makeShell();
  shell.start();
  const h = shell.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, 'eos-developer-shell-repl');
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.claudeCodeClone, false);
  assert.equal(shell.PRODUCTION_READY, 'NO');
  assert.equal(shell.kind, DEVELOPER_SHELL_KIND);
});

// ─── X12 ANSI / state transition render ──────────────────────────────────────
test('X12 ANSI HUD + state transition render', async () => {
  const hud = formatHudLine({
    state: 'SESSION_OPEN',
    changeId: 'c1',
    sessionId: 's1',
    sessionState: 'SESSION_ACTIVE',
    ports: { workerDaemon: true, sentinel: true, specboot: true },
    color: true
  });
  assert.match(hud, /\u001b\[/); // has ANSI
  assert.match(hud, /EOS-SHELL/);
  assert.match(hud, /SESSION_OPEN/);

  const rem = formatRemediationLine(1, 3, true);
  assert.match(rem, /\[Remediation attempt 1\/3\]/);
  assert.match(rem, /\u001b\[/);

  const tr = formatTransitionLine('READY', 'SESSION_OPEN', true);
  assert.match(tr, /READY/);
  assert.match(tr, /SESSION_OPEN/);
  assert.match(tr, /\u001b\[/);

  const { shell, output } = makeShell({ color: true });
  shell.start();
  assert.match(output.text(), /READY|EOS Developer Shell/);
  // transition lines emitted
  assert.ok(shell.getLineLog().some((l) => l.includes('READY') || l.includes('→')));
});

// ─── X13 /close without session fail-closed ──────────────────────────────────
test('X13 /close without session refuse fail-closed', async () => {
  const { shell } = makeShell();
  shell.start();
  const r = await shell.handleLine('/close');
  assert.equal(r.ok, false);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_NO_SESSION);
});

// ─── X14 /start missing changeId ─────────────────────────────────────────────
test('X14 /start without changeId fail-closed', async () => {
  const { shell } = makeShell();
  shell.start();
  const r = await shell.handleLine('/start');
  assert.equal(r.ok, false);
  assert.equal(r.code, DEVELOPER_SHELL_CODES.SHELL_MISSING_CHANGE_ID);
});

// ─── X15 createSovereignSessionCoordinator injection ─────────────────────────
test('X15 createSovereignSessionCoordinator injection path', async () => {
  let built = 0;
  const coord = mockCoordinator();
  const { shell } = makeShell({
    noCoordinator: true,
    extra: {},
    createSovereignSessionCoordinator: (opts) => {
      built += 1;
      assert.ok(opts);
      return coord;
    }
  });
  // rebuild with createSovereignSessionCoordinator only
  const output = collectOutput();
  const shell2 = createInteractiveDeveloperShell({
    stdout: output.stream,
    color: false,
    createSovereignSessionCoordinator: () => {
      built += 1;
      return mockCoordinator();
    }
  });
  shell2.start();
  const r = await shell2.handleLine('/start via-factory');
  assert.equal(r.ok, true);
  assert.ok(built >= 1);
});

// ─── X16 PassThrough stream line handling + NON-CLAIM source ─────────────────
test('X16 simulated stream handleLine + NON-CLAIM source honesty', async () => {
  const { shell, input, output } = makeShell();
  shell.start();
  // drive via stream
  input.write('/help\n');
  // allow microtask for data handler
  await new Promise((r) => setImmediate(r));
  assert.match(output.text(), /\/status/);

  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /NOT a Claude Code clone/i);
  assert.match(src, /PRODUCTION_READY:\s*NO/);
  assert.match(src, /eos-developer-shell-repl/);
  assert.match(src, /Fundacion Δ=0|fundacionDelta/);
  assert.match(src, /injection only/i);
  assert.ok(!src.includes('Co-Authored-By'));

  assert.ok(InteractiveDeveloperShellError);
  assert.equal(typeof formatHudLine, 'function');
  assert.deepEqual(
    Object.values(DEVELOPER_SHELL_STATES).includes('SESSION_OPEN'),
    true
  );
});

// ─── X17 run() alias + default doctor never touches Fundacion ────────────────
test('X17 run() alias + default doctor hermetic', async () => {
  const output = collectOutput();
  const shell = createInteractiveDeveloperShell({
    stdout: output.stream,
    color: false,
    coordinatorFactory: () => mockCoordinator()
  });
  const started = shell.run();
  assert.equal(started.ok, true);
  assert.equal(shell.getState(), DEVELOPER_SHELL_STATES.READY);
  const doc = await shell.handleLine('/doctor');
  assert.equal(doc.ok, true);
  assert.equal(doc.doctor.fundacionDelta, 0);
  assert.equal(doc.doctor.hermetic, true);
});
