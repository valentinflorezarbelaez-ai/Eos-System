/**
 * @file tests/eos-by-spec-synthesis-compiler-port.test.js
 * SPEC-0082 / Mission BY — Autonomous EARS/BDD Spec Synthesizer & Verification Compiler Port Test Suite.
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
  BY_PRODUCTION_READY,
  BY_RECEIPT_PRODUCTION_READY,
  BY_RECEIPT_KIND,
  sha256Canonical,
  buildSpecSynthesisReceipt,
  verifySpecSynthesisReceipt,
  _resetReceiptSeqForTests
} from '../src/core/sdd/spec-synthesis-receipt.js';

import {
  SpecSynthesisPolicyGate,
  BY_CODES,
  EARS_PATTERNS,
  scanForSecrets,
  isFundacionTarget
} from '../src/core/sdd/spec-synthesis-policy-gate.js';

import {
  SpecSynthesisCompilerPort,
  BY_PORT_PRODUCTION_READY,
  BY_PORT_KIND
} from '../src/core/sdd/spec-synthesis-compiler-port.js';

// Dynamic synthetic secret builder (Law VI compliance)
function makeSyntheticSecret() {
  const prefix = String.fromCharCode(115, 107, 45);
  return prefix + 'syntheticTestCredentialKeyForSpecSynthesisVerification1234567890';
}

describe('Mission BY — Spec Synthesis Receipt (SPEC-0082)', () => {
  beforeEach(() => {
    _resetReceiptSeqForTests();
  });

  it('declares PRODUCTION_READY=NO non-claims', () => {
    assert.equal(BY_PRODUCTION_READY, 'NO');
    assert.equal(BY_RECEIPT_PRODUCTION_READY, 'NO');
    assert.equal(BY_PORT_PRODUCTION_READY, 'NO');
  });

  it('builds canonical nine-field sealed receipt with valid SHA-256 hash', () => {
    const receipt = buildSpecSynthesisReceipt({
      operation: 'SPEC_COMPILE',
      goalId: 'goal:auth',
      specId: 'SPEC-BY-AUTH',
      status: 'OK',
      digestHash: sha256Canonical({ sample: 'spec-data' })
    });

    assert.equal(receipt.kind, BY_RECEIPT_KIND);
    assert.equal(receipt.productionReady, 'NO');
    assert.equal(receipt.fundacionDelta, 0);
    assert.ok(receipt.receiptId.startsWith('BY-RCPT-'));
    assert.equal(receipt.goalId, 'goal:auth');
    assert.equal(receipt.specId, 'SPEC-BY-AUTH');
    assert.ok(receipt.receiptHash.length === 64);
    assert.equal(receipt.nonClaims.automatedArchitect, false);
    assert.equal(receipt.nonClaims.productionReady, false);

    const verifyRes = verifySpecSynthesisReceipt(receipt);
    assert.equal(verifyRes.ok, true);
  });

  it('detects tampering in receipt content', () => {
    const receipt = buildSpecSynthesisReceipt({
      operation: 'SPEC_COMPILE',
      goalId: 'goal:auth',
      specId: 'SPEC-BY-AUTH',
      status: 'OK'
    });

    const tampered = { ...receipt, goalId: 'goal:tampered-hacked' };
    const verifyRes = verifySpecSynthesisReceipt(tampered);
    assert.equal(verifyRes.ok, false);
    assert.match(verifyRes.reason, /receiptHash mismatch/);
  });
});

describe('Mission BY — Spec Synthesis Policy Gate (SPEC-0082)', () => {
  let gate;

  beforeEach(() => {
    gate = new SpecSynthesisPolicyGate();
  });

  it('validates a well-formed goal', () => {
    const res = gate.evaluateGoal({
      goalId: 'goal:cache',
      title: 'Distributed Redis Caching',
      objective: 'Cache user sessions with 15-minute TTL'
    });

    assert.equal(res.valid, true);
    assert.equal(res.code, BY_CODES.GOAL_VALID_OK);
  });

  it('rejects malformed goals missing title or objective', () => {
    const badId = gate.evaluateGoal({
      goalId: '',
      title: 'Title',
      objective: 'Objective'
    });
    assert.equal(badId.valid, false);
    assert.equal(badId.code, BY_CODES.MALFORMED_GOAL_DENY);

    const badObj = gate.evaluateGoal({
      goalId: 'goal:test',
      title: 'Title',
      objective: ''
    });
    assert.equal(badObj.valid, false);
    assert.equal(badObj.code, BY_CODES.MALFORMED_GOAL_DENY);
  });

  it('validates all 4 formal EARS syntax patterns', () => {
    const eventDriven = gate.evaluateEARSStatement('WHEN a user logs in, THE SYSTEM SHALL issue a JWT token');
    assert.equal(eventDriven.valid, true);
    assert.equal(eventDriven.pattern, 'EVENT_DRIVEN');

    const stateDriven = gate.evaluateEARSStatement('WHILE in maintenance mode, THE SYSTEM SHALL reject write requests');
    assert.equal(stateDriven.valid, true);
    assert.equal(stateDriven.pattern, 'STATE_DRIVEN');

    const errorDriven = gate.evaluateEARSStatement('IF database connection times out, THEN THE SYSTEM SHALL retry with exponential backoff');
    assert.equal(errorDriven.valid, true);
    assert.equal(errorDriven.pattern, 'ERROR_DRIVEN');

    const ubiquitous = gate.evaluateEARSStatement('THE SYSTEM SHALL hash all stored passwords using Argon2id');
    assert.equal(ubiquitous.valid, true);
    assert.equal(ubiquitous.pattern, 'UBIQUITOUS');
  });

  it('rejects statements with ambiguous keywords', () => {
    const res1 = gate.evaluateEARSStatement('WHEN data arrives, THE SYSTEM SHALL process it maybe later');
    assert.equal(res1.valid, false);
    assert.equal(res1.code, BY_CODES.AMBIGUOUS_REQUIREMENT_DENY);

    const res2 = gate.evaluateEARSStatement('THE SYSTEM SHALL respond as fast as possible to queries');
    assert.equal(res2.valid, false);
    assert.equal(res2.code, BY_CODES.AMBIGUOUS_REQUIREMENT_DENY);
  });

  it('detects secrets in goal or scenario (Law VI)', () => {
    const secret = makeSyntheticSecret();
    const res = gate.evaluateGoal({
      goalId: 'goal:leak',
      title: 'API Gateway',
      objective: `Connect with apiKey: ${secret}`
    });

    assert.equal(res.valid, false);
    assert.equal(res.code, BY_CODES.SECRET_DETECTED_DENY);
  });

  it('blocks Fundacion targets with FUNDACION_ALWAYS_DENY', () => {
    const res = gate.evaluateGoal({
      goalId: 'goal:fundacion',
      title: 'Fundacion Specs',
      objective: 'Write specifications',
      target: 'C:/Users/valen/Documents/Fundacion/specs.md'
    });

    assert.equal(res.valid, false);
    assert.equal(res.code, BY_CODES.FUNDACION_ALWAYS_DENY);
  });
});

describe('Mission BY — Autonomous EARS/BDD Spec Synthesizer Port (SPEC-0082)', () => {
  let port;

  beforeEach(() => {
    _resetReceiptSeqForTests();
    port = new SpecSynthesisCompilerPort();
  });

  it('compiles goal into formal EARS requirements and BDD scenarios', () => {
    const res = port.compileGoalToSpec({
      goalId: 'goal:jwt-auth',
      title: 'JWT Token Service',
      objective: 'Issue signed JWT tokens with 15-minute expiration',
      targetSystem: 'AUTH_GATEWAY'
    });

    assert.equal(res.ok, true);
    assert.equal(res.code, BY_CODES.SPEC_COMPILED_OK);
    assert.equal(res.specId, 'SPEC-BY-GOALJWTAUTH');
    assert.ok(res.receipt.receiptId.startsWith('BY-RCPT-'));

    // Verify 4 synthesized EARS requirements
    assert.equal(res.spec.requirements.length, 4);
    assert.equal(res.spec.requirements[0].pattern, 'EVENT_DRIVEN');
    assert.equal(res.spec.requirements[1].pattern, 'STATE_DRIVEN');
    assert.equal(res.spec.requirements[2].pattern, 'ERROR_DRIVEN');
    assert.equal(res.spec.requirements[3].pattern, 'UBIQUITOUS');

    // Verify synthesized BDD scenarios
    assert.equal(res.spec.scenarios.length, 2);
    assert.match(res.spec.scenarios[0].given, /healthy/);
    assert.match(res.spec.scenarios[1].then, /fail-closed/);
  });

  it('compiles custom EARS requirements when provided', () => {
    const res = port.compileGoalToSpec({
      goalId: 'goal:custom-ears',
      title: 'Rate Limiting',
      objective: 'Limit API requests to 100 per minute',
      customRequirements: [
        'WHEN request count exceeds 100 within 60s, THE SYSTEM SHALL return HTTP 429'
      ]
    });

    assert.equal(res.ok, true);
    assert.equal(res.spec.requirements.length, 5);
    assert.equal(res.spec.requirements[4].pattern, 'EVENT_DRIVEN');
  });

  it('renders compiled spec to standard professional Markdown', () => {
    const res = port.compileGoalToSpec({
      goalId: 'goal:md-test',
      title: 'Metrics Pipeline',
      objective: 'Aggregate CPU metrics'
    });

    const md = port.renderMarkdown(res.specId);
    assert.ok(md.includes('# Specification — Metrics Pipeline'));
    assert.ok(md.includes('## 1. Functional Requirements (EARS)'));
    assert.ok(md.includes('## 2. Acceptance Criteria (BDD)'));
    assert.ok(md.includes('ESCENARIO:'));
  });

  it('retrieves stored spec by specId', () => {
    const res = port.compileGoalToSpec({
      goalId: 'goal:lookup',
      title: 'Lookup Goal',
      objective: 'Perform key lookup'
    });

    const retrieved = port.getSpec(res.specId);
    assert.equal(retrieved.specId, res.specId);
    assert.equal(retrieved.title, 'Lookup Goal');
  });

  it('verifies cryptographic custody trail of all emitted receipts', () => {
    port.compileGoalToSpec({
      goalId: 'goal:t1',
      title: 'Task 1',
      objective: 'Execute Task 1'
    });

    port.compileGoalToSpec({
      goalId: 'goal:t2',
      title: 'Task 2',
      objective: 'Execute Task 2'
    });

    const trailRes = port.verifySpecTrail();
    assert.equal(trailRes.valid, true);
    assert.equal(trailRes.code, BY_CODES.TRAIL_OK);
    assert.equal(trailRes.receiptCount, 2);
    assert.ok(trailRes.headHash.length === 64);
  });

  it('detects tampered receipt in audit trail', () => {
    port.compileGoalToSpec({
      goalId: 'goal:t3',
      title: 'Task 3',
      objective: 'Execute Task 3'
    });

    // Tamper with receipt
    port.receipts[0] = { ...port.receipts[0], goalId: 'goal:tampered' };

    const trailRes = port.verifySpecTrail();
    assert.equal(trailRes.valid, false);
    assert.equal(trailRes.code, BY_CODES.TRAIL_BREAK);
  });
});
