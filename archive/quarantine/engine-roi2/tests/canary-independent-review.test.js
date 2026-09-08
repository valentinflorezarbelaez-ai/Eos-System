import test from 'node:test';
import assert from 'node:assert/strict';
import { IndependentCanaryReviewer } from '../scripts/engine/independent-canary-reviewer.js';

test('D-01: Independent Evidence & Denominator Verification', () => {
  const reviewer = new IndependentCanaryReviewer('CANARY-M001');
  const audit = reviewer.auditEvidencePackage();

  assert.equal(audit.baselineFrozenBeforeExecution, true);
  assert.equal(audit.rawNumerator, 14);
  assert.equal(audit.rawDenominator, 15);
  assert.equal(audit.recalculatedCompletion, '14/15 = 93.3%');
  assert.equal(audit.completionValid, true);
  assert.equal(audit.deltaCalculationsAccurate, true);
  assert.equal(audit.tamperDetected, false);
  assert.equal(audit.verdict, 'EVIDENCE_PACKAGE_INTEGRITY_VERIFIED');
});

test('D-02: Forensic Investigation of Failed Trial 8 (User #15)', () => {
  const reviewer = new IndependentCanaryReviewer('CANARY-M001');
  const userAudit = reviewer.auditFailedUserOutcome();

  assert.equal(userAudit.trial8Forensics.trialId, 8);
  assert.equal(userAudit.trial8Forensics.technicalFailure, false);
  assert.equal(userAudit.trial8Forensics.uxFrictionIdentified, true);
  assert.equal(userAudit.verdict, 'FAILED_USER_ROOT_CAUSE_DIAGNOSED');
});

test('D-03: Incident, Recovery, and Near-Miss Triage', () => {
  const reviewer = new IndependentCanaryReviewer('CANARY-M001');
  const incAudit = reviewer.auditIncidentsAndNearMisses();

  assert.equal(incAudit.incidents.criticalIncidents, 0);
  assert.equal(incAudit.incidents.policyViolations, 0);
  assert.equal(incAudit.incidents.nearMisses.length, 1);
  assert.equal(incAudit.incidents.nearMisses[0].containedInTdd, true);
  assert.equal(incAudit.verdict, 'ZERO_CRITICAL_INCIDENTS_ONE_NEAR_MISS_CONTAINED_IN_TDD');
});

test('D-04: Learning Review & Anti-Premature BKM Promotion Gating', () => {
  const reviewer = new IndependentCanaryReviewer('CANARY-M001');
  const learningAudit = reviewer.auditLearningObservations();

  assert.equal(learningAudit.anyPrematurePromotions, false);
  assert.ok(learningAudit.observations.every(o => o.promotedToCanonicalBkm === false));
  assert.equal(learningAudit.verdict, 'LEARNING_DISCIPLINE_ENFORCED_ZERO_PREMATURE_BKMS');
});

test('D-05: Claim-Scope Boundary & Falsification Enforcement', () => {
  const reviewer = new IndependentCanaryReviewer('CANARY-M001');
  const claimAudit = reviewer.auditClaimScopeBoundaries();

  assert.equal(claimAudit.allClaimsBounded, true);
  assert.equal(claimAudit.verdict, 'ALL_CLAIMS_HONESTLY_BOUNDED');
});

test('Phase D Master Decision Gate Evaluation', () => {
  const reviewer = new IndependentCanaryReviewer('CANARY-M001');
  const review = reviewer.evaluateFullIndependentReview();

  assert.equal(review.finalIndependentVerdict, 'SUPPORTED_WITHIN_TESTED_SCOPE');
  assert.equal(review.recommendationForM002, 'AUTHORIZED_TO_PREPARE_CANARY_M002_REPLICATION');
});
