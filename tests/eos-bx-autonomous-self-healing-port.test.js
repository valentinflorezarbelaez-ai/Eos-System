/**
 * @file tests/eos-bx-autonomous-self-healing-port.test.js
 * SPEC-0081 / Mission BX — Sovereign Autonomous Self-Healing Sentinel & FDIR Remediation Engine Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  BX_PRODUCTION_READY,
  BX_RECEIPT_PRODUCTION_READY,
  BX_RECEIPT_KIND,
  sha256Canonical,
  buildSelfHealingReceipt,
  verifySelfHealingReceipt,
  _resetReceiptSeqForTests
} from '../src/core/sentinel/self-healing-receipt.js';

import {
  SelfHealingPolicyGate,
  BX_CODES,
  VALID_SEVERITIES,
  VALID_REMEDIATION_TYPES,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/sentinel/self-healing-policy-gate.js';

import {
  AutonomousSelfHealingPort,
  BX_PORT_PRODUCTION_READY,
  BX_PORT_KIND
} from '../src/core/sentinel/autonomous-self-healing-port.js';

// Dynamic synthetic secret builder (Law VI compliance)
function makeSyntheticSecret() {
  // sk- prefix
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForSentinelVerification1234567890';
}

describe('Mission BX — Self-Healing Sentinel Receipt (SPEC-0081)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims', () => {
    assert.equal(BX_PRODUCTION_READY, 'NO');
    assert.equal(BX_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(BX_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed receipt with valid SHA-256 hash', () => {
    const receipt = buildSelfHealingReceipt({
      operation: 'INCIDENT_REGISTER',
      componentId: 'agent:planner',
      incidentId: 'inc:test-001',
      status: 'OK',
      digestHash: sha256Canonical({ sample: 'data' })
    });

    assert.equal(receipt.kind, BX_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('BX-RCPT-'));
    assert.equal(receipt.componentId, 'agent:planner');
    assert.equal(receipt.incidentId, 'inc:test-001');
    assert.ok(receipt.receiptHash.length === 64);
    assert.equal(receipt.nonClaims.kubernetesOperator, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const verifyRes = verifySelfHealingReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content', () => {
    const receipt = buildSelfHealingReceipt({
      operation: 'INCIDENT_REGISTER',
      componentId: 'agent:planner',
      incidentId: 'inc:test-002',
      status: 'OK'
    });

    const tampered = { ...receipt, componentId: 'agent:malicious-tamper' };
    const verifyRes = verifySelfHealingReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission BX — Self-Healing Policy Gate (SPEC-0081)', () => {
  let gate;

  beforeEach(() => {
    gate = new SelfHealingPolicyGate({ maxRetries: 3 });
  });

  it('validates a well-formed incident report', () => {
    const res = gate.evaluateIncident({
      incidentId: 'inc:100',
      componentId: 'service:auth',
      severity: 'HIGH',
      anomalyType: 'INVARIANT_DRIFT',
      details: 'Drift in consensus round'
    });

    assert.equal(res.valid, true);
    assert.equal(res.code, BX_CODES.INCIDENT_REGISTERED_OK);
  });

  it('rejects malformed incident reports', () => {
    const emptyId = gate.evaluateIncident({
      incidentId: '',
      componentId: 'service:auth',
      severity: 'HIGH',
      anomalyType: 'INVARIANT_DRIFT'
    });
    assert.equal(emptyId.valid, false);
    assert.equal(emptyId.code, BX_CODES.MALFORMED_INCIDENT_DENY);

    const badSeverity = gate.evaluateIncident({
      incidentId: 'inc:101',
      componentId: 'service:auth',
      severity: 'SUPER_CRITICAL',
      anomalyType: 'INVARIANT_DRIFT'
    });
    assert.equal(badSeverity.valid, false);
    assert.equal(badSeverity.code, BX_CODES.MALFORMED_INCIDENT_DENY);
  });

  it('detects secrets in incident payload (Law VI)', () => {
    const secretKey = makeSyntheticSecret();
    const res = gate.evaluateIncident({
      incidentId: 'inc:102',
      componentId: 'service:auth',
      severity: 'MEDIUM',
      anomalyType: 'AUTH_FAILURE',
      details: `Failed with token: ${secretKey}`
    });

    assert.equal(res.valid, false);
    assert.equal(res.code, BX_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    const res = gate.evaluateIncident({
      incidentId: 'inc:103',
      componentId: 'service:storage',
      severity: 'LOW',
      anomalyType: 'FILE_ERROR',
      target: 'C:/Users/valen/Documents/Fundacion/secrets.json'
    });

    assert.equal(res.valid, false);
    assert.equal(res.code, BX_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('evaluates remediation retry limits and flags HITL escalation', () => {
    const validPlan = {
      componentId: 'agent:compiler',
      remediationType: 'RESTART'
    };

    const attempt1 = gate.evaluateRemediation(validPlan, 0);
    assert.equal(attempt1.valid, true);

    const attempt3 = gate.evaluateRemediation(validPlan, 2);
    assert.equal(attempt3.valid, true);

    const limitExceeded = gate.evaluateRemediation(validPlan, 3);
    assert.equal(limitExceeded.valid, false);
    assert.equal(limitExceeded.code, BX_CODES.MAX_RETRIES_EXCEEDED_DENY);
    assert.equal(limitExceeded.hitlRequired, true);
  });
});

describe('Mission BX — Sovereign Autonomous Self-Healing Port (SPEC-0081)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new AutonomousSelfHealingPort({ maxRetries: 3, autoQuarantineCritical: true });
  });

  it('registers incident and degrades component health', () => {
    const res = port.registerIncident({
      incidentId: 'inc:201',
      componentId: 'agent:executor',
      severity: 'HIGH',
      anomalyType: 'LATENCY_SPIKE',
      details: 'Response time exceeded 5000ms'
    });

    assert.equal(res.ok, true);
    assert.equal(res.code, BX_CODES.INCIDENT_REGISTERED_OK);
    assert.equal(res.incident.status, 'OPEN');
    assert.ok(res.receipt.receiptId.startsWith('BX-RCPT-'));

    const health = port.getComponentHealth('agent:executor');
    assert.equal(health.status, 'DEGRADED');
    assert.equal(health.activeIncidentsCount, 1);
  });

  it('auto-quarantines component on CRITICAL severity incident', () => {
    const res = port.registerIncident({
      incidentId: 'inc:202',
      componentId: 'agent:kernel',
      severity: 'CRITICAL',
      anomalyType: 'STATE_CORRUPTION',
      details: 'Memory invariant violated'
    });

    assert.equal(res.ok, true);
    const health = port.getComponentHealth('agent:kernel');
    assert.equal(health.status, 'QUARANTINED');
    assert.match(health.quarantineReason, /AUTO_CRITICAL/);
  });

  it('explicitly quarantines and releases component', () => {
    const qRes = port.quarantineComponent('agent:worker-1', 'SUSPECTED_LOOP');
    assert.equal(qRes.ok, true);
    assert.equal(qRes.code, BX_CODES.COMPONENT_QUARANTINED_OK);

    let health = port.getComponentHealth('agent:worker-1');
    assert.equal(health.status, 'QUARANTINED');

    const rRes = port.releaseQuarantine('agent:worker-1', 'OPERATOR_VERIFIED');
    assert.equal(rRes.ok, true);
    health = port.getComponentHealth('agent:worker-1');
    assert.equal(health.status, 'HEALTHY');
  });

  it('executes successful remediation and restores component health', () => {
    port.registerIncident({
      incidentId: 'inc:301',
      componentId: 'agent:router',
      severity: 'MEDIUM',
      anomalyType: 'CACHE_STALE'
    });

    let actionExecuted = false;
    const remRes = port.executeRemediation({
      componentId: 'agent:router',
      incidentId: 'inc:301',
      remediationType: 'STATE_RESET',
      actionFn: () => {
        actionExecuted = true;
      }
    });

    assert.equal(remRes.ok, true);
    assert.equal(remRes.code, BX_CODES.REMEDIATION_SUCCESS_OK);
    assert.equal(actionExecuted, true);
    assert.equal(remRes.incident.retries, 1);

    const health = port.getComponentHealth('agent:router');
    assert.equal(health.status, 'HEALTHY');
  });

  it('escalates to HITL when remediation retries exceed bound', () => {
    port.registerIncident({
      incidentId: 'inc:401',
      componentId: 'agent:flaky',
      severity: 'HIGH',
      anomalyType: 'PERSISTENT_CRASH'
    });

    // 3 failed actions
    for (let i = 0; i < 3; i++) {
      const failRes = port.executeRemediation({
        componentId: 'agent:flaky',
        incidentId: 'inc:401',
        remediationType: 'RESTART',
        actionFn: () => {
          throw new Error('Service failed to come up');
        }
      });
      assert.equal(failRes.ok, false);
      assert.equal(failRes.code, 'REMEDIATION_FAILED');
    }

    // 4th attempt should exceed retry limit
    const escRes = port.executeRemediation({
      componentId: 'agent:flaky',
      incidentId: 'inc:401',
      remediationType: 'RESTART'
    });

    assert.equal(escRes.ok, false);
    assert.equal(escRes.code, BX_CODES.ESCALATED_HITL_REQUIRED);
    assert.equal(escRes.hitlRequired, true);

    const health = port.getComponentHealth('agent:flaky');
    assert.equal(health.status, 'ESCALATED');
  });

  it('resolves incident manually and returns active incidents list', () => {
    port.registerIncident({
      incidentId: 'inc:501',
      componentId: 'agent:auditor',
      severity: 'LOW',
      anomalyType: 'METRIC_DELAY'
    });

    let active = port.listActiveIncidents();
    assert.equal(active.length, 1);

    const res = port.resolveIncident('inc:501', 'False positive alert');
    assert.equal(res.ok, true);
    assert.equal(res.code, BX_CODES.INCIDENT_RESOLVED_OK);

    active = port.listActiveIncidents();
    assert.equal(active.length, 0);

    const health = port.getComponentHealth('agent:auditor');
    assert.equal(health.status, 'HEALTHY');
  });

  it('verifies cryptographic custody trail of all emitted receipts', () => {
    port.registerIncident({
      incidentId: 'inc:601',
      componentId: 'agent:a',
      severity: 'LOW',
      anomalyType: 'MINOR_DRIFT'
    });

    port.executeRemediation({
      componentId: 'agent:a',
      incidentId: 'inc:601',
      remediationType: 'RESTART'
    });

    port.quarantineComponent('agent:b', 'PERIODIC_CHECK');

    const trailRes = port.verifyHealingTrail();
    assert.equal(trailRes.valid, true);
    assert.equal(trailRes.code, BX_CODES.TRAIL_OK);
    assert.equal(trailRes.receiptCount, 3);
    assert.ok(trailRes.headHash.length === 64);
  });

  it('detects tampered receipt in audit trail', () => {
    port.registerIncident({
      incidentId: 'inc:701',
      componentId: 'agent:x',
      severity: 'LOW',
      anomalyType: 'TEST_DRIFT'
    });

    port.executeRemediation({
      componentId: 'agent:x',
      incidentId: 'inc:701',
      remediationType: 'RESTART'
    });

    // Tamper with first receipt in trail
    port.receipts[0] = { ...port.receipts[0], componentId: 'agent:tampered' };

    const trailRes = port.verifyHealingTrail();
    assert.equal(trailRes.valid, false);
    assert.equal(trailRes.code, BX_CODES.TRAIL_BREAK);
  });
});
