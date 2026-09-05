import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  MultiAgentArbitrationEngine,
  COUNCIL_DESKS,
  BALLOT_VERDICTS,
  CONSENSUS_STATUSES
} from '../src/core/governance/multi-agent-arbitration-engine.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

describe('Multi-Agent Consensus & Byzantine Peer Review Arbitration Engine (SPEC-EOS-008)', () => {
  let engine;
  let cli;

  before(() => {
    engine = new MultiAgentArbitrationEngine({ controlPlaneRoot: process.cwd() });
    cli = new MissionCLI({ controlPlaneRoot: process.cwd() });
  });

  test('T1: Specialized desks cast independent ballots according to their mandates', () => {
    // 1. Clean code passes all desks
    const cleanArtifact = {
      content: 'export function add(a, b) { return a + b; }',
      implementerClaim: 'DONE',
      verifierEvidence: { exitCode: 0 }
    };

    const secBallot = engine.castBallot(COUNCIL_DESKS.SECURITY, cleanArtifact);
    assert.equal(secBallot.verdict, BALLOT_VERDICTS.APPROVE);
    assert.equal(secBallot.findings_count, 0);

    // 2. Security Desk detects plain secret and casts VETO
    const dirtyArtifact = {
      content: "const apiKey = 'sk-live-1234567890abcdef';"
    };
    const dirtySecBallot = engine.castBallot(COUNCIL_DESKS.SECURITY, dirtyArtifact);
    assert.equal(dirtySecBallot.verdict, BALLOT_VERDICTS.VETO);
    assert.ok(dirtySecBallot.findings.some(f => f.ruleId === 'SEC-001-PLAIN-CREDENTIAL'));

    // 3. Quality Desk detects silent exception swallow
    const swallowArtifact = {
      content: 'try { doSomething(); } catch (e) {}'
    };
    const qualBallot = engine.castBallot(COUNCIL_DESKS.QUALITY, swallowArtifact);
    assert.equal(qualBallot.verdict, BALLOT_VERDICTS.REJECT);
    assert.ok(qualBallot.findings.some(f => f.ruleId === 'QUAL-001-SILENT-EXCEPTION-SWALLOW'));
  });

  test('T2: Security Desk and Architecture Desk hold absolute binding VETO', () => {
    // Security VETO
    const proposalWithSecret = {
      projectId: 'PRJ-SECURITY-TEST',
      content: "export const APP_SECRET_KEY = 'unhashed_insecure_token_secret_999';",
      implementerClaim: 'DONE',
      verifierEvidence: { exitCode: 0 }
    };

    const consensus = engine.conductCouncilDeliberation(proposalWithSecret);
    assert.equal(consensus.approved, false);
    assert.equal(consensus.status, CONSENSUS_STATUSES.VETO_REJECTED);
    assert.equal(consensus.has_veto, true);
    assert.ok(consensus.veto_reasons.length >= 1);
    assert.ok(consensus.remediation_order);
    assert.equal(consensus.remediation_order.priority, 'P0_IMMEDIATE_BLOCK');

    // Architecture VETO in Domain Core
    const proposalArchBreach = {
      projectId: 'PRJ-ARCH-TEST',
      filePath: 'src/core/domain/user-service.js',
      content: "import express from 'express'; export class UserService {}",
      implementerClaim: 'DONE',
      verifierEvidence: { exitCode: 0 }
    };

    const archConsensus = engine.conductCouncilDeliberation(proposalArchBreach);
    assert.equal(archConsensus.approved, false);
    assert.equal(archConsensus.status, CONSENSUS_STATUSES.VETO_REJECTED);
    assert.equal(archConsensus.has_veto, true);
  });

  test('T3: NASA IV&V Anti-Self-Certification Invariant blocks unverified claims', () => {
    const unverifiedProposal = {
      projectId: 'PRJ-IVV-TEST',
      content: 'export class MathUtils { static multiply(a, b) { return a * b; } }',
      implementerClaim: 'DONE',
      verifierEvidence: null // No independent test run!
    };

    const consensus = engine.conductCouncilDeliberation(unverifiedProposal);
    assert.equal(consensus.approved, false);
    assert.equal(consensus.status, CONSENSUS_STATUSES.REJECTED_MISSING_INDEPENDENT_EVIDENCE);
    assert.ok(consensus.remediation_order);
  });

  test('T4: Unanimous consensus verifies and seals cryptographic consensus envelope', () => {
    const cleanProposal = {
      projectId: 'PRJ-CLEAN-PROPOSAL',
      content: 'export function subtract(a, b) { return a - b; }',
      implementerClaim: 'DONE',
      verifierEvidence: { exitCode: 0, testSuite: 'tests/subtract.test.js' }
    };

    const consensus = engine.conductCouncilDeliberation(cleanProposal);
    assert.equal(consensus.approved, true);
    assert.equal(consensus.status, CONSENSUS_STATUSES.CONSENSUS_VERIFIED);
    assert.equal(consensus.quorum_percentage, 100);
    assert.equal(consensus.has_veto, false);
    assert.ok(consensus.sha256 && consensus.sha256.length === 64);
    assert.equal(consensus.remediation_order, null);

    const report = engine.formatCouncilReport(consensus);
    assert.ok(report.includes('EOS MULTI-AGENT ARBITRATION COUNCIL'));
    assert.ok(report.includes('CONSENSUS_VERIFIED'));
  });

  test('T5: CLI Integration via eos council and eos arbitrate', async () => {
    const res = await cli.run(['council', '--project', 'PRJ-APP-FUERZA', '--json']);
    assert.equal(res.success, true);
    assert.ok(res.data.consensus_id);
    assert.equal(res.data.status, CONSENSUS_STATUSES.CONSENSUS_VERIFIED);

    const reportRes = await cli.run(['council', '--project', 'PRJ-APP-FUERZA']);
    assert.equal(reportRes.success, true);
    assert.ok(reportRes.output.includes('SUPREME COURT VERDICT'));
  });
});
