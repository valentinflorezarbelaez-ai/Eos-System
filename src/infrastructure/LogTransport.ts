/**
 * LogTransport Infrastructure Adapter (Layer 2 — Infrastructure)
 * SPEC-016: Observability & Telemetry Pipeline
 *
 * Pluggable log transport implementations for stdout and file output.
 * NDJSON (Newline Delimited JSON) format for machine-parseable log lines.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ILogTransport } from '../core/application/TelemetryPipeline.js';
import type { TelemetryEventData } from '../core/domain/models/TelemetryEvent.js';

// ─── Stdout Transport ───────────────────────────────────────────

/**
 * Writes structured telemetry events to stdout as NDJSON.
 * Each event is serialized as a single JSON line.
 */
export class StdoutTransport implements ILogTransport {
  readonly name = 'stdout';

  write(event: TelemetryEventData): void {
    const line = JSON.stringify(event);
    process.stdout.write(line + '\n');
  }

  flush(): void {
    // stdout is unbuffered in Node.js; no-op
  }
}

// ─── File Transport ─────────────────────────────────────────────

export interface FileTransportOptions {
  /** Absolute path to the log file */
  readonly filePath: string;
  /** Maximum file size in bytes before rotation (default: 10MB) */
  readonly maxFileSize?: number;
  /** Maximum number of rotated log files to keep (default: 5) */
  readonly maxFiles?: number;
}

/**
 * Writes structured telemetry events to a file as NDJSON.
 * Supports basic file size rotation.
 */
export class FileTransport implements ILogTransport {
  readonly name = 'file';
  private readonly filePath: string;
  private readonly maxFileSize: number;
  private readonly maxFiles: number;
  private buffer: string[] = [];

  constructor(options: FileTransportOptions) {
    this.filePath = options.filePath;
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles ?? 5;

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  write(event: TelemetryEventData): void {
    const line = JSON.stringify(event) + '\n';
    this.buffer.push(line);

    // Auto-flush when buffer reaches 100 lines
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;

    // Check rotation before writing
    this.rotateIfNeeded();

    const content = this.buffer.join('');
    fs.appendFileSync(this.filePath, content, 'utf-8');
    this.buffer = [];
  }

  /**
   * Reads the current log file and returns all events as parsed objects.
   */
  readAll(): TelemetryEventData[] {
    if (!fs.existsSync(this.filePath)) return [];

    const content = fs.readFileSync(this.filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    const events: TelemetryEventData[] = [];
    for (const line of lines) {
      try {
        events.push(JSON.parse(line) as TelemetryEventData);
      } catch {
        // Skip malformed lines
      }
    }
    return events;
  }

  /**
   * Reads the last N events from the log file.
   */
  readTail(count: number): TelemetryEventData[] {
    const all = this.readAll();
    return all.slice(-count);
  }

  /**
   * Searches events by a text query across all string fields.
   */
  search(query: string): TelemetryEventData[] {
    const all = this.readAll();
    const lowerQuery = query.toLowerCase();
    return all.filter(event => {
      const searchable = `${event.severity} ${event.source} ${event.message} ${event.correlationId}`.toLowerCase();
      return searchable.includes(lowerQuery);
    });
  }

  private rotateIfNeeded(): void {
    if (!fs.existsSync(this.filePath)) return;

    const stats = fs.statSync(this.filePath);
    if (stats.size < this.maxFileSize) return;

    // Rotate files: log.4 → deleted, log.3 → log.4, ..., log → log.1
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldPath = `${this.filePath}.${i}`;
      const newPath = `${this.filePath}.${i + 1}`;
      if (fs.existsSync(oldPath)) {
        if (i === this.maxFiles - 1) {
          fs.unlinkSync(oldPath);
        } else {
          fs.renameSync(oldPath, newPath);
        }
      }
    }

    // Rotate current log → log.1
    fs.renameSync(this.filePath, `${this.filePath}.1`);
  }
}

// ─── Memory Transport (for testing) ─────────────────────────────

/**
 * In-memory transport that stores events for testing and inspection.
 */
export class MemoryTransport implements ILogTransport {
  readonly name = 'memory';
  private readonly events: TelemetryEventData[] = [];

  write(event: TelemetryEventData): void {
    this.events.push(event);
  }

  flush(): void {
    // No-op for memory transport
  }

  /**
   * Returns all stored events.
   */
  getEvents(): readonly TelemetryEventData[] {
    return Object.freeze([...this.events]);
  }

  /**
   * Returns the count of stored events.
   */
  get count(): number {
    return this.events.length;
  }

  /**
   * Clears all stored events.
   */
  clear(): void {
    this.events.length = 0;
  }
}
