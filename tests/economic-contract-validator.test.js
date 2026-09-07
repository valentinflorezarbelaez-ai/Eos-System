import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { EconomicContractValidator, REVERSIBILITY_TIERS, DEFAULT_ECONOMIC_LIMITS } from '../src/core/formal/economic-contract-validator.js';
import { ContractEvidenceSealer } from '../src/core/formal/contract-evidence-sealer.js';
import { MissionCLI } from '../src/cli/mission-cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('EconomicContractValidator (Quantitative Economic & Operational Risk Invariants)', () => {
  let tempDir;
  let tempSpecsDir;
  let tempEvidenceDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-econ-test-'));
    tempSpecsDir = path.join(tempDir, 'docs', 'specs');
    tempEvidenceDir = path.join(tempDir, 'docs', 'evidence');
    fs.mkdirSync(tempSpecsDir, { recursive: true });
    fs.mkdirSync(tempEvidenceDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Contract Extraction & Markdown Parsing', () => {
    it('should fall back to safe default limits when spec has no explicit economic declarations', () => {
      const validator = new EconomicContractValidator();
      const contract = validator.extractEconomicContract('# SPEC-SAMPLE\nWHEN input THEN output.');
      assert.equal(contract.max_tokens, DEFAULT_ECONOMIC_LIMITS.max_tokens);
      assert.equal(contract.max_cost_usd, DEFAULT_ECONOMIC_LIMITS.max_cost_usd);
      assert.equal(contract.max_latency_ms, DEFAULT_ECONOMIC_LIMITS.max_latency_ms);
      assert.equal(contract.source, 'SPEC_EXTRACTED');
    });

    it('should extract quantitative economic limits from Markdown declarations', () => {
      const specContent = `
# SPEC-FINANCIAL-001: High-Value Settlement Engine
* **Max Tokens:** \`20,000\`
* **Cost Budget USD:** \`$0.08\`
* **SLA Latency:** \`150ms\`
* **Max Memory:** \`128MB\`
* **Max Blast Radius:** \`3\`
* **Reversibility Tier:** \`COMPENSATING_TX\`
* **Max Financial Exposure:** \`$50,000\`
`;
      const validator = new EconomicContractValidator();
      const contract = validator.extractEconomicContract(specContent);

      assert.equal(contract.max_tokens, 20000);
      assert.equal(contract.max_cost_usd, 0.08);
      assert.equal(contract.max_latency_ms, 150);
      assert.equal(contract.max_memory_mb, 128);
      assert.equal(contract.max_blast_radius, 3);
      assert.equal(contract.reversibility_tier, 'COMPENSATING_TX');
      assert.equal(contract.max_financial_exposure_usd, 50000);
    });
  });

  describe('Telemetry Evaluation & Circuit Breaker Logic', () => {
    it('should certify compliance with high efficiency score when telemetry is within budget', () => {
      const validator = new EconomicContractValidator();
      const contract = {
        max_tokens: 30000,
        max_cost_usd: 0.10,
        max_latency_ms: 500
      };
      const telemetry = {
        tokens_consumed: 12000,
        cost_usd: 0.035,
        latency_ms: 180,
        memory_mb: 85,
        blast_radius: 2
      };

      const result = validator.evaluateTelemetry(contract, telemetry);
      assert.equal(result.compliant, true);
      assert.equal(result.circuit_breaker_tripped, false);
      assert.equal(result.verdict, 'ECONOMIC_CONTRACT_SATISFIED');
      assert.equal(result.violations_count, 0);
      assert.ok(result.efficiency_score > 70, 'Efficiency score must reflect preserved margins');
    });

    it('should trip circuit breaker when token budget is exceeded', () => {
      const validator = new EconomicContractValidator();
      const contract = { max_tokens: 15000 };
      const telemetry = { tokens_consumed: 22500 };

      const result = validator.evaluateTelemetry(contract, telemetry);
      assert.equal(result.compliant, false);
      assert.equal(result.circuit_breaker_tripped, true);
      assert.equal(result.verdict, 'CIRCUIT_BREAKER_TRIPPED');
      assert.equal(result.violations_count, 1);
      assert.equal(result.violations[0].metric, 'tokens_consumed');
      assert.equal(result.violations[0].severity, 'BLOCKING');
    });

    it('should trip circuit breaker when financial cost exceeds budget ceiling', () => {
      const validator = new EconomicContractValidator();
      const contract = { max_cost_usd: 0.25 };
      const telemetry = { cost_usd: 0.89 };

      const result = validator.evaluateTelemetry(contract, telemetry);
      assert.equal(result.compliant, false);
      assert.equal(result.circuit_breaker_tripped, true);
      assert.equal(result.violations[0].metric, 'cost_usd');
    });

    it('should trip circuit breaker when operational latency violates SLA threshold', () => {
      const validator = new EconomicContractValidator();
      const contract = { max_latency_ms: 200 };
      const telemetry = { latency_ms: 850 };

      const result = validator.evaluateTelemetry(contract, telemetry);
      assert.equal(result.compliant, false);
      assert.equal(result.circuit_breaker_tripped, true);
      assert.equal(result.violations[0].metric, 'latency_ms');
    });

    it('should enforce human authorization gate for IRREVERSIBLE mutations', () => {
      const validator = new EconomicContractValidator();
      const contract = { reversibility_tier: REVERSIBILITY_TIERS.IRREVERSIBLE };

      // Case 1: Unauthorized irreversible mutation -> FAIL
      const unauthResult = validator.evaluateTelemetry(contract, { human_authorized: false });
      assert.equal(unauthResult.compliant, false);
      assert.equal(unauthResult.circuit_breaker_tripped, true);
      assert.match(unauthResult.violations[0].message, /human authorization/i);

      // Case 2: Authorized irreversible mutation -> PASS
      const authResult = validator.evaluateTelemetry(contract, { human_authorized: true });
      assert.equal(authResult.compliant, true);
      assert.equal(authResult.circuit_breaker_tripped, false);
    });
  });

  describe('Integration with ContractEvidenceSealer', () => {
    it('should include economic_provenance in evidence receipt and grant VERIFIED when within bounds', () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-ECON-VERIFIED.md');
      fs.writeFileSync(
        specFile,
        '# SPEC-ECON-VERIFIED\nWHEN batch is received, THE SYSTEM SHALL process in parallel.\n* **Max Tokens:** `40,000`\n* **Max Cost:** `$0.15`',
        'utf8'
      );

      const sealer = new ContractEvidenceSealer({
        controlPlaneRoot: tempDir,
        specsDir: tempSpecsDir,
        evidenceDir: tempEvidenceDir
      });

      const result = sealer.sealContractEvidence({
        specId: 'SPEC-ECON-VERIFIED',
        taskId: 'TASK-ECON-01',
        projectId: 'PRJ-ECON-TEST',
        exitCode: 0,
        telemetry: {
          tokens_consumed: 15000,
          cost_usd: 0.045,
          latency_ms: 210
        }
      });

      assert.equal(result.success, true);
      assert.equal(result.record.status, 'VERIFIED');
      assert.equal(result.record.result, 'PASS');
      assert.ok(result.record.economic_provenance);
      assert.equal(result.record.economic_provenance.verdict, 'ECONOMIC_CONTRACT_SATISFIED');
    });

    it('should deny VERIFIED status and record ECONOMIC_VIOLATION when telemetry trips circuit breaker', () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-ECON-BREACH.md');
      fs.writeFileSync(
        specFile,
        '# SPEC-ECON-BREACH\nWHEN queried, THE SYSTEM SHALL answer.\n* **Max Cost:** `$0.10`',
        'utf8'
      );

      const sealer = new ContractEvidenceSealer({
        controlPlaneRoot: tempDir,
        specsDir: tempSpecsDir,
        evidenceDir: tempEvidenceDir
      });

      const result = sealer.sealContractEvidence({
        specId: 'SPEC-ECON-BREACH',
        exitCode: 0, // Command exited 0, but economic contract breached!
        telemetry: {
          cost_usd: 1.45 // Exceeds $0.10 budget!
        }
      });

      assert.equal(result.success, false);
      assert.equal(result.record.status, 'NOT VERIFIED');
      assert.equal(result.record.result, 'ECONOMIC_VIOLATION');
      assert.equal(result.record.confidence, 'LOW');
      assert.match(result.record.actual, /Economic circuit breaker tripped/);
    });
  });

  describe('MissionCLI (eos econ and eos seal economic integration)', () => {
    it('should evaluate economic contract from CLI with --json output', async () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-CLI-ECON.md');
      fs.writeFileSync(
        specFile,
        '# SPEC-CLI-ECON\nWHEN called, THE SYSTEM SHALL validate.\n* **Max Tokens:** `25,000`',
        'utf8'
      );

      const cli = new MissionCLI({ controlPlaneRoot: tempDir });
      const res = await cli.run([
        'econ',
        '--spec', 'SPEC-CLI-ECON',
        '--tokens', '8000',
        '--cost', '0.02',
        '--latency', '110',
        '--json'
      ]);

      assert.equal(res.success, true);
      assert.ok(res.data);
      assert.equal(res.data.verdict, 'ECONOMIC_CONTRACT_SATISFIED');
      assert.equal(res.data.circuit_breaker_tripped, false);
    });

    it('should render structured text audit receipt on terminal invocation', async () => {
      const specFile = path.join(tempSpecsDir, 'SPEC-CLI-TEXT.md');
      fs.writeFileSync(
        specFile,
        '# SPEC-CLI-TEXT\nWHEN called, THE SYSTEM SHALL output receipt.',
        'utf8'
      );

      const cli = new MissionCLI({ controlPlaneRoot: tempDir });
      const res = await cli.run([
        'econ',
        '--spec', 'SPEC-CLI-TEXT',
        '--tokens', '15000'
      ]);

      assert.equal(res.success, true);
      assert.match(res.output, /EOS ECONOMIC & RISK CONTRACT AUDIT RECEIPT/);
      assert.match(res.output, /Verdict:\s+ECONOMIC_CONTRACT_SATISFIED/);
      assert.match(res.output, /Efficiency Score:/);
    });
  });
});
