/**
 * @file src/app-fuerza/core/timers.js
 * @version 1.0.0
 * @description High-Precision Offline-First Interval Engine for App Fuerza.
 * Implements hardware delta time recovery against mobile OS background throttling under L0 Pure built-ins.
 */

export class FuerzaTimerEngine {
  /**
   * @param {object} config
   * @param {number} config.workDurationMs
   * @param {number} config.restDurationMs
   * @param {number} config.totalCycles
   * @param {() => number} [config.timeProvider]
   */
  constructor(config = {}) {
    if (config.workDurationMs !== undefined) {
      this.configurar(config);
    } else {
      this.state = {
        currentState: 'IDLE',
        currentCycle: 1,
        totalCycles: 1,
        timeRemainingMs: 0,
        targetTimestamp: null,
        isHardwareVibrationTriggered: false
      };
      this.config = null;
      this.timeProvider = () => Date.now();
    }
  }

  /**
   * Configures and validates cycle durations.
   * @param {object} config
   */
  configurar(config) {
    if (
      !config ||
      typeof config.workDurationMs !== 'number' || config.workDurationMs <= 0 ||
      typeof config.restDurationMs !== 'number' || config.restDurationMs <= 0 ||
      typeof config.totalCycles !== 'number' || config.totalCycles <= 0
    ) {
      const error = new Error('ERR-FUE-INVALID-TIMER-DURATION: workDurationMs, restDurationMs, and totalCycles must be positive numbers.');
      error.code = 'ERR-FUE-INVALID-TIMER-DURATION';
      throw error;
    }

    this.config = {
      workDurationMs: config.workDurationMs,
      restDurationMs: config.restDurationMs,
      totalCycles: config.totalCycles
    };

    this.timeProvider = typeof config.timeProvider === 'function' ? config.timeProvider : () => Date.now();

    this.state = {
      currentState: 'IDLE',
      currentCycle: 1,
      totalCycles: config.totalCycles,
      timeRemainingMs: config.workDurationMs,
      targetTimestamp: null,
      isHardwareVibrationTriggered: false
    };

    return true;
  }

  /**
   * Starts interval cycle setting absolute targetTimestamp.
   */
  start() {
    if (this.state.currentState !== 'IDLE') return;

    const now = this.timeProvider();
    this.state.currentState = 'WORK';
    this.state.timeRemainingMs = this.config.workDurationMs;
    this.state.targetTimestamp = now + this.config.workDurationMs;
    this.state.isHardwareVibrationTriggered = false;
  }

  iniciar() {
    this.start();
  }

  /**
   * Evaluates control tick against absolute target timestamp.
   * Mitigates background tab throttling.
   * @param {number} [forcedTimestamp]
   */
  tick(forcedTimestamp) {
    if (this.state.currentState === 'IDLE' || this.state.currentState === 'COMPLETE') return;

    const now = forcedTimestamp !== undefined ? forcedTimestamp : this.timeProvider();
    this.state.isHardwareVibrationTriggered = false;
    const remaining = this.state.targetTimestamp - now;

    if (remaining > 0) {
      this.state.timeRemainingMs = remaining;
    } else {
      this.procesarTransicionEstado(now);
    }
  }

  actualizar(forcedTimestamp) {
    this.tick(forcedTimestamp);
  }

  /**
   * Processes deterministic state machine transitions upon expiration.
   * @param {number} currentTimestamp
   */
  procesarTransicionEstado(currentTimestamp) {
    this.state.isHardwareVibrationTriggered = true;

    if (this.state.currentState === 'WORK') {
      this.state.currentState = 'REST';
      this.state.timeRemainingMs = this.config.restDurationMs;
      this.state.targetTimestamp = currentTimestamp + this.config.restDurationMs;
    } else if (this.state.currentState === 'REST') {
      if (this.state.currentCycle < this.config.totalCycles) {
        this.state.currentCycle++;
        this.state.currentState = 'WORK';
        this.state.timeRemainingMs = this.config.workDurationMs;
        this.state.targetTimestamp = currentTimestamp + this.config.workDurationMs;
      } else {
        this.state.currentState = 'COMPLETE';
        this.state.timeRemainingMs = 0;
        this.state.targetTimestamp = null;
      }
    }
  }

  /**
   * Returns copy of active telemetry state.
   */
  getState() {
    return { ...this.state };
  }

  obtenerEstado() {
    return this.getState();
  }
}

// Alias export for dual compatibility
export const AppFuerzaTimer = FuerzaTimerEngine;
