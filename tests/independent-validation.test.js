import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { IndependentVerificationHarness } from '../scripts/engine/independent-verification-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const harnessScript = path.join(rootDir, 'scripts/engine/independent-verification-harness.js');
const isolationBaseline = path.join(rootDir, 'tests/fixtures/independent-verifier/isolation-baseline');
const defaultCasesDir = path.join(rootDir, 'tests/fixtures/independent-verifier/cases');

const harness = new IndependentVerificationHarness();

function fingerprintTree(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return createHash('sha256').update('MISSING').digest('hex');
  }
  const entries = [];
  function walk(dir, rel = '') {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const relPath = rel ? `${rel}/${name}` : name;
      const st = fs.lstatSync(full);
      if (st.isDirectory()) {
        walk(full, relPath);
        continue;
      }
      if (st.isFile()) {
        const sha256 = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
        entries.push({ path: relPath, sha256, size: st.size });
      }
    }
  }
  walk(targetPath);
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

function sandboxFromFixture(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.cpSync(isolationBaseline, dir, { recursive: true });
  return dir;
}

function writeCaseDir(parent, caseId, files) {
  const dir = path.join(parent, caseId);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), `${JSON.stringify(body)}\n`);
  }
  return dir;
}

function spawnIndependentCli(args) {
  return spawnSync(process.execPath, [harnessScript, '--verify-independent', ...args], {
    cwd: rootDir,
    encoding: 'utf8'
  });
}

function parseCliPayload(stdout) {
  const start = String(stdout).search(/[{[]/);
  assert.ok(start >= 0, `CLI did not emit JSON: ${stdout}`);
  return JSON.parse(String(stdout).slice(start));
}

// ====================================================
// INDEPENDENT EMPIRICAL VALIDATION TESTS
// ====================================================
test('Independent Verification Harness evaluates 5 falsification cases (A to E)', () => {
  const res = harness.runIndependentValidationSuite();
  assert.equal(res.falsificationCasesEvaluated, 5);
  assert.equal(res.harnessPassed, true);
  assert.equal(res.metrics.CDR, 1.0);
  assert.equal(res.metrics.FAR, 0.0);
});

test('Independence Levels classification (I0 to I4)', () => {
  assert.equal(harness.evaluateClaimIndependence({}).independenceLevel, 'I0');
  assert.equal(harness.evaluateClaimIndependence({ evidence: 'E1' }).independenceLevel, 'I1');
  assert.equal(harness.evaluateClaimIndependence({ evidence: 'E1', independentLocalVerified: true }).independenceLevel, 'I2');
  assert.equal(harness.evaluateClaimIndependence({ evidence: 'E1', externalVerified: true }).independenceLevel, 'I4');
});

test('Contradiction testing halts promotion on contradiction or tampered evidence', () => {
  const caseB = harness.evaluateContradictionCase('PASS', 'FAIL', true, false);
  assert.equal(caseB.outcome, 'CONTRADICTION');
  assert.equal(caseB.haltPromotion, true);

  const caseE = harness.evaluateContradictionCase('PASS', 'PASS', true, true);
  assert.equal(caseE.outcome, 'INTEGRITY_FAILURE');
  assert.equal(caseE.haltPromotion, true);
});

test('Negative Protection Test: PRJ-FUNDACION isolation - external target immutability (Δ=0)', () => {
  const fundacionPath = 'C:\\Users\\valen\\Documents\\Fundacion';
  const baselineItems = fs.existsSync(fundacionPath) ? fs.readdirSync(fundacionPath).sort() : [];
  const currentItems = fs.existsSync(fundacionPath) ? fs.readdirSync(fundacionPath).sort() : [];
  assert.deepEqual(currentItems, baselineItems, 'External target must remain immutable during test execution');
  const workspaceFundacion = path.join(rootDir, 'Fundacion');
  assert.ok(fs.existsSync(workspaceFundacion), 'workspace Fundacion tree must remain present');
});

test('I2 isolation: injectable targetPath + T0 fingerprint; sandbox mutation fails isolation and harness', () => {
  const sandbox = sandboxFromFixture('eos-i2-iso-');
  const t0 = fingerprintTree(sandbox);
  fs.writeFileSync(path.join(sandbox, 'MUTATION.txt'), 'isolation-breach\n');

  const isolation = harness.verifyTargetIsolation({
    targetPath: sandbox,
    baselineFingerprint: t0
  });
  assert.equal(isolation.isolated, false, 'self-compare of Fundacion must not hide a mutated injectable target');
  assert.equal(isolation.path, sandbox);

  const res = harness.runIndependentValidationSuite({
    targetPath: sandbox,
    baselineFingerprint: t0,
    evidenceDir: defaultCasesDir
  });
  assert.equal(res.targetIsolation.isolated, false);
  assert.equal(res.harnessPassed, false);
  fs.rmSync(sandbox, { recursive: true, force: true });
});

test('I2 isolation: unmutated sandbox matches T0 fingerprint', () => {
  const sandbox = sandboxFromFixture('eos-i2-iso-ok-');
  const t0 = fingerprintTree(sandbox);
  const isolation = harness.verifyTargetIsolation({
    targetPath: sandbox,
    baselineFingerprint: t0
  });
  assert.equal(isolation.isolated, true);
  assert.equal(isolation.sha256, t0);
  fs.rmSync(sandbox, { recursive: true, force: true });
});

test('I2 isolation: non-source directories do not alter fingerprintTarget or isolation', () => {
  const sandbox = sandboxFromFixture('eos-i2-iso-ignore-');
  const t0 = harness.fingerprintTarget(sandbox);

  const ignoredDirs = ['node_modules', '.git', '.next', 'dist', 'coverage'];
  for (const dir of ignoredDirs) {
    const full = path.join(sandbox, dir);
    fs.mkdirSync(full, { recursive: true });
    fs.writeFileSync(path.join(full, 'junk.txt'), `${dir}-noise\n`);
  }

  const t1 = harness.fingerprintTarget(sandbox);
  assert.equal(t1.sha256, t0.sha256, 'ignored non-source trees must not change fingerprint');
  assert.equal(t1.entryCount, t0.entryCount);

  const isolation = harness.verifyTargetIsolation({
    targetPath: sandbox,
    baselineFingerprint: t0.sha256
  });
  assert.equal(isolation.isolated, true, 'non-source directories must not trigger an isolation breach');
  assert.equal(isolation.sha256, t0.sha256);
  fs.rmSync(sandbox, { recursive: true, force: true });
});

test('Contradiction case B is evaluated from filesystem evidence, not string literals alone', () => {
  assert.equal(typeof harness.evaluateContradictionCaseFromEvidence, 'function');

  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-i2-case-b-'));
  const caseBDir = writeCaseDir(evidenceRoot, 'B', {
    'eos-signal.json': { signal: 'PASS' },
    'verifier-signal.json': { signal: 'FAIL' },
    'evidence.json': { present: true, tampered: false }
  });

  const caseB = harness.evaluateContradictionCaseFromEvidence(caseBDir);
  assert.equal(caseB.case, 'B');
  assert.equal(caseB.outcome, 'CONTRADICTION');
  assert.equal(caseB.haltPromotion, true);
  assert.equal(caseB.source, 'filesystem');

  const eosRaw = JSON.parse(fs.readFileSync(path.join(caseBDir, 'eos-signal.json'), 'utf8'));
  const verifierRaw = JSON.parse(fs.readFileSync(path.join(caseBDir, 'verifier-signal.json'), 'utf8'));
  assert.equal(eosRaw.signal, 'PASS');
  assert.equal(verifierRaw.signal, 'FAIL');

  const res = harness.runIndependentValidationSuite({
    targetPath: evidenceRoot,
    evidenceDir: evidenceRoot
  });
  assert.equal(res.cases.length, 1);
  assert.equal(res.cases[0].outcome, 'CONTRADICTION');
  assert.equal(res.cases[0].source, 'filesystem');
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
});

test('Metrics are computed from evaluated cases, not constants', () => {
  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-i2-metrics-'));
  writeCaseDir(evidenceRoot, 'B', {
    'eos-signal.json': { signal: 'PASS' },
    'verifier-signal.json': { signal: 'FAIL' },
    'evidence.json': { present: true, tampered: false }
  });

  const res = harness.runIndependentValidationSuite({
    targetPath: evidenceRoot,
    evidenceDir: evidenceRoot
  });
  assert.equal(res.cases.length, 1);
  assert.equal(res.cases[0].case, 'B');

  const corroborated = res.cases.filter((c) => c.outcome === 'CORROBORATED').length;
  const contradictionLike = new Set(['CONTRADICTION', 'INTEGRITY_FAILURE']);
  const detected = res.cases.filter((c) => contradictionLike.has(c.outcome)).length;
  const introduced = res.cases.filter((c) => contradictionLike.has(c.expectedOutcome || c.outcome)).length;
  const haltWorthy = new Set(['CONTRADICTION', 'INTEGRITY_FAILURE', 'UNSUPPORTED_CLAIM']);
  const falsePresented = res.cases.filter((c) => haltWorthy.has(c.expectedOutcome || c.outcome));
  const falseAccepted = falsePresented.filter((c) => c.haltPromotion === false);
  const validPresented = res.cases.filter((c) => (c.expectedOutcome || c.outcome) === 'CORROBORATED');
  const validRejected = validPresented.filter((c) => c.haltPromotion === true);

  const expected = {
    FAR: falsePresented.length ? falseAccepted.length / falsePresented.length : 0,
    FRR: validPresented.length ? validRejected.length / validPresented.length : 0,
    CDR: introduced.length ? detected / introduced : 1,
    EIR: res.cases.length ? corroborated / res.cases.length : 0
  };

  assert.deepEqual(res.metrics, expected);
  assert.equal(res.metrics.EIR, 0);
  assert.notDeepEqual(res.metrics, { FAR: 0, FRR: 0, CDR: 1, EIR: 1 });
  fs.rmSync(evidenceRoot, { recursive: true, force: true });
});

test('CLI --verify-independent exits 1 when harnessPassed is false', () => {
  const sandbox = sandboxFromFixture('eos-i2-cli-fail-');
  const t0 = fingerprintTree(sandbox);
  fs.writeFileSync(path.join(sandbox, 'MUTATION.txt'), 'cli-must-fail\n');

  const result = spawnIndependentCli(['--target', sandbox, '--baseline', t0]);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  const payload = parseCliPayload(result.stdout);
  assert.equal(payload.harnessPassed, false);
  assert.equal(payload.targetIsolation.isolated, false);
  assert.equal(payload.validationState, 'EMPIRICAL_VALIDATION_PENDING_EXTERNAL_REALITY');
  assert.notEqual(payload.validationState, 'EMPIRICALLY_VALIDATED');
  fs.rmSync(sandbox, { recursive: true, force: true });
});

test('CLI --verify-independent exits 0 only on a real local pass', () => {
  const result = spawnIndependentCli([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = parseCliPayload(result.stdout);
  assert.equal(payload.harnessPassed, true);
  assert.equal(payload.falsificationCasesEvaluated, 5);
  assert.equal(payload.validationState, 'EMPIRICAL_VALIDATION_PENDING_EXTERNAL_REALITY');
  assert.match(payload.harnessIdentity.sha256, /^[a-f0-9]{64}$/);
  assert.equal(payload.independenceLevel, 'I2');
});
