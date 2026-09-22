import http from 'node:http';
import { parse } from 'node:url';
import { LuxeRegistryDomainEngine, TenantIsolationViolation, DoubleBookingException, SecurityValidationException } from './domain/registryEngine.js';

export function createLuxeServer(engine = new LuxeRegistryDomainEngine()) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    res.setHeader('Content-Type', 'application/json');

    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
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
        return res.end(JSON.stringify({ status: 'UP', service: 'luxe-registry-api' }));
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

      // 4. Register Tenant
      if (method === 'POST' && pathname === '/api/tenants') {
        const body = await readBody();
        const tenant = engine.registerTenant(body.tenant_id, body.name, body.host_email);
        res.statusCode = 201;
        return res.end(JSON.stringify(tenant));
      }

      // 5. Add Item
      if (method === 'POST' && pathname === '/api/items') {
        const body = await readBody();
        const item = engine.addGiftItem(body.tenant_id, body.item_id, body.title, body.price, body.is_goal_contribution);
        res.statusCode = 201;
        return res.end(JSON.stringify(item));
      }

      // 6. Get Tenant Items (Enforces Scoping)
      if (method === 'GET' && pathname.startsWith('/api/tenants/') && pathname.endsWith('/items')) {
        const parts = pathname.split('/');
        const tenantId = parts[3];
        const requestingTenantId = req.headers['x-tenant-id'] || tenantId;

        const items = engine.getItemsByTenant(tenantId, requestingTenantId);
        res.statusCode = 200;
        return res.end(JSON.stringify(items));
      }

      // 7. Reserve Item
      if (method === 'POST' && pathname === '/api/reserve') {
        const body = await readBody();
        const requestingTenantId = req.headers['x-tenant-id'] || body.tenant_id;
        const reservation = await engine.reserveItem(body.tenant_id, body.item_id, body.guest_id, requestingTenantId);
        res.statusCode = 200;
        return res.end(JSON.stringify(reservation));
      }

      // 8. Record Contribution
      if (method === 'POST' && pathname === '/api/contribute') {
        const body = await readBody();
        const requestingTenantId = req.headers['x-tenant-id'] || body.tenant_id;
        const entry = engine.recordContribution(body.tenant_id, body.item_id, body.guest_id, body.amount, body.payment_tx_id, requestingTenantId);
        res.statusCode = 200;
        return res.end(JSON.stringify(entry));
      }

      // 9. Render UI
      if (method === 'GET' && (pathname === '/' || pathname === '/ui')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        return res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Luxe Registry — Premium Gift List Platform</title>
            <style>
              body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
              .card { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #334155; }
              h1 { color: #38bdf8; }
              .badge { background: #0284c7; color: white; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; }
            </style>
          </head>
          <body>
            <h1>Luxe Registry <span class="badge">Phase II Operational</span></h1>
            <div class="card">
              <h2>Multi-Tenant Event Registries</h2>
              <p>Welcome to Luxe Registry. Premium gift lists with strict tenant isolation and concurrent reservation locks.</p>
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
      if (err instanceof TenantIsolationViolation) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: err.message }));
      }
      if (err instanceof DoubleBookingException) {
        res.statusCode = 409;
        return res.end(JSON.stringify({ error: err.message }));
      }
      if (err instanceof SecurityValidationException) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: err.message }));
      }

      res.statusCode = 500;
      return res.end(JSON.stringify({ error: err.message }));
    }
  });

  return server;
}
