// =========================================================================
// EOS — CANARY-REAL-001: COHORT SERVER & TELEMETRY SINK TEST SUITE
// Tests: HTTP static serving, /api/telemetry ingestion, stats aggregation, kill-switch
// =========================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryCohortServer } from '../scripts/engine/canary-real-001-cohort-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to make HTTP requests in test
function requestAsync(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

test('SRV-01: CanaryCohortServer starts, passes health check, and serves index.html', async () => {
  const server = new CanaryCohortServer(3891);
  await server.start();

  try {
    // 1. Health check
    const health = await requestAsync('http://localhost:3891/health');
    assert.equal(health.statusCode, 200);
    const healthJson = JSON.parse(health.body);
    assert.equal(healthJson.status, 'HEALTHY');

    // 2. Static HTML serving
    const htmlRes = await requestAsync('http://localhost:3891/');
    assert.equal(htmlRes.statusCode, 200);
    assert.ok(htmlRes.body.includes('Alexander Rodríguez Remodelaciones'));
    assert.ok(htmlRes.headers['content-type'].includes('text/html'));
  } finally {
    await server.stop();
  }
});

test('SRV-02: /api/telemetry ingests events into AppendOnlyTelemetrySink and computes live stats', async () => {
  const testLogFile = path.join(rootDir, 'docs/evidence/raw_telemetry/test_temp_cohort.jsonl');
  if (fs.existsSync(testLogFile)) fs.unlinkSync(testLogFile);

  const server = new CanaryCohortServer({ port: 3892, logFilePath: testLogFile });
  await server.start();

  try {
    // Dispatch test cohort events
    const sampleEvent = {
      event_id: 'EVT-TEST-001',
      mission_id: 'CANARY-REAL-001',
      anonymous_session_id: 'sess_user_01',
      event_type: 'page_view',
      step: 0,
      metadata_minima: { url: '/' }
    };

    const postRes = await requestAsync('http://localhost:3892/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify(sampleEvent));

    assert.equal(postRes.statusCode, 201);
    const postJson = JSON.parse(postRes.body);
    assert.equal(postJson.status, 'INGESTED');
    assert.ok(postJson.blockHash.length === 64);

    // Ingest qualification started + completed
    await requestAsync('http://localhost:3892/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      event_id: 'EVT-TEST-002',
      anonymous_session_id: 'sess_user_01',
      event_type: 'qualification_started',
      step: 1
    }));

    await requestAsync('http://localhost:3892/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      event_id: 'EVT-TEST-003',
      anonymous_session_id: 'sess_user_01',
      event_type: 'qualified_lead_created',
      step: 3,
      metadata_minima: { projectType: 'CASA_PARCELACION', location: 'RIONEGRO_LLANOGRANDE' }
    }));

    // Query stats endpoint
    const statsRes = await requestAsync('http://localhost:3892/api/telemetry/stats');
    assert.equal(statsRes.statusCode, 200);
    const stats = JSON.parse(statsRes.body);

    assert.equal(stats.mission_id, 'CANARY-REAL-001');
    assert.equal(stats.cohort_id, 'COHORT-R1');
    assert.equal(stats.total_events_recorded, 3);
    assert.equal(stats.user_plane.page_views, 1);
    assert.equal(stats.user_plane.qualification_started, 1);
    assert.equal(stats.business_plane.qualified_leads, 1);
    assert.equal(stats.chain_integrity, true);
  } finally {
    await server.stop();
    if (fs.existsSync(testLogFile)) fs.unlinkSync(testLogFile);
  }
});

test('SRV-03: Kill-switch rejects unauthorized callers and freezes traffic when authorized', async () => {
  const testLogFile3 = path.join(rootDir, 'docs/evidence/raw_telemetry/test_temp_cohort3.jsonl');
  if (fs.existsSync(testLogFile3)) fs.unlinkSync(testLogFile3);

  const server = new CanaryCohortServer({ port: 3893, adminToken: 'secret_test_token_123', logFilePath: testLogFile3 });
  await server.start();

  try {
    // 1. Unauthorized attempt without token -> 401
    const unauthRes = await requestAsync('http://localhost:3893/api/admin/kill-switch', { method: 'POST' });
    assert.equal(unauthRes.statusCode, 401);
    assert.equal(JSON.parse(unauthRes.body).error, 'UNAUTHORIZED_ADMIN_ACCESS');

    // 2. Authorized attempt with valid admin token -> 200 & activates kill-switch
    const authToggle = await requestAsync('http://localhost:3893/api/admin/kill-switch', {
      method: 'POST',
      headers: { 'x-eos-admin-token': 'secret_test_token_123' }
    });
    assert.equal(authToggle.statusCode, 200);
    assert.equal(JSON.parse(authToggle.body).killSwitchActive, true);

    // 3. Normal traffic is now blocked by circuit breaker
    const pageRes = await requestAsync('http://localhost:3893/');
    assert.equal(pageRes.statusCode, 503);
    assert.equal(JSON.parse(pageRes.body).error, 'CANARY_KILL_SWITCH_ACTIVE');

    // 4. Authorized deactivation
    const deauthToggle = await requestAsync('http://localhost:3893/api/admin/kill-switch', {
      method: 'POST',
      headers: { 'x-eos-admin-token': 'secret_test_token_123' }
    });
    assert.equal(deauthToggle.statusCode, 200);
    assert.equal(JSON.parse(deauthToggle.body).killSwitchActive, false);

    // 5. Traffic flows again
    const pageRes2 = await requestAsync('http://localhost:3893/');
    assert.equal(pageRes2.statusCode, 200);
  } finally {
    await server.stop();
    if (fs.existsSync(testLogFile3)) fs.unlinkSync(testLogFile3);
  }
});
