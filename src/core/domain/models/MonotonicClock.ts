/**
 * Monotonic High-Resolution Clock Domain Model
 * SPEC-020: Monotonic High-Resolution Clock & Cryptographic Hash-Chain Ledger
 *
 * Provides monotonically non-decreasing timestamps with nanosecond precision.
 * Adheres to Pure Domain isolation (Hexagonal L0: zero external I/O imports).
 */

export interface MonotonicTimestamp {
  readonly wallClockIso: string;
  readonly monotonicNs: bigint;
  readonly sequenceIndex: number;
}

export type MonotonicProvider = () => bigint;
export type WallClockProvider = () => string;

export interface MonotonicClockOptions {
  readonly initialNs?: bigint | undefined;
  readonly monotonicProvider?: MonotonicProvider | undefined;
  readonly wallClockProvider?: WallClockProvider | undefined;
}

export class MonotonicClock {
  private lastMonotonicNs: bigint;
  private sequence: number;
  private readonly monotonicProvider: MonotonicProvider;
  private readonly wallClockProvider: WallClockProvider;
  private lastTimestamp: MonotonicTimestamp | null = null;

  constructor(options?: MonotonicClockOptions | undefined) {
    this.lastMonotonicNs = options?.initialNs ?? 0n;
    this.sequence = 0;

    // In Layer 0 pure domain, default to globalThis.performance.now() scaled to ns if available,
    // otherwise fallback to safe high-precision synthetic progression.
    this.monotonicProvider =
      options?.monotonicProvider ??
      (() => {
        if (
          typeof globalThis !== 'undefined' &&
          'performance' in globalThis &&
          typeof globalThis.performance?.now === 'function'
        ) {
          const origin =
            typeof globalThis.performance.timeOrigin === 'number'
              ? globalThis.performance.timeOrigin
              : 0;
          const ms = origin + globalThis.performance.now();
          return BigInt(Math.floor(ms * 1_000_000));
        }
        return BigInt(Date.now()) * 1_000_000n;
      });

    this.wallClockProvider =
      options?.wallClockProvider ?? (() => new Date().toISOString());
  }

  /**
   * Captures the current timestamp, guaranteeing strictly non-decreasing monotonic nanoseconds:
   * monotonicNs[k] >= monotonicNs[k - 1].
   */
  public now(): MonotonicTimestamp {
    let currentNs = this.monotonicProvider();

    // Invariant: monotonicNs must never move backward.
    if (currentNs <= this.lastMonotonicNs) {
      currentNs = this.lastMonotonicNs + 1n;
    }

    this.lastMonotonicNs = currentNs;
    this.sequence += 1;

    const timestamp: MonotonicTimestamp = Object.freeze({
      wallClockIso: this.wallClockProvider(),
      monotonicNs: currentNs,
      sequenceIndex: this.sequence,
    });

    this.lastTimestamp = timestamp;
    return timestamp;
  }

  /**
   * Calculates the nanoseconds elapsed between start and end (or now).
   */
  public elapsedNs(
    start: MonotonicTimestamp,
    end?: MonotonicTimestamp | undefined
  ): bigint {
    const endNs = end !== undefined ? end.monotonicNs : this.now().monotonicNs;
    if (endNs < start.monotonicNs) {
      throw new Error(
        `Invariant violation: Negative elapsed time detected (${endNs}ns < ${start.monotonicNs}ns)`
      );
    }
    return endNs - start.monotonicNs;
  }

  /**
   * Calculates the milliseconds elapsed between start and end (or now) as a floating-point number.
   */
  public elapsedMs(
    start: MonotonicTimestamp,
    end?: MonotonicTimestamp | undefined
  ): number {
    const diffNs = this.elapsedNs(start, end);
    return Number(diffNs) / 1_000_000;
  }

  public getLastTimestamp(): MonotonicTimestamp | null {
    return this.lastTimestamp;
  }

  public getSequence(): number {
    return this.sequence;
  }

  public reset(initialNs?: bigint | undefined): void {
    this.lastMonotonicNs = initialNs ?? 0n;
    this.sequence = 0;
    this.lastTimestamp = null;
  }
}
