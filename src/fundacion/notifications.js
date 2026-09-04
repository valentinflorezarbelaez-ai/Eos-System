/**
 * @file src/fundacion/notifications.js
 * @version 1.0.0
 * @description Autonomous Notification and HMAC-SHA256 Webhook Service for Fundación Pilot.
 * Pure L0 implementation with bounded retry fault-tolerance.
 */

import crypto from 'node:crypto';

export class FundacionNotificationService {
  /**
   * @param {object} [options]
   * @param {number} [options.maxRetries=3]
   * @param {number} [options.retryDelayMs=0]
   */
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 0;
    this.donorRegistry = new Map();
    this.notificationLogs = [];
    this.transport = async (url, options) => {
      // Default stub returns 200 OK
      return { status: 200, ok: true };
    };
  }

  /**
   * Registers a donor endpoint and shared secret for HMAC verification.
   * @param {string} donorId
   * @param {{ endpoint: string, secret: string }} config
   */
  registerDonorWebhook(donorId, config) {
    if (!donorId || !config || !config.endpoint || !config.secret) {
      throw new Error('ERR-FUN-INVALID-WEBHOOK-CONFIG: donorId, endpoint, and secret are required.');
    }
    this.donorRegistry.set(donorId, config);
  }

  /**
   * Overrides the HTTP transport handler (useful for testing and offline execution).
   * @param {Function} transportFn
   */
  setTransport(transportFn) {
    if (typeof transportFn === 'function') {
      this.transport = transportFn;
    }
  }

  /**
   * Computes the HMAC-SHA256 signature for a payload.
   * @param {object} payload
   * @param {string} secret
   * @returns {string} Hex HMAC signature
   */
  calculateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Dispatches an event-driven impact notification to the donor's webhook.
   * @param {object} event - Event parameters
   * @returns {Promise<object>} Dispatch receipt
   */
  async dispatchNotification(event) {
    const {
      donorId,
      donationTxId,
      allocationId,
      project,
      amountAllocated,
      purpose,
      ledgerDigest
    } = event;

    const donorConfig = this.donorRegistry.get(donorId) || {
      endpoint: `https://mock.fundacion.org/webhooks/${donorId}`,
      secret: 'default-secret-l0'
    };

    const timestamp = new Date().toISOString();
    const eventHash = crypto
      .createHash('sha256')
      .update(`${donorId}:${allocationId}:${timestamp}`)
      .digest('hex');
    const eventId = `EVT-${eventHash.substring(0, 16).toUpperCase()}`;

    const fullPayload = {
      eventId,
      donorId,
      timestamp,
      impact: {
        allocationId,
        project,
        amountAllocated,
        purpose
      },
      verification: {
        donationTxId,
        ledgerDigest
      }
    };

    const signature = this.calculateSignature(fullPayload, donorConfig.secret);
    let attempts = 0;
    let currentStatus = 'PENDING';

    while (attempts < this.maxRetries) {
      attempts++;
      try {
        const response = await this.transport(donorConfig.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-EOS-Signature': signature,
            'X-EOS-Event-Id': eventId
          },
          body: JSON.stringify(fullPayload)
        });

        if (response && (response.status === 200 || response.ok === true)) {
          currentStatus = 'DISPATCHED';
          break;
        } else {
          currentStatus = 'RETRYING';
        }
      } catch {
        currentStatus = 'RETRYING';
      }

      if (this.retryDelayMs > 0 && attempts < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
      }
    }

    if (currentStatus !== 'DISPATCHED') {
      currentStatus = 'FAILED_MAX_RETRIES';
    }

    const logEntry = {
      eventId,
      donorId,
      endpoint: donorConfig.endpoint,
      attempts,
      status: currentStatus,
      signatureSent: signature,
      timestamp
    };

    this.notificationLogs.push(logEntry);
    return logEntry;
  }

  /**
   * Returns all recorded notification dispatch logs.
   * @returns {Array<object>}
   */
  getNotificationLogs() {
    return [...this.notificationLogs];
  }
}
