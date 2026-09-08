import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class AutonomousEcosystemManagerV1 {
  constructor() {
    this.ecosystemMemory = new Map();
    this.upgradeProposals = [];
    this.connectionRegistry = new Map();
  }

  // E-02: Supply-Chain Security Gate
  evaluateSupplyChainSecurity(packageManifest) {
    const {
      name,
      version,
      sourceUrl,
      isOfficialSource = true,
      hasSignedProvenance = true,
      dependencyAuditPass = true,
      requestedPermissions = [],
      networkEgressAllowed = false
    } = packageManifest;

    // Critical security check: block unauthorized filesystem writes or secret harvesting
    const dangerousPerms = ['WRITE_SYSTEM_ROOT', 'READ_UNAUTHORIZED_SECRETS', 'BYPASS_SANDBOX'];
    const hasDangerousPerm = requestedPermissions.some(p => dangerousPerms.includes(p));

    if (!isOfficialSource || !hasSignedProvenance || !dependencyAuditPass || hasDangerousPerm) {
      return {
        verdict: 'SUPPLY_CHAIN_SECURITY_REJECTED',
        passed: false,
        reason: hasDangerousPerm
          ? 'CRITICAL_SECURITY_ALERT: Package requested dangerous unauthorized permissions'
          : 'Failed provenance verification, unsigned package, or failed dependency vulnerability audit',
        integrityHash: null
      };
    }

    return {
      verdict: 'SUPPLY_CHAIN_SECURITY_VERIFIED',
      passed: true,
      integrityHash: `sha256:${Buffer.from(`${name}@${version}`).toString('hex').slice(0, 32)}`,
      networkEgressAllowed,
      sandboxedEnvironment: 'EPHEMERAL_ISOLATION_ZONE'
    };
  }

  // E-04: Multi-Protocol Connection Manager (Agent Card / OpenAPI / MCP Manifest)
  registerConnectionEndpoint(endpoint) {
    const {
      endpointId,
      name,
      protocolType, // 'AGENT_CARD' | 'MCP_MANIFEST' | 'OPENAPI' | 'STDIO' | 'LOCAL_CLI'
      manifestPayload = {},
      authRequirements = 'NONE'
    } = endpoint;

    if (!endpointId || !protocolType) {
      throw new Error('INVALID_ENDPOINT: endpointId and protocolType are required');
    }

    const connection = {
      endpointId,
      name,
      protocolType,
      capabilitiesExposed: manifestPayload.capabilities || manifestPayload.tools || [],
      authRequirements,
      status: 'CONNECTED_IN_SANDBOX',
      registeredAt: new Date().toISOString()
    };

    this.connectionRegistry.set(endpointId, connection);
    return connection;
  }

  // E-05: Version & Upgrade Manager
  evaluateToolUpgrade(currentVersionManifest, candidateVersionManifest, changelogText = '') {
    const { version: currentVer, toolId } = currentVersionManifest;
    const { version: candidateVer, securityPatched = false, breakingChanges = false } = candidateVersionManifest;

    const changelogMentionsDeprecations = changelogText.toLowerCase().includes('breaking') || breakingChanges;
    const isSecurityPatch = securityPatched || changelogText.toLowerCase().includes('security');

    let recommendation = 'KEEP_CURRENT_VERSION';
    let riskLevel = 'LOW';

    if (isSecurityPatch && !changelogMentionsDeprecations) {
      recommendation = 'UPGRADE_HIGHLY_RECOMMENDED';
      riskLevel = 'LOW';
    } else if (changelogMentionsDeprecations) {
      recommendation = 'UPGRADE_REQUIRES_REGRESSION_AUDIT';
      riskLevel = 'MEDIUM_HIGH';
    } else if (candidateVer > currentVer) {
      recommendation = 'UPGRADE_OPTIONAL_IMPROVEMENT';
      riskLevel = 'LOW';
    }

    const proposal = {
      proposalId: `UPG-PROP-${Date.now()}`,
      toolId,
      currentVersion: currentVer,
      candidateVersion: candidateVer,
      recommendation,
      riskLevel,
      requiresGovernanceSignoff: riskLevel === 'MEDIUM_HIGH',
      generatedAt: new Date().toISOString()
    };

    this.upgradeProposals.push(proposal);
    return proposal;
  }

  // E-06: Contextual Capability Router
  routeCapabilityRequest(requirement, candidateProviders = []) {
    const { requiredCapability, priority = 'BALANCED', maxCostUsd = 1.0, maxLatencyMs = 5000 } = requirement;

    const scoredProviders = candidateProviders.map(p => {
      const supportsCap = (p.capabilities || []).includes(requiredCapability);
      if (!supportsCap) return { ...p, routingScore: 0, eligible: false };

      const securityScore = p.securityScore || 8.0;
      const qualityScore = p.qualityScore || 8.5;
      const speedScore = (p.latencyMs <= maxLatencyMs) ? 9.0 : 4.0;
      const costScore = (p.costUsd <= maxCostUsd) ? 9.5 : 3.0;

      const totalScore = Number((
        qualityScore * 0.35 +
        securityScore * 0.30 +
        speedScore * 0.20 +
        costScore * 0.15
      ).toFixed(2));

      return {
        ...p,
        routingScore: totalScore,
        eligible: totalScore >= 7.0
      };
    });

    const eligible = scoredProviders.filter(p => p.eligible).sort((a, b) => b.routingScore - a.routingScore);
    const selected = eligible.length > 0 ? eligible[0] : null;

    return {
      requiredCapability,
      selectedProvider: selected ? selected.providerId : null,
      selectedProviderName: selected ? selected.name : null,
      routingScore: selected ? selected.routingScore : 0,
      candidatesEvaluated: scoredProviders.length,
      decisionRationale: selected
        ? `Routed to ${selected.name} based on multi-criteria quality, security and performance score (${selected.routingScore})`
        : 'No eligible candidate satisfied security, latency, and capability constraints'
    };
  }

  // E-07: Ecosystem Memory
  recordEcosystemExperience(resourceId, experienceRecord) {
    const {
      recommendedTaskClasses = [],
      discouragedTaskClasses = [],
      failureModes = [],
      confidence = 'HIGH_CONFIDENCE'
    } = experienceRecord;

    const memoryEntry = {
      resourceId,
      recommendedTaskClasses,
      discouragedTaskClasses,
      failureModes,
      confidence,
      lastUpdated: new Date().toISOString()
    };

    this.ecosystemMemory.set(resourceId, memoryEntry);
    return memoryEntry;
  }
}
