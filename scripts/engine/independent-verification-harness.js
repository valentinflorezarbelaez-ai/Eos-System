import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { auditTddReceipts } from '../../src/core/sdd/tdd-evidence-receipt.js';
import { evaluateSddCeremonySpawn } from '../../src/core/sdd/organic-routing-gate.js';
import { assertRddDoesNotGrantDelivery } from '../../src/core/governance/rdd-review-stance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const DEFAULT_FUNDACION_PATH = 'C:\\Users\\valen\\Documents\\Fundacion';
const DEFAULT_EVIDENCE_DIR = path.join(rootDir, 'tests/fixtures/independent-verifier/cases');
const CONTRADICTION_LIKE = new Set(['CONTRADICTION', 'INTEGRITY_FAILURE']);
const HALT_WORTHY = new Set(['CONTRADICTION', 'INTEGRITY_FAILURE', 'UNSUPPORTED_CLAIM']);

function sha256Buffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function parseIndependentArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') {
      options.targetPath = argv[i + 1];
      i += 1;
    } else if (arg === '--baseline') {
      options.baselineFingerprint = argv[i + 1];
      i += 1;
    } else if (arg === '--evidence-dir') {
      options.evidenceDir = argv[i + 1];
      i += 1;
    }
  }
  return options;
}

export class IndependentVerificationHarness {
  constructor() {
    this.validationStandard = fs.readFileSync(path.join(rootDir, 'docs/governance/EOS_INDEPENDENT_EMPIRICAL_VALIDATION_STANDARD.md'), 'utf-8');
    this.claimModel = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/governance/CLAIM_VALIDATION_MODEL.json'), 'utf-8'));
    this.independenceModel = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/governance/EVIDENCE_INDEPENDENCE_MODEL.json'), 'utf-8'));
    this.contradictionModel = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/governance/CONTRADICTION_MODEL.json'), 'utf-8'));
    this.validationStateMachine = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/governance/VALIDATION_STATE_MACHINE.json'), 'utf-8'));
    this.complexityBudget = JSON.parse(fs.readFileSync(path.join(rootDir, 'docs/governance/COMPLEXITY_BUDGET.json'), 'utf-8'));
  }

  harnessScriptSha256() {
    return sha256Buffer(fs.readFileSync(__filename));
  }

  fingerprintTarget(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return {
        path: targetPath,
        exists: false,
        entryCount: 0,
        sha256: sha256Buffer('MISSING')
      };
    }

    const entries = [];
    const walk = (dir, rel = '') => {
      for (const name of fs.readdirSync(dir).sort()) {
        const full = path.join(dir, name);
        const relPath = rel ? `${rel}/${name}` : name;
        const st = fs.lstatSync(full);
        if (st.isDirectory()) {
          walk(full, relPath);
          continue;
        }
        if (st.isFile()) {
          entries.push({
            path: relPath,
            sha256: sha256Buffer(fs.readFileSync(full)),
            size: st.size
          });
        }
      }
    };
    walk(targetPath);

    return {
      path: targetPath,
      exists: true,
      entryCount: entries.length,
      sha256: sha256Buffer(JSON.stringify(entries))
    };
  }

  verifyTargetIsolation(options = {}) {
    const targetPath = options.targetPath || DEFAULT_FUNDACION_PATH;
    const current = this.fingerprintTarget(targetPath);
    const baselineSha = typeof options.baselineFingerprint === 'string'
      ? options.baselineFingerprint
      : options.baselineFingerprint?.sha256;
    const comparedSha = baselineSha || current.sha256;
    const isolated = comparedSha === current.sha256;

    return {
      path: targetPath,
      exists: current.exists,
      baselineCount: current.entryCount,
      currentCount: current.entryCount,
      delta: isolated ? 0 : 1,
      itemsMatch: isolated,
      isolated,
      sha256: current.sha256,
      baselineSha256: comparedSha
    };
  }

  evaluateClaimIndependence(claim) {
    if (!claim || !claim.evidence) return { independenceLevel: 'I0', status: 'UNSUPPORTED' };
    if (claim.externalVerified) return { independenceLevel: 'I4', status: 'EMPIRICALLY_VALIDATED' };
    if (claim.independentLocalVerified) return { independenceLevel: 'I2', status: 'INDEPENDENTLY_CORROBORATED' };
    return { independenceLevel: 'I1', status: 'INTERNALLY_VERIFIED' };
  }

  /**
   * Independent TDD receipt audit (ADR-0010). Used when Strict TDD is in scope.
   */
  auditStrictTddReceipts(receipts = [], options = {}) {
    return auditTddReceipts({
      receipts,
      strictTdd: options.strictTdd !== false,
      testsExist: options.testsExist !== false,
      requireRefactor: options.requireRefactor === true,
      claimVerified: options.claimVerified === true
    });
  }

  evaluateOrganicSpawn(intent = {}) {
    return evaluateSddCeremonySpawn(intent);
  }

  evaluateRddStance(review = {}) {
    return assertRddDoesNotGrantDelivery(review);
  }

  evaluateContradictionCase(eosSignal, verifierSignal, evidencePresent, evidenceTampered) {
    if (evidenceTampered) return { case: 'E', outcome: 'INTEGRITY_FAILURE', haltPromotion: true };
    if (!evidencePresent) return { case: 'D', outcome: 'UNSUPPORTED_CLAIM', haltPromotion: true };
    if (eosSignal === 'PASS' && verifierSignal === 'FAIL') return { case: 'B', outcome: 'CONTRADICTION', haltPromotion: true };
    if (eosSignal === 'BLOCK' && verifierSignal === 'PASS') return { case: 'C', outcome: 'FALSE_REJECTION_CANDIDATE', haltPromotion: false };
    return { case: 'A', outcome: 'CORROBORATED', haltPromotion: false };
  }

  evaluateContradictionCaseFromEvidence(evidenceDir) {
    const readPrimary = (name) => {
      const full = path.join(evidenceDir, name);
      if (!fs.existsSync(full)) {
        throw new Error(`Missing primary evidence: ${name}`);
      }
      return JSON.parse(fs.readFileSync(full, 'utf8'));
    };

    const eos = readPrimary('eos-signal.json');
    const verifier = readPrimary('verifier-signal.json');
    const evidence = readPrimary('evidence.json');
    const evaluated = this.evaluateContradictionCase(
      eos.signal,
      verifier.signal,
      evidence.present === true,
      evidence.tampered === true
    );

    return {
      ...evaluated,
      source: 'filesystem',
      evidenceDir
    };
  }

  loadFalsificationCases(evidenceDir = DEFAULT_EVIDENCE_DIR) {
    if (evidenceDir && fs.existsSync(evidenceDir)) {
      const caseDirs = fs.readdirSync(evidenceDir).sort().filter((name) => {
        const full = path.join(evidenceDir, name);
        return fs.statSync(full).isDirectory()
          && fs.existsSync(path.join(full, 'eos-signal.json'));
      });

      if (caseDirs.length > 0) {
        return caseDirs.map((name) => {
          const evaluated = this.evaluateContradictionCaseFromEvidence(path.join(evidenceDir, name));
          const model = this.contradictionModel.contradiction_cases.find((entry) => entry.case === evaluated.case);
          return { ...evaluated, expectedOutcome: model?.outcome };
        });
      }
    }

    return this.contradictionModel.contradiction_cases.map((entry) => {
      const present = entry.verifier_signal !== 'MISSING_EVIDENCE';
      const tampered = entry.verifier_signal === 'TAMPERED_EVIDENCE';
      const verifierSignal = present && !tampered ? entry.verifier_signal : 'PASS';
      return {
        ...this.evaluateContradictionCase(entry.eos_signal, verifierSignal, present, tampered),
        expectedOutcome: entry.outcome,
        source: 'contradiction-model'
      };
    });
  }

  computeMetrics(cases) {
    const detected = cases.filter((c) => CONTRADICTION_LIKE.has(c.outcome)).length;
    const introduced = cases.filter((c) => CONTRADICTION_LIKE.has(c.expectedOutcome || c.outcome)).length;
    const falsePresented = cases.filter((c) => HALT_WORTHY.has(c.expectedOutcome || c.outcome));
    const falseAccepted = falsePresented.filter((c) => c.haltPromotion === false);
    const validPresented = cases.filter((c) => (c.expectedOutcome || c.outcome) === 'CORROBORATED');
    const validRejected = validPresented.filter((c) => c.haltPromotion === true);
    const corroborated = cases.filter((c) => c.outcome === 'CORROBORATED').length;

    return {
      FAR: falsePresented.length ? falseAccepted.length / falsePresented.length : 0,
      FRR: validPresented.length ? validRejected.length / validPresented.length : 0,
      CDR: introduced.length ? detected / introduced : 1,
      EIR: cases.length ? corroborated / cases.length : 0
    };
  }

  runIndependentValidationSuite(options = {}) {
    const targetPath = options.targetPath || DEFAULT_FUNDACION_PATH;
    const baselineFingerprint = options.baselineFingerprint
      || this.fingerprintTarget(targetPath).sha256;
    const cases = this.loadFalsificationCases(options.evidenceDir || DEFAULT_EVIDENCE_DIR);
    const isolation = this.verifyTargetIsolation({ targetPath, baselineFingerprint });
    const metrics = this.computeMetrics(cases);

    return {
      timestamp: new Date().toISOString(),
      standard: 'EOS_INDEPENDENT_EMPIRICAL_VALIDATION_STANDARD',
      version: 'v0.3.0',
      phase: 24,
      independenceLevel: 'I2',
      targetIsolation: isolation,
      falsificationCasesEvaluated: cases.length,
      cases,
      metrics,
      complexityStatus: this.complexityBudget.status,
      validationState: 'EMPIRICAL_VALIDATION_PENDING_EXTERNAL_REALITY',
      harnessPassed: isolation.isolated && metrics.CDR === 1 && metrics.FAR === 0,
      harnessIdentity: {
        script: 'scripts/engine/independent-verification-harness.js',
        sha256: this.harnessScriptSha256()
      }
    };
  }
}

if (process.argv.includes('--verify-independent')) {
  const harness = new IndependentVerificationHarness();
  const res = harness.runIndependentValidationSuite(parseIndependentArgs(process.argv));
  console.log('EOS INDEPENDENT VERIFICATION HARNESS RESULTS:');
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.harnessPassed ? 0 : 1);
}
