/**
 * MetricCounter Domain Model (Layer 0 — Pure Domain)
 * SPEC-016: Observability & Telemetry Pipeline
 *
 * Counter, gauge, and histogram metric types with dimensional labels
 * and snapshot export for structured observability.
 *
 * ZERO external dependencies — no fs, path, http, node: imports.
 */

// ─── Metric Types ───────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricLabels {
  readonly [key: string]: string;
}

export interface MetricSnapshot {
  readonly name: string;
  readonly type: MetricType;
  readonly value: number;
  readonly labels: MetricLabels;
  readonly timestamp: string;
  readonly observations?: readonly number[];
}

// ─── MetricCounter Entity ───────────────────────────────────────

/**
 * Pure domain metric entity supporting three metric types:
 *
 * - **counter**: Monotonically increasing value (e.g., total requests).
 * - **gauge**: Arbitrary value that can increase or decrease (e.g., active connections).
 * - **histogram**: Records individual observations for statistical distribution.
 */
export class MetricCounter {
  readonly name: string;
  readonly type: MetricType;
  readonly labels: MetricLabels;
  private _value: number;
  private readonly _observations: number[];

  private constructor(name: string, type: MetricType, labels: MetricLabels) {
    this.name = name;
    this.type = type;
    this.labels = Object.freeze({ ...labels });
    this._value = 0;
    this._observations = [];
  }

  /**
   * Factory: creates a counter metric (monotonically increasing).
   */
  static counter(name: string, labels: MetricLabels = {}): MetricCounter {
    MetricCounter.validateName(name);
    return new MetricCounter(name, 'counter', labels);
  }

  /**
   * Factory: creates a gauge metric (can increase or decrease).
   */
  static gauge(name: string, labels: MetricLabels = {}): MetricCounter {
    MetricCounter.validateName(name);
    return new MetricCounter(name, 'gauge', labels);
  }

  /**
   * Factory: creates a histogram metric (records observations).
   */
  static histogram(name: string, labels: MetricLabels = {}): MetricCounter {
    MetricCounter.validateName(name);
    return new MetricCounter(name, 'histogram', labels);
  }

  /**
   * Returns the current metric value.
   */
  get value(): number {
    return this._value;
  }

  /**
   * Returns all recorded observations (histogram only, but available for all).
   */
  get observations(): readonly number[] {
    return Object.freeze([...this._observations]);
  }

  /**
   * Increments the metric value.
   * For counters: only positive deltas are allowed.
   * For gauges: any positive delta is allowed.
   * For histograms: the delta is added to the cumulative value AND recorded as an observation.
   *
   * @throws Error if delta is negative for a counter metric.
   */
  increment(delta: number = 1): void {
    if (this.type === 'counter' && delta < 0) {
      throw new Error(`Counter metric "${this.name}" cannot be decremented. Use a gauge for bidirectional values.`);
    }

    this._value += delta;

    if (this.type === 'histogram') {
      this._observations.push(delta);
    }
  }

  /**
   * Decrements the metric value (gauge only).
   *
   * @throws Error if metric type is 'counter'.
   */
  decrement(delta: number = 1): void {
    if (this.type === 'counter') {
      throw new Error(`Counter metric "${this.name}" cannot be decremented. Counters are monotonically increasing.`);
    }

    this._value -= delta;

    if (this.type === 'histogram') {
      this._observations.push(-delta);
    }
  }

  /**
   * Records an observation (histogram convenience method).
   * The observation value is added to the cumulative total AND stored individually.
   */
  observe(value: number): void {
    this._value += value;
    this._observations.push(value);
  }

  /**
   * Sets the metric value directly (gauge only).
   *
   * @throws Error if metric type is 'counter'.
   */
  set(value: number): void {
    if (this.type === 'counter') {
      throw new Error(`Counter metric "${this.name}" cannot be set directly. Use increment() instead.`);
    }

    this._value = value;
  }

  /**
   * Resets the metric to its initial state.
   */
  reset(): void {
    this._value = 0;
    this._observations.length = 0;
  }

  /**
   * Returns the count of observations recorded.
   */
  get observationCount(): number {
    return this._observations.length;
  }

  /**
   * Computes the arithmetic mean of recorded observations.
   * Returns 0 if no observations exist.
   */
  get mean(): number {
    if (this._observations.length === 0) return 0;
    const sum = this._observations.reduce((acc, v) => acc + v, 0);
    return sum / this._observations.length;
  }

  /**
   * Returns the minimum observation value.
   * Returns Infinity if no observations exist.
   */
  get min(): number {
    if (this._observations.length === 0) return Infinity;
    return Math.min(...this._observations);
  }

  /**
   * Returns the maximum observation value.
   * Returns -Infinity if no observations exist.
   */
  get max(): number {
    if (this._observations.length === 0) return -Infinity;
    return Math.max(...this._observations);
  }

  /**
   * Exports the current metric state as an immutable snapshot.
   */
  snapshot(): MetricSnapshot {
    const snap: MetricSnapshot = {
      name: this.name,
      type: this.type,
      value: this._value,
      labels: this.labels,
      timestamp: new Date().toISOString(),
      ...(this.type === 'histogram' ? { observations: Object.freeze([...this._observations]) } : {}),
    };

    return Object.freeze(snap);
  }

  /**
   * Returns a formatted label string for display purposes.
   * Example: `{env="production", region="us-east-1"}`
   */
  get labelString(): string {
    const entries = Object.entries(this.labels);
    if (entries.length === 0) return '{}';
    const pairs = entries.map(([k, v]) => `${k}="${v}"`).join(', ');
    return `{${pairs}}`;
  }

  /**
   * Validates that a metric name follows the naming convention:
   * lowercase alphanumeric with dots and underscores.
   */
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Metric name must be a non-empty string.');
    }

    if (!/^[a-z][a-z0-9._]*$/.test(name)) {
      throw new Error(
        `Invalid metric name "${name}". Must start with a lowercase letter and contain only lowercase alphanumeric, dots (.), and underscores (_).`
      );
    }
  }
}
