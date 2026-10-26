import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EosMcpStreamServer,
  EosMcpSessionManager,
  EosMcpSession
} from "../src/mcp/eosMcpStreamServer.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

test("SPEC-027 / BDD-061: SSE Connection Handshake and Endpoint Negotiation", async () => {
  const streamServer = new EosMcpStreamServer(projectRoot, 100); // 100ms keepalive for fast test
  const testPort = 39871;
  await streamServer.listen(testPort, "127.0.0.1");

  try {
    const sseChunks = [];
    let receivedEndpoint = false;
    let assignedSessionId = "";

    const req = http.request(
      `http://127.0.0.1:${testPort}/sse`,
      {
        method: "GET",
        headers: {
          Accept: "text/event-stream"
        }
      },
      (res) => {
        assert.equal(res.statusCode, 200);
        assert.ok(res.headers["content-type"].includes("text/event-stream"));

        res.on("data", (chunk) => {
          const text = chunk.toString();
          sseChunks.push(text);

          if (text.includes("event: endpoint")) {
            receivedEndpoint = true;
            const match = text.match(/sessionId=([a-f0-9\-]+)/);
            if (match) {
              assignedSessionId = match[1];
            }
          }
        });
      }
    );

    req.end();

    // Wait for initial SSE endpoint event
    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.ok(receivedEndpoint, "Server must emit 'event: endpoint' upon SSE connection");
    assert.ok(assignedSessionId.length > 0, "Server must assign a valid sessionId");

    // Verify session manager tracked the session
    const activeSessions = streamServer.sessionManager.getActiveSessions();
    assert.equal(activeSessions.length, 1);
    assert.equal(activeSessions[0].id, assignedSessionId);

    // Abort connection to test cleanup
    req.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify session was purged on client disconnect (BDD-063)
    const afterDisconnectSessions = streamServer.sessionManager.getActiveSessions();
    assert.equal(afterDisconnectSessions.length, 0, "Session must be removed immediately on socket disconnect");
  } finally {
    await streamServer.close();
  }
});

test("SPEC-027 / BDD-062: Bi-Directional Message Dispatching & Progress Streaming over SSE", async () => {
  const streamServer = new EosMcpStreamServer(projectRoot, 20000);
  const testPort = 39872;
  await streamServer.listen(testPort, "127.0.0.1");

  try {
    const sseMessages = [];
    let assignedSessionId = "";

    // 1. Establish SSE stream
    const sseReq = http.request(
      `http://127.0.0.1:${testPort}/sse`,
      { method: "GET" },
      (res) => {
        res.on("data", (chunk) => {
          const text = chunk.toString();
          sseMessages.push(text);
          if (text.includes("event: endpoint")) {
            const match = text.match(/sessionId=([a-f0-9\-]+)/);
            if (match) assignedSessionId = match[1];
          }
        });
      }
    );
    sseReq.end();

    // Wait for SSE handshake
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.ok(assignedSessionId, "Expected valid assignedSessionId");

    // 2. Dispatch tool call via POST /message?sessionId=<id>
    const toolPayload = JSON.stringify({
      jsonrpc: "2.0",
      id: "req-topo-1",
      method: "tools/call",
      params: {
        name: "eos_query_topology",
        arguments: {}
      }
    });

    const postResponse = await new Promise((resolve, reject) => {
      const postReq = http.request(
        `http://127.0.0.1:${testPort}/message?sessionId=${assignedSessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(toolPayload)
          }
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
        }
      );
      postReq.on("error", reject);
      postReq.write(toolPayload);
      postReq.end();
    });

    // 3. Verify HTTP response
    assert.equal(postResponse.statusCode, 200);
    assert.equal(postResponse.body.id, "req-topo-1");
    assert.ok(postResponse.body.result, "Expected tool execution result");

    const contentText = postResponse.body.result.content[0].text;
    const topoResult = JSON.parse(contentText);
    assert.equal(topoResult.nodes.length, 14, "Expected 14 Sovereign fleet nodes");
    assert.equal(topoResult.rings.length, 3, "Expected 3 concentric rings");
    assert.ok(topoResult.metrics.totalNodes === 14);

    // 4. Verify SSE stream received both progress notification and result event
    await new Promise((resolve) => setTimeout(resolve, 150));
    const allSseText = sseMessages.join("");
    assert.ok(allSseText.includes("notifications/progress"), "SSE stream must receive progress notification");
    assert.ok(allSseText.includes("req-topo-1"), "SSE stream must receive response with request id");

    sseReq.destroy();
  } finally {
    await streamServer.close();
  }
});

test("SPEC-027: Health, Status & Stdio Error Handling Invariants", async () => {
  const streamServer = new EosMcpStreamServer(projectRoot);
  const testPort = 39873;
  await streamServer.listen(testPort, "127.0.0.1");

  try {
    // 1. Health check
    const healthRes = await new Promise((resolve) => {
      http.get(`http://127.0.0.1:${testPort}/health`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      });
    });

    assert.equal(healthRes.status, "UP");
    assert.equal(healthRes.server, "eos-system-mcp-stream");
    assert.equal(healthRes.protocolVersion, "2024-11-05");
    assert.ok(healthRes.transports.includes("sse"));

    // 2. Malformed JSON handling on /message
    const malformedRes = await new Promise((resolve) => {
      const req = http.request(
        `http://127.0.0.1:${testPort}/message`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }
      );
      req.write("{ malformed json ... ");
      req.end();
    });

    assert.equal(malformedRes.status, 400);
    assert.equal(malformedRes.body.error.code, -32700);

    // 3. Stdio direct call validation
    const mcpServer = streamServer.mcpServer;
    const listRes = mcpServer.handleRequest({ jsonrpc: "2.0", id: "tools-test", method: "tools/list", params: {} });
    assert.equal(listRes.id, "tools-test");
    const hasQueryTopo = listRes.result.tools.some((t) => t.name === "eos_query_topology");
    const hasWasmCompress = listRes.result.tools.some((t) => t.name === "eos_wasm_compress");
    assert.ok(hasQueryTopo, "tools/list must include eos_query_topology");
    assert.ok(hasWasmCompress, "tools/list must include eos_wasm_compress");
  } finally {
    await streamServer.close();
  }
});
