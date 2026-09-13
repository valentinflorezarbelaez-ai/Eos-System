/**
 * Mission BB / SPEC-0059 — Ladder 18 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 * L17 CLOSED — never reopen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER18 = [
  'test:developer-engine-core',
  'test:ast-semantic-port',
  'test:self-repair-bridge',
  'test:local-sandbox-port',
];

const MISSION_ALIASES = [
  'test:mission-ax',
  'test:mission-ay',
  'test:mission-az',
  'test:mission-ba',
];

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

test('BB1: ci.yml seam-pack contains Ladder 18 AX/AY/AZ/BA satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER18) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('BB2: package.json scripts for Ladder 18 satellites + mission-bb / bb18 / l18', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER18) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  for (const alias of MISSION_ALIASES) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-bb'],
    'node --test tests/eos-bb-ladder18-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:bb18'],
    'node --test tests/eos-bb-ladder18-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:l18'],
    'node --test tests/eos-bb-ladder18-seam-pack.test.js'
  );
});

test('BB3: ladder18-pack chains AX+AY+AZ+BA + test:mission-bb', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:ladder18-pack'], 'string', 'missing test:ladder18-pack');
  for (const s of LADDER18) {
    assert.ok(
      pkg.scripts['test:ladder18-pack'].includes(s),
      'ladder18-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder18-pack'].includes('test:mission-bb'),
    'ladder18-pack must chain test:mission-bb'
  );
});

test('BB4: native-suite-pack extended with Ladder 18 satellites (when present)', () => {
  const pkg = JSON.parse(read('package.json'));
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER18) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
});

test('BB5: primary lock paths seed AX/AY/AZ/BA test files', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(
    pkg.scripts['test:developer-engine-core'].includes(
      'eos-ax-sovereign-developer-engine.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:ast-semantic-port'].includes('eos-ay-ast-semantic-port.test.js')
  );
  assert.ok(
    pkg.scripts['test:self-repair-bridge'].includes(
      'eos-az-self-repair-fdir-bridge.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:local-sandbox-port'].includes(
      'eos-ba-local-sandbox-container-port.test.js'
    )
  );
  assert.equal(
    pkg.scripts['test:mission-ax'],
    pkg.scripts['test:developer-engine-core']
  );
  assert.equal(pkg.scripts['test:mission-ay'], pkg.scripts['test:ast-semantic-port']);
  assert.equal(
    pkg.scripts['test:mission-az'],
    pkg.scripts['test:self-repair-bridge']
  );
  assert.equal(
    pkg.scripts['test:mission-ba'],
    pkg.scripts['test:local-sandbox-port']
  );
});

test('BB6: CI_CD_CONTRACT.md mentions Ladder 18 / Mission BB satellites', () => {
  const contractRel = resolveContractRel();
  assert.ok(exists(contractRel), 'CI_CD_CONTRACT.md missing');
  const md = read(contractRel);
  assert.ok(
    md.includes('Ladder 18') || md.includes('Mission BB'),
    'contract missing Ladder 18 / Mission BB'
  );
  assert.ok(
    md.includes('test:developer-engine-core') ||
      md.includes('test:ast-semantic-port') ||
      md.includes('test:self-repair-bridge') ||
      md.includes('test:local-sandbox-port') ||
      md.includes('Ladder 18'),
    'contract missing Ladder 18 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
});

test('BB7: Ladder 18 closeout doc exists with CLOSED_FOR_LOCAL_GOVERNED_USE / AX–BA+BB MEASURED / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_18_CLOSEOUT_2026-09-12.md';
  assert.ok(exists(p), 'Ladder 18 closeout missing');
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
    md.includes('CLOSED_FOR_LOCAL_GOVERNED_USE') ||
      md.includes('CLOSED_FOR_LOCAL'),
    'closeout must mark Ladder 18 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    md.includes('MEASURED') &&
      (md.includes('AX') || md.includes('developer-engine')) &&
      (md.includes('AY') || md.includes('ast-semantic') || md.includes('AST')) &&
      (md.includes('AZ') || md.includes('self-repair')) &&
      (md.includes('BA') || md.includes('sandbox')) &&
      (md.includes('BB') || md.includes('seam-pack')),
    'closeout must mark AX+AY+AZ+BA+BB MEASURED'
  );
});

test('BB8: Mission BB release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_BB_LADDER18_SEAM_PACK_2026-09-12.md';
  assert.ok(exists(p), 'Mission BB release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0059') || md.includes('Mission BB'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:developer-engine-core') &&
      md.includes('test:ast-semantic-port') &&
      md.includes('test:self-repair-bridge') &&
      md.includes('test:local-sandbox-port')
  );
});

test('BB9: OpenSpec Mission BB artifacts exist (SPEC-0059)', () => {
  const base = 'openspec/changes/eos-mission-bb-ladder18-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/mission-bb-ladder18-closeout-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0059'));
});

test('BB10: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-bb-ladder18-seam-pack.test.js'") ||
      runner.includes('"eos-bb-ladder18-seam-pack.test.js"'),
    'eos-bb-ladder18-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('BB11: NON-CLAIM markers (engine≠cloud IDE, AST≠PR LLM, repair≠unsupervised prod, sandbox≠K8s SaaS)', () => {
  const md = read('docs/releases/EOS_LADDER_18_CLOSEOUT_2026-09-12.md');
  assert.ok(
    md.includes('NON-CLAIM') || md.includes('not flipped') || md.includes('≠'),
    'closeout must carry NON-CLAIM / honesty markers'
  );
  assert.ok(
    /developer-engine|developer engine/i.test(md) &&
      (/cloud IDE|CloudAgent|SaaS IDE|remote IDE/i.test(md)),
    'NON-CLAIM: developer-engine ≠ cloud IDE SaaS / CloudAgent remote'
  );
  assert.ok(
    /AST|semantic/i.test(md) && (/PRODUCTION_READY|SLA|LLM/i.test(md)),
    'NON-CLAIM: AST/semantic ≠ PRODUCTION_READY LLM product / SLA'
  );
  assert.ok(
    /self-repair|FDIR/i.test(md) &&
      (/unsupervised|Fundacion|auto-fix|PRODUCTION_READY/i.test(md)),
    'NON-CLAIM: self-repair ≠ unsupervised prod auto-fix / Fundacion rewrite'
  );
  assert.ok(
    /sandbox|container|isolation/i.test(md) &&
      (/K8s|Kubernetes|multi-tenant|managed container|SaaS/i.test(md)),
    'NON-CLAIM: local-sandbox ≠ K8s multi-tenant / managed container SaaS'
  );
  assert.ok(
    md.includes('PRODUCTION_READY') && md.includes('NO'),
    'NON-CLAIM: PRODUCTION_READY remains NO'
  );
  assert.ok(
    /L17|Ladder 17/i.test(md) && /never reopen|CLOSED/i.test(md),
    'L17 CLOSED — never reopen'
  );
});

test('BB12: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-bb.mjs',
    'tests/eos-bb-ladder18-seam-pack.test.js',
    'docs/releases/EOS_LADDER_18_CLOSEOUT_2026-09-12.md',
    'docs/releases/EOS_MISSION_BB_LADDER18_SEAM_PACK_2026-09-12.md',
    'docs/governance/CI_CD_CONTRACT.ladder18-fragment.md',
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

test('BB13: patcher present and CRLF-safe ([^\\r\\n]* / [\\s\\S] patterns)', () => {
  assert.ok(exists('scripts/patch-mission-bb.mjs'), 'patch-mission-bb.mjs missing');
  const src = read('scripts/patch-mission-bb.mjs');
  assert.ok(src.includes('[^\\r\\n]*') || src.includes('[^\\r\\n]'), 'patcher must use CRLF-safe line matchers');
  assert.ok(src.includes('[\\s\\S]') || src.includes('[\\s\\S]*'), 'patcher must use [\\s\\S] for multi-line Set match');
  assert.ok(src.includes('PRODUCTION_READY'), 'patcher header must note PRODUCTION_READY');
});

test('BB14: assert-gha-contract needles for Ladder 18 (when assert file present)', () => {
  if (!exists('scripts/ci/assert-gha-contract.js')) return;
  const src = read('scripts/ci/assert-gha-contract.js');
  for (const s of LADDER18) {
    assert.ok(
      src.includes("'" + s + "'") || src.includes('"' + s + '"'),
      'assert-gha-contract missing needle ' + s
    );
  }
});

test('BB15: Antigravity-first / CloudAgent out markers in closeout + release', () => {
  const closeout = read('docs/releases/EOS_LADDER_18_CLOSEOUT_2026-09-12.md');
  const release = read('docs/releases/EOS_MISSION_BB_LADDER18_SEAM_PACK_2026-09-12.md');
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

test('BB16: tip honesty deferred; Expected tip StartsWith b206bf3 documented', () => {
  const closeout = read('docs/releases/EOS_LADDER_18_CLOSEOUT_2026-09-12.md');
  assert.ok(
    /tip honesty|post-BB tip refresh|deferred/i.test(closeout),
    'closeout must defer tip honesty to post-BB tip refresh'
  );
  assert.ok(
    closeout.includes('b206bf3'),
    'closeout must document Expected tip StartsWith b206bf3'
  );
});
