/**
 * Unit Tests: TelemetryPipeline Application Service
 * SPEC-016: Observability & Telemetry Pipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TelemetryPipeline,
  type ILogTransport,
} from '../../../src/core/application/TelemetryPipeline.js';
import type { TelemetryEventData } from '../../../src/core/domain/models/TelemetryEvent.js';

// ─── Test Transport Mock ────────────────────────────────────────

class MockTransport implements ILogTransport {
  readonly name: string;
  readonly events: TelemetryEventData[] = [];
  flushed = false;

  constructor(name: string = 'mock') {
    this.name = name;
  }

  write(event: TelemetryEventData): void {
    this.events.push(event);
  }

  flush(): void {
    this.flushed = true;
  }
}

// ─── Pipeline Tests ─────────────────────────────────────────────

describe('TelemetryPipeline', () => {
  let pipeline: TelemetryPipeline;

  beforeEach(() => {
    pipeline = new TelemetryPipeline({ minSeverity: 'INFO' });
  });

  // ─── Event Emission ─────────────────────────────────────

  describe('emit()', () => {
    it('should emit events above minimum severity', () => {
      const event = pipeline.emit('WARN', 'TestSrc', 'Warning happened');

      expect(event).not.toBeNull();
      expect(event?.severity).toBe('WARN');
      expect(event?.source).toBe('TestSrc');
      expect(pipeline.totalEmitted).toBe(1);
    });

    it('should filter events below minimum severity', () => {
      const event = pipeline.emit('DEBUG', 'TestSrc', 'Debug msg');

      expect(event).toBeNull();
      expect(pipeline.totalEmitted).toBe(1);
      expect(pipeline.totalFiltered).toBe(1);
    });

    it('should emit events at exactly the minimum severity', () => {
      const event = pipeline.emit('INFO', 'TestSrc', 'Info msg');
      expect(event).not.toBeNull();
    });
  });

  // ─── Convenience Methods ──────────────────────────────────

  describe('convenience severity methods', () => {
    it('should emit via trace()', () => {
      const p = new TelemetryPipeline({ minSeverity: 'TRACE' });
      const event = p.trace('Src', 'Trace msg');
      expect(event?.severity).toBe('TRACE');
    });

    it('should emit via debug()', () => {
      const p = new TelemetryPipeline({ minSeverity: 'DEBUG' });
      const event = p.debug('Src', 'Debug msg');
      expect(event?.severity).toBe('DEBUG');
    });

    it('should emit via info()', () => {
      const event = pipeline.info('Src', 'Info msg');
      expect(event?.severity).toBe('INFO');
    });

    it('should emit via warn()', () => {
      const event = pipeline.warn('Src', 'Warn msg');
      expect(event?.severity).toBe('WARN');
    });

    it('should emit via error()', () => {
      const event = pipeline.error('Src', 'Error msg');
      expect(event?.severity).toBe('ERROR');
    });

    it('should emit via fatal()', () => {
      const event = pipeline.fatal('Src', 'Fatal msg');
      expect(event?.severity).toBe('FATAL');
    });
  });

  // ─── Correlation Context ──────────────────────────────────

  describe('correlation context', () => {
    it('should propagate correlation ID to emitted events', () => {
      pipeline.setCorrelationId('corr-test-001');
      const event = pipeline.info('Src', 'Msg');

      expect(event?.correlationId).toBe('corr-test-001');
    });

    it('should clear correlation ID', () => {
      pipeline.setCorrelationId('corr-test');
      pipeline.clearCorrelationId();

      expect(pipeline.activeCorrelationId).toBeUndefined();
    });

    it('should scope correlation with withCorrelation()', () => {
      const event1 = pipeline.info('Src', 'Before');
      expect(event1?.correlationId).not.toBe('corr-scoped');

      const result = pipeline.withCorrelation('corr-scoped', () => {
        const inner = pipeline.info('Src', 'Inside');
        expect(inner?.correlationId).toBe('corr-scoped');
        return 42;
      });

      expect(result).toBe(42);
      expect(pipeline.activeCorrelationId).toBeUndefined();
    });

    it('should restore previous correlation ID after withCorrelation()', () => {
      pipeline.setCorrelationId('corr-outer');

      pipeline.withCorrelation('corr-inner', () => {
        expect(pipeline.activeCorrelationId).toBe('corr-inner');
      });

      expect(pipeline.activeCorrelationId).toBe('corr-outer');
    });
  });

  // ─── Subscribers ──────────────────────────────────────────

  describe('subscriber management', () => {
    it('should deliver events to registered subscribers', () => {
      const received: string[] = [];
      pipeline.subscribe('sub-1', (event) => {
        received.push(event.message);
      });

      pipeline.info('Src', 'Hello');
      pipeline.warn('Src', 'Warning');

      expect(received).toEqual(['Hello', 'Warning']);
      expect(pipeline.subscriberCount).toBe(1);
    });

    it('should respect subscriber-level severity filtering', () => {
      const received: string[] = [];
      pipeline.subscribe('sub-1', (event) => {
        received.push(event.message);
      }, 'ERROR');

      pipeline.info('Src', 'Info msg');
      pipeline.error('Src', 'Error msg');

      expect(received).toEqual(['Error msg']);
    });

    it('should deliver to multiple subscribers', () => {
      const received1: string[] = [];
      const received2: string[] = [];

      pipeline.subscribe('sub-1', (event) => received1.push(event.message));
      pipeline.subscribe('sub-2', (event) => received2.push(event.message));

      pipeline.info('Src', 'Event 1');
      pipeline.warn('Src', 'Event 2');

      expect(received1).toEqual(['Event 1', 'Event 2']);
      expect(received2).toEqual(['Event 1', 'Event 2']);
    });

    it('should unsubscribe by ID', () => {
      const received: string[] = [];
      pipeline.subscribe('sub-1', (event) => received.push(event.message));
      pipeline.info('Src', 'Before');

      pipeline.unsubscribe('sub-1');
      pipeline.info('Src', 'After');

      expect(received).toEqual(['Before']);
      expect(pipeline.subscriberCount).toBe(0);
    });

    it('should not crash on subscriber errors', () => {
      pipeline.subscribe('sub-crash', () => {
        throw new Error('Subscriber boom');
      });

      expect(() => pipeline.info('Src', 'Msg')).not.toThrow();
    });
  });

  // ─── Transports ───────────────────────────────────────────

  describe('transport management', () => {
    it('should dispatch events to registered transports', () => {
      const transport = new MockTransport();
      pipeline.addTransport(transport);

      pipeline.info('Src', 'Transport test');

      expect(transport.events).toHaveLength(1);
      expect(transport.events[0].message).toBe('Transport test');
    });

    it('should dispatch to multiple transports', () => {
      const t1 = new MockTransport('t1');
      const t2 = new MockTransport('t2');
      pipeline.addTransport(t1);
      pipeline.addTransport(t2);

      pipeline.warn('Src', 'Multi-transport');

      expect(t1.events).toHaveLength(1);
      expect(t2.events).toHaveLength(1);
    });

    it('should remove transport by name', () => {
      const transport = new MockTransport();
      pipeline.addTransport(transport);
      pipeline.removeTransport('mock');

      pipeline.info('Src', 'After removal');

      expect(transport.events).toHaveLength(0);
      expect(pipeline.transportCount).toBe(0);
    });

    it('should not crash on transport errors', () => {
      const badTransport: ILogTransport = {
        name: 'bad',
        write: () => { throw new Error('Transport boom'); },
        flush: () => {},
      };
      pipeline.addTransport(badTransport);

      expect(() => pipeline.info('Src', 'Msg')).not.toThrow();
    });
  });

  // ─── Buffer & Flush ───────────────────────────────────────

  describe('buffer management', () => {
    it('should buffer emitted events', () => {
      pipeline.info('Src', 'Event 1');
      pipeline.warn('Src', 'Event 2');

      expect(pipeline.bufferedCount).toBe(2);
    });

    it('should not buffer filtered events', () => {
      pipeline.emit('DEBUG', 'Src', 'Filtered');

      expect(pipeline.bufferedCount).toBe(0);
    });

    it('should flush and clear buffer', () => {
      const transport = new MockTransport();
      pipeline.addTransport(transport);

      pipeline.info('Src', 'E1');
      pipeline.info('Src', 'E2');

      const count = pipeline.flush();
      expect(count).toBe(2);
      expect(pipeline.bufferedCount).toBe(0);
      expect(transport.flushed).toBe(true);
    });

    it('should enforce buffer size limit (FIFO eviction)', () => {
      const small = new TelemetryPipeline({ minSeverity: 'INFO', bufferSize: 3 });

      small.info('Src', 'A');
      small.info('Src', 'B');
      small.info('Src', 'C');
      small.info('Src', 'D');

      expect(small.bufferedCount).toBe(3);
      expect(small.buffer[0].message).toBe('B'); // A was evicted
    });
  });

  // ─── Metrics ──────────────────────────────────────────────

  describe('metrics', () => {
    it('should create and retrieve metrics by name', () => {
      const counter = pipeline.metric('eos.builds.total', 'counter');
      counter.increment();
      counter.increment();

      const same = pipeline.metric('eos.builds.total');
      expect(same.value).toBe(2);
    });

    it('should export metric snapshots', () => {
      const m = pipeline.metric('eos.test.count', 'counter');
      m.increment(5);

      const snapshots = pipeline.exportMetrics();
      // At least the custom metric plus any internal metrics
      const custom = snapshots.find(s => s.name === 'eos.test.count');
      expect(custom).toBeDefined();
      expect(custom?.value).toBe(5);
    });

    it('should track internal telemetry event counts', () => {
      pipeline.info('Src', 'Info 1');
      pipeline.info('Src', 'Info 2');
      pipeline.warn('Src', 'Warn 1');

      const snapshots = pipeline.exportMetrics();
      const infoMetric = snapshots.find(s => s.name === 'eos.telemetry.events.info');
      const warnMetric = snapshots.find(s => s.name === 'eos.telemetry.events.warn');

      expect(infoMetric?.value).toBe(2);
      expect(warnMetric?.value).toBe(1);
    });
  });

  // ─── Statistics ───────────────────────────────────────────

  describe('statistics', () => {
    it('should track total emitted and filtered counts', () => {
      pipeline.info('Src', 'Passed');
      pipeline.debug('Src', 'Filtered');
      pipeline.warn('Src', 'Passed');

      expect(pipeline.totalEmitted).toBe(3);
      expect(pipeline.totalFiltered).toBe(1);
    });
  });
});
