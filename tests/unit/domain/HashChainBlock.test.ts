/**
 * Unit Tests for HashChainBlock Domain Model & Pure SHA-256
 * SPEC-020: Monotonic High-Resolution Clock & Cryptographic Hash-Chain Ledger
 */

import { describe, it, expect } from 'vitest';
import {
  HashChainBlock,
  pureSha256,
  GENESIS_PREVIOUS_HASH,
  type BlockPayload,
} from '../../../src/core/domain/models/HashChainBlock.js';
import * as crypto from 'node:crypto';

describe('HashChainBlock Domain Model & pureSha256', () => {
  it('pureSha256 matches NIST standard test vectors and node:crypto', () => {
    // Empty string
    expect(pureSha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    // Standard test vector "abc"
    expect(pureSha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );

    // Cross-validate with node:crypto
    const sampleStrings = [
      'Hello Eos-System v3.0',
      'The quick brown fox jumps over the lazy dog',
      'Monotonic 999999999999999ns',
      JSON.stringify({ a: 1, b: 'test', c: [1, 2, 3] }),
    ];

    for (const str of sampleStrings) {
      const nodeHash = crypto.createHash('sha256').update(str, 'utf8').digest('hex');
      expect(pureSha256(str)).toBe(nodeHash);
    }
  });

  const createDummyPayload = (id: string): BlockPayload => ({
    recordId: id,
    type: 'EVIDENCE_RECORD',
    payloadHash: pureSha256(`Payload data for ${id}`),
    summary: `Audit record ${id}`,
  });

  it('creates valid Genesis block at index 0', () => {
    const genesis = HashChainBlock.createGenesis(
      createDummyPayload('GENESIS-0'),
      '2026-10-25T18:00:00.000Z',
      1_000_000_000n
    );

    expect(genesis.index).toBe(0);
    expect(genesis.previousHash).toBe(GENESIS_PREVIOUS_HASH);
    expect(genesis.currentHash.length).toBe(64);
    expect(Object.isFrozen(genesis)).toBe(true);
    expect(Object.isFrozen(genesis.payload)).toBe(true);

    const verification = HashChainBlock.verifyChain([genesis]);
    expect(verification.valid).toBe(true);
    expect(verification.totalBlocks).toBe(1);
  });

  it('links consecutive blocks into an unbroken cryptographic chain', () => {
    const genesis = HashChainBlock.createGenesis(
      createDummyPayload('EVD-0'),
      '2026-10-25T18:00:00.000Z',
      1_000_000_000n
    );

    const block1 = HashChainBlock.createNextBlock(
      genesis,
      createDummyPayload('EVD-1'),
      '2026-10-25T18:00:01.000Z',
      1_005_000_000n
    );

    const block2 = HashChainBlock.createNextBlock(
      block1,
      createDummyPayload('EVD-2'),
      '2026-10-25T18:00:02.000Z',
      1_010_000_000n
    );

    expect(block1.index).toBe(1);
    expect(block1.previousHash).toBe(genesis.currentHash);

    expect(block2.index).toBe(2);
    expect(block2.previousHash).toBe(block1.currentHash);

    const chain = [genesis, block1, block2];
    const verification = HashChainBlock.verifyChain(chain);

    expect(verification.valid).toBe(true);
    expect(verification.totalBlocks).toBe(3);
    expect(verification.brokenIndex).toBeUndefined();
  });

  it('detects tampering when payload data or hash is manipulated', () => {
    const genesis = HashChainBlock.createGenesis(
      createDummyPayload('EVD-0'),
      '2026-10-25T18:00:00.000Z',
      1_000_000_000n
    );

    const block1 = HashChainBlock.createNextBlock(
      genesis,
      createDummyPayload('EVD-1'),
      '2026-10-25T18:00:01.000Z',
      1_005_000_000n
    );

    const block2 = HashChainBlock.createNextBlock(
      block1,
      createDummyPayload('EVD-2'),
      '2026-10-25T18:00:02.000Z',
      1_010_000_000n
    );

    // Tamper with block1's payloadHash by recreating a tampered block object
    const tamperedBlock1 = new HashChainBlock({
      index: 1,
      previousHash: genesis.currentHash,
      payload: {
        recordId: 'EVD-1',
        type: 'EVIDENCE_RECORD',
        payloadHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        summary: 'Forged summary',
      },
      wallClockIso: block1.wallClockIso,
      monotonicNs: block1.monotonicNs,
    });

    const tamperedChain = [genesis, tamperedBlock1, block2];
    const verification = HashChainBlock.verifyChain(tamperedChain);

    expect(verification.valid).toBe(false);
    expect(verification.brokenIndex).toBe(2); // block2 previousHash won't match tamperedBlock1.currentHash
    expect(verification.reason).toContain('BROKEN_CHAIN_DETECTED');
  });

  it('detects monotonic clock regression between blocks', () => {
    const genesis = HashChainBlock.createGenesis(
      createDummyPayload('EVD-0'),
      '2026-10-25T18:00:00.000Z',
      2_000_000_000n
    );

    // Attempt to create next block with regressive monotonicNs
    expect(() =>
      HashChainBlock.createNextBlock(
        genesis,
        createDummyPayload('EVD-1'),
        '2026-10-25T18:00:01.000Z',
        1_999_999_999n // Smaller than genesis
      )
    ).toThrow('Monotonic time cannot decrease');
  });

  it('correctly serializes to JSON and deserializes back', () => {
    const genesis = HashChainBlock.createGenesis(
      createDummyPayload('EVD-0'),
      '2026-10-25T18:00:00.000Z',
      1_234_567_890n
    );

    const json = genesis.toJSON();
    expect(json.monotonicNs).toBe('1234567890');

    const deserialized = HashChainBlock.fromJSON(json);
    expect(deserialized.index).toBe(0);
    expect(deserialized.monotonicNs).toBe(1_234_567_890n);
    expect(deserialized.currentHash).toBe(genesis.currentHash);
  });
});
