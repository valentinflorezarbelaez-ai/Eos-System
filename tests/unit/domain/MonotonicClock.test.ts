/**
 * Unit Tests for MonotonicClock Domain Model
 * SPEC-020: Monotonic High-Resolution Clock & Cryptographic Hash-Chain Ledger
 */

import { describe, it, expect } from 'vitest';
import {
  MonotonicClock,
  type MonotonicTimestamp,
} from '../../../src/core/domain/models/MonotonicClock.js';

describe('MonotonicClock Domain Model', () => {
  it('generates non-decreasing monotonic nanosecond timestamps', () => {
    const clock = new MonotonicClock();
    const timestamps: MonotonicTimestamp[] = [];

    for (let i = 0; i < 50; i++) {
      timestamps.push(clock.now());
    }

    expect(timestamps.length).toBe(50);
    expect(timestamps[0]!.sequenceIndex).toBe(1);
    expect(timestamps[49]!.sequenceIndex).toBe(50);

    for (let i = 1; i < timestamps.length; i++) {
      const prev = timestamps[i - 1]!;
      const curr = timestamps[i]!;

      expect(curr.sequenceIndex).toBe(prev.sequenceIndex + 1);
      expect(curr.monotonicNs >= prev.monotonicNs).toBe(true);
      expect(Object.isFrozen(curr)).toBe(true);
    }
  });

  it('enforces forward monotonic progression even if provider stalls or regresses', () => {
    let mockTick = 1000n;
    // Provider that regresses backward
    const regressiveProvider = () => {
      mockTick -= 10n;
      return mockTick;
    };

    const clock = new MonotonicClock({ monotonicProvider: regressiveProvider });
    const t1 = clock.now();
    const t2 = clock.now();
    const t3 = clock.now();

    expect(t2.monotonicNs > t1.monotonicNs).toBe(true);
    expect(t3.monotonicNs > t2.monotonicNs).toBe(true);
  });

  it('calculates elapsed time in nanoseconds and milliseconds correctly', () => {
    let current = 10_000_000n;
    const provider = () => current;
    const clock = new MonotonicClock({ monotonicProvider: provider });

    const start = clock.now();
    current += 5_500_000n; // +5.5 ms
    const end = clock.now();

    const elapsedNs = clock.elapsedNs(start, end);
    const elapsedMs = clock.elapsedMs(start, end);

    expect(elapsedNs).toBe(5_500_000n);
    expect(elapsedMs).toBe(5.5);
  });

  it('prevents negative elapsed calculations', () => {
    const clock = new MonotonicClock();
    const earlier: MonotonicTimestamp = {
      wallClockIso: new Date().toISOString(),
      monotonicNs: 100n,
      sequenceIndex: 1,
    };
    const later: MonotonicTimestamp = {
      wallClockIso: new Date().toISOString(),
      monotonicNs: 50n,
      sequenceIndex: 2,
    };

    expect(() => clock.elapsedNs(earlier, later)).toThrow('Negative elapsed time');
  });

  it('tracks sequence and supports reset', () => {
    const clock = new MonotonicClock();
    clock.now();
    clock.now();
    expect(clock.getSequence()).toBe(2);

    clock.reset(500n);
    expect(clock.getSequence()).toBe(0);
    expect(clock.getLastTimestamp()).toBeNull();

    const next = clock.now();
    expect(next.sequenceIndex).toBe(1);
    expect(next.monotonicNs >= 501n).toBe(true);
  });
});
