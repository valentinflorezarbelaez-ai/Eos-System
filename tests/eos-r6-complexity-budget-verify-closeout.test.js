import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertGithubActionsContract } from '../scripts/ci/assert-gha-contract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const R_SEAM = ['test:r4', 'test:r5'];
const R6_EVIDENCE = 'docs/releases/EOS_R6_COMPLEXITY_BUDGET_VERIFY_CLOSEOUT_2026-09-09.md';
const R4_EVIDENCE = 'docs/releases/EOS_R4_AT_CEILING_SCHEMA_GATE_2026-09-09.md';
const OPENSPEC = 'openspec/changes/eos-r6-complexity-budget-verify-closeout';

test('R6: K6 CLOSED_BY_R4 — OpenSpec documents residual-only closeout', () => {
  const proposal = fs.readFileSync(path.join(rootDir, OPENSPEC, 'proposal.md'), 'utf8');
  const design = fs.readFileSync(path.join(rootDir, OPENSPEC, 'design.md'), 'utf8');
  assert.ok(/CLOSED_BY_R4/i.test(proposal) || /CLOSED_BY_R4/i.test(design));
  assert.ok(proposal.includes('complexity-budget-lock') || design.includes('complexity-budget-lock'));
  assert.ok(/do not reimplement|MUST NOT reimplement|not reimplement/i.test(proposal + '\n' + design));
});

test('R6: verify-eos imports and wires auditComplexityBudgetLock (R4 lock; no duplicate)', () => {
  const src = fs.readFileSync(path.join(rootDir, 'scripts/verify-eos.js'), 'utf8');
  assert.ok(src.includes("from './lib/complexity-budget-lock.js'") || src.includes('complexity-budget-lock'));
  assert.ok(src.includes('auditComplexityBudgetLock'));
  assert.ok(src.includes('COMPLEXITY_BUDGET_REQUIRED_PATHS') || src.includes('complexity-budget-lock'));
  // single lock module path — no parallel r6 lock reinvent
  assert.equal(fs.existsSync(path.join(rootDir, 'scripts/lib/complexity-budget-lock.js')), true);
  assert.equal(fs.existsSync(path.join(rootDir, 'scripts/lib/complexity-budget-verify-closeout-lock.js')), false);
});

test('R6: CI workflow seam-pack runs Ladder6 test:r4 and test:r5', () => {
  const yaml = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
  assert.match(yaml, /^  seam-pack:/m);
  for (const s of R_SEAM) {
    assert.ok(yaml.includes(s), 'ci.yml missing ' + s);
  }
  assert.ok(yaml.includes('Fundacion'), 'seam-pack must keep Fundacion freeze');
  assert.equal(yaml.includes('continue-on-error: true'), false);
  const seamBody = yaml.split('seam-pack:')[1] || '';
  assert.equal(/soak/i.test(seamBody), false, 'seam-pack must not add soak');
});

test('R6: CI_CD_CONTRACT.md documents r4+r5 seam-pack', () => {
  const md = fs.readFileSync(path.join(rootDir, 'docs/governance/CI_CD_CONTRACT.md'), 'utf8');
  assert.ok(md.includes('test:r4'));
  assert.ok(md.includes('test:r5'));
  assert.ok(md.includes('R6 seam-pack note') || md.includes('R6 seam-pack'));
});

test('R6: assert-gha-contract verifies Ladder6 R seam surface', () => {
  const result = assertGithubActionsContract(rootDir);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test('R6: package script test:r6 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(
    pkg.scripts['test:r6'],
    'node --test tests/eos-r6-complexity-budget-verify-closeout.test.js'
  );
  assert.ok(pkg.scripts['test:r4'], 'test:r4 must remain');
  assert.ok(pkg.scripts['test:r5'], 'test:r5 must remain');
});

test('R6: NON-CLAIM candado ≠ prune (R4 + R6 evidence)', () => {
  const r4 = fs.readFileSync(path.join(rootDir, R4_EVIDENCE), 'utf8');
  assert.ok(/NON-CLAIM/i.test(r4));
  assert.ok(
    /[Gg]ate\s*!=\s*executed prune|[Gg]ate\s*≠\s*executed prune|candado\s*≠\s*(executed )?prune|candado!=prune|Gate != executed prune/i.test(
      r4
    ) ||
      (r4.includes('Gate') && /prune/i.test(r4) && /NON-CLAIM/i.test(r4)),
    'R4 evidence must state gate/candado != prune'
  );

  const r6 = fs.readFileSync(path.join(rootDir, R6_EVIDENCE), 'utf8');
  assert.ok(/NON-CLAIM/i.test(r6));
  assert.ok(
    /candado\s*≠\s*(executed )?prune|candado\s*!=\s*(executed )?prune|[Cc]andado\s*≠\s*prune|[Gg]ate\s*!=\s*executed prune|candado≠prune/i.test(
      r6
    ) ||
      (/candado/i.test(r6) && /prune/i.test(r6) && /≠|!=|no es|≠ executed/i.test(r6)),
    'R6 evidence must restate NON-CLAIM candado != prune'
  );
  assert.ok(/CLOSED_BY_R4/i.test(r6));
  assert.ok(/PRODUCTION_READY:\*\*\s*NO|PRODUCTION_READY:\s*NO/i.test(r6));
  assert.ok(/Fundacion/i.test(r6) && /Delta\s*=\s*0|Δ\s*=\s*0|Delta=0/i.test(r6));
});

test('R6: freeze note states Ladder 6 R1–R6 close pending merge', () => {
  const freeze = fs.readFileSync(path.join(rootDir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md'), 'utf8');
  assert.ok(/R6/i.test(freeze));
  assert.ok(
    /R1.?R6|Ladder 6 R1|close pending|cierre pendiente|pending this merge|pendiente (de )?este merge/i.test(
      freeze
    ),
    'freeze must note Ladder 6 R1-R6 close pending merge'
  );
});
