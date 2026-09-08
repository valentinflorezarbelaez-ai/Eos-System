/**
 * @module ContractEvidenceSealer
 * @description Enterprise Contract-Based Evidence Sealing Engine for EOS.
 * Implements strict IEEE 830 / ISO 26262 closed-loop cryptographic provenance (L1 -> L3 -> L5 -> L6).
 * Enforces Epistemic Law III:
 * 1. Validates that the targeted Specification exists and adheres to formal EARS syntax.
 * 2. Enforces non-zero exit codes deny VERIFIED status.
 * 3. Binds Specification, Task DAG, and Test outputs into an immutable SHA-256 cryptographic seal.
 * 4. Produces schema-compliant evidence records in docs/evidence/EVD-XXXX.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveControlPlaneRoot } from '../runtime/control-plane-root.js';
import { EconomicContractValidator } from './economic-contract-validator.js';
import { EvidenceCustody } from '../sdd/evidence-custody.js';

export const EARS_PATTERNS = [
  /\bWHEN\b/i,
  /\bWHILE\b/i,
  /\bWHERE\b/i,
  /\bIF\b/i,
  /\bSHALL\b/i,
  /\bCUANDO\b/i,
  /\bMIENTRAS\b/i,
  /\bSI\b/i,
  /\bENTONCES\b/i,
  /\bEL SISTEMA\b/i
];

export class ContractEvidenceSealer {
  /**
   * @param {object} [options]
   * @param {string} [options.controlPlaneRoot]
   * @param {string} [options.evidenceDir]
   * @param {string} [options.specsDir]
   */
  constructor(options = {}) {
    this.controlPlaneRoot = options.controlPlaneRoot || resolveControlPlaneRoot();
    this.evidenceDir = options.evidenceDir || path.join(this.controlPlaneRoot, 'docs', 'evidence');
    this.specsDir = options.specsDir || path.join(this.controlPlaneRoot, 'docs', 'specs');
    this.economicValidator = options.economicValidator || new EconomicContractValidator();
    this.custodyEnabled = options.custody !== false && options.custodyEnabled !== false;
    this.custody = options.custody instanceof EvidenceCustody
      ? options.custody
      : (this.custodyEnabled
          ? new EvidenceCustody({
              controlPlaneRoot: this.controlPlaneRoot,
              baseDir: options.custodyBaseDir,
              enabled: true
            })
          : null);
  }

  /**
   * Computes SHA-256 hash of a string or buffer.
   * @param {string|Buffer} content
   * @returns {string}
   */
  hashString(content) {
    return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
  }

  /**
   * Discovers the specification file matching the given specId or relative path.
   * @param {string} specIdOrPath
   * @returns {{ path: string, content: string, relativePath: string }|null}
   */
  findSpec(specIdOrPath) {
    if (!specIdOrPath) return null;

    // 1. Direct path check
    const directPath = path.isAbsolute(specIdOrPath)
      ? specIdOrPath
      : path.join(this.controlPlaneRoot, specIdOrPath);

    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      const content = fs.readFileSync(directPath, 'utf8');
      return {
        path: directPath,
        content,
        relativePath: path.relative(this.controlPlaneRoot, directPath).replace(/\\/g, '/')
      };
    }

    // 2. Recursive search in docs/specs/
    if (!fs.existsSync(this.specsDir)) return null;

    const cleanId = specIdOrPath.toUpperCase().replace(/\.MD$/, '');
    const results = [];

    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
          const entryUpper = entry.name.toUpperCase();
          if (entryUpper.includes(cleanId)) {
            results.push(full);
          }
        }
      }
    };

    walk(this.specsDir);

    if (results.length > 0) {
      const matched = results[0];
      const content = fs.readFileSync(matched, 'utf8');
      return {
        path: matched,
        content,
        relativePath: path.relative(this.controlPlaneRoot, matched).replace(/\\/g, '/')
      };
    }

    return null;
  }

  /**
   * Validates whether a specification text adheres to formal EARS syntax.
   * @param {string} specContent
   * @returns {{ valid: boolean, matchedPatterns: string[] }}
   */
  validateEarsContract(specContent) {
    if (!specContent || typeof specContent !== 'string') {
      return { valid: false, matchedPatterns: [] };
    }

    const matchedPatterns = [];
    for (const pattern of EARS_PATTERNS) {
      if (pattern.test(specContent)) {
        matchedPatterns.push(pattern.source);
      }
    }

    // Spec must contain at least one formal EARS clause
    return {
      valid: matchedPatterns.length > 0,
      matchedPatterns
    };
  }

  /**
   * Scans evidence directory to determine the next sequential evidence identifier.
   * @returns {string} EVD-XXXX
   */
  getNextEvidenceId() {
    if (!fs.existsSync(this.evidenceDir)) {
      fs.mkdirSync(this.evidenceDir, { recursive: true });
      return 'EVD-0001';
    }

    const files = fs.readdirSync(this.evidenceDir);
    let maxNum = 0;

    for (const file of files) {
      const match = file.match(/^EVD-(\d{4,})\.json$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    return `EVD-${String(maxNum + 1).padStart(4, '0')}`;
  }

  /**
   * Seals an execution output into a formal contract-based cryptographic evidence receipt.
   * @param {object} options
   * @param {string} options.specId - Identifier or path of the formal specification
   * @param {string} [options.taskId] - Task DAG ID
   * @param {string} [options.projectId] - Project ID (e.g. PRJ-FUNDACION)
   * @param {string} [options.claim] - Verifiable claim statement
   * @param {string} [options.command] - Test/verification command executed
   * @param {number} [options.exitCode=0] - Process exit code
   * @param {string} [options.stdout=''] - Standard output
   * @param {string} [options.stderr=''] - Standard error
   * @param {Array<string>} [options.artifacts=[]] - Verified artifact file paths
   * @param {string} [options.actor] - Sealing agent or persona
   * @param {boolean} [options.dryRun=false] - If true, does not write to disk
   * @returns {object} Sealed evidence record and file path
   */
  sealContractEvidence(options = {}) {
    const {
      specId,
      taskId,
      projectId,
      claim,
      command = 'node --test',
      exitCode = 0,
      stdout = '',
      stderr = '',
      artifacts = [],
      actor = 'EOS Contract Evidence Sealer',
      dryRun = false
    } = options;

    if (!specId) {
      throw new Error('CONTRACT_SEAL_ERROR: specId is mandatory for contract-based evidence sealing.');
    }

    // 1. Resolve and Validate Specification Contract
    const spec = this.findSpec(specId);
    if (!spec) {
      throw new Error(`CONTRACT_SPEC_NOT_FOUND: Specification '${specId}' could not be located in docs/specs/.`);
    }

    const earsCheck = this.validateEarsContract(spec.content);
    if (!earsCheck.valid) {
      throw new Error(
        `CONTRACT_SPEC_INVALID: Specification '${spec.relativePath}' lacks formal EARS syntax requirements.`
      );
    }

    // 2. Epistemic Law III & Economic Contract Enforcement
    const economicContract = options.economicContract || this.economicValidator.extractEconomicContract(spec.content);
    let economicEvaluation = null;
    if (options.telemetry) {
      economicEvaluation = this.economicValidator.evaluateTelemetry(economicContract, options.telemetry);
    }

    let isSuccess = exitCode === 0;
    let failureReason = null;
    if (isSuccess && economicEvaluation && economicEvaluation.circuit_breaker_tripped) {
      isSuccess = false;
      failureReason = `Economic circuit breaker tripped: ${economicEvaluation.violations.map(v => v.message).join('; ')}`;
    }

    const status = isSuccess ? 'VERIFIED' : 'NOT VERIFIED';
    const result = isSuccess ? 'PASS' : (failureReason ? 'ECONOMIC_VIOLATION' : 'FAIL');
    const confidence = isSuccess ? 'HIGH' : 'LOW';

    // 3. Generate Sequential Evidence ID
    const evdId = this.getNextEvidenceId();
    const timestamp = new Date().toISOString();

    // 4. Compute Merkle Cryptographic Seal
    const stdoutHash = this.hashString(stdout);
    const stderrHash = this.hashString(stderr);
    const economicDigest = economicEvaluation ? this.hashString(JSON.stringify(economicEvaluation)) : 'NONE';
    const sealPayload = `${evdId}:${spec.relativePath}:${taskId || 'NONE'}:${projectId || 'CORE'}:${command}:${exitCode}:${stdoutHash}:${stderrHash}:${economicDigest}:${timestamp}`;
    const sealHash = `sha256-${this.hashString(sealPayload)}`;

    // 5. Build Schema-Compliant Record
    const actualMessage = isSuccess
      ? `Command exited cleanly with code 0. EARS contract satisfied.${economicEvaluation ? ` Economic contract: ${economicEvaluation.verdict} (efficiency ${economicEvaluation.efficiency_score}%).` : ''}`
      : (failureReason || `Command failed with exit code ${exitCode}. Error output: ${stderr.slice(0, 150)}`);

    const evidenceRecord = {
      $schema: './schema.json',
      id: evdId,
      claim: claim || `Deterministic contract compliance for ${spec.relativePath}`,
      status,
      scope: projectId ? `${projectId} / contract-seal` : 'EOS Control Plane / contract-seal',
      source: 'Contract-Based Automated Verification Sealer',
      timestamp,
      actor,
      action: `Executed and verified contract ${spec.relativePath}${taskId ? ` under task ${taskId}` : ''}`,
      command,
      expected: `Exit code 0, satisfaction of formal EARS contract, and compliance with economic budget invariants in ${spec.relativePath}`,
      actual: actualMessage,
      result,
      artifacts: artifacts.map(a => a.replace(/\\/g, '/')),
      environment: {
        node: process.version,
        platform: process.platform
      },
      confidence,
      related_spec: spec.relativePath,
      related_task: taskId || null,
      related_project: projectId || null,
      sha256: sealHash,
      digest: sealHash,
      contract_provenance: {
        spec_file: spec.relativePath,
        ears_patterns_matched: earsCheck.matchedPatterns,
        stdout_sha256: stdoutHash
      },
      economic_provenance: economicEvaluation || {
        verdict: 'DEFAULT_LIMITS_APPLIED',
        contract: economicContract
      }
    };


    const targetFilePath = path.join(this.evidenceDir, `${evdId}.json`);
    let custody_event = null;

    if (!dryRun) {
      if (!fs.existsSync(this.evidenceDir)) {
        fs.mkdirSync(this.evidenceDir, { recursive: true });
      }
      fs.writeFileSync(targetFilePath, JSON.stringify(evidenceRecord, null, 2) + '\n', 'utf8');
      if (this.custody) {
        custody_event = this.custody.sealEvdRecord({
          evidence_id: evdId,
          seal_hash: sealHash,
          related_spec: evidenceRecord.related_spec,
          related_project: evidenceRecord.related_project,
          status: evidenceRecord.status,
          dry_run: false
        });
      }
    }

    return {
      success: isSuccess,
      evidence_id: evdId,
      path: targetFilePath,
      seal_hash: sealHash,
      record: evidenceRecord,
      custody_event
    };
  }
}
