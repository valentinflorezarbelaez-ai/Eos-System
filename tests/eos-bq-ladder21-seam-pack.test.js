/**
 * Mission BQ / SPEC-0074 — Ladder 21 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 * L17 CLOSED — never reopen. L18 CLOSED — never reopen. L19 CLOSED — never reopen. L20 CLOSED — never reopen.
 * After BQ, Ladder 21 is CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L21 after closeout.
 * Tip honesty ritual deferred to post-BQ tip refresh (not this mission).
 * Receipt integrity: BM-RCPT-* / BN-RCPT-* / BO-RCPT-* / BP-RCPT-*.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER21 = [
  'test:mission-bm',
  'test:mission-bn',
  'test:mission-bo',
  'test:mission-bp',
];

const MISSION_ALIASES = [
  'test:agent-identity-attestation',
  'test:continuous-integrity-sentinel',
  'test:two-key-consensus-gate',
  'test:telemetry-forensic-trail',
];

const SATELLITE_LOCKS = {
  'test:mission-bm': 'eos-bm-agent-identity-attestation-port.test.js',
  'test:mission-bn': 'eos-bn-continuous-integrity-sentinel.test.js',
  'test:mission-bo': 'eos-bo-multi-agent-consensus-gate.test.js',
  'test:mission-bp': 'eos-bp-sovereign-telemetry-forensic-aggregator.test.js',
};

const RECEIPT_PREFIXES = {
  'tests/eos-bm-agent-identity-attestation-port.test.js': 'BM-RCPT-',
  'tests/eos-bn-continuous-integrity-sentinel.test.js': 'BN-RCPT-',
  'tests/eos-bo-multi-agent-consensus-gate.test.js': 'BO-RCPT-',
  'tests/eos-bp-sovereign-telemetry-forensic-aggregator.test.js': 'BP-RCPT-',
};

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

function resolveContractRel() {
  if (exists('docs/governance/CI_CD_CONTRACT.md')) return 'docs/governance/CI_CD_CONTRACT.md';
  if (exists('docs/releases/CI_CD_CONTRACT.md')) return 'docs/releases/CI_CD_CONTRACT.md';
  return 'docs/governance/CI_CD_CONTRACT.md';
}

test('BQ1: ci.yml seam-pack contains Ladder 21 BM/BN/BO/BP satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER21) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('BQ2: package.json scripts for Ladder 21 satellites + mission-bq / bq21 / l21', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER21) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  for (const alias of MISSION_ALIASES) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-bq'],
    'node --test tests/eos-bq-ladder21-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:bq21'],
    'node --test tests/eos-bq-ladder21-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:l21'],
    'node --test tests/eos-bq-ladder21-seam-pack.test.js'
  );
});

test('BQ3: ladder21-pack chains BM+BN+BO+BP + test:mission-bq', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:ladder21-pack'], 'string', 'missing test:ladder21-pack');
  for (const s of LADDER21) {
    assert.ok(
      pkg.scripts['test:ladder21-pack'].includes(s),
      'ladder21-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder21-pack'].includes('test:mission-bq'),
    'ladder21-pack must chain test:mission-bq'
  );
  assert.equal(
    pkg.scripts['test:ladder21-pack'],
    'npm run test:mission-bm && npm run test:mission-bn && npm run test:mission-bo && npm run test:mission-bp && npm run test:mission-bq'
  );
});

test('BQ4: native-suite-pack extended with Ladder 21 satellites (when present)', () => {
  const pkg = JSON.parse(read('package.json'));
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER21) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
});

test('BQ5: primary lock paths seed BM/BN/BO/BP test files + aliases aligned', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const [script, lock] of Object.entries(SATELLITE_LOCKS)) {
    assert.ok(
      pkg.scripts[script].includes(lock),
      script + ' must point at ' + lock
    );
  }
  assert.equal(pkg.scripts['test:agent-identity-attestation'], pkg.scripts['test:mission-bm']);
  assert.equal(pkg.scripts['test:continuous-integrity-sentinel'], pkg.scripts['test:mission-bn']);
  assert.equal(pkg.scripts['test:two-key-consensus-gate'], pkg.scripts['test:mission-bo']);
  assert.equal(pkg.scripts['test:telemetry-forensic-trail'], pkg.scripts['test:mission-bp']);
});

test('BQ6: CI_CD_CONTRACT.md + fragment mention Ladder 21 / Mission BQ satellites', () => {
  const contractRel = resolveContractRel();
  assert.ok(exists(contractRel), 'CI_CD_CONTRACT.md missing');
  const md = read(contractRel);
  assert.ok(
    md.includes('Ladder 21') || md.includes('Mission BQ'),
    'contract missing Ladder 21 / Mission BQ'
  );
  assert.ok(
    md.includes('test:mission-bm') ||
      md.includes('test:mission-bn') ||
      md.includes('test:mission-bo') ||
      md.includes('test:mission-bp') ||
      md.includes('Ladder 21'),
    'contract missing Ladder 21 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
  const frag = 'docs/governance/CI_CD_CONTRACT.ladder21-fragment.md';
  assert.ok(exists(frag), 'ladder21 contract fragment missing');
  const fragMd = read(frag);
  assert.ok(
    fragMd.includes('Ladder 21') &&
      (fragMd.includes('test:mission-bm') || fragMd.includes('Mission BQ')),
    'fragment must document Ladder 21 / Mission BQ'
  );
});

test('BQ7: Ladder 21 closeout doc exists with CLOSED_FOR_LOCAL_GOVERNED_USE / BM–BP+BQ MEASURED / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md';
  assert.ok(exists(p), 'Ladder 21 closeout missing');
  const md = read(p);
  assert.ok(
    /PRODUCTION_READY\s*[:=]\s*\*?NO\*?/i.test(md) ||
      (md.includes('PRODUCTION_READY') && md.includes('NO')),
    'closeout must state PRODUCTION_READY=NO'
  );
  assert.ok(
    md.includes('Fundacion') &&
      (md.includes('Δ=0') || md.includes('Delta=0') || md.includes('delta-0') || md.includes('delta 0')),
    'closeout must state Fundacion Δ=0'
  );
  assert.ok(md.includes('COMPLETE_FOR_LOCAL_GOVERNED_USE'));
  assert.ok(
    md.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'),
    'closeout must mark Ladder 21 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    md.includes('MEASURED') &&
      (md.includes('BM') || md.includes('attestation') || md.includes('identity')) &&
      (md.includes('BN') || md.includes('sentinel') || md.includes('heartbeat')) &&
      (md.includes('BO') || md.includes('consensus') || md.includes('two-key')) &&
      (md.includes('BP') || md.includes('telemetry') || md.includes('forensic')) &&
      (md.includes('BQ') || md.includes('seam-pack')),
    'closeout must mark BM+BN+BO+BP+BQ MEASURED'
  );
  assert.ok(
    /Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric/i.test(md),
    'closeout must name the L21 axis'
  );
});

test('BQ8: Mission BQ release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_BQ_LADDER21_SEAM_PACK_2026-09-14.md';
  assert.ok(exists(p), 'Mission BQ release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0074') || md.includes('Mission BQ'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:mission-bm') &&
      md.includes('test:mission-bn') &&
      md.includes('test:mission-bo') &&
      md.includes('test:mission-bp')
  );
});

test('BQ9: OpenSpec Mission BQ artifacts exist (SPEC-0074)', () => {
  const base = 'openspec/changes/eos-ladder-21-mission-bq';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/mission-bq-ladder21-closeout-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0074'));
});

test('BQ10: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-bq-ladder21-seam-pack.test.js'") ||
      runner.includes('"eos-bq-ladder21-seam-pack.test.js"'),
    'eos-bq-ladder21-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('BQ11: NON-CLAIM markers (GH Team/enforcement, PRODUCTION_READY, L21 satellite fences)', () => {
  const md = read('docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md');
  assert.ok(
    md.includes('NON-CLAIM') || md.includes('not flipped') || md.includes('≠'),
    'closeout must carry NON-CLAIM / honesty markers'
  );
  assert.ok(
    /GH Team|Enterprise|enforcement/i.test(md),
    'NON-CLAIM: seam-pack ≠ GH Team/Enterprise enforcement'
  );
  assert.ok(
    md.includes('PRODUCTION_READY') && md.includes('NO'),
    'NON-CLAIM: PRODUCTION_READY remains NO'
  );
  assert.ok(
    /attestation|identity/i.test(md) &&
      (/OAuth|IAM|OIDC/i.test(md)),
    'NON-CLAIM: agent identity attestation ≠ full OAuth/IAM/OIDC IdP'
  );
  assert.ok(
    /sentinel|heartbeat/i.test(md) &&
      (/SIEM|EDR|Datadog|Prometheus/i.test(md)),
    'NON-CLAIM: continuous sentinel ≠ enterprise SIEM / EDR'
  );
  assert.ok(
    /consensus|two-key/i.test(md) &&
      (/multi-sig|HSM|blockchain|Raft/i.test(md)),
    'NON-CLAIM: multi-agent consensus ≠ multi-sig HSM / blockchain consensus'
  );
  assert.ok(
    /telemetry|forensic/i.test(md) &&
      (/SOC|Datadog|Splunk|APM/i.test(md)),
    'NON-CLAIM: sovereign telemetry trail ≠ enterprise SOC / Datadog / Splunk'
  );
});

test('BQ12: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-bq.mjs',
    'tests/eos-bq-ladder21-seam-pack.test.js',
    'docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md',
    'docs/releases/EOS_MISSION_BQ_LADDER21_SEAM_PACK_2026-09-14.md',
    'docs/governance/CI_CD_CONTRACT.ladder21-fragment.md',
    'docs/adrs/ADR-0034-mission-bq-ladder21-closeout-seam-pack.md',
    'docs/evidence/EOS_MISSION_BQ_EVIDENCE_2026-09-14.md',
  ];
  for (const rel of scanRels) {
    if (!exists(rel)) continue;
    const body = read(rel);
    assert.equal(
      body.includes(forbiddenPrefix),
      false,
      'Law VI violation: static provider-secret prefix literal in ' + rel
    );
  }
});

test('BQ13: patcher present and CRLF-safe ([^\\r\\n]* / [\\s\\S] patterns)', () => {
  assert.ok(exists('scripts/patch-mission-bq.mjs'), 'patch-mission-bq.mjs missing');
  const src = read('scripts/patch-mission-bq.mjs');
  assert.ok(src.includes('[^\\r\\n]*') || src.includes('[^\\r\\n]'), 'patcher must use CRLF-safe line matchers');
  assert.ok(src.includes('[\\s\\S]') || src.includes('[\\s\\S]*'), 'patcher must use [\\s\\S] for multi-line Set match');
  assert.ok(src.includes('PRODUCTION_READY'), 'patcher header must note PRODUCTION_READY');
});

test('BQ14: assert-gha-contract needles for Ladder 21 (when assert file present)', () => {
  if (!exists('scripts/ci/assert-gha-contract.js')) return;
  const src = read('scripts/ci/assert-gha-contract.js');
  for (const s of LADDER21) {
    assert.ok(
      src.includes("'" + s + "'") || src.includes('"' + s + '"'),
      'assert-gha-contract missing needle ' + s
    );
  }
});

test('BQ15: Antigravity-first / CloudAgent out markers in closeout + release', () => {
  const closeout = read('docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md');
  const release = read('docs/releases/EOS_MISSION_BQ_LADDER21_SEAM_PACK_2026-09-14.md');
  for (const md of [closeout, release]) {
    assert.ok(
      /Antigravity-first/i.test(md) || /CloudAgent/i.test(md),
      'docs must mark Antigravity-first / CloudAgent out'
    );
    assert.ok(
      /CloudAgent/i.test(md) && (/out|OUT|forbidden|no Cursor/i.test(md)),
      'docs must explicitly put CloudAgent out'
    );
  }
});

test('BQ16: tip honesty deferred; Expected tip StartsWith ff545dd documented', () => {
  const closeout = read('docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md');
  assert.ok(
    /tip honesty|post-BQ tip refresh|deferred/i.test(closeout),
    'closeout must defer tip honesty to post-BQ tip refresh'
  );
  assert.ok(
    closeout.includes('ff545dd'),
    'closeout must document Expected tip StartsWith ff545dd'
  );
});

test('BQ17: L17/L18/L19/L20 CLOSED never-reopen; L21 CLOSED_FOR_LOCAL_GOVERNED_USE (never left OPEN)', () => {
  const closeout = read('docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md');
  const release = read('docs/releases/EOS_MISSION_BQ_LADDER21_SEAM_PACK_2026-09-14.md');
  for (const md of [closeout, release]) {
    assert.ok(
      /L17|Ladder 17/i.test(md) && /never reopen|CLOSED/i.test(md),
      'L17 CLOSED — never reopen'
    );
    assert.ok(
      /L18|Ladder 18/i.test(md) && /never reopen|CLOSED/i.test(md),
      'L18 CLOSED — never reopen'
    );
    assert.ok(
      /L19|Ladder 19/i.test(md) && /never reopen|CLOSED/i.test(md),
      'L19 CLOSED — never reopen'
    );
    assert.ok(
      /L20|Ladder 20/i.test(md) && /never reopen|CLOSED/i.test(md),
      'L20 CLOSED — never reopen'
    );
    assert.ok(
      md.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'),
      'docs must mark L21 CLOSED_FOR_LOCAL_GOVERNED_USE'
    );
    assert.equal(
      /L21 stays OPEN|L21 remains OPEN|L21:\s*\*?\*?OPEN\b|Ladder 21\s+(is\s+)?\*?\*?OPEN\b/i.test(md),
      false,
      'BQ docs must not leave Ladder 21 OPEN after closeout'
    );
  }
});

test('BQ18: dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE + ADR-0034 rejected alts', () => {
  const closeout = read('docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md');
  assert.ok(
    closeout.includes('COMPLETE_FOR_LOCAL_GOVERNED_USE'),
    'closeout must carry dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE'
  );
  const adrRel = 'docs/adrs/ADR-0034-mission-bq-ladder21-closeout-seam-pack.md';
  assert.ok(exists(adrRel), 'ADR-0034 missing');
  const adr = read(adrRel);
  assert.ok(/Decision/i.test(adr), 'ADR must have Decision');
  assert.ok(/Consequences/i.test(adr), 'ADR must have Consequences');
  assert.ok(/NON-CLAIM/i.test(adr), 'ADR must have NON-CLAIM');
  assert.ok(/soak/i.test(adr) && /continue-on-error/i.test(adr), 'ADR reject: soak/continue-on-error pack');
  assert.ok(
    /PRODUCTION_READY\s*=\s*YES|PRODUCTION_READY=YES/i.test(adr),
    'ADR reject: PRODUCTION_READY=YES flip'
  );
  assert.ok(
    /reopen(ing)? L21/i.test(adr),
    'ADR reject: reopening L21 after closeout'
  );
  assert.ok(
    /soft-fail|soft fail/i.test(adr),
    'ADR reject: soft-fail seam-pack'
  );
});

test('BQ19: receipt integrity prefixes BM-RCPT-* / BN-RCPT-* / BO-RCPT-* / BP-RCPT-* in satellite locks', () => {
  for (const [rel, prefix] of Object.entries(RECEIPT_PREFIXES)) {
    assert.ok(exists(rel), 'satellite lock missing: ' + rel + ' (seed fixture or host copy)');
    const body = read(rel);
    assert.ok(
      body.includes(prefix),
      rel + ' must document receipt prefix ' + prefix
    );
  }
});

test('BQ20: Layer 0 purity / fail-closed — no soft-fail / FUNDACION_ALWAYS_DENY held in closeout', () => {
  const closeout = read('docs/releases/EOS_LADDER_21_CLOSEOUT_2026-09-14.md');
  assert.ok(
    /fail-closed|no continue-on-error|No soak/i.test(closeout),
    'closeout must affirm fail-closed / no soak / no continue-on-error'
  );
  assert.ok(
    /FUNDACION_ALWAYS_DENY|Fundacion.*Δ=0|Fundacion delta-0/i.test(closeout),
    'closeout must affirm Fundacion Δ=0 / ALWAYS_DENY posture'
  );
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  assert.equal(/soft-fail/i.test(yaml), false);
});
