/**
 * @module PredictiveTokenGovernor
 * @description Real-time token entropy telemetry and runaway loop termination governor.
 * Calculates Shannon Entropy and N-gram repetition density to prevent hallucinations
 * and wasteful token consumption in microsecond latency.
 */

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export class PredictiveTokenGovernor {
  /**
   * @param {object} [options]
   * @param {number} [options.minEntropyThreshold] Default 2.2
   * @param {number} [options.maxRepetitionFactor] Default 0.55
   */
  constructor(options = {}) {
    this.minEntropyThreshold = options.minEntropyThreshold ?? 2.2;
    this.maxRepetitionFactor = options.maxRepetitionFactor ?? 0.55;
    this.auditLog = [];
  }

  /**
   * Calculates Shannon Entropy H(X) = -Σ P(x) log2 P(x)
   * @param {string} text
   * @returns {number} Entropy in bits per character
   */
  calculateShannonEntropy(text = '') {
    if (!text || text.length === 0) return 0;

    const freqMap = {};
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      freqMap[char] = (freqMap[char] || 0) + 1;
    }

    const len = text.length;
    let entropy = 0;

    for (const count of Object.values(freqMap)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return Math.round(entropy * 1000) / 1000;
  }

  /**
   * Calculates N-gram repetition factor
   * @param {string} text
   * @param {number} [n=4]
   * @returns {number} 0.0 to 1.0 repetition ratio
   */
  calculateRepetitionFactor(text = '', n = 4) {
    if (!text || text.length < n * 4) return 0;

    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < n * 2) return 0;

    const nGrams = [];
    for (let i = 0; i <= words.length - n; i++) {
      nGrams.push(words.slice(i, i + n).join(' '));
    }

    const uniqueCount = new Set(nGrams).size;
    const repetitionRatio = 1.0 - (uniqueCount / nGrams.length);
    return Math.round(repetitionRatio * 1000) / 1000;
  }

  /**
   * Evaluates text stream health and signals early termination on runaway loops
   * @param {string} text Stream buffer
   * @returns {object} Health verdict { shouldTerminate, healthStatus, entropy, repetitionFactor }
   */
  evaluateStreamHealth(text = '') {
    const entropy = this.calculateShannonEntropy(text);
    const repetitionFactor = this.calculateRepetitionFactor(text, 3);

    let shouldTerminate = false;
    let reason = null;
    let healthStatus = 'HEALTHY';

    if (text.length > 200) {
      if (repetitionFactor >= this.maxRepetitionFactor) {
        shouldTerminate = true;
        healthStatus = 'HALTED_RUNAWAY_LOOP';
        reason = `High repetition factor (${repetitionFactor} >= ${this.maxRepetitionFactor}) detected in token stream.`;
      } else if (entropy <= this.minEntropyThreshold) {
        shouldTerminate = true;
        healthStatus = 'HALTED_LOW_ENTROPY';
        reason = `Shannon entropy (${entropy} <= ${this.minEntropyThreshold}) indicates degenerate repeating content.`;
      } else if (repetitionFactor > 0.35) {
        healthStatus = 'DEGRADED_QUALITY';
      }
    }

    const verdict = {
      shouldTerminate,
      healthStatus,
      entropy,
      repetitionFactor,
      textLength: text.length,
      reason,
      timestamp: new Date().toISOString()
    };

    if (shouldTerminate) {
      verdict.sha256 = calculateSha256(JSON.stringify(verdict));
      this.auditLog.push(verdict);
    }

    return verdict;
  }
}
