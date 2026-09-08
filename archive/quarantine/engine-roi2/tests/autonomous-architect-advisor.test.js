import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousArchitectAdvisor } from '../scripts/engine/autonomous-architect-advisor.js';

test('Architect Advisor: Evaluates Architecture, Security, Performance, and A11y against elite benchmarks', () => {
  const advisor = new AutonomousArchitectAdvisor();

  // 1. Clean compliant project
  const cleanContext = {
    hasCircularDependencies: false,
    hasExposedSecrets: false,
    hasUnsanitizedInputs: false,
    bundleSizeKb: 15,
    missingAriaLive: false
  };

  const review = advisor.generateHolisticReview(cleanContext);
  assert.equal(review.holisticScore, 100);
  assert.equal(review.verdict, 'PRODUCTION_READY_ELITE');

  // 2. Project with architectural flaws
  const flawedContext = {
    hasCircularDependencies: true,
    hasExposedSecrets: true,
    bundleSizeKb: 120,
    missingAriaLive: true
  };

  const flawedReview = advisor.generateHolisticReview(flawedContext);
  assert.ok(flawedReview.holisticScore < 80);
  assert.equal(flawedReview.verdict, 'NEEDS_GOVERNED_REMEDIATION');
  assert.ok(flawedReview.domainBreakdown.some(d => d.recommendations.length > 0));
});
