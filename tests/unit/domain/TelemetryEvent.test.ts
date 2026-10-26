/**
 * Unit Tests: TelemetryEvent Domain Model
 * SPEC-016: Observability & Telemetry Pipeline
 */

import { describe, it, expect } from 'vitest';
import {
  TelemetryEvent,
  SeverityLevel,
  SeverityLevelName,
  isValidSeverity,
  severityPriority,
  compareSeverity,
} from '../../../src/core/domain/models/TelemetryEvent.js';

describe('TelemetryEvent', () => {
  // ─── Factory Creation ─────────────────────────────────────

  describe('create()', () => {
    it('should create a valid telemetry event with required fields', () => {
      const event = TelemetryEvent.create('INFO', 'TestSource', 'Test message');

      expect(event.severity).toBe('INFO');
      expect(event.source).toBe('TestSource');
      expect(event.message).toBe('Test message');
      expect(event.eventId).toMatch(/^evt-/);
      expect(event.correlationId).toMatch(/^corr-/);
      expect(event.timestamp).toBeTruthy();
      expect(event.metadata).toEqual({});
    });

    it('should accept custom correlation ID', () => {
      const event = TelemetryEvent.create('DEBUG', 'Src', 'Msg', {
        correlationId: 'corr-abc-123',
      });

      expect(event.correlationId).toBe('corr-abc-123');
    });

    it('should accept custom metadata', () => {
      const event = TelemetryEvent.create('WARN', 'Src', 'Msg', {
        metadata: { userId: 42, action: 'login' },
      });

      expect(event.metadata).toEqual({ userId: 42, action: 'login' });
    });

    it('should accept custom timestamp and eventId', () => {
      const event = TelemetryEvent.create('ERROR', 'Src', 'Msg', {
        timestamp: '2026-01-01T00:00:00.000Z',
        eventId: 'evt-custom-001',
      });

      expect(event.timestamp).toBe('2026-01-01T00:00:00.000Z');
      expect(event.eventId).toBe('evt-custom-001');
    });

    it('should throw on invalid severity', () => {
      expect(() => {
        TelemetryEvent.create('INVALID' as SeverityLevelName, 'Src', 'Msg');
      }).toThrow('Invalid severity level');
    });

    it('should throw on empty source', () => {
      expect(() => TelemetryEvent.create('INFO', '', 'Msg')).toThrow('Source component name');
      expect(() => TelemetryEvent.create('INFO', '   ', 'Msg')).toThrow('Source component name');
    });

    it('should throw on empty message', () => {
      expect(() => TelemetryEvent.create('INFO', 'Src', '')).toThrow('Message must be');
      expect(() => TelemetryEvent.create('INFO', 'Src', '   ')).toThrow('Message must be');
    });
  });

  // ─── Immutability ─────────────────────────────────────────

  describe('immutability', () => {
    it('should freeze the event object after creation', () => {
      const event = TelemetryEvent.create('INFO', 'Src', 'Msg');
      expect(Object.isFrozen(event)).toBe(true);
    });

    it('should freeze the metadata object', () => {
      const event = TelemetryEvent.create('INFO', 'Src', 'Msg', {
        metadata: { key: 'value' },
      });
      expect(Object.isFrozen(event.metadata)).toBe(true);
    });
  });

  // ─── Severity Filtering ───────────────────────────────────

  describe('meetsMinimumSeverity()', () => {
    it('should return true when event severity equals minimum', () => {
      const event = TelemetryEvent.create('WARN', 'Src', 'Msg');
      expect(event.meetsMinimumSeverity('WARN')).toBe(true);
    });

    it('should return true when event severity exceeds minimum', () => {
      const event = TelemetryEvent.create('ERROR', 'Src', 'Msg');
      expect(event.meetsMinimumSeverity('WARN')).toBe(true);
    });

    it('should return false when event severity is below minimum', () => {
      const event = TelemetryEvent.create('DEBUG', 'Src', 'Msg');
      expect(event.meetsMinimumSeverity('INFO')).toBe(false);
    });

    it('should filter correctly across all severity levels', () => {
      const event = TelemetryEvent.create('WARN', 'Src', 'Msg');
      expect(event.meetsMinimumSeverity('TRACE')).toBe(true);
      expect(event.meetsMinimumSeverity('DEBUG')).toBe(true);
      expect(event.meetsMinimumSeverity('INFO')).toBe(true);
      expect(event.meetsMinimumSeverity('WARN')).toBe(true);
      expect(event.meetsMinimumSeverity('ERROR')).toBe(false);
      expect(event.meetsMinimumSeverity('FATAL')).toBe(false);
    });
  });

  // ─── Child Events ─────────────────────────────────────────

  describe('createChildEvent()', () => {
    it('should propagate the parent correlation ID', () => {
      const parent = TelemetryEvent.create('INFO', 'ParentSrc', 'Parent msg', {
        correlationId: 'corr-parent-001',
      });

      const child = parent.createChildEvent('DEBUG', 'ChildSrc', 'Child msg');

      expect(child.correlationId).toBe('corr-parent-001');
      expect(child.source).toBe('ChildSrc');
      expect(child.severity).toBe('DEBUG');
    });
  });

  // ─── JSON Serialization ───────────────────────────────────

  describe('toJSON() / toJSONString()', () => {
    it('should produce a valid TelemetryEventData object', () => {
      const event = TelemetryEvent.create('INFO', 'Src', 'Test', {
        eventId: 'evt-test',
        timestamp: '2026-01-01T00:00:00.000Z',
        correlationId: 'corr-test',
        metadata: { key: 'val' },
      });

      const json = event.toJSON();
      expect(json.eventId).toBe('evt-test');
      expect(json.timestamp).toBe('2026-01-01T00:00:00.000Z');
      expect(json.severity).toBe('INFO');
      expect(json.source).toBe('Src');
      expect(json.correlationId).toBe('corr-test');
      expect(json.message).toBe('Test');
      expect(json.metadata).toEqual({ key: 'val' });
    });

    it('should produce valid JSON string', () => {
      const event = TelemetryEvent.create('ERROR', 'Src', 'Error occurred');
      const jsonStr = event.toJSONString();
      const parsed = JSON.parse(jsonStr);
      expect(parsed.severity).toBe('ERROR');
      expect(parsed.message).toBe('Error occurred');
    });
  });
});

// ─── Severity Utility Functions ─────────────────────────────────

describe('Severity Utilities', () => {
  describe('SeverityLevel enum', () => {
    it('should have correct numeric ordering', () => {
      expect(SeverityLevel.TRACE).toBe(0);
      expect(SeverityLevel.DEBUG).toBe(1);
      expect(SeverityLevel.INFO).toBe(2);
      expect(SeverityLevel.WARN).toBe(3);
      expect(SeverityLevel.ERROR).toBe(4);
      expect(SeverityLevel.FATAL).toBe(5);
    });
  });

  describe('isValidSeverity()', () => {
    it('should return true for valid severity names', () => {
      expect(isValidSeverity('TRACE')).toBe(true);
      expect(isValidSeverity('DEBUG')).toBe(true);
      expect(isValidSeverity('INFO')).toBe(true);
      expect(isValidSeverity('WARN')).toBe(true);
      expect(isValidSeverity('ERROR')).toBe(true);
      expect(isValidSeverity('FATAL')).toBe(true);
    });

    it('should return false for invalid severity names', () => {
      expect(isValidSeverity('INVALID')).toBe(false);
      expect(isValidSeverity('info')).toBe(false);
      expect(isValidSeverity('')).toBe(false);
    });
  });

  describe('severityPriority()', () => {
    it('should return correct numeric priority', () => {
      expect(severityPriority('TRACE')).toBe(0);
      expect(severityPriority('FATAL')).toBe(5);
    });
  });

  describe('compareSeverity()', () => {
    it('should return negative when a < b', () => {
      expect(compareSeverity('TRACE', 'FATAL')).toBeLessThan(0);
    });

    it('should return 0 when equal', () => {
      expect(compareSeverity('WARN', 'WARN')).toBe(0);
    });

    it('should return positive when a > b', () => {
      expect(compareSeverity('FATAL', 'TRACE')).toBeGreaterThan(0);
    });
  });
});
