import crypto from 'node:crypto';

/**
 * EOS Cryptographic Self-Healing Sentinel
 * Continuously monitors SHA-256 integrity of constitutional directives and heals tampered artifacts via FDIR.
 */
export class CryptographicSelfHealingSentinel {
  constructor() {
    this.baselines = new Map();
    this.fdirAuditLogs = [];
  }

  /**
   * Computes SHA-256 hash string for raw content.
   * @param {string} content
   * @returns {string}
   * @private
   */
  #hash(content) {
    return 'sha256-' + crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Registers baseline cryptographic snapshot for a critical file.
   * @param {string} filePath
   * @param {string} content
   * @returns {object}
   */
  registerBaseline(filePath, content = '') {
    const sha256 = this.#hash(content);
    const entry = {
      filePath,
      content,
      sha256,
      registeredAt: new Date().toISOString()
    };
    this.baselines.set(filePath, entry);
    return entry;
  }

  /**
   * Verifies live file content against registered baseline.
   * @param {string} filePath
   * @param {string} currentContent
   * @returns {object}
   */
  verifyIntegrity(filePath, currentContent = '') {
    const baseline = this.baselines.get(filePath);
    if (!baseline) {
      throw new Error(`GOVERNANCE_FAULT: No baseline registered for [${filePath}].`);
    }

    const currentHash = this.#hash(currentContent);
    const isIntact = currentHash === baseline.sha256;

    return {
      filePath,
      isIntact,
      status: isIntact ? 'INTEGRITY_VERIFIED' : 'TAMPERED_ARTIFACT_DETECTED',
      baselineSha256: baseline.sha256,
      currentSha256: currentHash,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Restores tampered artifact to verified pristine baseline snapshot via FDIR.
   * @param {string} filePath
   * @returns {object}
   */
  selfHeal(filePath) {
    const baseline = this.baselines.get(filePath);
    if (!baseline) {
      throw new Error(`GOVERNANCE_FAULT: Cannot heal unregistered artifact [${filePath}].`);
    }

    const fdirReceiptPayload = JSON.stringify({
      action: 'FDIR_SELF_HEAL',
      filePath,
      restoredSha256: baseline.sha256,
      timestamp: new Date().toISOString()
    });
    const fdirReceipt = this.#hash(fdirReceiptPayload);

    const logEntry = {
      fdirReceipt,
      filePath,
      status: 'HEALED',
      restoredAt: new Date().toISOString()
    };
    this.fdirAuditLogs.push(logEntry);

    return {
      status: 'SELF_HEALED_VERIFIED',
      filePath,
      restoredContent: baseline.content,
      sha256: baseline.sha256,
      fdirReceipt,
      restoredAt: new Date().toISOString()
    };
  }
}
