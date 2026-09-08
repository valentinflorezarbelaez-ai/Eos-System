import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductDecisionEngine } from '../scripts/engine/product-decision-engine.js';

// ====================================================
// PRODUCT DECISION ENGINE & REQUIREMENTS TESTS
// ====================================================

const engine = new ProductDecisionEngine();

test('ProductDecisionEngine authorizes feature with verified evidence', () => {
  const proposal = {
    featureId: 'FEAT-LEGAL-FOOTER',
    name: 'Verified Legal & Contact Footer',
    userNeed: 'Users need to verify NIT and Chamber of Commerce registration',
    evidenceRef: 'VAL_EVD_001_FUNDACION_USER_PILOT',
    measuredEffect: { trustDelta: 0.9 },
    expectedOutcome: 'Increase trust score from 7.1 to >= 8.5',
    acceptanceCriteria: ['NIT displayed', 'Address displayed', 'One-click copy active']
  };

  const evalResult = engine.evaluateFeatureProposal(proposal);
  assert.equal(evalResult.verdict, 'MUST_HAVE');
  assert.equal(evalResult.authorizedForImplementation, true);
});

test('ProductDecisionEngine REJECTS ornamental feature without user evidence', () => {
  const proposal = {
    featureId: 'FEAT-3D-ANIMATED-SPINNER',
    name: '3D Floating Interactive Logo',
    userNeed: 'Make site look futuristic',
    evidenceRef: null,
    securityOrComplianceRequired: false,
    expectedOutcome: 'Visually impressive'
  };

  const evalResult = engine.evaluateFeatureProposal(proposal);
  assert.equal(evalResult.verdict, 'NOT_JUSTIFIED');
  assert.equal(evalResult.authorizedForImplementation, false);
  assert.ok(evalResult.decisionReason.includes('lacks supporting user evidence'));
});

test('ProductDecisionEngine generates structured requirements doc filtering unverified features', () => {
  const proposals = [
    {
      featureId: 'FEAT-LEGAL',
      name: 'Legal Footer',
      userNeed: 'Verify entity',
      evidenceRef: 'VAL_EVD_001',
      expectedOutcome: 'Trust up',
      acceptanceCriteria: ['NIT visible']
    },
    {
      featureId: 'FEAT-FLUFF',
      name: 'Parallax Particle Background',
      userNeed: 'Aesthetic novelty',
      evidenceRef: null
    }
  ];

  const doc = engine.generateRequirementsDocument(proposals);
  assert.equal(doc.totalProposed, 2);
  assert.equal(doc.totalAuthorized, 1);
  assert.equal(doc.requirements[0].featureId, 'FEAT-LEGAL');
});
