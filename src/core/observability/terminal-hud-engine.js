/**
 * @module TerminalHudEngine
 * @description Zero-dependency ANSI Mission Control Terminal Heads-Up Display (HUD).
 * Renders real-time SDD phase status, DAG execution waves, token economics, FDIR health, and Byzantine consensus.
 */

export const ANSI = Object.freeze({
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  BG_BLUE: '\x1b[44m',
  BG_GREEN: '\x1b[42m',
  BG_RED: '\x1b[41m'
});

export class TerminalHudEngine {
  constructor(options = {}) {
    this.useColor = options.useColor !== false;
  }

  _c(color, text) {
    if (!this.useColor) return text;
    return `${color}${text}${ANSI.RESET}`;
  }

  /**
   * Renders the Mission Control header banner
   */
  renderHeader(mission = {}) {
    const id = mission.mission_id || 'MIS-LOCAL-001';
    const title = mission.title || 'Autonomous Engineering Mission';
    const phase = mission.phase || 'VISION_INTAKE';

    const line = '═'.repeat(78);
    const badge = this._c(ANSI.BG_BLUE + ANSI.WHITE + ANSI.BOLD, ` ${phase} `);
    const titleStr = this._c(ANSI.BOLD + ANSI.CYAN, `EOS MISSION CONTROL`);

    return [
      this._c(ANSI.BLUE, `╔${line}╗`),
      this._c(ANSI.BLUE, `║ `) + `${titleStr} — [${id}] ${badge}`.padEnd(85) + this._c(ANSI.BLUE, `║`),
      this._c(ANSI.BLUE, `║ `) + this._c(ANSI.DIM, `Goal: ${title}`.padEnd(76)) + this._c(ANSI.BLUE, `║`),
      this._c(ANSI.BLUE, `╚${line}╝`)
    ].join('\n');
  }

  /**
   * Renders DAG execution waves in a visual box layout
   */
  renderDagWaves(waves = [], completedTasks = []) {
    const completedSet = new Set(completedTasks);
    const lines = [];
    lines.push(this._c(ANSI.BOLD + ANSI.YELLOW, `▶ MISSION DAG PIPELINE WAVES`));

    if (!Array.isArray(waves) || waves.length === 0) {
      lines.push(this._c(ANSI.DIM, `  (No active DAG tasks)`));
      return lines.join('\n');
    }

    for (let i = 0; i < waves.length; i++) {
      const waveTasks = waves[i];
      const taskChips = waveTasks.map(t => {
        const isDone = completedSet.has(t);
        const icon = isDone ? '✔' : '○';
        const color = isDone ? ANSI.GREEN : ANSI.WHITE;
        return this._c(color, `[${icon} ${t}]`);
      }).join(' ');

      lines.push(`  Wave ${i + 1}: ${taskChips}`);
    }

    return lines.join('\n');
  }

  /**
   * Renders real-time Token Economics and efficiency metrics
   */
  renderTelemetry(telemetry = {}) {
    const tokens = (telemetry.tokens_consumed || 0).toLocaleString('en-US');
    const cost = (telemetry.actual_cost_usd || 0).toFixed(4);
    const evdRatio = (telemetry.evidence_per_kilotoken || 0).toFixed(2);
    const latency = telemetry.actual_latency_ms || 0;

    return [
      this._c(ANSI.BOLD + ANSI.MAGENTA, `▶ COGNITIVE TELEMETRY & ECONOMICS`),
      `  Tokens Burned : ${this._c(ANSI.CYAN, tokens)} | Cost : ${this._c(ANSI.GREEN, `$${cost} USD`)}`,
      `  Efficiency    : ${this._c(ANSI.BOLD + ANSI.GREEN, `${evdRatio} EVD/kTok`)} | Latency : ${this._c(ANSI.YELLOW, `${latency}ms`)}`
    ].join('\n');
  }

  /**
   * Renders FDIR health and Byzantine consensus status
   */
  renderHealthAndConsensus(health = {}, consensus = {}) {
    const fdirState = health.fdir_state || 'NORMAL';
    const incidents = health.incident_count || 0;

    let fdirBadge = this._c(ANSI.GREEN, `● NORMAL`);
    if (fdirState === 'SAFE_MODE_TRIPPED') fdirBadge = this._c(ANSI.RED + ANSI.BOLD, `✖ SAFE_MODE_TRIPPED`);
    else if (fdirState === 'DEGRADED_DIAGNOSING') fdirBadge = this._c(ANSI.YELLOW, `▲ DEGRADED`);

    const consensusVerdict = consensus.verdict || 'APPROVED';
    let cBadge = this._c(ANSI.GREEN, `✔ ${consensusVerdict}`);
    if (consensusVerdict === 'BYZANTINE_DISAGREEMENT') cBadge = this._c(ANSI.YELLOW, `⚠ BYZANTINE_DISAGREEMENT`);
    else if (consensusVerdict === 'VETOED_SECURITY_FAILURE') cBadge = this._c(ANSI.RED, `✖ SECURITY_VETO`);

    return [
      this._c(ANSI.BOLD + ANSI.CYAN, `▶ SYSTEM RESILIENCE & CONSENSUS`),
      `  FDIR Status   : ${fdirBadge} (Incidents: ${incidents})`,
      `  TMR Consensus : ${cBadge}`
    ].join('\n');
  }

  /**
   * Renders the complete unified Mission Control HUD
   */
  renderFullDashboard(state = {}) {
    const divider = this._c(ANSI.DIM, '─'.repeat(80));
    return [
      this.renderHeader(state.mission || {}),
      this.renderDagWaves(state.dag_waves || [], state.completed_tasks || []),
      divider,
      this.renderTelemetry(state.telemetry || {}),
      divider,
      this.renderHealthAndConsensus(state.health || {}, state.consensus || {}),
      divider
    ].join('\n');
  }
}
