/**
 * @module autonomous-self-healing-port
 * SPEC-0081 / Mission BX — Sovereign Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port.
 * Pure Layer-0 Node.js built-ins (node:crypto only). Never seal secrets.
 *
 * NON-CLAIM:
 *   autonomous self-healing sentinel port ≠ Kubernetes Operator SaaS /
 *   ≠ Enterprise Datadog AIOps /
 *   ≠ PRODUCTION_READY=YES healing system.
 *   L22 CLOSED never reopen; L17–L21 CLOSED never reopen;
 *   L23 OPEN (Mission BX in progress);
 *   Axis: Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/sentinel.
 *
 * PRODUCTION_READY: NO
 */

import {
  BX_PRODUCTION_READY,
  BX_RECEIPT_KIND,
  sha256Canonical,
  buildSelfHealingReceipt,
  verifySelfHealingReceipt
} from './self-healing-receipt.js';

import {
  SelfHealingPolicyGate,
  BX_CODES,
  VALID_SEVERITIES,
  VALID_REMEDIATION_TYPES
} from './self-healing-policy-gate.js';

/** @type {'NO'} */
export const BX_PORT_PRODUCTION_READY = 'NO';

export const BX_PORT_KIND = 'eos-autonomous-self-healing-port';

/**
 * Sovereign Autonomous Self-Healing Port.
 */
export class AutonomousSelfHealingPort {
  /**
   * @param {object} [options]
   * @param {number} [options.maxRetries=3]
   * @param {boolean} [options.autoQuarantineCritical=true]
   * @param {(payload: unknown) => string} [options.hashFn]
   */
  constructor(options = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.autoQuarantineCritical = options.autoQuarantineCritical ?? true;
    this.hashFn = options.hashFn || sha256Canonical;

    this.gate = new SelfHealingPolicyGate({ maxRetries: this.maxRetries });

    /** @type {Map<string, object>} */
    this.incidents = new Map();

    /** @type {Map<string, { status: string, activeIncidents: Set<string>, quarantineReason: string|null }>} */
    this.components = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;
  }

  /**
   * Get internal component state or create initial healthy record.
   * @private
   * @param {string} componentId
   * @returns {object}
   */
  _ensureComponent(componentId) {
    if (!this.components.has(componentId)) {
      this.components.set(componentId, {
        status: 'HEALTHY',
        activeIncidents: new Set(),
        quarantineReason: null
      });
    }
    return this.components.get(componentId);
  }

  /**
   * Internal receipt builder appending to the audit trail.
   * @private
   * @param {object} fields
   * @returns {object}
   */
  _sealReceipt(fields) {
    const receipt = buildSelfHealingReceipt(
      {
        ...fields,
        prevReceiptHash: this._lastReceiptHash
      },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * Register an anomaly incident.
   * @param {object} incidentPayload
   * @returns {{ ok: boolean, code: string, incident?: object, receipt: object, reason?: string }}
   */
  registerIncident(incidentPayload) {
    const evaluation = this.gate.evaluateIncident(incidentPayload);
    if (!evaluation.valid) {
      const receipt = this._sealReceipt({
        operation: 'INCIDENT_REGISTER',
        componentId: incidentPayload?.componentId || null,
        incidentId: incidentPayload?.incidentId || null,
        status: 'DENIED',
        meta: { code: evaluation.code, reason: evaluation.reason }
      });
      return {
        ok: false,
        code: evaluation.code,
        reason: evaluation.reason,
        receipt
      };
    }

    const { incidentId, componentId, severity, anomalyType, details, target } = incidentPayload;
    const component = this._ensureComponent(componentId);

    const incidentRecord = {
      incidentId,
      componentId,
      severity: String(severity).toUpperCase(),
      anomalyType,
      details: details || null,
      target: target || null,
      status: 'OPEN',
      retries: 0,
      createdAt: new Date().toISOString()
    };

    this.incidents.set(incidentId, incidentRecord);
    component.activeIncidents.add(incidentId);

    // Update component health status
    if (this.autoQuarantineCritical && incidentRecord.severity === 'CRITICAL') {
      component.status = 'QUARANTINED';
      component.quarantineReason = `AUTO_CRITICAL:${anomalyType}`;
    } else if (component.status !== 'QUARANTINED') {
      component.status = 'DEGRADED';
    }

    const digestHash = this.hashFn({
      incidentId,
      componentId,
      severity: incidentRecord.severity,
      anomalyType
    });

    const receipt = this._sealReceipt({
      operation: 'INCIDENT_REGISTER',
      componentId,
      incidentId,
      status: 'OK',
      digestHash,
      meta: { severity: incidentRecord.severity, anomalyType }
    });

    return {
      ok: true,
      code: BX_CODES.INCIDENT_REGISTERED_OK,
      incident: Object.freeze({ ...incidentRecord }),
      receipt
    };
  }

  /**
   * Explicitly quarantine a component to isolate failure propagation.
   * @param {string} componentId
   * @param {string} [reason='MANUAL_QUARANTINE']
   * @returns {{ ok: boolean, code: string, componentId?: string, status?: string, receipt: object, reason?: string }}
   */
  quarantineComponent(componentId, reason = 'MANUAL_QUARANTINE') {
    const evaluation = this.gate.evaluateQuarantine(componentId, reason);
    if (!evaluation.valid) {
      const receipt = this._sealReceipt({
        operation: 'COMPONENT_QUARANTINE',
        componentId: componentId || null,
        status: 'DENIED',
        meta: { code: evaluation.code, reason: evaluation.reason }
      });
      return {
        ok: false,
        code: evaluation.code,
        reason: evaluation.reason,
        receipt
      };
    }

    const component = this._ensureComponent(componentId);
    component.status = 'QUARANTINED';
    component.quarantineReason = reason;

    const receipt = this._sealReceipt({
      operation: 'COMPONENT_QUARANTINE',
      componentId,
      status: 'OK',
      meta: { reason }
    });

    return {
      ok: true,
      code: BX_CODES.COMPONENT_QUARANTINED_OK,
      componentId,
      status: 'QUARANTINED',
      receipt
    };
  }

  /**
   * Release a component from quarantine if conditions are clear.
   * @param {string} componentId
   * @param {string} [authorization='OPERATOR_RELEASE']
   * @returns {{ ok: boolean, componentId: string, status: string, receipt: object }}
   */
  releaseQuarantine(componentId, authorization = 'OPERATOR_RELEASE') {
    const component = this._ensureComponent(componentId);
    component.status = component.activeIncidents.size === 0 ? 'HEALTHY' : 'DEGRADED';
    component.quarantineReason = null;

    const receipt = this._sealReceipt({
      operation: 'COMPONENT_RELEASE',
      componentId,
      status: 'OK',
      meta: { authorization, newStatus: component.status }
    });

    return {
      ok: true,
      componentId,
      status: component.status,
      receipt
    };
  }

  /**
   * Execute an autonomous remediation action for an incident.
   * @param {object} params
   * @param {string} params.componentId
   * @param {string} params.incidentId
   * @param {string} params.remediationType - 'RESTART' | 'ROLLBACK_SNAPSHOT' | 'STATE_RESET' | 'ISOLATE_CIRCUIT_BREAKER'
   * @param {string} [params.snapshotId]
   * @param {Function} [params.actionFn]
   * @param {number} [params.maxRetries]
   * @returns {{ ok: boolean, code: string, incident?: object, receipt: object, hitlRequired?: boolean, reason?: string }}
   */
  executeRemediation(params) {
    const { componentId, incidentId, remediationType, snapshotId, actionFn, maxRetries } = params || {};
    const incident = this.incidents.get(incidentId);

    if (!incident) {
      const receipt = this._sealReceipt({
        operation: 'REMEDIATION_EXECUTE',
        componentId: componentId || null,
        incidentId: incidentId || null,
        status: 'DENIED',
        meta: { code: BX_CODES.MALFORMED_INCIDENT_DENY, reason: 'Incident not found' }
      });
      return {
        ok: false,
        code: BX_CODES.MALFORMED_INCIDENT_DENY,
        reason: 'Incident not found',
        receipt
      };
    }

    const component = this._ensureComponent(componentId);
    const evaluation = this.gate.evaluateRemediation(
      { componentId, remediationType, maxRetries },
      incident.retries
    );

    if (!evaluation.valid) {
      if (evaluation.hitlRequired) {
        component.status = 'ESCALATED';
        incident.status = 'ESCALATED';

        const receipt = this._sealReceipt({
          operation: 'REMEDIATION_ESCALATE',
          componentId,
          incidentId,
          status: 'ESCALATED',
          meta: { code: evaluation.code, reason: evaluation.reason, retries: incident.retries }
        });

        return {
          ok: false,
          code: BX_CODES.ESCALATED_HITL_REQUIRED,
          hitlRequired: true,
          reason: evaluation.reason,
          receipt
        };
      }

      const receipt = this._sealReceipt({
        operation: 'REMEDIATION_EXECUTE',
        componentId,
        incidentId,
        status: 'DENIED',
        meta: { code: evaluation.code, reason: evaluation.reason }
      });

      return {
        ok: false,
        code: evaluation.code,
        reason: evaluation.reason,
        receipt
      };
    }

    // Mark remediating
    component.status = 'REMEDIATING';
    incident.retries += 1;

    try {
      if (typeof actionFn === 'function') {
        actionFn();
      }

      incident.status = 'REMEDIATED';
      component.activeIncidents.delete(incidentId);
      component.status = component.activeIncidents.size === 0 ? 'HEALTHY' : 'DEGRADED';

      const digestHash = this.hashFn({
        incidentId,
        componentId,
        remediationType,
        retries: incident.retries,
        snapshotId: snapshotId || null
      });

      const receipt = this._sealReceipt({
        operation: 'REMEDIATION_EXECUTE',
        componentId,
        incidentId,
        status: 'OK',
        digestHash,
        meta: { remediationType, retries: incident.retries }
      });

      return {
        ok: true,
        code: BX_CODES.REMEDIATION_SUCCESS_OK,
        incident: Object.freeze({ ...incident }),
        receipt
      };
    } catch (err) {
      component.status = 'DEGRADED';

      const receipt = this._sealReceipt({
        operation: 'REMEDIATION_EXECUTE',
        componentId,
        incidentId,
        status: 'FAILED',
        meta: { error: err.message, retries: incident.retries }
      });

      return {
        ok: false,
        code: 'REMEDIATION_FAILED',
        reason: err.message,
        receipt
      };
    }
  }

  /**
   * Resolve an incident manually or post-verification.
   * @param {string} incidentId
   * @param {string} [notes='']
   * @returns {{ ok: boolean, code: string, incident?: object, receipt: object, reason?: string }}
   */
  resolveIncident(incidentId, notes = '') {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return {
        ok: false,
        code: BX_CODES.MALFORMED_INCIDENT_DENY,
        reason: 'Incident not found',
        receipt: null
      };
    }

    incident.status = 'RESOLVED';
    const component = this.components.get(incident.componentId);
    if (component) {
      component.activeIncidents.delete(incidentId);
      if (component.activeIncidents.size === 0 && component.status !== 'QUARANTINED') {
        component.status = 'HEALTHY';
      }
    }

    const receipt = this._sealReceipt({
      operation: 'INCIDENT_RESOLVE',
      componentId: incident.componentId,
      incidentId,
      status: 'OK',
      meta: { notes }
    });

    return {
      ok: true,
      code: BX_CODES.INCIDENT_RESOLVED_OK,
      incident: Object.freeze({ ...incident }),
      receipt
    };
  }

  /**
   * Get health status for a component.
   * @param {string} componentId
   * @returns {{ componentId: string, status: string, activeIncidentsCount: number, quarantineReason: string|null }}
   */
  getComponentHealth(componentId) {
    const component = this.components.get(componentId);
    if (!component) {
      return {
        componentId,
        status: 'HEALTHY',
        activeIncidentsCount: 0,
        quarantineReason: null
      };
    }

    return {
      componentId,
      status: component.status,
      activeIncidentsCount: component.activeIncidents.size,
      quarantineReason: component.quarantineReason
    };
  }

  /**
   * List all non-resolved incidents.
   * @returns {Array<object>}
   */
  listActiveIncidents() {
    return Array.from(this.incidents.values())
      .filter((inc) => inc.status !== 'RESOLVED')
      .map((inc) => ({ ...inc }));
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifyHealingTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifySelfHealingReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: BX_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: BX_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      prevHash = receipt.receiptHash;
    }

    return {
      valid: true,
      code: BX_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}
