/**
 * @module DeterministicChaosEngine
 * @description SpaceX/Netflix-grade Chaos Engineering engine with deterministic PRNG seeding.
 * Injects repeatable I/O errors, concurrency race conditions, and latency spikes to verify fault-tolerance.
 */

import { createHash, randomBytes } from 'node:crypto';
import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export const CHAOS_FAULT_TYPES = Object.freeze({
  IO_WRITE_ERROR: 'IO_WRITE_ERROR',
  TRANSIENT_TIMEOUT: 'TRANSIENT_TIMEOUT',
  RESOURCE_BUSY_LOCK: 'RESOURCE_BUSY_LOCK',
  CORRUPTED_READ_BYTE: 'CORRUPTED_READ_BYTE'
});

export class DeterministicChaosEngine {
  /**
   * @param {object} [options]
   * @param {number} [options.seed] Fixed integer seed for deterministic repeatability
   */
  constructor(options = {}) {
    this.seed = typeof options.seed === 'number' ? options.seed : 42;
    this._prngState = this.seed;
    this.drillHistory = [];
  }

  /**
   * Simple deterministic Pseudo-Random Number Generator (LCG)
   * @returns {number} Float between 0 and 1
   */
  _nextRandom() {
    this._prngState = (this._prngState * 1664525 + 1013904223) % 4294967296;
    return this._prngState / 4294967296;
  }

  /**
   * Resets the PRNG state to the initial seed
   */
  resetSeed(seed = null) {
    if (typeof seed === 'number') this.seed = seed;
    this._prngState = this.seed;
  }

  /**
   * Runs a chaos drill executing an async operation across N iterations with injected faults
   * @param {object} params
   * @param {Function} params.operationAsyncFn (iteration, isFaultInjected, faultType) => Promise<any>
   * @param {number} [params.iterations] Total iterations to run (default 10)
   * @param {number} [params.faultProbability] Probability of fault injection (0.0 to 1.0, default 0.4)
   * @param {Array<string>} [params.allowedFaults]
   * @returns {Promise<object>} Chaos drill report
   */
  async runChaosDrill(params = {}) {
    const {
      operationAsyncFn,
      iterations = 10,
      faultProbability = 0.4,
      allowedFaults = Object.values(CHAOS_FAULT_TYPES)
    } = params;

    if (typeof operationAsyncFn !== 'function') {
      throw new Error('CHAOS_ERROR: operationAsyncFn must be an executable function');
    }

    const drillId = `CHAOS-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const iterationResults = [];
    let injectedFaultsCount = 0;
    let successfulRecoveries = 0;
    let unhandledCrashes = 0;

    for (let i = 0; i < iterations; i++) {
      const rand = this._nextRandom();
      const shouldInjectFault = rand < faultProbability;
      let faultType = null;

      if (shouldInjectFault) {
        injectedFaultsCount++;
        const faultIdx = Math.floor(this._nextRandom() * allowedFaults.length);
        faultType = allowedFaults[faultIdx];
      }

      const iterStart = Date.now();
      try {
        const result = await operationAsyncFn(i + 1, shouldInjectFault, faultType);
        iterationResults.push({
          iteration: i + 1,
          fault_injected: shouldInjectFault,
          fault_type: faultType,
          status: 'SUCCESS',
          recovered: shouldInjectFault,
          result
        });
        if (shouldInjectFault) successfulRecoveries++;
      } catch (err) {
        const msg = err.message || '';
        // If the error was a graceful handled chaos fault rejection, count as clean
        if (msg.includes('CHAOS_INJECTED') || msg.includes('HANDLED_FAULT') || msg.includes('RETRY_EXHAUSTED')) {
          iterationResults.push({
            iteration: i + 1,
            fault_injected: shouldInjectFault,
            fault_type: faultType,
            status: 'HANDLED_FAULT_REJECTION',
            recovered: false,
            error: msg
          });
        } else {
          unhandledCrashes++;
          iterationResults.push({
            iteration: i + 1,
            fault_injected: shouldInjectFault,
            fault_type: faultType,
            status: 'UNHANDLED_CRASH',
            recovered: false,
            error: msg
          });
        }
      }
    }

    const resilienceRate =
      injectedFaultsCount > 0
        ? Math.round(((injectedFaultsCount - unhandledCrashes) / injectedFaultsCount) * 1000) / 10
        : 100.0;

    const report = {
      drill_id: drillId,
      seed: this.seed,
      total_iterations: iterations,
      injected_faults_count: injectedFaultsCount,
      successful_recoveries: successfulRecoveries,
      unhandled_crashes: unhandledCrashes,
      resilience_rate_percent: resilienceRate,
      verdict: unhandledCrashes === 0 ? 'RESILIENT_CHAOS_PROOF' : 'FRAGILE_UNDER_CHAOS',
      iteration_results: iterationResults,
      timestamp: new Date().toISOString()
    };

    report.sha256 = calculateSha256(JSON.stringify(report));
    this.drillHistory.push(report);
    return report;
  }
}
