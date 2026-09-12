/**
 * @module interactive-developer-shell
 * SPEC-0029 / Mission X — Interactive Developer Shell / REPL.
 *
 * Thin slash-command REPL that orchestrates Mission W sovereign session
 * coordinator (and optionally Q/R/S/T/V ports) via injection. Does NOT
 * rewrite sovereign-session-coordinator.js — injection only.
 *
 * Slash commands:
 *   /start <changeId>  — open sovereign session, boot daemons
 *   /run               — SpecBoot cycle with remediation active
 *   /status            — live session/sentinel/daemon HUD
 *   /close             — graceful drain + EVD seal
 *   /doctor            — workspace integrity diagnostic (injectable)
 *   /help              — list commands
 *   /exit | /quit      — stop REPL
 *
 * NON-CLAIM:
 *   This is the **eos-developer-shell-repl** overlay.
 *   It is NOT a Claude Code clone, NOT PRODUCTION_READY,
 *   NOT a rewrite of Mission W (orchestrates via injection only),
 *   and MUST NOT be read as AGY DAEMON_PRESENT.
 *   Fundacion Δ=0 — hermetic fixtures only; never touches real Fundacion.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | AT_CEILING
 */

/** @type {'NO'} */
export const DEVELOPER_SHELL_PRODUCTION_READY = 'NO';

export const DEVELOPER_SHELL_KIND = 'eos-developer-shell-repl';

export const DEVELOPER_SHELL_STATES = Object.freeze({
  IDLE: 'IDLE',
  READY: 'READY',
  SESSION_OPEN: 'SESSION_OPEN',
  RUNNING_CHANGE: 'RUNNING_CHANGE',
  CLOSING: 'CLOSING',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR'
});

export const DEVELOPER_SHELL_CODES = Object.freeze({
  SHELL_STARTED: 'SHELL_STARTED',
  SHELL_STOPPED: 'SHELL_STOPPED',
  SHELL_SESSION_OPENED: 'SHELL_SESSION_OPENED',
  SHELL_CHANGE_OK: 'SHELL_CHANGE_OK',
  SHELL_CHANGE_REMEDIATED: 'SHELL_CHANGE_REMEDIATED',
  SHELL_SESSION_CLOSED: 'SHELL_SESSION_CLOSED',
  SHELL_UNKNOWN_COMMAND: 'SHELL_UNKNOWN_COMMAND',
  SHELL_NO_SESSION: 'SHELL_NO_SESSION',
  SHELL_MISSING_CHANGE_ID: 'SHELL_MISSING_CHANGE_ID',
  SHELL_DOCTOR_OK: 'SHELL_DOCTOR_OK',
  SHELL_DOCTOR_FAIL: 'SHELL_DOCTOR_FAIL',
  SHELL_DEPENDENCY: 'SHELL_DEPENDENCY',
  SHELL_INVALID_STATE: 'SHELL_INVALID_STATE'
});

/**
 * Typed error for interactive developer shell failures.
 */
export class InteractiveDeveloperShellError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   * @param {object} [details]
   */
  constructor(message, code = 'DEVELOPER_SHELL_ERROR', details = {}) {
    super(message);
    this.name = 'InteractiveDeveloperShellError';
    this.code = code;
    Object.assign(this, details);
  }
}

/** ANSI helpers (no-op when color disabled). */
const ANSI = Object.freeze({
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  magenta: '\u001b[35m',
  blue: '\u001b[34m',
  gray: '\u001b[90m'
});

/**
 * Format a single HUD line (append-only — no flicker / no clear-screen).
 * @param {object} opts
 * @param {string} opts.kind
 * @param {string} opts.state
 * @param {string|null} [opts.changeId]
 * @param {string|null} [opts.sessionId]
 * @param {string|null} [opts.sessionState]
 * @param {object} [opts.ports]
 * @param {string|null} [opts.lastFault]
 * @param {boolean} [opts.color=true]
 * @returns {string}
 */
export function formatHudLine(opts = {}) {
  const color = opts.color !== false;
  const c = color ? ANSI : blankAnsi();
  const state = opts.state || 'IDLE';
  const sessionState = opts.sessionState || '—';
  const changeId = opts.changeId || '—';
  const sessionId = opts.sessionId || '—';
  const ports = opts.ports || {};
  const portBits = [
    ports.workerDaemon ? 'W' : '·',
    ports.sentinel ? 'S' : '·',
    ports.specboot ? 'B' : '·',
    ports.remediation ? 'R' : '·',
    ports.writeGateway ? 'G' : '·'
  ].join('');
  const fault = opts.lastFault
    ? ` ${c.red}fault=${opts.lastFault}${c.reset}`
    : '';
  return (
    `${c.dim}[${c.reset}${c.cyan}EOS-SHELL${c.reset}${c.dim}]${c.reset} ` +
    `${c.bold}${state}${c.reset} ` +
    `${c.gray}sess=${sessionState}${c.reset} ` +
    `${c.blue}id=${sessionId}${c.reset} ` +
    `${c.magenta}change=${changeId}${c.reset} ` +
    `${c.gray}ports=${portBits}${c.reset}` +
    fault
  );
}

/**
 * Format a remediation attempt HUD line.
 * @param {number} attempt
 * @param {number} maxAttempts
 * @param {boolean} [color=true]
 * @returns {string}
 */
export function formatRemediationLine(attempt, maxAttempts, color = true) {
  const c = color ? ANSI : blankAnsi();
  return (
    `${c.yellow}[Remediation attempt ${attempt}/${maxAttempts}]${c.reset}`
  );
}

/**
 * Format a state-transition line (append-only).
 * @param {string} from
 * @param {string} to
 * @param {boolean} [color=true]
 * @returns {string}
 */
export function formatTransitionLine(from, to, color = true) {
  const c = color ? ANSI : blankAnsi();
  return (
    `${c.dim}→ ${c.reset}${c.gray}${from}${c.reset} ${c.dim}→${c.reset} ${c.green}${to}${c.reset}`
  );
}

function blankAnsi() {
  return {
    reset: '',
    bold: '',
    dim: '',
    cyan: '',
    green: '',
    yellow: '',
    red: '',
    magenta: '',
    blue: '',
    gray: ''
  };
}

const HELP_TEXT = [
  'EOS Interactive Developer Shell (SPEC-0029) — NOT a Claude Code clone',
  'PRODUCTION_READY=NO | Fundacion Δ=0 | kind=eos-developer-shell-repl',
  '',
  'Commands:',
  '  /start <changeId>  Open sovereign session + boot daemons',
  '  /run               SpecBoot cycle (remediation active)',
  '  /status            Live session / sentinel / daemon HUD',
  '  /close             Graceful drain + EVD seal',
  '  /doctor            Workspace integrity diagnostic',
  '  /help              Show this help',
  '  /exit | /quit      Stop the shell'
].join('\n');

/**
 * Create an interactive developer shell / REPL.
 *
 * Injected ports:
 * - stdin / stdout (or input / output) — duplex streams for hermetic tests
 * - createSovereignSessionCoordinator — Mission W factory (preferred)
 * - coordinatorFactory — () => pre-built coordinator (alternative)
 * - createWorkerDaemon / createSentinel / createSpecboot / createRemediation /
 *   createWriteGateway — optional factories wired into the session
 * - doctor — () => diagnostic result (hermetic injectable)
 * - color — ANSI on/off (default true)
 * - maxRemediationAttempts — forwarded to coordinator (default 3)
 *
 * @param {object} [options]
 * @returns {object} shell instance
 */
export function createInteractiveDeveloperShell(options = {}) {
  const input =
    options.stdin ||
    options.input ||
    null;
  const output =
    options.stdout ||
    options.output ||
    null;

  const color = options.color !== false;
  const nowFn =
    typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  const maxRemediationAttempts =
    Number.isFinite(Number(options.maxRemediationAttempts))
      ? Math.max(1, Math.floor(Number(options.maxRemediationAttempts)))
      : 3;

  const createCoordinator =
    typeof options.createSovereignSessionCoordinator === 'function'
      ? options.createSovereignSessionCoordinator
      : typeof options.coordinatorFactory === 'function'
        ? null
        : null;
  const coordinatorFactory =
    typeof options.coordinatorFactory === 'function'
      ? options.coordinatorFactory
      : null;

  const createWorkerDaemon =
    typeof options.createWorkerDaemon === 'function'
      ? options.createWorkerDaemon
      : typeof options.workerDaemon === 'function'
        ? options.workerDaemon
        : null;
  const createSentinel =
    typeof options.createSentinel === 'function'
      ? options.createSentinel
      : typeof options.sentinel === 'function'
        ? options.sentinel
        : null;
  const createSpecboot =
    typeof options.createSpecboot === 'function'
      ? options.createSpecboot
      : typeof options.specboot === 'function'
        ? options.specboot
        : null;
  const createRemediation =
    typeof options.createRemediation === 'function'
      ? options.createRemediation
      : typeof options.remediation === 'function'
        ? options.remediation
        : null;
  const createWriteGateway =
    typeof options.createWriteGateway === 'function'
      ? options.createWriteGateway
      : typeof options.writeGateway === 'function'
        ? options.writeGateway
        : null;

  // Also accept pre-built port objects (not factories)
  const staticWorker =
    options.workerDaemon && typeof options.workerDaemon === 'object'
      ? options.workerDaemon
      : null;
  const staticSentinel =
    options.sentinel && typeof options.sentinel === 'object'
      ? options.sentinel
      : null;
  const staticSpecboot =
    options.specboot && typeof options.specboot === 'object'
      ? options.specboot
      : null;
  const staticRemediation =
    options.remediation && typeof options.remediation === 'object'
      ? options.remediation
      : null;
  const staticWriteGateway =
    options.writeGateway && typeof options.writeGateway === 'object'
      ? options.writeGateway
      : null;

  const doctorPort =
    typeof options.doctor === 'function'
      ? options.doctor
      : typeof options.createDoctor === 'function'
        ? options.createDoctor
        : defaultDoctor;

  let state = DEVELOPER_SHELL_STATES.IDLE;
  /** @type {string[]} */
  const stateLog = [];
  /** @type {object|null} */
  let coordinator = null;
  /** @type {string|null} */
  let changeId = null;
  /** @type {string|null} */
  let sessionId = null;
  /** @type {string|null} */
  let lastFault = null;
  /** @type {object|null} */
  let lastResult = null;
  /** @type {object|null} */
  let lastSealedEvd = null;
  /** @type {object|null} */
  let lastDoctor = null;
  /** @type {string[]} */
  const lineLog = [];
  let started = false;
  let stopped = false;
  let listening = false;
  /** @type {((chunk: Buffer|string) => void)|null} */
  let onData = null;
  let lineBuffer = '';
  const createdAt = isoNow(nowFn);

  function transition(next) {
    const from = state;
    state = next;
    stateLog.push(next);
    if (from !== next) {
      writeLine(formatTransitionLine(from, next, color));
    }
  }

  function writeLine(text) {
    const line = String(text);
    lineLog.push(line);
    if (output && typeof output.write === 'function') {
      const payload = line.endsWith('\n') ? line : `${line}\n`;
      try {
        output.write(payload);
      } catch {
        // output faults must not crash the shell
      }
    }
  }

  function writeError(text) {
    const c = color ? ANSI : blankAnsi();
    writeLine(`${c.red}ERROR:${c.reset} ${text}`);
  }

  function writeOk(text) {
    const c = color ? ANSI : blankAnsi();
    writeLine(`${c.green}OK:${c.reset} ${text}`);
  }

  function prompt() {
    if (output && typeof output.write === 'function' && !stopped) {
      try {
        output.write('eos> ');
      } catch {
        // ignore
      }
    }
  }

  function portSnapshot() {
    if (coordinator && typeof coordinator.health === 'function') {
      const h = coordinator.health();
      return h?.ports || {};
    }
    return {
      workerDaemon: Boolean(staticWorker || createWorkerDaemon),
      sentinel: Boolean(staticSentinel || createSentinel),
      specboot: Boolean(staticSpecboot || createSpecboot),
      remediation: Boolean(staticRemediation || createRemediation),
      writeGateway: Boolean(staticWriteGateway || createWriteGateway)
    };
  }

  function sessionStateOf() {
    if (!coordinator) return null;
    if (typeof coordinator.getState === 'function') return coordinator.getState();
    return coordinator.state || null;
  }

  function renderHud() {
    return formatHudLine({
      kind: DEVELOPER_SHELL_KIND,
      state,
      changeId,
      sessionId,
      sessionState: sessionStateOf(),
      ports: portSnapshot(),
      lastFault,
      color
    });
  }

  function snapshot() {
    return {
      state,
      kind: DEVELOPER_SHELL_KIND,
      PRODUCTION_READY: DEVELOPER_SHELL_PRODUCTION_READY,
      changeId,
      sessionId,
      sessionState: sessionStateOf(),
      lastFault,
      lastSealedEvd: lastSealedEvd
        ? {
            id: lastSealedEvd.id,
            sha256: lastSealedEvd.sha256,
            custody: lastSealedEvd.custody
          }
        : null,
      started,
      stopped,
      createdAt,
      stateLog: [...stateLog],
      ports: portSnapshot(),
      fundacionDelta: 0,
      cloudAgent: false,
      usesCloudAgent: false,
      claudeCodeClone: false
    };
  }

  function resolvePorts() {
    const workerDaemon =
      staticWorker ||
      (createWorkerDaemon ? createWorkerDaemon() : null);
    const sentinel =
      staticSentinel || (createSentinel ? createSentinel() : null);
    const specboot =
      staticSpecboot || (createSpecboot ? createSpecboot() : null);
    const remediation =
      staticRemediation ||
      (createRemediation ? createRemediation() : null);
    const writeGateway =
      staticWriteGateway ||
      (createWriteGateway ? createWriteGateway() : null);
    return { workerDaemon, sentinel, specboot, remediation, writeGateway };
  }

  function buildCoordinator() {
    if (coordinatorFactory) {
      return coordinatorFactory();
    }
    if (typeof options.createSovereignSessionCoordinator === 'function') {
      const ports = resolvePorts();
      return options.createSovereignSessionCoordinator({
        ...ports,
        maxRemediationAttempts,
        now: nowFn
      });
    }
    // Allow pre-built coordinator instance
    if (options.coordinator && typeof options.coordinator === 'object') {
      return options.coordinator;
    }
    return null;
  }

  /**
   * Start the shell (attach stdin listener if present). Alias for entering READY.
   * @returns {object}
   */
  function start() {
    if (stopped) {
      throw new InteractiveDeveloperShellError(
        'SHELL_INVALID_STATE: cannot start a stopped shell',
        DEVELOPER_SHELL_CODES.SHELL_INVALID_STATE,
        { state }
      );
    }
    if (started && state !== DEVELOPER_SHELL_STATES.IDLE) {
      return { ok: true, state, code: DEVELOPER_SHELL_CODES.SHELL_STARTED };
    }
    started = true;
    transition(DEVELOPER_SHELL_STATES.READY);
    writeLine(
      `${color ? ANSI.bold : ''}EOS Developer Shell${color ? ANSI.reset : ''} ` +
        `kind=${DEVELOPER_SHELL_KIND} PRODUCTION_READY=${DEVELOPER_SHELL_PRODUCTION_READY}`
    );
    writeLine('Type /help for commands. NON-CLAIM: not a Claude Code clone.');
    attachInput();
    prompt();
    lastResult = {
      ok: true,
      status: state,
      code: DEVELOPER_SHELL_CODES.SHELL_STARTED,
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND
    };
    return lastResult;
  }

  /**
   * Alias: start + keep running (for bin entrypoint). Returns start result.
   * Does not block — use handleLine / stdin events.
   * @returns {object}
   */
  function run() {
    return start();
  }

  function attachInput() {
    if (!input || typeof input.on !== 'function' || listening) return;
    listening = true;
    onData = (chunk) => {
      const text = String(chunk);
      lineBuffer += text;
      let idx;
      while ((idx = lineBuffer.indexOf('\n')) !== -1) {
        const raw = lineBuffer.slice(0, idx);
        lineBuffer = lineBuffer.slice(idx + 1);
        const cleaned = raw.replace(/\r$/, '');
        // fire-and-forget; errors written to output
        Promise.resolve(handleLine(cleaned)).catch((err) => {
          writeError(err?.message || String(err));
          prompt();
        });
      }
    };
    input.on('data', onData);
  }

  function detachInput() {
    if (input && onData && typeof input.off === 'function') {
      input.off('data', onData);
    } else if (input && onData && typeof input.removeListener === 'function') {
      input.removeListener('data', onData);
    }
    onData = null;
    listening = false;
  }

  /**
   * Handle a single REPL line (slash command or empty).
   * @param {string} line
   * @returns {Promise<object>}
   */
  async function handleLine(line) {
    const raw = String(line ?? '').trim();
    if (!raw) {
      prompt();
      return { ok: true, empty: true, state };
    }

    if (!raw.startsWith('/')) {
      writeError(
        `unknown input (expected slash command). Try /help. got: ${raw.slice(0, 60)}`
      );
      prompt();
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_UNKNOWN_COMMAND,
        state
      };
    }

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    let result;
    switch (cmd) {
      case '/help':
        result = cmdHelp();
        break;
      case '/exit':
      case '/quit':
        result = await cmdExit();
        break;
      case '/start':
        result = await cmdStart(args);
        break;
      case '/run':
        result = await cmdRun();
        break;
      case '/status':
        result = cmdStatus();
        break;
      case '/close':
        result = await cmdClose();
        break;
      case '/doctor':
        result = await cmdDoctor();
        break;
      default:
        writeError(`unknown command: ${cmd}. Try /help.`);
        result = {
          ok: false,
          code: DEVELOPER_SHELL_CODES.SHELL_UNKNOWN_COMMAND,
          command: cmd,
          PRODUCTION_READY: 'NO',
          kind: DEVELOPER_SHELL_KIND,
          state
        };
    }

    lastResult = result;
    if (!stopped && cmd !== '/exit' && cmd !== '/quit') {
      prompt();
    }
    return result;
  }

  function cmdHelp() {
    writeLine(HELP_TEXT);
    return {
      ok: true,
      code: 'SHELL_HELP',
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND,
      state
    };
  }

  async function cmdExit() {
    return stop();
  }

  async function cmdStart(args) {
    const id = args[0];
    if (!id) {
      writeError('/start requires <changeId>');
      lastFault = DEVELOPER_SHELL_CODES.SHELL_MISSING_CHANGE_ID;
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_MISSING_CHANGE_ID,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    if (
      state !== DEVELOPER_SHELL_STATES.READY &&
      state !== DEVELOPER_SHELL_STATES.IDLE &&
      state !== DEVELOPER_SHELL_STATES.ERROR
    ) {
      // Allow re-start only after close → READY, or from IDLE via auto-start
      if (state === DEVELOPER_SHELL_STATES.SESSION_OPEN) {
        writeError('session already open; /close first');
        return {
          ok: false,
          code: DEVELOPER_SHELL_CODES.SHELL_INVALID_STATE,
          state,
          PRODUCTION_READY: 'NO',
          kind: DEVELOPER_SHELL_KIND
        };
      }
    }

    if (!started) start();

    coordinator = buildCoordinator();
    if (!coordinator) {
      lastFault = DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY;
      transition(DEVELOPER_SHELL_STATES.ERROR);
      writeError(
        'missing createSovereignSessionCoordinator / coordinatorFactory (Mission W inject)'
      );
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY,
        hitlRequired: true,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    changeId = id;
    lastFault = null;
    lastSealedEvd = null;

    const open =
      typeof coordinator.openSession === 'function'
        ? coordinator.openSession.bind(coordinator)
        : typeof coordinator.startSession === 'function'
          ? coordinator.startSession.bind(coordinator)
          : null;

    if (!open) {
      lastFault = DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY;
      transition(DEVELOPER_SHELL_STATES.ERROR);
      writeError('coordinator missing openSession/startSession');
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    let opened;
    try {
      opened = await Promise.resolve(
        open({ changeId: id, sessionId: `shell-${id}` })
      );
    } catch (err) {
      lastFault = err?.message || String(err);
      transition(DEVELOPER_SHELL_STATES.ERROR);
      writeError(`openSession failed: ${lastFault}`);
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY,
        error: lastFault,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    sessionId =
      opened?.sessionId ||
      coordinator.sessionId ||
      `shell-${id}`;

    if (opened && opened.ok === false) {
      lastFault = opened.code || opened.reason || 'SESSION_OPEN_FAILED';
      transition(DEVELOPER_SHELL_STATES.ERROR);
      writeError(`session open failed: ${lastFault}`);
      writeLine(renderHud());
      return {
        ok: false,
        code: opened.code || DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY,
        opened,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state,
        health: snapshot()
      };
    }

    transition(DEVELOPER_SHELL_STATES.SESSION_OPEN);
    writeOk(`session opened changeId=${id} sessionId=${sessionId}`);
    writeLine(renderHud());
    return {
      ok: true,
      code: DEVELOPER_SHELL_CODES.SHELL_SESSION_OPENED,
      changeId,
      sessionId,
      opened: summarize(opened),
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND,
      state,
      health: snapshot()
    };
  }

  async function cmdRun() {
    if (!coordinator || state !== DEVELOPER_SHELL_STATES.SESSION_OPEN) {
      writeError('/run requires an open session — use /start <changeId> first');
      lastFault = DEVELOPER_SHELL_CODES.SHELL_NO_SESSION;
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_NO_SESSION,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }
    if (!changeId) {
      writeError('/run missing changeId — /start <changeId> first');
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_MISSING_CHANGE_ID,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    transition(DEVELOPER_SHELL_STATES.RUNNING_CHANGE);
    writeLine(
      `${color ? ANSI.cyan : ''}SpecBoot cycle${color ? ANSI.reset : ''} changeId=${changeId} (remediation active)`
    );

    // Emit remediation HUD lines when we observe attempt progress via onRemediation
    // or by wrapping — for honesty, emit attempt lines based on coordinator max.
    const maxAttempts =
      coordinator.maxRemediationAttempts || maxRemediationAttempts;

    let runResult;
    try {
      if (typeof coordinator.runChange !== 'function') {
        throw new InteractiveDeveloperShellError(
          'coordinator missing runChange',
          DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY
        );
      }
      // If remediation port exposes attempt events via a callback we passed — else
      // emit a single "attempt 1/N" before run and additional lines if result reports attempts.
      writeLine(formatRemediationLine(1, maxAttempts, color));
      runResult = await Promise.resolve(
        coordinator.runChange({ changeId })
      );
    } catch (err) {
      lastFault = err?.message || String(err);
      transition(DEVELOPER_SHELL_STATES.SESSION_OPEN);
      writeError(`/run failed: ${lastFault}`);
      writeLine(renderHud());
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY,
        error: lastFault,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    // Surface remediation attempts from result if present
    const attempts =
      runResult?.remediation?.attempts ||
      runResult?.attempts ||
      (runResult?.code &&
      String(runResult.code).includes('REMEDIATION')
        ? maxAttempts
        : null);
    if (attempts && Number(attempts) > 1) {
      for (let i = 2; i <= Number(attempts); i += 1) {
        writeLine(formatRemediationLine(i, maxAttempts, color));
      }
    }

    const ok = runResult && runResult.ok !== false;
    if (ok) {
      const remediated =
        runResult.status === 'REMEDIATED' ||
        runResult.code === 'SESSION_REMEDIATION_RESOLVED';
      writeOk(
        remediated
          ? `change remediated changeId=${changeId}`
          : `change ok changeId=${changeId}`
      );
      transition(DEVELOPER_SHELL_STATES.SESSION_OPEN);
      writeLine(renderHud());
      return {
        ok: true,
        code: remediated
          ? DEVELOPER_SHELL_CODES.SHELL_CHANGE_REMEDIATED
          : DEVELOPER_SHELL_CODES.SHELL_CHANGE_OK,
        changeId,
        runResult: summarize(runResult),
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state,
        health: snapshot()
      };
    }

    lastFault = runResult?.code || runResult?.reason || 'RUN_FAILED';
    // Stay SESSION_OPEN unless coordinator escalated permanently — shell tracks SESSION_OPEN
    // so operator can /status /close. Escalation is visible via HUD sessionState.
    transition(DEVELOPER_SHELL_STATES.SESSION_OPEN);
    writeError(`/run failed: ${lastFault}`);
    writeLine(renderHud());
    return {
      ok: false,
      code: lastFault,
      changeId,
      runResult: summarize(runResult),
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND,
      state,
      health: snapshot()
    };
  }

  function cmdStatus() {
    const hud = renderHud();
    writeLine(hud);
    if (coordinator && typeof coordinator.health === 'function') {
      const h = coordinator.health();
      writeLine(
        `${color ? ANSI.dim : ''}session.health state=${h.state} changesRun=${h.changesRun ?? 0} remediations=${h.remediationsInvoked ?? 0}${color ? ANSI.reset : ''}`
      );
    }
    return {
      ok: true,
      code: 'SHELL_STATUS',
      hud,
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND,
      state,
      health: snapshot()
    };
  }

  async function cmdClose() {
    if (!coordinator) {
      writeError('/close requires an open session — use /start <changeId> first');
      lastFault = DEVELOPER_SHELL_CODES.SHELL_NO_SESSION;
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_NO_SESSION,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    transition(DEVELOPER_SHELL_STATES.CLOSING);
    writeLine('Closing session: drain workers + seal EVD…');

    const closer =
      typeof coordinator.closeSession === 'function'
        ? coordinator.closeSession.bind(coordinator)
        : typeof coordinator.seal === 'function'
          ? coordinator.seal.bind(coordinator)
          : null;

    if (!closer) {
      writeError('coordinator missing closeSession/seal');
      transition(DEVELOPER_SHELL_STATES.ERROR);
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    let closed;
    try {
      closed = await Promise.resolve(closer());
    } catch (err) {
      lastFault = err?.message || String(err);
      transition(DEVELOPER_SHELL_STATES.ERROR);
      writeError(`/close failed: ${lastFault}`);
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_DEPENDENCY,
        error: lastFault,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }

    lastSealedEvd =
      closed?.sealedEvd ||
      (typeof coordinator.getSealedEvd === 'function'
        ? coordinator.getSealedEvd()
        : null);

    const sha = lastSealedEvd?.sha256 || '—';
    writeOk(`session sealed EVD sha256=${sha}`);
    writeLine(renderHud());

    // Reset session handles; shell returns to READY for another /start
    coordinator = null;
    changeId = null;
    sessionId = null;
    transition(DEVELOPER_SHELL_STATES.READY);

    return {
      ok: closed?.ok !== false,
      code: DEVELOPER_SHELL_CODES.SHELL_SESSION_CLOSED,
      sealedEvd: lastSealedEvd
        ? {
            id: lastSealedEvd.id,
            sha256: lastSealedEvd.sha256,
            custody: lastSealedEvd.custody
          }
        : null,
      closed: summarize(closed),
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND,
      state,
      health: snapshot()
    };
  }

  async function cmdDoctor() {
    let report;
    try {
      report = await Promise.resolve(doctorPort({ changeId, sessionId, state }));
    } catch (err) {
      lastDoctor = { ok: false, error: err?.message || String(err) };
      writeError(`/doctor failed: ${lastDoctor.error}`);
      return {
        ok: false,
        code: DEVELOPER_SHELL_CODES.SHELL_DOCTOR_FAIL,
        doctor: lastDoctor,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND,
        state
      };
    }
    lastDoctor = report && typeof report === 'object' ? report : { ok: true, raw: report };
    const ok = lastDoctor.ok !== false;
    if (ok) {
      writeOk(
        `/doctor ${lastDoctor.status || 'OK'} fundacionDelta=${lastDoctor.fundacionDelta ?? 0}`
      );
    } else {
      writeError(`/doctor reported failure: ${lastDoctor.reason || lastDoctor.status || 'FAIL'}`);
    }
    if (lastDoctor.lines && Array.isArray(lastDoctor.lines)) {
      for (const ln of lastDoctor.lines) writeLine(`  ${ln}`);
    }
    return {
      ok,
      code: ok
        ? DEVELOPER_SHELL_CODES.SHELL_DOCTOR_OK
        : DEVELOPER_SHELL_CODES.SHELL_DOCTOR_FAIL,
      doctor: lastDoctor,
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND,
      state
    };
  }

  /**
   * Stop the shell: detach stdin, transition STOPPED.
   * @returns {object}
   */
  function stop() {
    if (stopped) {
      return {
        ok: true,
        status: DEVELOPER_SHELL_STATES.STOPPED,
        code: DEVELOPER_SHELL_CODES.SHELL_STOPPED,
        PRODUCTION_READY: 'NO',
        kind: DEVELOPER_SHELL_KIND
      };
    }
    detachInput();
    stopped = true;
    transition(DEVELOPER_SHELL_STATES.STOPPED);
    writeLine('Shell stopped. PRODUCTION_READY=NO');
    lastResult = {
      ok: true,
      status: DEVELOPER_SHELL_STATES.STOPPED,
      code: DEVELOPER_SHELL_CODES.SHELL_STOPPED,
      PRODUCTION_READY: 'NO',
      kind: DEVELOPER_SHELL_KIND
    };
    return lastResult;
  }

  function getState() {
    return state;
  }

  function health() {
    const h = snapshot();
    h.PRODUCTION_READY = 'NO';
    h.cloudAgent = false;
    h.usesCloudAgent = false;
    h.agyDaemonPresent = false;
    h.fundacionDelta = 0;
    h.claudeCodeClone = false;
    return h;
  }

  function getLineLog() {
    return [...lineLog];
  }

  function getLastResult() {
    return lastResult;
  }

  return {
    start,
    run,
    handleLine,
    stop,
    getState,
    health,
    getLineLog,
    getLastResult,
    formatHudLine: () => renderHud(),
    PRODUCTION_READY: DEVELOPER_SHELL_PRODUCTION_READY,
    kind: DEVELOPER_SHELL_KIND,
    get state() {
      return state;
    },
    get changeId() {
      return changeId;
    },
    get sessionId() {
      return sessionId;
    }
  };
}

export { createInteractiveDeveloperShell as InteractiveDeveloperShell };

function isoNow(nowFn) {
  const v = nowFn();
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function summarize(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return { value: String(value) };
  const out = {};
  for (const key of [
    'ok',
    'status',
    'code',
    'sessionId',
    'changeId',
    'reason',
    'hitlRequired',
    'phase',
    'attempts'
  ]) {
    if (value[key] !== undefined) out[key] = value[key];
  }
  if (value.sealedEvd) {
    out.sealedEvd = {
      id: value.sealedEvd.id,
      sha256: value.sealedEvd.sha256
    };
  }
  return Object.keys(out).length > 0 ? out : { ok: value.ok !== false };
}

/**
 * Default hermetic doctor — never touches Fundacion.
 * @returns {object}
 */
function defaultDoctor() {
  return {
    ok: true,
    status: 'OK',
    fundacionDelta: 0,
    hermetic: true,
    PRODUCTION_READY: 'NO',
    lines: [
      'workspace: hermetic fixture OK',
      'fundacion: Δ=0 (not touched)',
      'PRODUCTION_READY: NO'
    ]
  };
}
