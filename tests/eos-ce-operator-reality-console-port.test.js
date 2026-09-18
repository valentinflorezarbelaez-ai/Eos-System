/**
 * @file tests/eos-ce-operator-reality-console-port.test.js
 * SPEC-0088 / Mission CE — Sovereign Operator Reality Console Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   NON-CLAIM: ≠ full SIEM/APM / ≠ production ops center / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CE_PRODUCTION_READY,
  CE_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CE_RECEIPT_KIND,
  CE_STATUS,
  sha256Canonical,
  buildOperatorRealityConsoleReceipt,
  verifyOperatorRealityConsoleReceipt,
  canonicalOperatorRealityConsoleSealBody,
  aggregateStatusCounts,
  _resetReceiptSeqForTests
} from '../src/core/observability/operator-reality-console-receipt.js';

import {
  OperatorRealityConsolePolicyGate,
  CE_CODES,
  CE_MAX_ENTRIES,
  CE_LADDER_ID_PATTERN,
  CE_VALID_STATUSES,
  CE_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/observability/operator-reality-console-policy-gate.js';

import {
  OperatorRealityConsolePort,
  CE_PORT_PRODUCTION_READY,
  CE_PORT_KIND
} from '../src/core/observability/operator-reality-console-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionOperatorReality1234567890';
}

function sampleHappyPlan(overrides = {}) {
  return {
    consoleId: 'eos-reality-console-demo',
    label: 'aggregated epistemic ladder surface',
    snapshotAt: '2026-09-18T20:00:00.000Z',
    entries: [
      {
        ladder: 'L22',
        satellite: 'CB',
        status: 'MEASURED',
        evidenceRef: 'EVD-CB'
      },
      {
        ladder: 'L23',
        satellite: 'CC',
        status: 'MEASURED',
        evidenceRef: 'EVD-CC'
      },
      {
        ladder: 'L24',
        satellite: 'CD',
        status: 'MEASURED',
        evidenceRef: 'EVD-CD'
      },
      { ladder: 'L24', satellite: 'CE', status: 'UNKNOWN' },
      { ladder: 'L11', status: 'BLOCKED', evidenceRef: 'WAIT-L11' }
    ],
    ...overrides
  };
}

describe('Mission CE — Operator Reality Console Receipt (SPEC-0088)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CE_PRODUCTION_READY, 'NO');
    assert.equal(CE_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CE_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CE_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CE-RCPT-* with valid SHA-256 hash', () => {
    const entries = [
      { ladder: 'L24', satellite: 'CE', status: 'MEASURED', evidenceRef: 'e1' },
      { ladder: 'L23', status: 'UNKNOWN' }
    ];
    const summary = aggregateStatusCounts(entries);
    const receipt = buildOperatorRealityConsoleReceipt({
      operation: 'SNAPSHOT',
      consoleId: 'eos-demo',
      decision: 'VIEW',
      snapshotAt: '2026-09-18T20:00:00.000Z',
      entries,
      summary,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CE_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CE-RCPT-'));
    assert.equal(receipt.consoleId, 'eos-demo');
    assert.equal(receipt.decision, 'VIEW');
    assert.equal(receipt.snapshotAt, '2026-09-18T20:00:00.000Z');
    assert.equal(receipt.entryCount, 2);
    assert.equal(receipt.summary.measured, 1);
    assert.equal(receipt.summary.unknown, 1);
    assert.equal(receipt.summary.blocked, 0);
    assert.equal(receipt.entries.length, 2);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.fullSiemApm, false);
    assert.equal(receipt.nonClaims.productionOpsCenter, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalOperatorRealityConsoleSealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyOperatorRealityConsoleReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildOperatorRealityConsoleReceipt({
      operation: 'SNAPSHOT',
      consoleId: 'eos-demo',
      decision: 'VIEW',
      snapshotAt: '2026-09-18T20:00:00.000Z',
      entries: [{ ladder: 'L24', status: 'MEASURED' }]
    });

    const tampered = { ...receipt, consoleId: 'eos-tampered-hacked' };
    const verifyRes = verifyOperatorRealityConsoleReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CE — Operator Reality Console Policy Gate (SPEC-0088)', () => {
  let gate;

  beforeEach(() => {
    gate = new OperatorRealityConsolePolicyGate();
  });

  it('validates a well-formed MEASURED mix console plan', () => {
    const res = gate.evaluatePlan(sampleHappyPlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CE_CODES.PLAN_VALID_OK);
    assert.equal(res.entries.length, 5);
    assert.equal(res.consoleId, 'eos-reality-console-demo');
    assert.ok(CE_LADDER_ID_PATTERN.test('L24'));
    assert.ok(CE_VALID_STATUSES.includes(CE_STATUS.MEASURED));
    assert.ok(CE_MAX_ENTRIES >= 2);
  });

  it('rejects empty console entries fail-closed', () => {
    const empty = gate.evaluatePlan({
      consoleId: 'empty',
      entries: []
    });
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CE_CODES.EMPTY_CONSOLE_DENY);

    const missing = gate.evaluatePlan({
      consoleId: 'missing'
    });
    assert.equal(missing.valid, false);
    assert.equal(missing.code, CE_CODES.EMPTY_CONSOLE_DENY);
  });

  it('rejects invalid status enum', () => {
    const res = gate.evaluatePlan({
      consoleId: 'bad-status',
      entries: [{ ladder: 'L24', status: 'GREEN' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CE_CODES.INVALID_STATUS_DENY);
  });

  it('rejects unknown ladder ids outside L11–L24', () => {
    const badId = gate.evaluatePlan({
      consoleId: 'bad-ladder',
      entries: [{ ladder: 'L99', status: 'MEASURED' }]
    });
    assert.equal(badId.valid, false);
    assert.equal(badId.code, CE_CODES.UNKNOWN_LADDER_DENY);

    const l10 = gate.evaluatePlan({
      consoleId: 'l10',
      entries: [{ ladder: 'L10', status: 'UNKNOWN' }]
    });
    assert.equal(l10.valid, false);
    assert.equal(l10.code, CE_CODES.UNKNOWN_LADDER_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluatePlan({
      consoleId: 'leak',
      label: `console with key ${secret}`,
      entries: [{ ladder: 'L24', status: 'MEASURED' }]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CE_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluatePlan({
      consoleId: 'fundacion-plan',
      target: 'C:/Users/valen/Documents/Fundacion/console.json',
      entries: [{ ladder: 'L24', status: 'MEASURED' }]
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CE_CODES.FUNDACION_ALWAYS_DENY);

    const consoleIdLevel = gate.evaluatePlan({
      consoleId: 'fundacion/bleed',
      entries: [{ ladder: 'L24', status: 'MEASURED' }]
    });
    assert.equal(consoleIdLevel.valid, false);
    assert.equal(consoleIdLevel.code, CE_CODES.FUNDACION_ALWAYS_DENY);

    const rowLevel = gate.evaluatePlan({
      consoleId: 'fundacion-row',
      entries: [
        {
          ladder: 'L24',
          status: 'MEASURED',
          evidenceRef: '/fundacion/memory.json'
        }
      ]
    });
    assert.equal(rowLevel.valid, false);
    assert.equal(rowLevel.code, CE_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects oversized entry lists beyond max entry bound', () => {
    const tight = new OperatorRealityConsolePolicyGate({ maxEntries: 2 });
    const entries = [
      { ladder: 'L22', status: 'MEASURED' },
      { ladder: 'L23', status: 'UNKNOWN' },
      { ladder: 'L24', status: 'BLOCKED' }
    ];
    const res = tight.evaluatePlan({
      consoleId: 'over',
      entries
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CE_CODES.OVERSIZED_ENTRIES_DENY);
  });
});

describe('Mission CE — Operator Reality Console Port (SPEC-0088)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new OperatorRealityConsolePort();
  });

  it('snapshot happy path: MEASURED mix → VIEW + CE receipt with summary counts', () => {
    const plan = sampleHappyPlan();
    const res = port.snapshot(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'VIEW');
    assert.equal(res.code, CE_CODES.SNAPSHOT_VIEW);
    assert.equal(res.consoleId, 'eos-reality-console-demo');
    assert.equal(res.rootDigest.length, 64);
    assert.equal(res.summary.measured, 3);
    assert.equal(res.summary.unknown, 1);
    assert.equal(res.summary.blocked, 1);
    assert.equal(res.entries.length, 5);

    assert.equal(res.receipt.kind, CE_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CE-RCPT-'));
    assert.equal(res.receipt.decision, 'VIEW');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.summary.measured, 3);
    assert.equal(res.receipt.summary.unknown, 1);
    assert.equal(res.receipt.summary.blocked, 1);

    const stored = port.getSnapshot(res.consoleId);
    assert.ok(stored);
    assert.equal(stored.rootDigest, res.rootDigest);
    assert.equal(stored.summary.measured, 3);
  });

  it('snapshot surfaces UNKNOWN and BLOCKED entries in summary', () => {
    const res = port.snapshot({
      consoleId: 'mixed-epistemic',
      entries: [
        { ladder: 'L20', status: 'UNKNOWN' },
        { ladder: 'L21', status: 'BLOCKED' },
        { ladder: 'L22', status: 'MEASURED', satellite: 'CB' }
      ]
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'VIEW');
    assert.equal(res.summary.measured, 1);
    assert.equal(res.summary.unknown, 1);
    assert.equal(res.summary.blocked, 1);
    assert.equal(res.receipt.entries.length, 3);
  });

  it('deny empty console emits sealed DENY receipt', () => {
    const res = port.snapshot({
      consoleId: 'deny-empty',
      entries: []
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CE_CODES.EMPTY_CONSOLE_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CE-RCPT-'));
  });

  it('deny Fundacion emits sealed DENY receipt', () => {
    const res = port.snapshot({
      consoleId: 'deny-fundacion',
      target: 'Documents/Fundacion/out',
      entries: [{ ladder: 'L24', status: 'MEASURED' }]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CE_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CE-RCPT-'));
    assert.equal(verifyOperatorRealityConsoleReceipt(res.receipt).ok, true);
  });

  it('deny secrets emits sealed DENY receipt', () => {
    const secret = makeSyntheticSecret();
    const res = port.snapshot({
      consoleId: 'deny-secret',
      entries: [
        {
          ladder: 'L24',
          status: 'MEASURED',
          payload: { token: secret }
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CE_CODES.SECRET_DETECTED_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny invalid status emits sealed DENY receipt', () => {
    const res = port.snapshot({
      consoleId: 'deny-status',
      entries: [{ ladder: 'L24', status: 'READY' }]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CE_CODES.INVALID_STATUS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny oversize entries emits sealed DENY receipt', () => {
    const tight = new OperatorRealityConsolePort({ maxEntries: 2 });
    const res = tight.snapshot({
      consoleId: 'deny-oversize',
      entries: [
        { ladder: 'L22', status: 'MEASURED' },
        { ladder: 'L23', status: 'UNKNOWN' },
        { ladder: 'L24', status: 'BLOCKED' }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CE_CODES.OVERSIZED_ENTRIES_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('verifyTrail validates CE receipt chain; tamper breaks trail', () => {
    const a = port.snapshot(sampleHappyPlan({ consoleId: 'trail-a' }));
    const b = port.snapshot({
      consoleId: 'trail-b',
      entries: [
        { ladder: 'L17', status: 'MEASURED', satellite: 'CLOSED' },
        { ladder: 'L24', status: 'UNKNOWN', satellite: 'CE' }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CE_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, consoleId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CE_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: not SIEM/APM / not ops center / PRODUCTION_READY=NO', () => {
    assert.equal(CE_PORT_KIND, 'eos-operator-reality-console-port');
    const receipt = buildOperatorRealityConsoleReceipt({
      operation: 'SNAPSHOT',
      consoleId: 'nonclaim',
      decision: 'VIEW',
      snapshotAt: '2026-09-18T20:00:00.000Z',
      entries: [{ ladder: 'L24', status: 'MEASURED' }]
    });
    assert.equal(receipt.nonClaims.fullSiemApm, false);
    assert.equal(receipt.nonClaims.productionOpsCenter, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CE_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CE_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
  });
});
