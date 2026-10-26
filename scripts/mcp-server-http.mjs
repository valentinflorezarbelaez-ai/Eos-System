// scripts/mcp-server-http.mjs
// EOS System — Local HTTP server for MCP tunneling
// Zero external dependencies.

import http from "node:http";
import mcpHandler from "../api/mcp.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
        res.setHeader(k, v);
      },
      status(code) {
        this.statusCode = code;
        res.statusCode = code;
        return this;
      },
      json(data) {
        this.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
        return this;
      },
      end(data) {
        res.end(data);
        return this;
      },
      write(data) {
        res.write(data);
        return this;
      }
    };

    req.body = body;
    try {
      await mcpHandler(req, mockRes);
    } catch (err) {
      console.error("[EOS MCP Error]:", err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[EOS MCP] HTTP bridge listening on http://127.0.0.1:${PORT}`);
});
