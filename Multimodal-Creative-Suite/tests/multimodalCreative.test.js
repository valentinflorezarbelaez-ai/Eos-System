import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { MultimodalCreativeEngine, RequireHumanApprovalException, SecurityAlertException, ProviderUnavailableException } from '../src/domain/creativeEngine.js';
import { createMultimodalServer } from '../src/server.js';

test('MultimodalCreative: Full Multimodal Mission Dispatch across 4 Media Modalities', async () => {
  const engine = new MultimodalCreativeEngine();
  const result = await engine.dispatchMission('MIS-TEST-001', 'Create a promotional campaign for luxury hotel resort');

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.artifacts.length, 4);
  assert.ok(result.total_cost_usd <= 1.00);
  assert.ok(result.composite_qa.final_score >= 0.70);
});

test('MultimodalCreative: Provider Fallback on Primary Provider Failure', async () => {
  const engine = new MultimodalCreativeEngine();
  
  // Mark primary text provider as UNAVAILABLE
  const primaryText = engine.providers.get('PRV-TEXT-PRO-01');
  primaryText.status = 'UNAVAILABLE';

  const artifact = await engine.executeCapabilityWithFallback('MIS-FALLBACK-01', 'TEXT_SCRIPTWRITING', 'Write luxury hotel script');
  
  assert.equal(artifact.selected_provider_id, 'PRV-TEXT-FALLBACK-02');
  assert.equal(artifact.is_fallback_provider, true);
});

test('MultimodalCreative: Budget Governance Gate Enforces $1.00 USD Limit', async () => {
  const engine = new MultimodalCreativeEngine();

  // High cost mission without PO secret token MUST throw RequireHumanApprovalException!
  await assert.rejects(
    () => engine.dispatchMission('MIS-BUDGET-01', 'High cost campaign', null, true),
    (err) => err instanceof RequireHumanApprovalException && err.statusCode === 402
  );
});

test('MultimodalCreative: PO Secret Token Authorizes High Cost Missions', async () => {
  const engine = new MultimodalCreativeEngine();
  const result = await engine.dispatchMission('MIS-BUDGET-APPROVED', 'High cost campaign', 'SECRET-PO-TOKEN-APPROVED', true);

  assert.equal(result.status, 'COMPLETED');
  assert.ok(result.total_cost_usd > 1.00);
});

test('MultimodalCreative: Security Input Sanitization Rejects Malicious Payload', async () => {
  const engine = new MultimodalCreativeEngine();

  await assert.rejects(
    () => engine.dispatchMission('MIS-XSS-01', '<script>window.location="http://attacker.com"</script>'),
    (err) => err instanceof SecurityAlertException && err.statusCode === 400
  );
});

test('MultimodalCreative: Non-Binary Multimodal QA Dimension Scoring', () => {
  const engine = new MultimodalCreativeEngine();
  const qa = engine.evaluateMultimodalQA(0.90, 0.80, 0.95, 0.90, 0.85);

  assert.ok(qa.final_score >= 0.70);
  assert.equal(qa.qa_status, 'ACCEPTED');
  assert.equal(qa.dimension_scores.promptAdherence, 0.90);
});

test('MultimodalCreative: REST API Server Integration & HTTP Dispatch Intercept', async () => {
  const server = createMultimodalServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const post = (urlPath, body = {}, headers = {}) => new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(body);
    const req = http.request(`http://localhost:${port}${urlPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });

  const dispatch = await post('/api/missions/dispatch', { mission_id: 'MIS-HTTP-01', brief: 'Promotional video brief' });
  assert.equal(dispatch.status, 200);
  assert.equal(dispatch.data.status, 'COMPLETED');

  server.close();
});

test('MultimodalCreative: CORS restricts origins based on ALLOWED_ORIGINS', async () => {
  process.env.ALLOWED_ORIGINS = 'http://trusted.com';
  const server = createMultimodalServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const getWithOrigin = (origin) => new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${port}/api/health`, {
      method: 'GET',
      headers: { 'Origin': origin }
    }, res => {
      resolve(res.headers['access-control-allow-origin']);
    });
    req.on('error', reject);
    req.end();
  });

  const trustedCors = await getWithOrigin('http://trusted.com');
  assert.equal(trustedCors, 'http://trusted.com');

  const evilCors = await getWithOrigin('http://evil.com');
  assert.equal(evilCors, undefined);

  server.close();
});
