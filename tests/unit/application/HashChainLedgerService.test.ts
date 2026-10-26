/**
 * Unit Tests for HashChainLedgerService Application Service
 * SPEC-020: Monotonic High-Resolution Clock & Cryptographic Hash-Chain Ledger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { HashChainLedgerService } from '../../../src/core/application/HashChainLedgerService.js';
import type { TelemetryPipeline } from '../../../src/core/application/TelemetryPipeline.js';

describe('HashChainLedgerService Application Service', () => {
  const tempLedgerPath = path.resolve(process.cwd(), '.eos', 'test-ledger', 'chain.test.json');

  beforeEach(() => {
    if (fs.existsSync(tempLedgerPath)) {
      fs.unlinkSync(tempLedgerPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempLedgerPath)) {
      fs.unlinkSync(tempLedgerPath);
    }
    const dir = path.dirname(tempLedgerPath);
    if (fs.existsSync(dir)) {
      try {
        fs.rmdirSync(dir);
      } catch {
        // Ignore if not empty
      }
    }
  });

  it('initializes genesis and appends sequential evidence blocks', () => {
    const mockTelemetry: TelemetryPipeline = {
      emit: vi.fn(),
    } as unknown as TelemetryPipeline;

    const service = new HashChainLedgerService({
      telemetry: mockTelemetry,
      defaultLedgerPath: tempLedgerPath,
    });

    const genesis = service.initializeGenesis();
    expect(genesis.index).toBe(0);
    expect(service.getBlockCount()).toBe(1);

    const block1 = service.appendBlock({
      recordId: 'EVD-001',
      type: 'CODE_COVERAGE',
      payloadHash: '1111111111111111111111111111111111111111111111111111111111111111',
      summary: '99% Coverage achieved',
    });

    expect(block1.index).toBe(1);
    expect(block1.previousHash).toBe(genesis.currentHash);
    expect(service.getBlockCount()).toBe(2);

    const verification = service.verifyLedger();
    expect(verification.valid).toBe(true);
    expect(verification.totalBlocks).toBe(2);

    const status = service.formatLedgerStatus();
    expect(status).toContain('Chain Depth          : 2 blocks');
    expect(status).toContain('VALID (100% UNBROKEN)');
  });

  it('persists ledger to file and reloads with full integrity', () => {
    const service1 = new HashChainLedgerService({ defaultLedgerPath: tempLedgerPath });
    service1.initializeGenesis();
    service1.appendBlock({
      recordId: 'EVD-PERSIST',
      type: 'INVARIANT_CHECK',
      payloadHash: '2222222222222222222222222222222222222222222222222222222222222222',
      summary: 'Strict invariant passed',
    });

    service1.saveToFile();
    expect(fs.existsSync(tempLedgerPath)).toBe(true);

    const service2 = new HashChainLedgerService({ defaultLedgerPath: tempLedgerPath });
    service2.loadFromFile();

    expect(service2.getBlockCount()).toBe(2);
    const verification = service2.verifyLedger();
    expect(verification.valid).toBe(true);
    expect(service2.getLatestBlock()?.payload.recordId).toBe('EVD-PERSIST');
  });
});
