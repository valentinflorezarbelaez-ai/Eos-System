import http from 'node:http';
import { parse } from 'node:url';
import { MultimodalCreativeEngine, RequireHumanApprovalException, SecurityAlertException, ProviderUnavailableException } from './domain/creativeEngine.js';

export function createMultimodalServer(engine = new MultimodalCreativeEngine()) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    res.setHeader('Content-Type', 'application/json');
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    const readBody = () => new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });

    try {
      // 1. Health
      if (method === 'GET' && pathname === '/api/health') {
        res.statusCode = 200;
        return res.end(JSON.stringify({ status: 'UP', service: 'multimodal-creative-suite-api' }));
      }

      // 2. Telemetry
      if (method === 'GET' && pathname === '/api/telemetry') {
        res.statusCode = 200;
        return res.end(JSON.stringify(engine.getPerformanceDistribution()));
      }

      // 3. Audit Logs
      if (method === 'GET' && pathname === '/api/audit-logs') {
        res.statusCode = 200;
        return res.end(JSON.stringify(engine.auditLogs));
      }

      // 4. Mission Dispatch
      if (method === 'POST' && pathname === '/api/missions/dispatch') {
        const body = await readBody();
        const userToken = req.headers['x-user-token'] || body.user_token;
        const forceHighCost = body.force_high_cost || false;

        const result = await engine.dispatchMission(body.mission_id || `MIS-${Date.now()}`, body.brief, userToken, forceHighCost);
        res.statusCode = 200;
        return res.end(JSON.stringify(result));
      }

      // 5. Render UI
      if (method === 'GET' && (pathname === '/' || pathname === '/ui')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        return res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Multimodal Creative Suite — EOS Phase II Project #2</title>
            <style>
              body { font-family: sans-serif; background: #090d16; color: #f8fafc; padding: 2rem; }
              .card { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #334155; }
              h1 { color: #c084fc; }
              .badge { background: #9333ea; color: white; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; }
            </style>
          </head>
          <body>
            <h1>Multimodal Creative Production Suite <span class="badge">Phase II Operational</span></h1>
            <div class="card">
              <h2>Decoupled Media Generation & Multimodal QA Pipeline</h2>
              <p>Generates Text, Image, Video, and Audio assets with continuous quality evaluation and cost caps.</p>
              <div id="status">API Status: UP</div>
            </div>
          </body>
          </html>
        `);
      }

      // 404
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: 'NOT_FOUND' }));
    } catch (err) {
      if (err instanceof RequireHumanApprovalException) {
        res.statusCode = 402;
        return res.end(JSON.stringify({ error: err.message }));
      }
      if (err instanceof SecurityAlertException) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: err.message }));
      }
      if (err instanceof ProviderUnavailableException) {
        res.statusCode = 503;
        return res.end(JSON.stringify({ error: err.message }));
      }

      res.statusCode = 500;
      return res.end(JSON.stringify({ error: err.message }));
    }
  });

  return server;
}
