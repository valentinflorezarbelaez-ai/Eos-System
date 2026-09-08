import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export class ProductDecisionEngine {
  constructor() {
    this.decisionLevels = ['MUST_HAVE', 'HIGH_VALUE', 'EXPERIMENT', 'NICE_TO_HAVE', 'NOT_JUSTIFIED'];
  }

  evaluateFeatureProposal(proposal) {
    const {
      featureId,
      name,
      userNeed,
      evidenceRef,
      expectedOutcome,
      acceptanceCriteria = [],
      securityOrComplianceRequired = false
    } = proposal;

    if (!featureId || !name) {
      throw new Error('INVALID_PROPOSAL: featureId and name are strictly required');
    }

    // Rule: Reject features with no demonstrated user value unless required for security/compliance
    if (!evidenceRef && !securityOrComplianceRequired) {
      return {
        featureId,
        name,
        verdict: 'NOT_JUSTIFIED',
        decisionReason: 'REJECTED: Feature lacks supporting user evidence and is not required for security/compliance.',
        authorizedForImplementation: false
      };
    }

    let verdict = 'HIGH_VALUE';
    if (securityOrComplianceRequired) {
      verdict = 'MUST_HAVE';
    } else if (proposal.measuredEffect && proposal.measuredEffect.trustDelta >= 0.5) {
      verdict = 'MUST_HAVE';
    } else if (proposal.status === 'EXPLORATORY') {
      verdict = 'EXPERIMENT';
    }

    return {
      featureId,
      name,
      userNeed,
      evidenceRef: evidenceRef || 'SECURITY_GOVERNANCE_MANDATE',
      expectedOutcome,
      acceptanceCriteria,
      verdict,
      authorizedForImplementation: verdict === 'MUST_HAVE' || verdict === 'HIGH_VALUE'
    };
  }

  generateRequirementsDocument(proposals, outputPath) {
    const evaluated = proposals.map(p => this.evaluateFeatureProposal(p));
    const authorized = evaluated.filter(e => e.authorizedForImplementation);

    const doc = {
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      governanceStatus: 'GOVERNED_BY_EVIDENCE',
      totalProposed: proposals.length,
      totalAuthorized: authorized.length,
      requirements: authorized.map((req, idx) => ({
        reqId: `REQ-${String(idx + 1).padStart(3, '0')}`,
        featureId: req.featureId,
        name: req.name,
        priority: req.verdict,
        userNeed: req.userNeed,
        evidence: req.evidenceRef,
        expectedOutcome: req.expectedOutcome,
        acceptanceCriteria: req.acceptanceCriteria,
        rollbackPlan: 'Component level revert via versioned Git commit'
      }))
    };

    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(doc, null, 2));
    }

    return doc;
  }
}
