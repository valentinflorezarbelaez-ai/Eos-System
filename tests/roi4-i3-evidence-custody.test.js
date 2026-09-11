import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  EvidenceCustody,
  EvidenceCustodyError,
  CUSTODY_CHAIN_ID,
  CUSTODY_EVENT_TYPES,
  GENESIS_PREVIOUS_HASH,
  resolveCustodyBaseDir
} from '../src/core/sdd/evidence-custody.js';
import { ContractEvidenceSealer } from '../src/core/formal/contract-evidence-sealer.js';
import { MissionLoopRuntime } from '../src/core/mcp/mission-loop-runtime.js';
import { MISSION_LOOP_STAGES } from '../src/core/mcp/mission-loop.js';

describe('ROI4 I3 Evidence Custody', () => {
  let tempRoot;
  let custodyDir;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-custody-'));
    custodyDir = path.join(tempRoot, '.eos', 'custody');
    fs.mkdirSync(custodyDir, { recursive: true });
  });

  afterEach(() => {
    if (tempRoot && fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('genesis / empty chain verifies as PASS_EMPTY_GENESIS', () => {
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const result = custody.verify({ failClosed: true });
    assert.equal(result.valid, true);
    assert.equal(result.verdict, 'PASS_EMPTY_GENESIS');
    assert.equal(result.count, 0);
    assert.equal(result.lastHash, GENESIS_PREVIOUS_HASH);
  });

  it('happy path: append-only hash chain of evidence records', () => {
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const e0 = custody.sealEvdRecord({
      evidence_id: 'EVD-TEST-0001',
      seal_hash: 'sha256-abc',
      status: 'VERIFIED'
    });
    const e1 = custody.sealVerifyReceipt({
      receipt_id: 'RCPT-1',
      receipt_hash: 'deadbeef',
      status: 'NOT_VERIFIED',
      builder_id: 'TEST_BUILDER',
      verifier_id: 'LOCAL'
    });
    const e2 = custody.sealMissionLoopAdvance({
      mission_id: 'MIS-TEST',
      from: 'Evidence',
      to: 'Verify',
      ok: true
    });

    assert.equal(e0.sequence, 0);
    assert.equal(e0.previous_hash, GENESIS_PREVIOUS_HASH);
    assert.equal(e1.sequence, 1);
    assert.equal(e1.previous_hash, e0.event_hash);
    assert.equal(e2.sequence, 2);
    assert.equal(e2.previous_hash, e1.event_hash);
    assert.equal(e0.event_type, CUSTODY_EVENT_TYPES.EVD_SEALED);

    const result = custody.verify({ failClosed: true });
    assert.equal(result.valid, true);
    assert.equal(result.verdict, 'PASS');
    assert.equal(result.count, 3);
    assert.equal(result.lastHash, e2.event_hash);
  });

  it('tamper detection: payload mutation fail-closed DENY', () => {
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    custody.sealEvdRecord({ evidence_id: 'EVD-T1', seal_hash: 'h1' });
    custody.sealEvdRecord({ evidence_id: 'EVD-T2', seal_hash: 'h2' });

    const logPath = custody.getLogPath();
    const raw = fs.readFileSync(logPath, 'utf8');
    const lines = raw.trim().split('\n');
    const evt = JSON.parse(lines[0]);
    evt.payload.evidence_id = 'EVD-TAMPERED';
    lines[0] = JSON.stringify(evt);
    fs.writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');

    assert.throws(
      () => custody.verify({ failClosed: true }),
      (err) => {
        assert.ok(err instanceof EvidenceCustodyError);
        assert.equal(err.code, 'CUSTODY_CHAIN_BROKEN');
        assert.equal(err.details.verdict, 'DENY');
        return true;
      }
    );

    const soft = custody.audit();
    assert.equal(soft.valid, false);
    assert.ok(['DENY', 'FAIL'].includes(soft.verdict) || soft.error);
  });

  it('tamper detection: previous_hash break DENY', () => {
    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    custody.append(CUSTODY_EVENT_TYPES.VERIFY_RECEIPT, { receipt_id: 'A' });
    custody.append(CUSTODY_EVENT_TYPES.VERIFY_RECEIPT, { receipt_id: 'B' });

    const logPath = custody.getLogPath();
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    const evt1 = JSON.parse(lines[1]);
    evt1.previous_hash = 'f'.repeat(64);
    // Keep event_hash as-is so previous_hash mismatch is detected
    lines[1] = JSON.stringify(evt1);
    fs.writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');

    assert.throws(() => custody.verify({ failClosed: true }), /CUSTODY_CHAIN_BROKEN|PREVIOUS_HASH/);
  });

  it('Fundacion never written: resolveCustodyBaseDir and append deny Fundacion paths', () => {
    const fundacionPath = path.join(tempRoot, 'Documents', 'Fundacion', 'custody');
    assert.throws(
      () => resolveCustodyBaseDir(tempRoot, fundacionPath),
      (err) => err.code === 'CUSTODY_FUNDACION_DENY'
    );

    // In-repo Fundacion segment
    const inRepo = path.join(tempRoot, 'Fundacion', 'ledger');
    assert.throws(
      () => resolveCustodyBaseDir(tempRoot, inRepo),
      (err) => err.code === 'CUSTODY_FUNDACION_DENY'
    );

    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    custody.sealEvdRecord({ evidence_id: 'EVD-OK' });
    assert.ok(!fs.existsSync(fundacionPath));
    assert.ok(fs.existsSync(custody.getLogPath()));
    assert.ok(custody.getLogPath().includes(path.join('.eos', 'custody')) || custody.getLogPath().includes('.eos'));
  });

  it('ContractEvidenceSealer writes EVD + custody event on non-dryRun', () => {
    const specsDir = path.join(tempRoot, 'docs', 'specs');
    const evidenceDir = path.join(tempRoot, 'docs', 'evidence');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(specsDir, 'SPEC-CUSTODY-DEMO.md'),
      '# SPEC\nWHEN sealed, the system SHALL record custody.\n',
      'utf8'
    );

    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const sealer = new ContractEvidenceSealer({
      controlPlaneRoot: tempRoot,
      evidenceDir,
      specsDir,
      custody
    });

    const sealed = sealer.sealContractEvidence({
      specId: 'SPEC-CUSTODY-DEMO',
      command: 'node --test',
      exitCode: 0,
      stdout: 'ok',
      dryRun: false
    });
    assert.equal(sealed.success, true);
    assert.ok(sealed.custody_event);
    assert.equal(sealed.custody_event.event_type, CUSTODY_EVENT_TYPES.EVD_SEALED);
    assert.equal(custody.verify().count, 1);

    const dry = sealer.sealContractEvidence({
      specId: 'SPEC-CUSTODY-DEMO',
      exitCode: 0,
      dryRun: true
    });
    assert.equal(dry.custody_event, null);
    assert.equal(custody.verify().count, 1);
  });

  it('MissionLoopRuntime advance seals custody without writing Fundacion', () => {
    const missionId = 'MIS-CUSTODY-1';
    const missionDir = path.join(tempRoot, '.missions', missionId);
    fs.mkdirSync(missionDir, { recursive: true });

    const custody = new EvidenceCustody({
      controlPlaneRoot: tempRoot,
      baseDir: custodyDir
    });
    const runtime = new MissionLoopRuntime({
      baseDir: tempRoot,
      custody
    });
    runtime.initLoop(missionId);
    const advanced = runtime.advance({
      missionId,
      to: MISSION_LOOP_STAGES.SPEC
    });
    assert.equal(advanced.to, 'Spec');
    assert.ok(advanced.custody_event);
    assert.equal(advanced.custody_event.event_type, CUSTODY_EVENT_TYPES.MISSION_LOOP_ADVANCE);
    assert.equal(custody.verify().verdict, 'PASS');
    assert.ok(!fs.existsSync(path.join(tempRoot, 'Fundacion')));
  });

  it('exports stable chain id CP-EVIDENCE', () => {
    assert.equal(CUSTODY_CHAIN_ID, 'CP-EVIDENCE');
  });
});