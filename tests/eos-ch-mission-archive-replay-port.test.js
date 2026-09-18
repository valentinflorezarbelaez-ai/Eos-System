/**
 * @file tests/eos-ch-mission-archive-replay-port.test.js
 * SPEC-0091 / Mission CH — Long-Horizon Mission Archive & Replay Port Test Suite.
 *
 * Invariants:
 *   PRODUCTION_READY: NO (strictly verified across all receipts and components)
 *   Fundacion Δ=0 (enforced via FUNDACION_ALWAYS_DENY)
 *   Law VI: No plain static secret literals; synthetic keys constructed dynamically via String.fromCharCode
 *   Layer-0 Purity: Pure node:crypto, zero external runtime packages.
 *   Hermetic: in-memory trail only — no disk lake / no SIEM.
 *   NON-CLAIM: ≠ production data lake / ≠ SIEM retention SaaS / ≠ PRODUCTION_READY=YES
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CH_PRODUCTION_READY,
  CH_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CH_RECEIPT_KIND,
  sha256Canonical,
  buildMissionArchiveReplayReceipt,
  verifyMissionArchiveReplayReceipt,
  canonicalMissionArchiveReplaySealBody,
  _resetReceiptSeqForTests
} from '../src/core/archive/mission-archive-replay-receipt.js';

import {
  MissionArchiveReplayPolicyGate,
  CH_CODES,
  CH_MAX_ENTRIES,
  CH_MISSION_ID_PATTERN,
  CH_DIGEST_PATTERN,
  CH_POLICY_GATE_PRODUCTION_READY,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/archive/mission-archive-replay-policy-gate.js';

import {
  MissionArchiveReplayPort,
  CH_PORT_PRODUCTION_READY,
  CH_PORT_KIND
} from '../src/core/archive/mission-archive-replay-port.js';

// Dynamic synthetic secret builder (Law VI compliance — no contiguous sk- literal)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForMissionArchiveReplay1234567890';
}

function digestFor(label) {
  return sha256Canonical({ label, mission: 'CH' });
}

function sampleHappyEntries() {
  return [
    {
      missionId: 'CG',
      receiptId: 'CG-RCPT-20260918-0001',
      digest: digestFor('cg-1')
    },
    {
      missionId: 'CF',
      receiptId: 'CF-RCPT-20260918-0002',
      digest: digestFor('cf-1')
    },
    {
      missionId: 'CE',
      receiptId: 'CE-RCPT-20260918-0003',
      digest: digestFor('ce-1')
    }
  ];
}

function sampleHappyArchivePlan(overrides = {}) {
  return {
    archiveId: 'eos-archive-l25-demo',
    label: 'multi-mission sealed trail',
    trailEntries: sampleHappyEntries(),
    ...overrides
  };
}

describe('Mission CH — Mission Archive Replay Receipt (SPEC-0091)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims across receipt/gate/port', () => {
    assert.equal(CH_PRODUCTION_READY, 'NO');
    assert.equal(CH_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
    assert.equal(CH_POLICY_GATE_PRODUCTION_READY, 'NO');
    assert.equal(CH_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed CH-RCPT-* with valid SHA-256 hash', () => {
    const trailEntries = sampleHappyEntries();
    const trailDigest = sha256Canonical({
      trailEntries,
      decision: 'ARCHIVE',
      archiveId: 'eos-demo'
    });
    const receipt = buildMissionArchiveReplayReceipt({
      operation: 'ARCHIVE',
      archiveId: 'eos-demo',
      decision: 'ARCHIVE',
      trailEntries,
      trailDigest,
      reasons: ['ok']
    });

    assert.equal(receipt.kind, CH_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('CH-RCPT-'));
    assert.equal(receipt.archiveId, 'eos-demo');
    assert.equal(receipt.decision, 'ARCHIVE');
    assert.equal(receipt.entryCount, 3);
    assert.equal(receipt.trailEntries.length, 3);
    assert.equal(receipt.trailDigest, trailDigest);
    assert.deepEqual([...receipt.reasons], ['ok']);
    assert.equal(receipt.receiptHash.length, 64);
    assert.equal(receipt.nonClaims.productionDataLake, false);
    assert.equal(receipt.nonClaims.siemRetentionSaas, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const body = canonicalMissionArchiveReplaySealBody(receipt);
    assert.equal(Object.keys(body).length, 9);

    const verifyRes = verifyMissionArchiveReplayReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content (hash mismatch)', () => {
    const receipt = buildMissionArchiveReplayReceipt({
      operation: 'ARCHIVE',
      archiveId: 'eos-demo',
      decision: 'ARCHIVE',
      trailEntries: sampleHappyEntries()
    });

    const tampered = { ...receipt, archiveId: 'eos-tampered-hacked' };
    const verifyRes = verifyMissionArchiveReplayReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission CH — Mission Archive Replay Policy Gate (SPEC-0091)', () => {
  let gate;

  beforeEach(() => {
    gate = new MissionArchiveReplayPolicyGate();
  });

  it('validates a well-formed archive plan with trail entries', () => {
    const res = gate.evaluateArchivePlan(sampleHappyArchivePlan());
    assert.equal(res.valid, true);
    assert.equal(res.code, CH_CODES.PLAN_VALID_OK);
    assert.equal(res.trailEntries.length, 3);
    assert.equal(res.archiveId, 'eos-archive-l25-demo');
    assert.ok(CH_MISSION_ID_PATTERN.test('CG'));
    assert.ok(CH_DIGEST_PATTERN.test(digestFor('x')));
    assert.ok(CH_MAX_ENTRIES >= 2);
  });

  it('rejects empty plan / empty trailEntries fail-closed', () => {
    const empty = gate.evaluateArchivePlan({
      archiveId: 'empty',
      trailEntries: []
    });
    assert.equal(empty.valid, false);
    assert.equal(empty.code, CH_CODES.EMPTY_TRAIL_DENY);

    const missing = gate.evaluateArchivePlan({
      archiveId: 'missing'
    });
    assert.equal(missing.valid, false);
    assert.equal(missing.code, CH_CODES.EMPTY_PLAN_DENY);
  });

  it('rejects bad digest (not 64 hex)', () => {
    const res = gate.evaluateArchivePlan({
      archiveId: 'bad-digest',
      trailEntries: [
        {
          missionId: 'CG',
          receiptId: 'CG-RCPT-20260918-0001',
          digest: 'not-a-digest'
        }
      ]
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CH_CODES.INVALID_DIGEST_DENY);
  });

  it('detects secrets in plan labels/payloads (Law VI)', () => {
    const secret = makeSyntheticSecret();
    assert.equal(scanForSecrets(`apiKey=${secret}`), true);

    const res = gate.evaluateArchivePlan({
      archiveId: 'leak',
      label: `archive with key ${secret}`,
      trailEntries: sampleHappyEntries()
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CH_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    assert.equal(isFundacionTarget('C:/Users/valen/Documents/Fundacion/x'), true);

    const planLevel = gate.evaluateArchivePlan({
      archiveId: 'fundacion-plan',
      target: 'C:/Users/valen/Documents/Fundacion/archive.json',
      trailEntries: sampleHappyEntries()
    });
    assert.equal(planLevel.valid, false);
    assert.equal(planLevel.code, CH_CODES.FUNDACION_ALWAYS_DENY);

    const idLevel = gate.evaluateArchivePlan({
      archiveId: 'fundacion/bleed',
      trailEntries: sampleHappyEntries()
    });
    assert.equal(idLevel.valid, false);
    assert.equal(idLevel.code, CH_CODES.FUNDACION_ALWAYS_DENY);

    const entryLevel = gate.evaluateArchivePlan({
      archiveId: 'entry-fundacion',
      trailEntries: [
        {
          missionId: 'fundacion',
          receiptId: 'CG-RCPT-20260918-0001',
          digest: digestFor('f')
        }
      ]
    });
    assert.equal(entryLevel.valid, false);
    assert.equal(entryLevel.code, CH_CODES.FUNDACION_ALWAYS_DENY);
  });

  it('rejects oversized trail beyond max entry bound', () => {
    const tight = new MissionArchiveReplayPolicyGate({ maxEntries: 2 });
    const entries = [
      {
        missionId: 'A',
        receiptId: 'A-RCPT-1',
        digest: digestFor('a')
      },
      {
        missionId: 'B',
        receiptId: 'B-RCPT-1',
        digest: digestFor('b')
      },
      {
        missionId: 'C',
        receiptId: 'C-RCPT-1',
        digest: digestFor('c')
      }
    ];
    const res = tight.evaluateArchivePlan({
      archiveId: 'over',
      trailEntries: entries
    });
    assert.equal(res.valid, false);
    assert.equal(res.code, CH_CODES.OVERSIZED_TRAIL_DENY);
  });
});

describe('Mission CH — Mission Archive Replay Port (SPEC-0091)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new MissionArchiveReplayPort();
  });

  it('archive happy path: sealed trail → ARCHIVE + CH receipt', () => {
    const plan = sampleHappyArchivePlan();
    const res = port.archive(plan);
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'ARCHIVE');
    assert.equal(res.code, CH_CODES.ARCHIVE_ALLOW);
    assert.equal(res.archiveId, 'eos-archive-l25-demo');
    assert.equal(res.trailEntries.length, 3);
    assert.equal(res.trailDigest.length, 64);

    assert.equal(res.receipt.kind, CH_RECEIPT_KIND);
    assert.ok(res.receipt.receiptId.startsWith('CH-RCPT-'));
    assert.equal(res.receipt.decision, 'ARCHIVE');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.fundacionDelta, 0);
    assert.equal(res.receipt.trailEntries.length, 3);

    const stored = port.getArchive(res.archiveId);
    assert.ok(stored);
    assert.equal(stored.trailDigest, res.trailDigest);
    assert.equal(stored.decision, 'ARCHIVE');
  });

  it('replay happy path: sealed in-memory trail → REPLAY + CH receipt', () => {
    const archived = port.archive(sampleHappyArchivePlan());
    assert.equal(archived.ok, true);

    const res = port.replay({
      archiveId: archived.archiveId,
      replayCursor: '0/3'
    });
    assert.equal(res.ok, true);
    assert.equal(res.decision, 'REPLAY');
    assert.equal(res.code, CH_CODES.REPLAY_ALLOW);
    assert.equal(res.archiveId, archived.archiveId);
    assert.equal(res.trailEntries.length, 3);
    assert.equal(res.replayCursor, '0/3');
    assert.ok(res.receipt.receiptId.startsWith('CH-RCPT-'));
    assert.equal(res.receipt.decision, 'REPLAY');
    assert.equal(res.receipt.productionReady, 'NO');
    assert.equal(res.receipt.replayCursor, '0/3');
  });

  it('deny empty trail emits sealed DENY receipt', () => {
    const res = port.archive({
      archiveId: 'deny-empty',
      trailEntries: []
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CH_CODES.EMPTY_TRAIL_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CH-RCPT-'));
  });

  it('deny Fundacion emits sealed DENY receipt', () => {
    const res = port.archive({
      archiveId: 'deny-fundacion',
      target: 'Documents/Fundacion/out',
      trailEntries: sampleHappyEntries()
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CH_CODES.FUNDACION_ALWAYS_DENY);
    assert.equal(res.decision, 'DENY');
    assert.ok(res.receipt.receiptId.startsWith('CH-RCPT-'));
    assert.equal(verifyMissionArchiveReplayReceipt(res.receipt).ok, true);
  });

  it('deny secrets emits sealed DENY receipt', () => {
    const secret = makeSyntheticSecret();
    const res = port.archive({
      archiveId: 'deny-secret',
      trailEntries: sampleHappyEntries(),
      payload: { token: secret }
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CH_CODES.SECRET_DETECTED_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny bad digest emits sealed DENY receipt', () => {
    const res = port.archive({
      archiveId: 'deny-digest',
      trailEntries: [
        {
          missionId: 'CG',
          receiptId: 'CG-RCPT-20260918-0001',
          digest: 'deadbeef'
        }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CH_CODES.INVALID_DIGEST_DENY);
    assert.equal(res.decision, 'DENY');
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('deny oversize trail emits sealed DENY receipt', () => {
    const tight = new MissionArchiveReplayPort({ maxEntries: 2 });
    const res = tight.archive({
      archiveId: 'deny-oversize',
      trailEntries: [
        { missionId: 'A', receiptId: 'A-RCPT-1', digest: digestFor('a') },
        { missionId: 'B', receiptId: 'B-RCPT-1', digest: digestFor('b') },
        { missionId: 'C', receiptId: 'C-RCPT-1', digest: digestFor('c') }
      ]
    });
    assert.equal(res.ok, false);
    assert.equal(res.code, CH_CODES.OVERSIZED_TRAIL_DENY);
    assert.equal(res.receipt.decision, 'DENY');
  });

  it('verifyTrail validates CH receipt chain; tamper breaks trail', () => {
    const a = port.archive(
      sampleHappyArchivePlan({ archiveId: 'trail-a' })
    );
    const b = port.archive({
      archiveId: 'trail-b',
      trailEntries: [
        {
          missionId: 'CG',
          receiptId: 'CG-RCPT-20260918-0099',
          digest: digestFor('trail-b')
        }
      ]
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);

    const okTrail = port.verifyTrail();
    assert.equal(okTrail.valid, true);
    assert.equal(okTrail.code, CH_CODES.TRAIL_OK);
    assert.equal(okTrail.receiptCount, 2);

    const mid = port.receipts[0];
    port.receipts = [{ ...mid, archiveId: 'TAMPERED' }, b.receipt];

    const broken = port.verifyTrail();
    assert.equal(broken.valid, false);
    assert.equal(broken.code, CH_CODES.TRAIL_BREAK);
  });

  it('NON-CLAIM: not data lake / not SIEM / PRODUCTION_READY=NO', () => {
    assert.equal(CH_PORT_KIND, 'eos-mission-archive-replay-port');
    const receipt = buildMissionArchiveReplayReceipt({
      operation: 'ARCHIVE',
      archiveId: 'nonclaim',
      decision: 'ARCHIVE',
      trailEntries: sampleHappyEntries()
    });
    assert.equal(receipt.nonClaims.productionDataLake, false);
    assert.equal(receipt.nonClaims.siemRetentionSaas, false);
    assert.equal(receipt.nonClaims.fundacionTouch, false);
    assert.equal(receipt.nonClaims.productionReady, false);
    assert.equal(CH_PORT_PRODUCTION_READY, 'NO');
    assert.equal(CH_PRODUCTION_READY, 'NO');
    assert.equal(PRODUCTION_READY, 'NO');
  });
});
