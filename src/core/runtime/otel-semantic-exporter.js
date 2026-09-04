import crypto from 'node:crypto';

/**
 * OpenInference / OpenTelemetry Standard Span Kinds
 */
export const SPAN_KINDS = Object.freeze({
  AGENT: 'AGENT',
  LLM: 'LLM',
  TOOL: 'TOOL',
  GUARDRAIL: 'GUARDRAIL'
});

/**
 * EOS OpenInference & OTel Semantic Telemetry Exporter
 * L0 (Node built-ins only). Emits distributed spans for deep agentic observability.
 */
export class OTelSemanticExporter {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'eos-autonomous-sdlc';
    this.serviceVersion = options.serviceVersion || '0.5.0';
    this.traces = new Map();
  }

  /**
   * Initializes a root trace context.
   * @param {string} traceId
   * @param {string} rootAgentName
   * @returns {object}
   */
  startTrace(traceId, rootAgentName = 'EOSAgentOrchestrator') {
    const trace = {
      traceId,
      rootAgentName,
      startedAt: new Date().toISOString(),
      spans: []
    };
    this.traces.set(traceId, trace);
    return trace;
  }

  /**
   * Records a semantic span in the active trace.
   * @param {string} traceId
   * @param {object} spanData
   * @param {string} spanData.kind
   * @param {string} spanData.name
   * @param {number} [spanData.durationMs]
   * @param {object} [spanData.attributes]
   * @returns {object}
   */
  recordSpan(traceId, spanData = {}) {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`GOVERNANCE_FAULT: Trace ID [${traceId}] does not exist.`);
    }

    const spanId = `spn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const span = {
      spanId,
      traceId,
      name: spanData.name || 'unnamed-span',
      kind: spanData.kind || SPAN_KINDS.TOOL,
      durationMs: spanData.durationMs || 0,
      attributes: {
        'openinference.span.kind': spanData.kind || SPAN_KINDS.TOOL,
        'service.name': this.serviceName,
        'service.version': this.serviceVersion,
        ...(spanData.attributes || {})
      },
      timestamp: new Date().toISOString()
    };

    trace.spans.push(span);
    return span;
  }

  /**
   * Exports trace in OpenTelemetry OTLP JSON standard format.
   * @param {string} traceId
   * @returns {object}
   */
  exportToOTLPJson(traceId) {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`GOVERNANCE_FAULT: Trace ID [${traceId}] does not exist.`);
    }

    return {
      resourceSpans: [
        {
          resource: {
            attributes: {
              'service.name': this.serviceName,
              'service.version': this.serviceVersion,
              'host.arch': process.arch,
              'host.platform': process.platform
            }
          },
          scopeSpans: [
            {
              scope: {
                name: 'eos.telemetry.openinference',
                version: this.serviceVersion
              },
              spans: trace.spans.map(s => ({
                traceId: s.traceId,
                spanId: s.spanId,
                name: s.name,
                kind: s.kind,
                durationMs: s.durationMs,
                attributes: s.attributes,
                startTimeUnixNano: `${Date.now()}000000`
              }))
            }
          ]
        }
      ]
    };
  }

  /**
   * Exports trace as Newline-Delimited JSON (JSONL).
   * @param {string} traceId
   * @returns {string}
   */
  exportToJSONL(traceId) {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`GOVERNANCE_FAULT: Trace ID [${traceId}] does not exist.`);
    }
    return trace.spans.map(s => JSON.stringify(s)).join('\n');
  }
}
