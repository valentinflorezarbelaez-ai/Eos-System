/**
 * HashChainLedgerService Application Service (Layer 1 — Application)
 * SPEC-020: Monotonic High-Resolution Clock & Cryptographic Hash-Chain Ledger
 *
 * Coordinates cryptographic block chaining for audit records, enforces monotonic time stamps,
 * provides tamper verification, and manages file persistence.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  HashChainBlock,
  pureSha256,
  type BlockPayload,
  type HashChainBlockData,
  type ChainVerificationResult,
  type StringHasher,
} from '../domain/models/HashChainBlock.js';
import { MonotonicClock } from '../domain/models/MonotonicClock.js';
import type { TelemetryPipeline } from './TelemetryPipeline.js';

export interface HashChainLedgerServiceOptions {
  readonly clock?: MonotonicClock | undefined;
  readonly telemetry?: TelemetryPipeline | undefined;
  readonly defaultLedgerPath?: string | undefined;
  readonly hasher?: StringHasher | undefined;
}

export class HashChainLedgerService {
  private readonly clock: MonotonicClock;
  private readonly telemetry?: TelemetryPipeline | undefined;
  private readonly blocks: HashChainBlock[] = [];
  private readonly defaultLedgerPath: string;
  private readonly hasher: StringHasher;

  constructor(options: HashChainLedgerServiceOptions = {}) {
    this.clock = options.clock ?? new MonotonicClock();
    this.telemetry = options.telemetry;
    this.defaultLedgerPath =
      options.defaultLedgerPath ?? path.resolve(process.cwd(), '.eos', 'ledger', 'chain.json');
    this.hasher = options.hasher ?? pureSha256;
  }

  /**
   * Initializes the ledger with a Genesis block (index 0).
   * If blocks already exist, returns the existing Genesis block.
   */
  public initializeGenesis(customPayload?: BlockPayload | undefined): HashChainBlock {
    if (this.blocks.length > 0) {
      return this.blocks[0]!;
    }

    const payload: BlockPayload = customPayload ?? {
      recordId: 'GENESIS-0',
      type: 'LEDGER_INITIALIZATION',
      payloadHash: this.hasher('EOS_IMMUTABLE_GENESIS_ROOT'),
      summary: 'Eos Cryptographic Hash-Chain Root Block',
    };

    const ts = this.clock.now();
    const genesis = HashChainBlock.createGenesis(
      payload,
      ts.wallClockIso,
      ts.monotonicNs,
      this.hasher
    );

    this.blocks.push(genesis);

    this.telemetry?.emit(
      'INFO',
      'HashChainLedgerService',
      `Genesis block 0 initialized with hash ${genesis.currentHash.substring(0, 16)}...`,
      {
        index: 0,
        hash: genesis.currentHash,
        wallClockIso: genesis.wallClockIso,
      }
    );

    return genesis;
  }

  /**
   * Appends an evidence or audit block to the cryptographic chain.
   */
  public appendBlock(payload: BlockPayload): HashChainBlock {
    if (this.blocks.length === 0) {
      this.initializeGenesis();
    }

    const previousBlock = this.blocks[this.blocks.length - 1]!;
    let ts = this.clock.now();
    if (ts.monotonicNs <= previousBlock.monotonicNs) {
      this.clock.reset(previousBlock.monotonicNs);
      ts = this.clock.now();
    }

    const block = HashChainBlock.createNextBlock(
      previousBlock,
      payload,
      ts.wallClockIso,
      ts.monotonicNs,
      this.hasher
    );

    this.blocks.push(block);

    this.telemetry?.emit(
      'INFO',
      'HashChainLedgerService',
      `Block #${block.index} (${block.payload.recordId}) appended to hash chain.`,
      {
        index: block.index,
        recordId: block.payload.recordId,
        hash: block.currentHash,
        previousHash: block.previousHash,
      }
    );

    return block;
  }

  /**
   * Verifies the cryptographic integrity of the entire chain from block 0 to N.
   */
  public verifyLedger(): ChainVerificationResult {
    const result = HashChainBlock.verifyChain(this.blocks, this.hasher);

    if (result.valid) {
      this.telemetry?.emit(
        'INFO',
        'HashChainLedgerService',
        `Ledger integrity verified: ${result.totalBlocks} blocks intact with 0 discrepancies.`
      );
    } else {
      this.telemetry?.emit(
        'ERROR',
        'HashChainLedgerService',
        `Ledger integrity breach: ${result.reason ?? 'Unknown violation'} at index ${result.brokenIndex ?? -1}`,
        {
          brokenIndex: result.brokenIndex,
          reason: result.reason,
        }
      );
    }

    return result;
  }

  public getBlocks(): readonly HashChainBlock[] {
    return Object.freeze([...this.blocks]);
  }

  public getBlockCount(): number {
    return this.blocks.length;
  }

  public getLatestBlock(): HashChainBlock | null {
    if (this.blocks.length === 0) return null;
    return this.blocks[this.blocks.length - 1] ?? null;
  }

  /**
   * Persists the ledger blocks to JSON file.
   */
  public saveToFile(filePath?: string | undefined): void {
    const targetPath = filePath ?? this.defaultLedgerPath;
    const dir = path.dirname(targetPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serialized: HashChainBlockData[] = this.blocks.map((b) => b.toJSON());
    fs.writeFileSync(targetPath, JSON.stringify(serialized, null, 2), 'utf8');
  }

  /**
   * Loads ledger blocks from JSON file.
   */
  public loadFromFile(filePath?: string | undefined): void {
    const targetPath = filePath ?? this.defaultLedgerPath;
    if (!fs.existsSync(targetPath)) {
      return;
    }

    const content = fs.readFileSync(targetPath, 'utf8');
    const rawData = JSON.parse(content) as HashChainBlockData[];

    this.blocks.length = 0;
    for (const item of rawData) {
      const block = HashChainBlock.fromJSON(item, this.hasher);
      this.blocks.push(block);
    }

    const latest = this.blocks[this.blocks.length - 1];
    if (latest) {
      this.clock.reset(latest.monotonicNs);
    }
  }

  /**
   * Formats a human-readable CLI audit report.
   */
  public formatLedgerStatus(): string {
    const count = this.blocks.length;
    const latest = this.getLatestBlock();
    const verification = this.verifyLedger();

    return `
================================================================
    EOS CRYPTOGRAPHIC LEDGER STATUS (NSA / SPACEX SPEC-020)
================================================================
Chain Depth          : ${count} blocks
Integrity Status     : ${verification.valid ? 'VALID (100% UNBROKEN)' : `BREACH DETECTED: ${verification.reason}`}
Genesis Root Hash    : ${this.blocks[0] ? this.blocks[0].currentHash : 'N/A'}
Latest Block Hash    : ${latest ? latest.currentHash : 'N/A'}
Latest Sequence Time : ${latest ? latest.wallClockIso : 'N/A'}
================================================================
`;
  }
}
