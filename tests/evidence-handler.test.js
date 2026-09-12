import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EvidenceHandler } from '../src/mcp/handlers/evidence-handler.js';

describe('EvidenceHandler', () => {
  it('should initialize with default controlPlaneRoot', () => {
    const handler = new EvidenceHandler();
    assert.equal(handler.controlPlaneRoot, process.cwd());
  });

  it('should initialize with provided controlPlaneRoot', () => {
    const handler = new EvidenceHandler({ controlPlaneRoot: '/tmp/test' });
    assert.equal(handler.controlPlaneRoot, '/tmp/test');
  });

  describe('recordEvidence', () => {
    it('should generate evidence with default values when no args provided', async () => {
      const handler = new EvidenceHandler();
      const result = await handler.recordEvidence();

      const expectedHash = crypto.createHash('sha256').update(JSON.stringify({})).digest('hex');

      assert.ok(result.evidenceId.startsWith('EVD-'));
      assert.equal(result.status, 'RECORDED');
      assert.equal(result.sha256, `sha256-${expectedHash}`);
      assert.equal(result.epistemicClassification, 'VERIFIED');
      assert.ok(result.recordedAt);
      assert.doesNotThrow(() => new Date(result.recordedAt).toISOString());
    });

    it('should use provided id and classification, and correctly hash the payload', async () => {
      const handler = new EvidenceHandler();
      const args = { id: 'TEST-ID', classification: 'PROBABLE', someData: 123 };
      const result = await handler.recordEvidence(args);

      const expectedHash = crypto.createHash('sha256').update(JSON.stringify(args)).digest('hex');

      assert.equal(result.evidenceId, 'TEST-ID');
      assert.equal(result.status, 'RECORDED');
      assert.equal(result.sha256, `sha256-${expectedHash}`);
      assert.equal(result.epistemicClassification, 'PROBABLE');
      assert.ok(result.recordedAt);
    });
  });

  describe('getEvidence', () => {
    it('should return default evidence when no args provided', async () => {
      const handler = new EvidenceHandler();
      const result = await handler.getEvidence();

      assert.equal(result.evidenceId, 'EVD-0001');
      assert.equal(result.status, 'FOUND');
      assert.equal(result.classification, 'VERIFIED');
      assert.equal(result.verified, true);
    });

    it('should return evidence with provided id', async () => {
      const handler = new EvidenceHandler();
      const result = await handler.getEvidence({ id: 'MY-EVD-ID' });

      assert.equal(result.evidenceId, 'MY-EVD-ID');
      assert.equal(result.status, 'FOUND');
      assert.equal(result.classification, 'VERIFIED');
      assert.equal(result.verified, true);
    });
  });
});
