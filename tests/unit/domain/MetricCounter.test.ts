/**
 * Unit Tests: MetricCounter Domain Model
 * SPEC-016: Observability & Telemetry Pipeline
 */

import { describe, it, expect } from 'vitest';
import { MetricCounter } from '../../../src/core/domain/models/MetricCounter.js';

describe('MetricCounter', () => {
  // ─── Factory Methods ──────────────────────────────────────

  describe('factory methods', () => {
    it('should create a counter metric', () => {
      const m = MetricCounter.counter('eos.builds.total');
      expect(m.name).toBe('eos.builds.total');
      expect(m.type).toBe('counter');
      expect(m.value).toBe(0);
    });

    it('should create a gauge metric', () => {
      const m = MetricCounter.gauge('eos.connections.active');
      expect(m.name).toBe('eos.connections.active');
      expect(m.type).toBe('gauge');
      expect(m.value).toBe(0);
    });

    it('should create a histogram metric', () => {
      const m = MetricCounter.histogram('eos.request.duration');
      expect(m.name).toBe('eos.request.duration');
      expect(m.type).toBe('histogram');
      expect(m.value).toBe(0);
      expect(m.observations).toEqual([]);
    });

    it('should accept dimensional labels', () => {
      const m = MetricCounter.counter('eos.builds.total', { env: 'production', region: 'us-east-1' });
      expect(m.labels).toEqual({ env: 'production', region: 'us-east-1' });
    });

    it('should freeze labels', () => {
      const m = MetricCounter.counter('eos.test', { key: 'val' });
      expect(Object.isFrozen(m.labels)).toBe(true);
    });
  });

  // ─── Name Validation ──────────────────────────────────────

  describe('name validation', () => {
    it('should reject empty metric names', () => {
      expect(() => MetricCounter.counter('')).toThrow('non-empty');
      expect(() => MetricCounter.counter('   ')).toThrow('non-empty');
    });

    it('should reject names starting with numbers', () => {
      expect(() => MetricCounter.counter('1metric')).toThrow('Invalid metric name');
    });

    it('should reject names with uppercase letters', () => {
      expect(() => MetricCounter.counter('Eos.Metric')).toThrow('Invalid metric name');
    });

    it('should accept valid metric names', () => {
      expect(() => MetricCounter.counter('eos.builds.total')).not.toThrow();
      expect(() => MetricCounter.counter('eos_events_count')).not.toThrow();
      expect(() => MetricCounter.counter('a')).not.toThrow();
    });
  });

  // ─── Counter Operations ───────────────────────────────────

  describe('counter operations', () => {
    it('should increment by default delta of 1', () => {
      const m = MetricCounter.counter('eos.test');
      m.increment();
      expect(m.value).toBe(1);
      m.increment();
      expect(m.value).toBe(2);
    });

    it('should increment by custom delta', () => {
      const m = MetricCounter.counter('eos.test');
      m.increment(5);
      expect(m.value).toBe(5);
    });

    it('should reject negative delta on counter', () => {
      const m = MetricCounter.counter('eos.test');
      expect(() => m.increment(-1)).toThrow('cannot be decremented');
    });

    it('should reject decrement on counter', () => {
      const m = MetricCounter.counter('eos.test');
      expect(() => m.decrement()).toThrow('cannot be decremented');
    });

    it('should reject set() on counter', () => {
      const m = MetricCounter.counter('eos.test');
      expect(() => m.set(10)).toThrow('cannot be set directly');
    });
  });

  // ─── Gauge Operations ─────────────────────────────────────

  describe('gauge operations', () => {
    it('should increment and decrement freely', () => {
      const m = MetricCounter.gauge('eos.connections');
      m.increment(10);
      expect(m.value).toBe(10);
      m.decrement(3);
      expect(m.value).toBe(7);
    });

    it('should allow set() to arbitrary values', () => {
      const m = MetricCounter.gauge('eos.temperature');
      m.set(42);
      expect(m.value).toBe(42);
      m.set(-10);
      expect(m.value).toBe(-10);
    });
  });

  // ─── Histogram Operations ─────────────────────────────────

  describe('histogram operations', () => {
    it('should record observations with observe()', () => {
      const m = MetricCounter.histogram('eos.latency');
      m.observe(10);
      m.observe(20);
      m.observe(30);

      expect(m.value).toBe(60);
      expect(m.observationCount).toBe(3);
      expect(m.observations).toEqual([10, 20, 30]);
    });

    it('should track observations via increment()', () => {
      const m = MetricCounter.histogram('eos.latency');
      m.increment(5);
      m.increment(15);

      expect(m.value).toBe(20);
      expect(m.observationCount).toBe(2);
    });

    it('should compute mean correctly', () => {
      const m = MetricCounter.histogram('eos.latency');
      m.observe(10);
      m.observe(20);
      m.observe(30);
      expect(m.mean).toBe(20);
    });

    it('should return 0 mean with no observations', () => {
      const m = MetricCounter.histogram('eos.latency');
      expect(m.mean).toBe(0);
    });

    it('should compute min and max correctly', () => {
      const m = MetricCounter.histogram('eos.latency');
      m.observe(5);
      m.observe(100);
      m.observe(50);

      expect(m.min).toBe(5);
      expect(m.max).toBe(100);
    });

    it('should return Infinity/-Infinity for min/max with no observations', () => {
      const m = MetricCounter.histogram('eos.latency');
      expect(m.min).toBe(Infinity);
      expect(m.max).toBe(-Infinity);
    });
  });

  // ─── Reset ────────────────────────────────────────────────

  describe('reset()', () => {
    it('should reset value and observations to initial state', () => {
      const m = MetricCounter.histogram('eos.test');
      m.observe(10);
      m.observe(20);

      m.reset();

      expect(m.value).toBe(0);
      expect(m.observationCount).toBe(0);
    });
  });

  // ─── Snapshot Export ──────────────────────────────────────

  describe('snapshot()', () => {
    it('should export a frozen snapshot for a counter', () => {
      const m = MetricCounter.counter('eos.builds', { env: 'prod' });
      m.increment(3);

      const snap = m.snapshot();
      expect(snap.name).toBe('eos.builds');
      expect(snap.type).toBe('counter');
      expect(snap.value).toBe(3);
      expect(snap.labels).toEqual({ env: 'prod' });
      expect(snap.timestamp).toBeTruthy();
      expect(Object.isFrozen(snap)).toBe(true);
    });

    it('should include observations for histogram', () => {
      const m = MetricCounter.histogram('eos.latency');
      m.observe(5);
      m.observe(10);

      const snap = m.snapshot();
      expect(snap.observations).toEqual([5, 10]);
    });

    it('should not include observations for counter', () => {
      const m = MetricCounter.counter('eos.count');
      m.increment();

      const snap = m.snapshot();
      expect(snap.observations).toBeUndefined();
    });
  });

  // ─── Label String ─────────────────────────────────────────

  describe('labelString', () => {
    it('should format empty labels as {}', () => {
      const m = MetricCounter.counter('eos.test');
      expect(m.labelString).toBe('{}');
    });

    it('should format labels as key=value pairs', () => {
      const m = MetricCounter.counter('eos.test', { env: 'prod', region: 'us' });
      expect(m.labelString).toContain('env="prod"');
      expect(m.labelString).toContain('region="us"');
    });
  });
});
