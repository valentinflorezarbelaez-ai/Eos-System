/**
 * @module write-barrier/errors
 */

export class WriteBarrierDeniedError extends Error {
  /**
   * @param {string} reason
   * @param {object} [details]
   */
  constructor(reason, details = {}) {
    super(`WRITE_BARRIER_DENIED: ${reason}`);
    this.name = 'WriteBarrierDeniedError';
    this.code = 'WRITE_BARRIER_DENIED';
    this.reason = reason;
    this.details = details;
  }
}

export class WriteBarrierConfigError extends Error {
  /**
   * @param {string} message
   * @param {object} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'WriteBarrierConfigError';
    this.code = 'WRITE_BARRIER_SSOT_CONFIG';
    this.details = details;
  }
}
