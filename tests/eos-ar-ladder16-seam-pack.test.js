/**
 * Mission AR / SPEC-0049 — Ladder 16 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER16 = [
  'test:multi-workstation-federation',
  'test:provider-failover-resilience',
  'test:hitl-po-authority',
  'test:evidence-export-notarization',
];

const MISSION_ALIASES = [
  'test:mission-an',
  'test:mission-ao',
  'test:mission-ap',
  'test:mission-aq',
];

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(rootDir, rel));
}

test('AR1: ci.yml seam-pack contains Ladder 16 AN/AO/AP/AQ satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER16) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('AR2: package.json scripts for Ladder 16 satellites + mission-ar / ar16 / l16', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER16) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  for (const alias of MISSION_ALIASES) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-ar'],
    'node --test tests/eos-ar-ladder16-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:ar16'],
    'node --test tests/eos-ar-ladder16-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:l16'],
    'node --test tests/eos-ar-ladder16-seam-pack.test.js'
  );
});

test('AR3: ladder16-pack chains AN+AO+AP+AQ + test:mission-ar', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:ladder16-pack'], 'string', 'missing test:ladder16-pack');
  for (const s of LADDER16) {
    assert.ok(
      pkg.scripts['test:ladder16-pack'].includes(s),
      'ladder16-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder16-pack'].includes('test:mission-ar'),
    'ladder16-pack must chain test:mission-ar'
  );
});

test('AR4: native-suite-pack extended with Ladder 16 satellites (when present)', () => {
  const pkg = JSON.parse(read('package.json'));
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER16) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
});

test('AR5: primary lock paths seed AN/AO/AP/AQ test files', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(
    pkg.scripts['test:multi-workstation-federation'].includes(
      'eos-an-multi-workstation-session-federation.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:provider-failover-resilience'].includes(
      'eos-ao-provider-failover-resilience.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:hitl-po-authority'].includes('eos-ap-hitl-po-authority-channel.test.js')
  );
  assert.ok(
    pkg.scripts['test:evidence-export-notarization'].includes(
      'eos-aq-evidence-export-notarization.test.js'
    )
  );
  assert.equal(
    pkg.scripts['test:mission-an'],
    pkg.scripts['test:multi-workstation-federation']
  );
  assert.equal(
    pkg.scripts['test:mission-ao'],
    pkg.scripts['test:provider-failover-resilience']
  );
  assert.equal(pkg.scripts['test:mission-ap'], pkg.scripts['test:hitl-po-authority']);
  assert.equal(
    pkg.scripts['test:mission-aq'],
    pkg.scripts['test:evidence-export-notarization']
  );
});

test('AR6: CI_CD_CONTRACT.md mentions Ladder 16 / Mission AR satellites', () => {
  assert.ok(exists('docs/governance/CI_CD_CONTRACT.md'), 'CI_CD_CONTRACT.md missing');
  const md = read('docs/governance/CI_CD_CONTRACT.md');
  assert.ok(
    md.includes('Ladder 16') || md.includes('Mission AR'),
    'contract missing Ladder 16 / Mission AR'
  );
  assert.ok(
    md.includes('test:multi-workstation-federation') ||
      md.includes('test:provider-failover-resilience') ||
      md.includes('test:hitl-po-authority') ||
      md.includes('test:evidence-export-notarization') ||
      md.includes('Ladder 16'),
    'contract missing Ladder 16 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
});

test('AR7: Ladder 16 closeout doc exists with CLOSED_FOR_LOCAL_GOVERNED_USE / AN–AQ MEASURED / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_16_CLOSEOUT_2026-09-12.md';
  assert.ok(exists(p), 'Ladder 16 closeout missing');
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
    'closeout must mark Ladder 16 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    md.includes('MEASURED') &&
      (md.includes('AN') || md.includes('multi-workstation')) &&
      (md.includes('AO') || md.includes('failover')) &&
      (md.includes('AP') || md.includes('HITL')) &&
      (md.includes('AQ') || md.includes('export')),
    'closeout must mark AN–AQ MEASURED'
  );
});

test('AR8: Mission AR release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_AR_LADDER16_SEAM_PACK_2026-09-12.md';
  assert.ok(exists(p), 'Mission AR release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0049') || md.includes('Mission AR'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:multi-workstation-federation') &&
      md.includes('test:provider-failover-resilience') &&
      md.includes('test:hitl-po-authority') &&
      md.includes('test:evidence-export-notarization')
  );
});

test('AR9: OpenSpec Mission AR artifacts exist (SPEC-0049)', () => {
  const base = 'openspec/changes/eos-mission-ar-ladder16-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/ladder16-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0049'));
});

test('AR10: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-ar-ladder16-seam-pack.test.js'") ||
      runner.includes('"eos-ar-ladder16-seam-pack.test.js"'),
    'eos-ar-ladder16-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('AR11: NON-CLAIM markers (federation≠fleet, failover≠PR LLM, HITL≠GH enforcement, export≠compliance cert)', () => {
  const md = read('docs/releases/EOS_LADDER_16_CLOSEOUT_2026-09-12.md');
  assert.ok(
    md.includes('NON-CLAIM') || md.includes('not flipped') || md.includes('≠'),
    'closeout must carry NON-CLAIM / honesty markers'
  );
  assert.ok(
    /federation/i.test(md) && /fleet|multi-tenant/i.test(md),
    'NON-CLAIM: federation ≠ fleet / multi-tenant SaaS'
  );
  assert.ok(
    /failover/i.test(md) && (/PRODUCTION_READY|SLA|LLM/i.test(md)),
    'NON-CLAIM: failover ≠ PRODUCTION_READY LLM ops / SLA'
  );
  assert.ok(
    /HITL|PO authority/i.test(md) && /GH|enforcement|IAM/i.test(md),
    'NON-CLAIM: HITL/PO ≠ GH enforcement / org IAM'
  );
  assert.ok(
    /export|notariz/i.test(md) && /compliance|certif|legal notary/i.test(md),
    'NON-CLAIM: export/notarization ≠ compliance certification'
  );
  assert.ok(
    md.includes('PRODUCTION_READY') && md.includes('NO'),
    'NON-CLAIM: PRODUCTION_READY remains NO'
  );
});

test('AR12: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-ar.mjs',
    'tests/eos-ar-ladder16-seam-pack.test.js',
    'docs/releases/EOS_LADDER_16_CLOSEOUT_2026-09-12.md',
    'docs/releases/EOS_MISSION_AR_LADDER16_SEAM_PACK_2026-09-12.md',
    'docs/governance/CI_CD_CONTRACT.ladder16-fragment.md',
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

test('AR13: patcher present and CRLF-safe ([^\\r\\n]* / [\\s\\S] patterns)', () => {
  assert.ok(exists('scripts/patch-mission-ar.mjs'), 'patch-mission-ar.mjs missing');
  const src = read('scripts/patch-mission-ar.mjs');
  assert.ok(src.includes('[^\\r\\n]*') || src.includes('[^\\r\\n]'), 'patcher must use CRLF-safe line matchers');
  assert.ok(src.includes('[\\s\\S]') || src.includes('[\\s\\S]*'), 'patcher must use [\\s\\S] for multi-line Set match');
  assert.ok(src.includes('PRODUCTION_READY'), 'patcher header must note PRODUCTION_READY');
});

test('AR14: assert-gha-contract needles for Ladder 16 (when assert file present)', () => {
  if (!exists('scripts/ci/assert-gha-contract.js')) return;
  const src = read('scripts/ci/assert-gha-contract.js');
  for (const s of LADDER16) {
    assert.ok(
      src.includes("'" + s + "'") || src.includes('"' + s + '"'),
      'assert-gha-contract missing needle ' + s
    );
  }
});

test('AR15: Antigravity-first / CloudAgent out markers in closeout + release', () => {
  const closeout = read('docs/releases/EOS_LADDER_16_CLOSEOUT_2026-09-12.md');
  const release = read('docs/releases/EOS_MISSION_AR_LADDER16_SEAM_PACK_2026-09-12.md');
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
