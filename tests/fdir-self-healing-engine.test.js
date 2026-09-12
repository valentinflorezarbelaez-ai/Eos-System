import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { FdirSelfHealingEngine, FDIR_SEVERITY, FDIR_STATE } from '../src/core/resilience/fdir-self-healing-engine.js';

// Mock WorktreeMutationEngine
class MockWorktreeEngine {
  constructor() {
    this.sandboxCreated = false;
    this.mutationApplied = false;
    this.snapshotTaken = false;
    this.mockResult = { success: true, modifiedFiles: ['test.js'] };
    this.mockSnapshot = { 'test.js': 'somehash' };
  }

  createIsolatedWorktree(sourceFixturePath, destinationWorktreePath) {
    this.sandboxCreated = true;
    return {
      worktreePath: `/mock/worktree/${destinationWorktreePath}`,
      baselineSnapshot: {},
      fileCount: 1
    };
  }

  applyScopedMutation(worktreePath, fileModifications, allowedWriteFiles) {
    this.mutationApplied = true;
    if (fileModifications.some(m => m.content === 'throw')) {
        throw new Error("MOCK_MUTATION_ERROR");
    }
    return this.mockResult;
  }

  _takeDirectorySnapshot(dirPath) {
    this.snapshotTaken = true;
    return this.mockSnapshot;
  }
}

describe('FdirSelfHealingEngine', () => {
  describe('evaluateAnomaly', () => {
    it('classifies SECURITY errors and trips safe mode immediately', () => {
      const engine = new FdirSelfHealingEngine();
      const anomaly = { error: { message: 'SECURITY_VIOLATION_PATH_TRAVERSAL' } };
      const result = engine.evaluateAnomaly(anomaly);

      assert.equal(result.severity, FDIR_SEVERITY.SECURITY_BREACH_ATTEMPT);
      assert.equal(result.safeModeTripped, true);
      assert.equal(engine.state, FDIR_STATE.SAFE_MODE_TRIPPED);
    });

    it('classifies HASH_MISMATCH as CORRUPTED_LEDGER_CHAIN and trips safe mode', () => {
      const engine = new FdirSelfHealingEngine();
      const anomaly = { error: { message: 'HASH_MISMATCH detected' } };
      const result = engine.evaluateAnomaly(anomaly);

      assert.equal(result.severity, FDIR_SEVERITY.CORRUPTED_LEDGER_CHAIN);
      assert.equal(result.safeModeTripped, true);
      assert.equal(engine.state, FDIR_STATE.SAFE_MODE_TRIPPED);
    });

    it('classifies SCHEMA errors and initiates healing', () => {
      const engine = new FdirSelfHealingEngine();
      const anomaly = { error: { message: 'SCHEMA_VALIDATION_FAILED' } };
      const result = engine.evaluateAnomaly(anomaly);

      assert.equal(result.severity, FDIR_SEVERITY.SCHEMA_VIOLATION);
      assert.equal(result.safeModeTripped, false);
      assert.equal(engine.state, FDIR_STATE.HEALING_IN_PROGRESS);
      assert.equal(result.action, 'EXECUTE_HERMETIC_SELF_HEALING');
    });

    it('classifies TIMEOUT as TRANSIENT and recommends retry', () => {
      const engine = new FdirSelfHealingEngine();
      const anomaly = { error: { message: 'ETIMEDOUT connecting to host' } };
      const result = engine.evaluateAnomaly(anomaly);

      assert.equal(result.severity, FDIR_SEVERITY.TRANSIENT);
      assert.equal(result.safeModeTripped, false);
      assert.equal(result.action, 'EXPONENTIAL_BACKOFF_RETRY');
    });

    it('escalates to HITL when maxHealAttempts is exceeded', () => {
      const engine = new FdirSelfHealingEngine();
      const anomaly = { error: { message: 'Regular error' } };

      engine.evaluateAnomaly(anomaly);
      engine.evaluateAnomaly(anomaly);
      const result = engine.evaluateAnomaly(anomaly);

      assert.equal(result.action, 'ESCALATE_TO_HITL');
      assert.equal(result.safeModeTripped, true);
      assert.equal(engine.state, FDIR_STATE.SAFE_MODE_TRIPPED);
      assert.equal(engine.trippedReason.includes('MAX_HEAL_ATTEMPTS_EXCEEDED'), true);
    });
  });

  describe('generateHypotheses', () => {
    it('generates HYP-NULL-GUARD hypothesis for type/undefined errors', () => {
      const engine = new FdirSelfHealingEngine();
      const hypotheses = engine.generateHypotheses({ error_message: 'Cannot read property of undefined' });

      assert.equal(hypotheses.length > 0, true);
      assert.equal(hypotheses[0].hypothesis_id, 'HYP-NULL-GUARD');
      assert.equal(hypotheses[0].confidence, 0.85);
    });

    it('generates HYP-SCHEMA-INCOMPLETE hypothesis for schema errors', () => {
      const engine = new FdirSelfHealingEngine();
      const hypotheses = engine.generateHypotheses({ error_message: 'required property missing in payload' });

      assert.equal(hypotheses.length > 0, true);
      assert.equal(hypotheses[0].hypothesis_id, 'HYP-SCHEMA-INCOMPLETE');
      assert.equal(hypotheses[0].confidence, 0.90);
    });

    it('generates HYP-PATH-RESOLUTION hypothesis for not found errors', () => {
      const engine = new FdirSelfHealingEngine();
      const hypotheses = engine.generateHypotheses({ error_message: 'no such file or directory' });

      assert.equal(hypotheses.length > 0, true);
      assert.equal(hypotheses[0].hypothesis_id, 'HYP-PATH-RESOLUTION');
      assert.equal(hypotheses[0].confidence, 0.80);
    });

    it('generates HYP-LOGICAL-ASSERTION fallback when no specific patterns match', () => {
      const engine = new FdirSelfHealingEngine();
      const hypotheses = engine.generateHypotheses({ error_message: 'Something went wrong' });

      assert.equal(hypotheses.length, 1);
      assert.equal(hypotheses[0].hypothesis_id, 'HYP-LOGICAL-ASSERTION');
      assert.equal(hypotheses[0].confidence, 0.60);
    });
  });

  describe('tripSafeMode and resetSafeMode', () => {
    it('tripSafeMode sets state and logs the reason', () => {
      const engine = new FdirSelfHealingEngine();
      engine.tripSafeMode('MANUAL_OVERRIDE');

      assert.equal(engine.state, FDIR_STATE.SAFE_MODE_TRIPPED);
      assert.equal(engine.trippedReason, 'MANUAL_OVERRIDE');

      const lastLog = engine.incidentLog[engine.incidentLog.length - 1];
      assert.equal(lastLog.event, 'CIRCUIT_BREAKER_TRIPPED');
      assert.equal(lastLog.reason, 'MANUAL_OVERRIDE');
    });

    it('resetSafeMode throws if HITL receipt is invalid or missing', () => {
      const engine = new FdirSelfHealingEngine();
      engine.tripSafeMode('TEST_TRIP');

      assert.throws(() => {
        engine.resetSafeMode();
      }, /FDIR_RESET_DENIED/);

      assert.throws(() => {
        engine.resetSafeMode({ receipt_id: '123' }); // Missing approver
      }, /FDIR_RESET_DENIED/);

      assert.equal(engine.state, FDIR_STATE.SAFE_MODE_TRIPPED);
    });

    it('resetSafeMode restores NORMAL state when given valid receipt', () => {
      const engine = new FdirSelfHealingEngine();
      engine.tripSafeMode('TEST_TRIP');

      const result = engine.resetSafeMode({
        receipt_id: 'HITL-999',
        approver: { identity: 'Director' }
      });

      assert.equal(engine.state, FDIR_STATE.NORMAL);
      assert.equal(engine.trippedReason, null);
      assert.equal(engine.consecutiveFailures, 0);
      assert.equal(result.status, 'RESET_SUCCESSFUL');
      assert.equal(result.authorized_by, 'Director');
    });
  });

  describe('executeSelfHealingCycle', () => {
    it('throws if engine is in SAFE_MODE_TRIPPED state', () => {
      const engine = new FdirSelfHealingEngine();
      engine.tripSafeMode('PREVENTATIVE');

      assert.throws(() => {
        engine.executeSelfHealingCycle({});
      }, /FDIR_BLOCKED/);
    });

    it('executes successful hermetic self-healing cycle and updates state', () => {
      const mockEngine = new MockWorktreeEngine();
      const engine = new FdirSelfHealingEngine({ worktreeEngine: mockEngine });
      engine.consecutiveFailures = 2; // Simulate some previous failures

      const result = engine.executeSelfHealingCycle({
        sourceFixturePath: 'fixtures/a',
        worktreeRelPath: 'sandbox-1',
        fileModifications: [{ path: 'test.js', content: 'fixed' }],
        allowedWriteFiles: ['test.js']
      });

      assert.equal(mockEngine.sandboxCreated, true);
      assert.equal(mockEngine.mutationApplied, true);
      assert.equal(mockEngine.snapshotTaken, true);

      assert.equal(result.healed, true);
      assert.equal(result.rollbackVerified, true);
      assert.equal(engine.state, FDIR_STATE.RECOVERED);
      assert.equal(engine.consecutiveFailures, 0); // Should reset on success
    });

    it('evaluates anomaly if mutation application throws an error', () => {
      const mockEngine = new MockWorktreeEngine();
      const engine = new FdirSelfHealingEngine({ worktreeEngine: mockEngine });

      assert.throws(() => {
        engine.executeSelfHealingCycle({
          sourceFixturePath: 'fixtures/a',
          worktreeRelPath: 'sandbox-2',
          fileModifications: [{ path: 'test.js', content: 'throw' }], // Mock triggers error on 'throw'
          allowedWriteFiles: ['test.js']
        });
      }, /MOCK_MUTATION_ERROR/);

      // The error should be logged as an anomaly
      assert.equal(engine.incidentLog.length, 1);
      assert.equal(engine.incidentLog[0].component, 'FDIR_SELF_HEALING_RUNNER');
    });
  });
});
