/**
 * TelemetryEvent Domain Model (Layer 0 — Pure Domain)
 * SPEC-016: Observability & Telemetry Pipeline
 *
 * Structured telemetry event entity with severity classification,
 * correlation ID propagation, and deterministic JSON serialization.
 *
 * ZERO external dependencies — no fs, path, http, node: imports.
 */

// ─── Severity Levels (RFC 5424 aligned) ─────────────────────────

/**
 * Six severity levels ordered from lowest to highest priority.
 * Numeric values enable comparison-based filtering.
 */
export const SeverityLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
} as const;

export type SeverityLevelName = keyof typeof SeverityLevel;

const SEVERITY_NAMES: readonly SeverityLevelName[] = [
  'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL',
] as const;

/**
 * Validates that a string is a valid severity level name.
 */
export function isValidSeverity(name: string): name is SeverityLevelName {
  return SEVERITY_NAMES.includes(name as SeverityLevelName);
}

/**
 * Returns the numeric priority for a severity level name.
 * Higher values indicate more critical events.
 */
export function severityPriority(name: SeverityLevelName): number {
  return SeverityLevel[name];
}

/**
 * Compares two severity levels. Returns:
 * - negative if a < b (a is less severe)
 * - zero if a === b
 * - positive if a > b (a is more severe)
 */
export function compareSeverity(a: SeverityLevelName, b: SeverityLevelName): number {
  return SeverityLevel[a] - SeverityLevel[b];
}

// ─── Telemetry Event Entity ─────────────────────────────────────

export interface TelemetryEventData {
  readonly eventId: string;
  readonly timestamp: string;
  readonly severity: SeverityLevelName;
  readonly source: string;
  readonly correlationId: string;
  readonly message: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Pure domain telemetry event entity.
 *
 * Immutable after creation via Object.freeze().
 * Contains all information required for structured logging and tracing.
 */
export class TelemetryEvent {
  readonly eventId: string;
  readonly timestamp: string;
  readonly severity: SeverityLevelName;
  readonly source: string;
  readonly correlationId: string;
  readonly message: string;
  readonly metadata: Readonly<Record<string, unknown>>;

  private constructor(data: TelemetryEventData) {
    this.eventId = data.eventId;
    this.timestamp = data.timestamp;
    this.severity = data.severity;
    this.source = data.source;
    this.correlationId = data.correlationId;
    this.message = data.message;
    this.metadata = Object.freeze({ ...data.metadata });

    Object.freeze(this);
  }

  /**
   * Factory method: creates a new immutable TelemetryEvent.
   *
   * @param severity - One of the 6 RFC 5424 severity levels
   * @param source - The originating component/module name
   * @param message - Human-readable event description
   * @param options - Optional correlation ID and metadata
   */
  static create(
    severity: SeverityLevelName,
    source: string,
    message: string,
    options: {
      correlationId?: string | undefined;
      metadata?: Record<string, unknown> | undefined;
      timestamp?: string | undefined;
      eventId?: string | undefined;
    } = {}
  ): TelemetryEvent {
    if (!isValidSeverity(severity)) {
      throw new Error(`Invalid severity level: ${severity}. Valid levels: ${SEVERITY_NAMES.join(', ')}`);
    }

    if (!source || source.trim().length === 0) {
      throw new Error('Source component name must be a non-empty string.');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message must be a non-empty string.');
    }

    const eventId = options.eventId ?? TelemetryEvent.generateEventId();
    const timestamp = options.timestamp ?? new Date().toISOString();
    const correlationId = options.correlationId ?? TelemetryEvent.generateCorrelationId();
    const metadata = options.metadata ?? {};

    return new TelemetryEvent({
      eventId,
      timestamp,
      severity,
      source,
      correlationId,
      message,
      metadata,
    });
  }

  /**
   * Serializes the event to a structured JSON string (NDJSON-compatible).
   * Fields are ordered deterministically for consistent log output.
   */
  toJSON(): TelemetryEventData {
    return {
      eventId: this.eventId,
      timestamp: this.timestamp,
      severity: this.severity,
      source: this.source,
      correlationId: this.correlationId,
      message: this.message,
      metadata: this.metadata,
    };
  }

  /**
   * Serializes to a single-line JSON string (NDJSON format).
   */
  toJSONString(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Returns true if this event's severity is at or above the given minimum.
   */
  meetsMinimumSeverity(minimum: SeverityLevelName): boolean {
    return SeverityLevel[this.severity] >= SeverityLevel[minimum];
  }

  /**
   * Creates a child event sharing the same correlation ID.
   */
  createChildEvent(
    severity: SeverityLevelName,
    source: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): TelemetryEvent {
    return TelemetryEvent.create(severity, source, message, {
      correlationId: this.correlationId,
      metadata,
    });
  }

  /**
   * Generates a pseudo-unique event ID.
   * Uses timestamp + random hex for sufficient uniqueness without crypto dependency.
   */
  private static generateEventId(): string {
    const timePart = Date.now().toString(36);
    const randPart = Math.random().toString(36).substring(2, 10);
    return `evt-${timePart}-${randPart}`;
  }

  /**
   * Generates a pseudo-unique correlation ID.
   */
  private static generateCorrelationId(): string {
    const timePart = Date.now().toString(36);
    const randPart = Math.random().toString(36).substring(2, 10);
    return `corr-${timePart}-${randPart}`;
  }
}
