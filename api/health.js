import crypto from "node:crypto";
import packageMetadata from "../package.json" with { type: "json" };

/**
 * EOS SYSTEM — PROCESS LIVENESS ENDPOINT (/api/health)
 * Reports this handler's process data and trace identifiers. It does not probe
 * application subsystems or calculate availability SLI/SLO measurements.
 *
 * Zero external runtime dependencies.
 */

export default function handler(req, res) {
  const startTime = process.hrtime.bigint();

  // W3C Trace Context generation or propagation
  const incomingTrace = req.headers && req.headers.traceparent;
  const traceMatch = typeof incomingTrace === "string"
    ? incomingTrace.match(/^([\da-f]{2})-([\da-f]{32})-([\da-f]{16})-([\da-f]{2})$/i)
    : null;
  const validTrace = traceMatch && !/^0+$/.test(traceMatch[2]) && !/^0+$/.test(traceMatch[3]);
  const traceId = validTrace ? traceMatch[2].toLowerCase() : crypto.randomBytes(16).toString("hex");
  const spanId = crypto.randomBytes(8).toString("hex");
  const traceparent = `00-${traceId}-${spanId}-01`;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, traceparent, x-trace-id");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("traceparent", traceparent);
  res.setHeader("X-Trace-Id", traceId);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).json({ status: "METHOD_NOT_ALLOWED" });
  }

  const mem = process.memoryUsage();
  const formatMb = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + " MB";

  const endTime = process.hrtime.bigint();
  const latencyMicros = Number(endTime - startTime) / 1000;

  const healthPayload = {
    status: "UP",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: {
      name: "eos-system-control-plane",
      version: packageMetadata.version,
      runtime: `Node.js ${process.version} (${process.platform}-${process.arch})`,
      verificationScope: "PROCESS_LIVENESS_ONLY"
    },
    telemetry: {
      traceparent,
      latencyMicroseconds: latencyMicros,
      memory: {
        rss: formatMb(mem.rss),
        heapTotal: formatMb(mem.heapTotal),
        heapUsed: formatMb(mem.heapUsed),
        external: formatMb(mem.external),
        arrayBuffers: formatMb(mem.arrayBuffers || 0)
      }
    },
    subsystems: Object.fromEntries([
      "jarvis",
      "semanticGraph",
      "kernelDemo",
      "browserMemory",
      "repositoryChecks",
      "projectRegistry"
    ].map((name) => [name, { status: "NOT_PROBED" }])),
    sliReport: {
      measurementStatus: "TARGETS_ONLY_NOT_MEASURED",
      availabilitySloTarget: "99.99%",
      currentAvailabilityEstimate: null,
      errorBudgetRemaining: null,
      p50LatencyTargetMs: 2.0,
      p95LatencyTargetMs: 15.0,
      p99LatencyTargetMs: 50.0
    }
  };

  return res.status(200).json(healthPayload);
}
