/**
 * TelemetryPipeline Application Service (Layer 1 — Application)
 * SPEC-016: Observability & Telemetry Pipeline
 *
 * In-memory event bus with subscriber management, severity filtering,
 * transport dispatch, and correlation context propagation.
 */

import {
  TelemetryEvent,
  SeverityLevelName,
  TelemetryEventData,
} from '../domain/models/TelemetryEvent.js';
import { MetricCounter, MetricSnapshot } from '../domain/models/MetricCounter.js';

// ─── Transport Interface ────────────────────────────────────────

/**
 * Abstract log transport interface.
 * Infrastructure layer implements concrete transports (stdout, file).
 */
export interface ILogTransport {
  readonly name: string;
  write(event: TelemetryEventData): void;
  flush(): void;
}

// ─── Subscriber Types ───────────────────────────────────────────

export type TelemetrySubscriber = (event: TelemetryEvent) => void;

interface SubscriberEntry {
  readonly id: string;
  readonly callback: TelemetrySubscriber;
  readonly minSeverity: SeverityLevelName;
}

// ─── Pipeline Configuration ─────────────────────────────────────

export interface TelemetryPipelineConfig {
  readonly minSeverity: SeverityLevelName;
  readonly enableMetrics: boolean;
  readonly bufferSize: number;
}

const DEFAULT_CONFIG: TelemetryPipelineConfig = {
  minSeverity: 'INFO',
  enableMetrics: true,
  bufferSize: 1000,
};

// ─── Telemetry Pipeline ─────────────────────────────────────────

/**
 * Central telemetry orchestration service.
 *
 * Responsibilities:
 * - Emit structured telemetry events
 * - Route events to registered subscribers
 * - Filter events by severity threshold
 * - Dispatch to pluggable transports
 * - Manage correlation context for distributed tracing
 * - Collect and export metric snapshots
 */
export class TelemetryPipeline {
  private readonly config: TelemetryPipelineConfig;
  private readonly subscribers: Map<string, SubscriberEntry> = new Map();
  private readonly transports: Map<string, ILogTransport> = new Map();
  private readonly metrics: Map<string, MetricCounter> = new Map();
  private readonly eventBuffer: TelemetryEvent[] = [];
  private _activeCorrelationId: string | undefined;
  private _totalEmitted: number = 0;
  private _totalFiltered: number = 0;

  constructor(config: Partial<TelemetryPipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Event Emission ─────────────────────────────────────────

  /**
   * Emits a telemetry event through the pipeline.
   * The event is created, filtered by severity, buffered, and dispatched
   * to all qualifying subscribers and transports.
   *
   * @returns The created TelemetryEvent, or null if filtered out.
   */
  emit(
    severity: SeverityLevelName,
    source: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): TelemetryEvent | null {
    const event = TelemetryEvent.create(severity, source, message, {
      correlationId: this._activeCorrelationId,
      metadata,
    });

    this._totalEmitted++;

    // Global severity filter
    if (!event.meetsMinimumSeverity(this.config.minSeverity)) {
      this._totalFiltered++;
      return null;
    }

    // Buffer the event
    this.bufferEvent(event);

    // Dispatch to subscribers
    this.dispatchToSubscribers(event);

    // Dispatch to transports
    this.dispatchToTransports(event);

    // Update internal metrics
    if (this.config.enableMetrics) {
      this.recordInternalMetric(severity);
    }

    return event;
  }

  /**
   * Convenience methods for each severity level.
   */
  trace(source: string, message: string, metadata?: Record<string, unknown>): TelemetryEvent | null {
    return this.emit('TRACE', source, message, metadata);
  }

  debug(source: string, message: string, metadata?: Record<string, unknown>): TelemetryEvent | null {
    return this.emit('DEBUG', source, message, metadata);
  }

  info(source: string, message: string, metadata?: Record<string, unknown>): TelemetryEvent | null {
    return this.emit('INFO', source, message, metadata);
  }

  warn(source: string, message: string, metadata?: Record<string, unknown>): TelemetryEvent | null {
    return this.emit('WARN', source, message, metadata);
  }

  error(source: string, message: string, metadata?: Record<string, unknown>): TelemetryEvent | null {
    return this.emit('ERROR', source, message, metadata);
  }

  fatal(source: string, message: string, metadata?: Record<string, unknown>): TelemetryEvent | null {
    return this.emit('FATAL', source, message, metadata);
  }

  // ─── Correlation Context ────────────────────────────────────

  /**
   * Sets the active correlation ID for all subsequent events.
   * Used to group related events in a single execution trace.
   */
  setCorrelationId(correlationId: string): void {
    this._activeCorrelationId = correlationId;
  }

  /**
   * Clears the active correlation ID.
   */
  clearCorrelationId(): void {
    this._activeCorrelationId = undefined;
  }

  /**
   * Returns the currently active correlation ID, or undefined.
   */
  get activeCorrelationId(): string | undefined {
    return this._activeCorrelationId;
  }

  /**
   * Executes a function within a correlation context.
   * All events emitted during the function execution share the same correlation ID.
   */
  withCorrelation<T>(correlationId: string, fn: () => T): T {
    const previousId = this._activeCorrelationId;
    this._activeCorrelationId = correlationId;
    try {
      return fn();
    } finally {
      this._activeCorrelationId = previousId;
    }
  }

  // ─── Subscriber Management ─────────────────────────────────

  /**
   * Registers a subscriber to receive telemetry events.
   *
   * @param id - Unique subscriber identifier
   * @param callback - Function invoked for each qualifying event
   * @param minSeverity - Optional minimum severity override for this subscriber
   * @returns The subscriber ID for later unsubscription
   */
  subscribe(
    id: string,
    callback: TelemetrySubscriber,
    minSeverity?: SeverityLevelName
  ): string {
    this.subscribers.set(id, {
      id,
      callback,
      minSeverity: minSeverity ?? this.config.minSeverity,
    });
    return id;
  }

  /**
   * Removes a subscriber by ID.
   */
  unsubscribe(id: string): boolean {
    return this.subscribers.delete(id);
  }

  /**
   * Returns the count of active subscribers.
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }

  // ─── Transport Management ──────────────────────────────────

  /**
   * Registers a log transport for event output.
   */
  addTransport(transport: ILogTransport): void {
    this.transports.set(transport.name, transport);
  }

  /**
   * Removes a transport by name.
   */
  removeTransport(name: string): boolean {
    return this.transports.delete(name);
  }

  /**
   * Returns the count of registered transports.
   */
  get transportCount(): number {
    return this.transports.size;
  }

  // ─── Metrics ───────────────────────────────────────────────

  /**
   * Registers or retrieves a named metric.
   */
  metric(name: string, type: 'counter' | 'gauge' | 'histogram' = 'counter'): MetricCounter {
    let m = this.metrics.get(name);
    if (!m) {
      switch (type) {
        case 'counter':
          m = MetricCounter.counter(name);
          break;
        case 'gauge':
          m = MetricCounter.gauge(name);
          break;
        case 'histogram':
          m = MetricCounter.histogram(name);
          break;
      }
      this.metrics.set(name, m);
    }
    return m;
  }

  /**
   * Exports snapshots of all registered metrics.
   */
  exportMetrics(): readonly MetricSnapshot[] {
    const snapshots: MetricSnapshot[] = [];
    for (const m of this.metrics.values()) {
      snapshots.push(m.snapshot());
    }
    return Object.freeze(snapshots);
  }

  // ─── Buffer & Flush ────────────────────────────────────────

  /**
   * Returns the current event buffer (readonly).
   */
  get buffer(): readonly TelemetryEvent[] {
    return Object.freeze([...this.eventBuffer]);
  }

  /**
   * Flushes all buffered events to transports.
   * Returns the number of events flushed.
   */
  flush(): number {
    const count = this.eventBuffer.length;

    for (const transport of this.transports.values()) {
      transport.flush();
    }

    this.eventBuffer.length = 0;
    return count;
  }

  // ─── Statistics ────────────────────────────────────────────

  /**
   * Returns the total number of events emitted (before filtering).
   */
  get totalEmitted(): number {
    return this._totalEmitted;
  }

  /**
   * Returns the total number of events filtered out by severity.
   */
  get totalFiltered(): number {
    return this._totalFiltered;
  }

  /**
   * Returns the number of events currently in the buffer.
   */
  get bufferedCount(): number {
    return this.eventBuffer.length;
  }

  // ─── Private Methods ──────────────────────────────────────

  private bufferEvent(event: TelemetryEvent): void {
    this.eventBuffer.push(event);

    // Enforce buffer size limit (FIFO eviction)
    while (this.eventBuffer.length > this.config.bufferSize) {
      this.eventBuffer.shift();
    }
  }

  private dispatchToSubscribers(event: TelemetryEvent): void {
    for (const sub of this.subscribers.values()) {
      if (event.meetsMinimumSeverity(sub.minSeverity)) {
        try {
          sub.callback(event);
        } catch {
          // Subscriber errors must not crash the pipeline
        }
      }
    }
  }

  private dispatchToTransports(event: TelemetryEvent): void {
    const data = event.toJSON();
    for (const transport of this.transports.values()) {
      try {
        transport.write(data);
      } catch {
        // Transport errors must not crash the pipeline
      }
    }
  }

  private recordInternalMetric(severity: SeverityLevelName): void {
    const metricName = `eos.telemetry.events.${severity.toLowerCase()}`;
    const m = this.metrics.get(metricName) ?? MetricCounter.counter(metricName, { severity });
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, m);
    }
    m.increment();
  }
}
