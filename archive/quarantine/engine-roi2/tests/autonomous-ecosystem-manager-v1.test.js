import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousEcosystemManagerV1 } from '../scripts/engine/autonomous-ecosystem-manager-v1.js';

// ====================================================
// AUTONOMOUS ECOSYSTEM MANAGER V1 TESTS
// ====================================================

const manager = new AutonomousEcosystemManagerV1();

test('SupplyChainSecurityGate verifies authentic packages and blocks trojan permissions', () => {
  // Authentic package
  const validManifest = {
    name: '@official/playwright-mcp',
    version: '1.45.0',
    sourceUrl: 'https://github.com/microsoft/playwright',
    isOfficialSource: true,
    hasSignedProvenance: true,
    dependencyAuditPass: true,
    requestedPermissions: ['STDIO_IPC']
  };
  const validEval = manager.evaluateSupplyChainSecurity(validManifest);
  assert.equal(validEval.verdict, 'SUPPLY_CHAIN_SECURITY_VERIFIED');
  assert.equal(validEval.passed, true);
  assert.ok(validEval.integrityHash.startsWith('sha256:'));

  // Trojan package requesting unauthorized root write
  const trojanManifest = {
    name: 'malicious-scraper-tool',
    version: '6.6.6',
    sourceUrl: 'https://untrusted-anon-repo.com',
    isOfficialSource: false,
    requestedPermissions: ['WRITE_SYSTEM_ROOT']
  };
  const trojanEval = manager.evaluateSupplyChainSecurity(trojanManifest);
  assert.equal(trojanEval.verdict, 'SUPPLY_CHAIN_SECURITY_REJECTED');
  assert.equal(trojanEval.passed, false);
});

test('ConnectionManager registers multi-protocol endpoints (A2A Agent Card / OpenAPI / MCP)', () => {
  const agentCardEndpoint = {
    endpointId: 'EP-AISA-AGENT-CARD-001',
    name: 'AIsa Capability Layer Discovery Endpoint',
    protocolType: 'AGENT_CARD',
    manifestPayload: {
      capabilities: ['CAP-WEB-RESEARCH', 'CAP-MARKET-SYNTHESIS', 'CAP-LLM-ROUTING']
    }
  };

  const connection = manager.registerConnectionEndpoint(agentCardEndpoint);
  assert.equal(connection.status, 'CONNECTED_IN_SANDBOX');
  assert.equal(connection.capabilitiesExposed.length, 3);
  assert.ok(manager.connectionRegistry.has('EP-AISA-AGENT-CARD-001'));
});

test('UpgradeManager assesses changelogs and flags high risk on breaking changes', () => {
  const currentVer = { toolId: 'TOL-BROWSER', version: '1.2.0' };
  const safePatch = { version: '1.2.1', securityPatched: true };
  const breakingUpgrade = { version: '2.0.0', breakingChanges: true };

  const safeEval = manager.evaluateToolUpgrade(currentVer, safePatch, 'Bugfix and security patch');
  assert.equal(safeEval.recommendation, 'UPGRADE_HIGHLY_RECOMMENDED');
  assert.equal(safeEval.requiresGovernanceSignoff, false);

  const breakingEval = manager.evaluateToolUpgrade(currentVer, breakingUpgrade, 'Major breaking changes to API');
  assert.equal(breakingEval.recommendation, 'UPGRADE_REQUIRES_REGRESSION_AUDIT');
  assert.equal(breakingEval.requiresGovernanceSignoff, true);
});

test('CapabilityRouter routes contextual requests to optimal candidate based on multi-criteria score', () => {
  const candidates = [
    { providerId: 'PRV-AISA-RESEARCH', name: 'AIsa Web Research Hub', capabilities: ['CAP-WEB-RESEARCH'], qualityScore: 9.6, securityScore: 9.5, latencyMs: 250, costUsd: 0.02 },
    { providerId: 'PRV-LOCAL-FALLBACK', name: 'Local Scraper Mock', capabilities: ['CAP-WEB-RESEARCH'], qualityScore: 7.0, securityScore: 8.0, latencyMs: 50, costUsd: 0.00 }
  ];

  const routeResult = manager.routeCapabilityRequest(
    { requiredCapability: 'CAP-WEB-RESEARCH', maxLatencyMs: 1000, maxCostUsd: 0.05 },
    candidates
  );

  assert.equal(routeResult.selectedProvider, 'PRV-AISA-RESEARCH');
  assert.ok(routeResult.routingScore >= 8.5);
  assert.ok(routeResult.decisionRationale.includes('AIsa Web Research Hub'));
});
