// =========================================================================
// EOS — CANARY-REAL-001: LIVE COHORT TELEMETRY SERVER & APPEND-ONLY SINK
// Serves Canary-Real-001 Landing Page & Ingests Real Cohort Telemetry
// Conforms to: PROTO-CANARY-REAL-001-TELEMETRY-001 & AppendOnlyTelemetrySink
// =========================================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { AppendOnlyTelemetrySink } from './independent-telemetry-sink.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const staticDir = path.join(rootDir, 'EOS-Lab/Canary-Real-001/src');
const rawTelemetryDir = path.join(rootDir, 'docs/evidence/raw_telemetry');
const rawLogFile = path.join(rawTelemetryDir, 'CANARY_REAL_001_COHORT_R1.jsonl');

export class CanaryCohortServer {
  constructor(portOrOptions = 3456) {
    if (typeof portOrOptions === 'object') {
      this.port = portOrOptions.port || 3456;
      this.adminToken = portOrOptions.adminToken || process.env.EOS_ADMIN_TOKEN || 'eos_admin_secret_canary_001';
      this.logFile = portOrOptions.logFilePath || rawLogFile;
    } else {
      this.port = portOrOptions;
      this.adminToken = process.env.EOS_ADMIN_TOKEN || 'eos_admin_secret_canary_001';
      this.logFile = rawLogFile;
    }
    this.sink = new AppendOnlyTelemetrySink();
    this.killSwitchActive = false;
    this.server = null;

    const targetDir = path.dirname(this.logFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  // Aggregate Real Live Cohort Statistics (User Plane + Business Plane)
  computeCohortSummary() {
    const events = this.sink.chain;
    const sessions = new Set();
    let pageViews = 0;
    let started = 0;
    let step2Reached = 0;
    let step3Reached = 0;
    let estimatesViewed = 0;
    let ctaClicks = 0;
    let qualifiedLeads = 0;
    let outOfCoverageCount = 0;
    let abandonments = 0;
    const ttActionList = [];

    for (const evt of events) {
      const sessId = evt.anonymous_session_id || evt.input?.anonymous_session_id;
      if (sessId) sessions.add(sessId);

      const type = evt.eventType || evt.event_type;
      const meta = evt.input || evt.metadata_minima || {};

      if (type === 'page_view') pageViews++;
      if (type === 'qualification_started') started++;
      if (type === 'qualification_step_completed') {
        const step = evt.step || meta.step;
        if (step === 2) step2Reached++;
        if (step === 3) step3Reached++;
      }
      if (type === 'qualification_step_abandoned') abandonments++;
      if (type === 'out_of_coverage') outOfCoverageCount++;
      if (type === 'estimate_viewed') estimatesViewed++;
      if (type === 'whatsapp_cta_clicked') {
        ctaClicks++;
        if (meta.elapsedSec) ttActionList.push(meta.elapsedSec);
      }
      if (type === 'qualified_lead_created') qualifiedLeads++;
    }

    const totalSessions = Math.max(sessions.size, pageViews);
    const medianTta = ttActionList.length > 0
      ? ttActionList.sort((a, b) => a - b)[Math.floor(ttActionList.length / 2)]
      : null;

    const quoteConversionRate = totalSessions > 0
      ? Number(((qualifiedLeads / totalSessions) * 100).toFixed(1))
      : 0;

    const abandonmentRate = started > 0
      ? Number(((abandonments / started) * 100).toFixed(1))
      : 0;

    const noiseRate = (qualifiedLeads + outOfCoverageCount) > 0
      ? Number(((outOfCoverageCount / (qualifiedLeads + outOfCoverageCount)) * 100).toFixed(1))
      : 0;

    return {
      mission_id: 'CANARY-REAL-001',
      cohort_id: 'COHORT-R1',
      total_events_recorded: events.length,
      total_unique_sessions: totalSessions,
      user_plane: {
        page_views: pageViews,
        qualification_started: started,
        step_2_reached: step2Reached,
        step_3_reached: step3Reached,
        estimates_viewed: estimatesViewed,
        whatsapp_cta_clicks: ctaClicks,
        abandonment_count: abandonments,
        observed_abandonment_rate: `${abandonmentRate}%`,
        target_abandonment_rate: '<= 25.0%',
        median_time_to_action_sec: medianTta,
        target_time_to_action_sec: '<= 45.0s'
      },
      business_plane: {
        qualified_leads: qualifiedLeads,
        out_of_coverage_inquiries: outOfCoverageCount,
        observed_qualified_quote_rate: `${quoteConversionRate}%`,
        target_qualified_quote_rate: '>= 22.0%',
        observed_unqualified_noise_rate: `${noiseRate}%`,
        target_unqualified_noise_rate: '<= 20.0%'
      },
      chain_integrity: this.sink.verifyChainIntegrity(),
      kill_switch_active: this.killSwitchActive
    };
  }

  // Handle incoming HTTP Requests
  handleRequest(req, res) {
    // CORS headers for local/staging cohort
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Kill switch protection
    if (this.killSwitchActive && pathname !== '/health' && pathname !== '/api/admin/kill-switch') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'CANARY_KILL_SWITCH_ACTIVE', status: 'SERVICE_TEMPORARILY_SUSPENDED' }));
      return;
    }

    // Health Endpoint
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'HEALTHY', mission: 'CANARY-REAL-001', killSwitch: this.killSwitchActive }));
      return;
    }

    // Telemetry Ingestion Endpoint
    if (req.method === 'POST' && pathname === '/api/telemetry') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const event = JSON.parse(body);
          const chained = this.sink.recordEvent({
            eventId: event.event_id,
            missionId: event.mission_id || 'CANARY-REAL-001',
            eventType: event.event_type,
            step: event.step,
            anonymous_session_id: event.anonymous_session_id,
            input: event.metadata_minima || {}
          });

          // Append to persistent log file
          fs.appendFileSync(this.logFile, JSON.stringify(chained) + '\n', 'utf8');

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'INGESTED', blockHash: chained.blockHash }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'INVALID_JSON_PAYLOAD', message: err.message }));
        }
      });
      return;
    }

    // Telemetry Stats Endpoint
    if (req.method === 'GET' && pathname === '/api/telemetry/stats') {
      const summary = this.computeCohortSummary();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summary, null, 2));
      return;
    }

    // Admin Kill Switch Endpoint (Protected by Admin Authorization Barrier)
    if (req.method === 'POST' && pathname === '/api/admin/kill-switch') {
      const providedToken = req.headers['x-eos-admin-token'] || parsedUrl.searchParams.get('token');
      if (!providedToken || providedToken !== this.adminToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'UNAUTHORIZED_ADMIN_ACCESS', message: 'Valid x-eos-admin-token header required' }));
        return;
      }

      this.killSwitchActive = !this.killSwitchActive;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ killSwitchActive: this.killSwitchActive, authorizedBy: 'ADMIN_KEY_VERIFIED' }));
      return;
    }

    // Static File Serving
    let filePath = path.join(staticDir, pathname === '/' ? 'index.html' : pathname);

    if (!filePath.startsWith(staticDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };

      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => {
        resolve(this.port);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
