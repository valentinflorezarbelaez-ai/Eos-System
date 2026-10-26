/**
 * EOS SYSTEM — MODEL CONTEXT PROTOCOL (MCP) LIVE STREAM SERVER (Layer 0)
 * Governed by ADR-034, SPEC-027, FR-066..FR-070, BDD-061..BDD-063
 *
 * Implements bi-directional streaming for Cursor, Antigravity, and Claude Code:
 * - Persistent Server-Sent Events (SSE) on GET /sse with endpoint negotiation.
 * - JSON-RPC 2.0 message dispatching via POST /message?sessionId=<sessionId>.
 * - Real-time notifications (notifications/progress) down active SSE streams.
 * - Keep-alive heartbeats (: keep-alive) and automatic session garbage collection.
 *
 * Invariant: 100% Layer-0 purity with zero external npm runtime dependencies.
 */

import http from "node:http";
import crypto from "node:crypto";
import { URL } from "node:url";
import { EosMcpServer, type JsonRpcRequest, type JsonRpcResponse } from "./eosMcpServer.ts";

export interface ProgressNotificationParams {
  progressToken: string | number;
  progress: number;
  total?: number;
  message?: string;
}

export class EosMcpSession {
  public readonly id: string;
  public readonly createdAt: number;
  public lastActivity: number;
  private readonly res: http.ServerResponse;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(id: string, res: http.ServerResponse, heartbeatIntervalMs = 15000) {
    this.id = id;
    this.res = res;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    if (heartbeatIntervalMs > 0) {
      this.keepAliveTimer = setInterval(() => {
        this.sendHeartbeat();
      }, heartbeatIntervalMs);
    }
  }

  public sendEvent(event: string, data: any): boolean {
    if (this.closed || this.res.writableEnded || !this.res.writable) {
      return false;
    }
    this.lastActivity = Date.now();
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    const frame = `event: ${event}\ndata: ${payload}\n\n`;
    try {
      this.res.write(frame);
      return true;
    } catch {
      this.close();
      return false;
    }
  }

  public sendHeartbeat(): void {
    if (this.closed || this.res.writableEnded || !this.res.writable) return;
    try {
      this.res.write(": keep-alive\n\n");
    } catch {
      this.close();
    }
  }

  public sendProgress(token: string | number, progress: number, total?: number, message?: string): boolean {
    const notification: JsonRpcRequest = {
      jsonrpc: "2.0",
      method: "notifications/progress",
      params: {
        progressToken: token,
        progress,
        total,
        message
      }
    };
    return this.sendEvent("message", notification);
  }

  public close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (!this.res.writableEnded && this.res.writable) {
      try {
        this.res.end();
      } catch {
        // Safe ignored on client abrupt termination
      }
    }
  }

  public isAlive(): boolean {
    return !this.closed && !this.res.writableEnded && this.res.writable;
  }
}

export class EosMcpSessionManager {
  private readonly sessions = new Map<string, EosMcpSession>();
  private readonly heartbeatIntervalMs: number;

  constructor(heartbeatIntervalMs = 15000) {
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  public createSession(res: http.ServerResponse): EosMcpSession {
    const sessionId = crypto.randomUUID();
    const session = new EosMcpSession(sessionId, res, this.heartbeatIntervalMs);
    this.sessions.set(sessionId, session);
    return session;
  }

  public getSession(sessionId: string): EosMcpSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session && !session.isAlive()) {
      this.removeSession(sessionId);
      return undefined;
    }
    return session;
  }

  public removeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.close();
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  public getActiveSessions(): Array<{ id: string; createdAt: number; ageMs: number }> {
    const now = Date.now();
    const list: Array<{ id: string; createdAt: number; ageMs: number }> = [];
    for (const [id, session] of this.sessions.entries()) {
      if (session.isAlive()) {
        list.push({ id, createdAt: session.createdAt, ageMs: now - session.createdAt });
      } else {
        this.sessions.delete(id);
      }
    }
    return list;
  }

  public closeAll(): void {
    for (const session of this.sessions.values()) {
      session.close();
    }
    this.sessions.clear();
  }
}

export class EosMcpStreamServer {
  public readonly mcpServer: EosMcpServer;
  public readonly sessionManager: EosMcpSessionManager;
  private server: http.Server | null = null;
  private readonly projectRoot: string;

  constructor(projectRoot?: string, heartbeatIntervalMs = 15000) {
    this.projectRoot = projectRoot || process.cwd();
    this.mcpServer = new EosMcpServer(this.projectRoot);
    this.sessionManager = new EosMcpSessionManager(heartbeatIntervalMs);
  }

  /**
   * Main HTTP request router implementing the MCP 2024-11-05 spec
   */
  public async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // 1. Permissive CORS for local AI IDE extensions (Cursor, Antigravity)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const host = req.headers.host || "127.0.0.1";
    const parsedUrl = new URL(req.url || "/", `http://${host}`);
    const pathname = parsedUrl.pathname;

    // 2. Health & Status endpoint
    if (pathname === "/health" || pathname === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "UP",
          server: "eos-system-mcp-stream",
          version: "35.0.0",
          protocolVersion: "2024-11-05",
          activeSessions: this.sessionManager.getActiveSessions().length,
          uptimeSeconds: Math.floor(process.uptime()),
          transports: ["stdio", "sse", "http-jsonrpc"]
        })
      );
      return;
    }

    // 3. SSE Live Stream Initiation: GET /sse
    if (req.method === "GET" && (pathname === "/sse" || pathname === "/events")) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      });

      // Force header flush for HTTP/1.1 chunking
      res.flushHeaders?.();

      const session = this.sessionManager.createSession(res);

      // MCP Spec 2024-11-05: Server must immediately send the endpoint event
      session.sendEvent("endpoint", `/message?sessionId=${session.id}`);

      // Graceful cleanup on client socket disconnect
      req.on("close", () => {
        this.sessionManager.removeSession(session.id);
      });

      return;
    }

    // 4. Bi-directional JSON-RPC Message backchannel: POST /message
    if (req.method === "POST" && pathname === "/message") {
      const sessionId = parsedUrl.searchParams.get("sessionId") || (req.headers["x-session-id"] as string);
      const session = sessionId ? this.sessionManager.getSession(sessionId) : undefined;

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", async () => {
        try {
          if (!body.trim()) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Empty request body" } }));
            return;
          }

          let jsonRpcReq: JsonRpcRequest;
          try {
            jsonRpcReq = JSON.parse(body);
          } catch (parseErr) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: { code: -32700, message: "Parse error: Invalid JSON", data: String(parseErr) }
              })
            );
            return;
          }

          // Progress hook for bi-directional live notification
          const progressCallback = (progress: number, total?: number, msg?: string) => {
            if (session && jsonRpcReq.id !== undefined && jsonRpcReq.id !== null) {
              session.sendProgress(jsonRpcReq.id, progress, total, msg);
            }
          };

          // Dispatch to core MCP Server
          const response = await this.dispatchJsonRpc(jsonRpcReq, progressCallback);

          // If session exists, also push down the SSE event stream
          if (session && response) {
            session.sendEvent("message", response);
          }

          // Return standard HTTP JSON response
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(response ? JSON.stringify(response) : "");
        } catch (err: any) {
          const errorRes: JsonRpcResponse = {
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32603,
              message: err.message || "Internal server error",
              data: String(err.stack || err)
            }
          };
          if (!res.writableEnded) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify(errorRes));
          }
        }
      });

      return;
    }

    // 5. Default 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Not found: ${pathname}` }));
  }

  /**
   * Dispatches JSON-RPC request to EosMcpServer with optional progress callback
   */
  public async dispatchJsonRpc(
    req: JsonRpcRequest,
    onProgress?: (progress: number, total?: number, message?: string) => void
  ): Promise<JsonRpcResponse | null> {
    return this.mcpServer.handleRequest(req, onProgress);
  }

  /**
   * Starts local HTTP listening daemon
   */
  public listen(port = 3333, host = "127.0.0.1"): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleHttpRequest(req, res).catch((err) => {
          if (!res.writableEnded) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      this.server.on("error", (err) => {
        reject(err);
      });

      this.server.listen(port, host, () => {
        resolve(this.server!);
      });
    });
  }

  /**
   * Closes active server and all SSE sessions
   */
  public close(): Promise<void> {
    this.sessionManager.closeAll();
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
        this.server = null;
      } else {
        resolve();
      }
    });
  }
}
