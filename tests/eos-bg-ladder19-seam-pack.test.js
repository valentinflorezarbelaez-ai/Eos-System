/**
 * Mission BG / SPEC-0064 — Ladder 19 CI Seam-Pack Consolidation lock suite.
 * Reads host (or harness) repo from process.cwd().
 * PRODUCTION_READY=NO; Fundacion Δ=0; no AI attribution; Law VI: no static provider-secret prefix literals.
 * L17 CLOSED — never reopen. L18 CLOSED — never reopen.
 * After BG, Ladder 19 is CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L19 after closeout.
 * Tip honesty ritual deferred to post-BG tip refresh (not this mission).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const LADDER19 = [
  'test:governed-patch-apply',
  'test:multi-target-delivery',
  'test:verification-replay',
  'test:local-rc-packaging',
];

const MISSION_ALIASES = [
  'test:mission-bc',
  'test:mission-bd',
  'test:mission-be',
  'test:mission-bf',
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

test('BG1: ci.yml seam-pack contains Ladder 19 BC/BD/BE/BF satellites (fail-closed)', () => {
  assert.ok(exists('.github/workflows/ci.yml'), 'ci.yml missing — run patcher / bootstrap on host');
  const yaml = read('.github/workflows/ci.yml');
  assert.match(yaml, /^  seam-pack:/m);
  assert.match(yaml, /name:\s*CI GameDay \/ ROI seam pack/);
  for (const s of LADDER19) {
    assert.ok(yaml.includes('npm run ' + s), 'ci.yml seam-pack missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('BG2: package.json scripts for Ladder 19 satellites + mission-bg / bg19 / l19', () => {
  assert.ok(exists('package.json'), 'package.json missing');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts, 'object');
  for (const s of LADDER19) {
    assert.equal(typeof pkg.scripts[s], 'string', 'missing satellite script ' + s);
  }
  for (const alias of MISSION_ALIASES) {
    assert.equal(typeof pkg.scripts[alias], 'string', 'missing alias ' + alias);
  }
  assert.equal(
    pkg.scripts['test:mission-bg'],
    'node --test tests/eos-bg-ladder19-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:bg19'],
    'node --test tests/eos-bg-ladder19-seam-pack.test.js'
  );
  assert.equal(
    pkg.scripts['test:l19'],
    'node --test tests/eos-bg-ladder19-seam-pack.test.js'
  );
});

test('BG3: ladder19-pack chains BC+BD+BE+BF + test:mission-bg', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.scripts['test:ladder19-pack'], 'string', 'missing test:ladder19-pack');
  for (const s of LADDER19) {
    assert.ok(
      pkg.scripts['test:ladder19-pack'].includes(s),
      'ladder19-pack missing ' + s
    );
  }
  assert.ok(
    pkg.scripts['test:ladder19-pack'].includes('test:mission-bg'),
    'ladder19-pack must chain test:mission-bg'
  );
});

test('BG4: native-suite-pack extended with Ladder 19 satellites (when present)', () => {
  const pkg = JSON.parse(read('package.json'));
  if (typeof pkg.scripts['test:native-suite-pack'] === 'string') {
    for (const s of LADDER19) {
      assert.ok(
        pkg.scripts['test:native-suite-pack'].includes(s),
        'native-suite-pack missing ' + s
      );
    }
  }
});

test('BG5: primary lock paths seed BC/BD/BE/BF test files', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.ok(
    pkg.scripts['test:governed-patch-apply'].includes(
      'eos-bc-governed-patch-diff-apply-port.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:multi-target-delivery'].includes(
      'eos-bd-multi-worktree-multi-target-delivery-port.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:verification-replay'].includes(
      'eos-be-verification-replay-golden-receipt-port.test.js'
    )
  );
  assert.ok(
    pkg.scripts['test:local-rc-packaging'].includes(
      'eos-bf-local-rc-packaging-artifact-notary-port.test.js'
    )
  );
  assert.equal(
    pkg.scripts['test:mission-bc'],
    pkg.scripts['test:governed-patch-apply']
  );
  assert.equal(
    pkg.scripts['test:mission-bd'],
    pkg.scripts['test:multi-target-delivery']
  );
  assert.equal(
    pkg.scripts['test:mission-be'],
    pkg.scripts['test:verification-replay']
  );
  assert.equal(
    pkg.scripts['test:mission-bf'],
    pkg.scripts['test:local-rc-packaging']
  );
});

test('BG6: CI_CD_CONTRACT.md + fragment mention Ladder 19 / Mission BG satellites', () => {
  const contractRel = resolveContractRel();
  assert.ok(exists(contractRel), 'CI_CD_CONTRACT.md missing');
  const md = read(contractRel);
  assert.ok(
    md.includes('Ladder 19') || md.includes('Mission BG'),
    'contract missing Ladder 19 / Mission BG'
  );
  assert.ok(
    md.includes('test:governed-patch-apply') ||
      md.includes('test:multi-target-delivery') ||
      md.includes('test:verification-replay') ||
      md.includes('test:local-rc-packaging') ||
      md.includes('Ladder 19'),
    'contract missing Ladder 19 satellite references'
  );
  assert.ok(md.includes('PRODUCTION_READY') && /NO/i.test(md));
  const frag = 'docs/governance/CI_CD_CONTRACT.ladder19-fragment.md';
  assert.ok(exists(frag), 'ladder19 contract fragment missing');
  const fragMd = read(frag);
  assert.ok(
    fragMd.includes('Ladder 19') &&
      (fragMd.includes('test:governed-patch-apply') || fragMd.includes('Mission BG')),
    'fragment must document Ladder 19 / Mission BG'
  );
});

test('BG7: Ladder 19 closeout doc exists with CLOSED_FOR_LOCAL_GOVERNED_USE / BC–BF+BG MEASURED / PRODUCTION_READY=NO / Fundacion Δ=0', () => {
  const p = 'docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md';
  assert.ok(exists(p), 'Ladder 19 closeout missing');
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
    'closeout must mark Ladder 19 CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.ok(
    md.includes('MEASURED') &&
      (md.includes('BC') || md.includes('governed-patch') || md.includes('governed patch')) &&
      (md.includes('BD') || md.includes('multi-target') || md.includes('multi-worktree')) &&
      (md.includes('BE') || md.includes('verification-replay') || md.includes('golden')) &&
      (md.includes('BF') || md.includes('rc-packaging') || md.includes('notary')) &&
      (md.includes('BG') || md.includes('seam-pack')),
    'closeout must mark BC+BD+BE+BF+BG MEASURED'
  );
  assert.ok(
    /Sovereign Delivery & Verification Fabric/i.test(md),
    'closeout must name the L19 axis'
  );
});

test('BG8: Mission BG release report exists', () => {
  const p = 'docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md';
  assert.ok(exists(p), 'Mission BG release report missing');
  const md = read(p);
  assert.ok(md.includes('SPEC-0064') || md.includes('Mission BG'));
  assert.ok(md.includes('PRODUCTION_READY') && md.includes('NO'));
  assert.ok(
    md.includes('test:governed-patch-apply') &&
      md.includes('test:multi-target-delivery') &&
      md.includes('test:verification-replay') &&
      md.includes('test:local-rc-packaging')
  );
});

test('BG9: OpenSpec Mission BG artifacts exist (SPEC-0064)', () => {
  const base = 'openspec/changes/eos-mission-bg-ladder19-closeout-seam-pack';
  for (const rel of [
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'specs/mission-bg-ladder19-closeout-seam-pack/spec.md',
  ]) {
    assert.ok(exists(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
  const yaml = read(path.join(base, '.openspec.yaml'));
  assert.ok(yaml.includes('SPEC-0064'));
});

test('BG10: lock test is slim-excluded (TR-01 ≤145)', () => {
  assert.ok(exists('scripts/test-runner.js'), 'test-runner.js missing');
  const runner = read('scripts/test-runner.js');
  assert.ok(
    runner.includes("'eos-bg-ladder19-seam-pack.test.js'") ||
      runner.includes('"eos-bg-ladder19-seam-pack.test.js"'),
    'eos-bg-ladder19-seam-pack.test.js must be in SLIM_SUITE_EXCLUDES'
  );
});

test('BG11: NON-CLAIM markers (GH Team/enforcement, PRODUCTION_READY, L19 satellite fences)', () => {
  const md = read('docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md');
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
    /governed.?patch|diff apply/i.test(md) &&
      (/auto-merge|GH Actions replacement/i.test(md)),
    'NON-CLAIM: governed patch ≠ unsupervised auto-merge SaaS / GH Actions replacement'
  );
  assert.ok(
    /multi-target|multi-worktree/i.test(md) &&
      (/cloud fleet|K8s|Kubernetes/i.test(md)),
    'NON-CLAIM: multi-target delivery ≠ multi-tenant cloud fleet / K8s CD'
  );
  assert.ok(
    /verification replay|golden receipt/i.test(md) &&
      (/SIEM|billing/i.test(md)),
    'NON-CLAIM: verification replay ≠ SIEM product / billing accuracy SaaS'
  );
  assert.ok(
    /RC packaging|artifact notary|rc-packaging/i.test(md) &&
      (/public registry|GH Releases|PRODUCTION_READY=YES/i.test(md)),
    'NON-CLAIM: local RC packaging ≠ PRODUCTION_READY=YES / public registry / GH Releases'
  );
});

test('BG12: no continue-on-error; Fundacion freeze kept; Law VI no static provider-secret prefixes', () => {
  const yaml = read('.github/workflows/ci.yml');
  assert.equal(/continue-on-error:\s*true/.test(yaml), false);
  assert.ok((yaml.match(/Fundacion freeze/g) || []).length >= 1);

  // Law VI: construct needle at runtime (never embed the forbidden prefix as a source literal)
  const forbiddenPrefix = ['s', 'k', String.fromCharCode(45)].join('');
  const scanRels = [
    'scripts/patch-mission-bg.mjs',
    'tests/eos-bg-ladder19-seam-pack.test.js',
    'docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md',
    'docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md',
    'docs/governance/CI_CD_CONTRACT.ladder19-fragment.md',
    'docs/adrs/ADR-0022-mission-bg-ladder19-closeout-seam-pack.md',
    'docs/evidence/EOS_MISSION_BG_EVIDENCE_2026-09-14.md',
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

  // Law VI MODULE_DIR: Mission BG ships no src/ modules (docs+scripts closeout).
  // Scan only BG touchpoints above — never whole-repo src/ (pre-existing unrelated files).
});

test('BG13: patcher present and CRLF-safe ([^\\r\\n]* / [\\s\\S] patterns)', () => {
  assert.ok(exists('scripts/patch-mission-bg.mjs'), 'patch-mission-bg.mjs missing');
  const src = read('scripts/patch-mission-bg.mjs');
  assert.ok(src.includes('[^\\r\\n]*') || src.includes('[^\\r\\n]'), 'patcher must use CRLF-safe line matchers');
  assert.ok(src.includes('[\\s\\S]') || src.includes('[\\s\\S]*'), 'patcher must use [\\s\\S] for multi-line Set match');
  assert.ok(src.includes('PRODUCTION_READY'), 'patcher header must note PRODUCTION_READY');
});

test('BG14: assert-gha-contract needles for Ladder 19 (when assert file present)', () => {
  if (!exists('scripts/ci/assert-gha-contract.js')) return;
  const src = read('scripts/ci/assert-gha-contract.js');
  for (const s of LADDER19) {
    assert.ok(
      src.includes("'" + s + "'") || src.includes('"' + s + '"'),
      'assert-gha-contract missing needle ' + s
    );
  }
});

test('BG15: Antigravity-first / CloudAgent out markers in closeout + release', () => {
  const closeout = read('docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md');
  const release = read('docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md');
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

test('BG16: tip honesty deferred; Expected tip StartsWith 37a36e9 documented', () => {
  const closeout = read('docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md');
  assert.ok(
    /tip honesty|post-BG tip refresh|deferred/i.test(closeout),
    'closeout must defer tip honesty to post-BG tip refresh'
  );
  assert.ok(
    closeout.includes('37a36e9'),
    'closeout must document Expected tip StartsWith 37a36e9'
  );
});

test('BG17: L17/L18 CLOSED never-reopen; L19 CLOSED_FOR_LOCAL_GOVERNED_USE (never left OPEN)', () => {
  const closeout = read('docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md');
  const release = read('docs/releases/EOS_MISSION_BG_LADDER19_SEAM_PACK_2026-09-14.md');
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
      md.includes('CLOSED_FOR_LOCAL_GOVERNED_USE'),
      'docs must mark L19 CLOSED_FOR_LOCAL_GOVERNED_USE'
    );
    assert.equal(
      /L19 stays OPEN|L19 remains OPEN|L19:\s*\*?\*?OPEN\b|Ladder 19\s+(is\s+)?\*?\*?OPEN\b/i.test(md),
      false,
      'BG docs must not leave Ladder 19 OPEN after closeout'
    );
  }
});

test('BG18: dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE + ADR-0022 rejected alts', () => {
  const closeout = read('docs/releases/EOS_LADDER_19_CLOSEOUT_2026-09-14.md');
  assert.ok(
    closeout.includes('COMPLETE_FOR_LOCAL_GOVERNED_USE'),
    'closeout must carry dictamen COMPLETE_FOR_LOCAL_GOVERNED_USE'
  );
  const adrRel = 'docs/adrs/ADR-0022-mission-bg-ladder19-closeout-seam-pack.md';
  assert.ok(exists(adrRel), 'ADR-0022 missing');
  const adr = read(adrRel);
  assert.ok(/Decision/i.test(adr), 'ADR must have Decision');
  assert.ok(/Consequences/i.test(adr), 'ADR must have Consequences');
  assert.ok(/NON-CLAIM/i.test(adr), 'ADR must have NON-CLAIM');
  assert.ok(/soak/i.test(adr) && /continue-on-error/i.test(adr), 'ADR reject: soak/continue-on-error pack');
  assert.ok(
    /required-check|billing|GH Team|Enterprise enforcement/i.test(adr),
    'ADR reject: GH required-check billing upgrade as product'
  );
  assert.ok(
    /reopen(ing)? L19/i.test(adr),
    'ADR reject: reopening L19 after closeout'
  );
  assert.ok(
    /soft-fail|soft fail/i.test(adr),
    'ADR reject: soft-fail seam-pack'
  );
});
