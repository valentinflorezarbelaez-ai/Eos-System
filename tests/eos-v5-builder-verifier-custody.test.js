import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertBuilderVerifierDisjunction,
  validateVerificationReceiptCustody
} from '../src/core/governance/builder-verifier-custody.js';
import { EvidenceCustody } from '../src/core/sdd/evidence-custody.js';
import { runBuilderVerifierCustodyGate } from '../scripts/ci/builder-verifier-custody-gate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

describe('Ladder 10 V5 — Runtime Enforcement of BUILDER != VERIFIER Rule', () => {
  it('V5: OpenSpec change artifacts exist', () => {
    const base = path.join(rootDir, 'openspec/changes/eos-v5-builder-verifier-gate');
    for (const rel of ['.openspec.yaml', 'proposal.md', 'tasks.md']) {
      assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
    }
  });

  it('V5: package.json wires test:v5', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['test:v5'],
      'node --test tests/eos-v5-builder-verifier-custody.test.js',
      'package.json must declare test:v5'
    );
  });

  it('V5: assertBuilderVerifierDisjunction rejects missing and collision identities', () => {
    // Missing builder
    assert.throws(
      () => assertBuilderVerifierDisjunction({ verifier_id: 'verifier-1' }),
      /BUILDER_ID_MISSING/
    );

    // Missing verifier
    assert.throws(
      () => assertBuilderVerifierDisjunction({ builder_id: 'builder-1' }),
      /VERIFIER_ID_MISSING/
    );

    // Identity collision (self-certification attempt)
    assert.throws(
      () => assertBuilderVerifierDisjunction({ builder_id: 'agent-alpha', verifier_id: 'agent-alpha' }),
      /BUILDER_EQUALS_VERIFIER_VIOLATION/
    );

    // Identity collision with whitespace / case variations
    assert.throws(
      () => assertBuilderVerifierDisjunction({ builder_id: 'agent-alpha ', verifier_id: ' AGENT-ALPHA' }),
      /BUILDER_EQUALS_VERIFIER_VIOLATION/
    );

    // Placeholder verifier rejected
    assert.throws(
      () => assertBuilderVerifierDisjunction({ builder_id: 'builder-1', verifier_id: 'APPLY_BUILDER_NOT_VERIFIER' }),
      /PLACEHOLDER_VERIFIER_DENIED/
    );

    // Distinct identities pass
    assert.doesNotThrow(() => {
      assertBuilderVerifierDisjunction({ builder_id: 'builder-coder', verifier_id: 'verifier-auditor' });
    });
  });

  it('V5: validateVerificationReceiptCustody validates receipt objects fail-closed', () => {
    const invalidReceipt = {
      receipt_id: 'rcpt-01',
      builder_id: 'subagent-builder-1',
      verifier_id: 'subagent-builder-1'
    };

    const invalidResult = validateVerificationReceiptCustody(invalidReceipt);
    assert.equal(invalidResult.valid, false);
    assert.equal(invalidResult.code, 'BUILDER_EQUALS_VERIFIER_VIOLATION');

    const validReceipt = {
      receipt_id: 'rcpt-02',
      builder_id: 'subagent-builder-1',
      verifier_id: 'subagent-verifier-2'
    };

    const validResult = validateVerificationReceiptCustody(validReceipt);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.code, 'CUSTODY_DISJUNCTION_VERIFIED');
  });

  it('V5: EvidenceCustody seals verify receipts only when BUILDER != VERIFIER holds', () => {
    const tempDir = path.join(rootDir, 'temp', 'test-custody-v5-' + Date.now());
    try {
      const custody = new EvidenceCustody({
        controlPlaneRoot: rootDir,
        baseDir: tempDir
      });

      // Self-certification attempt must throw fail-closed
      assert.throws(
        () => {
          custody.sealVerifyReceipt({
            receipt_id: 'rcpt-tamper-01',
            builder_id: 'agent-builder-rogue',
            verifier_id: 'agent-builder-rogue',
            status: 'VERIFIED'
          });
        },
        /BUILDER_EQUALS_VERIFIER_VIOLATION/
      );

      // Distinct identities must seal cleanly
      const event = custody.sealVerifyReceipt({
        receipt_id: 'rcpt-valid-01',
        builder_id: 'agent-builder-legit',
        verifier_id: 'agent-verifier-independent',
        status: 'VERIFIED'
      });

      assert.ok(event, 'event must be returned');
      assert.equal(event.payload.builder_id, 'agent-builder-legit');
      assert.equal(event.payload.verifier_id, 'agent-verifier-independent');
      assert.ok(event.event_hash, 'event must have event_hash');
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  it('V5: runBuilderVerifierCustodyGate passes cleanly and is non-mutating', async () => {
    const report = await runBuilderVerifierCustodyGate();
    assert.equal(report.ok, true, JSON.stringify(report.failures));
    assert.equal(report.schema, 'eos.builder_verifier_custody_gate.v1');
    assert.equal(report.PRODUCTION_READY, 'NO');
    assert.equal(report.mutating, false);
    assert.ok(report.checks.length >= 3);
    assert.equal(report.failures.length, 0);
  });

  it('V5: CI workflow seam-pack includes test:v5 and keeps prior locks', () => {
    const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
    assert.match(yaml, /^  seam-pack:/m);
    assert.ok(yaml.includes('npm run test:v5'), 'ci.yml missing npm run test:v5');
    assert.ok(yaml.includes('npm run test:v4'), 'ci.yml missing npm run test:v4');
  });

  it('V5: CI_CD_CONTRACT.md documents V5 seam-pack note', () => {
    const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
    assert.ok(md.includes('V5 seam-pack note'), 'CI_CD_CONTRACT.md missing V5 seam-pack note');
    assert.ok(md.includes('test:v5'), 'CI_CD_CONTRACT.md missing test:v5');
  });
});
