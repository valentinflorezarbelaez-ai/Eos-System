import crypto from 'node:crypto';

/**
 * @file src/core/evidence.js
 * @description Deterministic hashing and epistemic classification engine for EOS Mission OS.
 */
export class EosEvidence {
  /**
   * Calculates a SHA-256 hash from a string payload.
   * @param {string} content
   * @returns {string} SHA-256 hex string
   */
  hashString(content) {
    return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
  }

  /**
   * Creates a formal evidence record according to SPEC-001.
   * @param {Object} params
   * @param {string} params.target
   * @param {number} params.exitCode
   * @param {string} [params.stdout]
   * @param {string} [params.stderr]
   * @param {number} [params.durationMs]
   * @param {boolean} [params.timedOut]
   * @returns {Object} Evidence record
   */
  createRecord({ target, exitCode, stdout = '', stderr = '', durationMs = 0, timedOut = false }) {
    let epistemicStatus = 'VERIFIED';
    if (timedOut) {
      epistemicStatus = 'TIMED_OUT';
    } else if (exitCode !== 0) {
      epistemicStatus = 'EXECUTION_FAILED';
    }

    const payloadToHash = `${target}:${exitCode}:${stdout}:${stderr}:${timedOut}`;
    const sha256Payload = this.hashString(payloadToHash);

    return {
      target,
      exitCode,
      stdout,
      stderr,
      durationMs,
      timedOut,
      epistemicStatus,
      sha256Payload,
      timestamp: new Date().toISOString()
    };
  }
}
