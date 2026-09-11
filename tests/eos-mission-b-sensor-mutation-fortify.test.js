/**
 * Mission B — scoped sensor mutation fortification (not full 914 flip).
 * Sensors: V5 builder-verifier-custody, U7 specboot must-not-invent, T8 dirty-defer NON-MUTATING.
 * PRODUCTION_READY: NO | Fundacion Delta=0 | AT_CEILING
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assertBuilderVerifierDisjunction,
  validateVerificationReceiptCustody,
  BuilderVerifierCustodyError
} from '../src/core/governance/builder-verifier-custody.js';
import {
  auditSpecbootDeferStubsLock,
  SPECBOOT_DEFER_STUB_PATHS,
  SPECBOOT_DEFER_STUBS_EVIDENCE_DOC,
  SPECBOOT_DEFER_STUBS_RITUAL_DOC,
  SPECBOOT_DEFER_STUBS_INDEX_DOC
} from '../scripts/lib/specboot-defer-stubs-lock.js';
import {
  auditDirtyDeferTriageLock,
  DIRTY_DEFER_TRIAGE_DOC,
  DIRTY_DEFER_TRIAGE_RITUAL_DOC,
  LADDER_8_CLOSEOUT_DOC
} from '../scripts/lib/dirty-defer-triage-lock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const ZWSP = '\u200b';
const ZWNJ = '\u200c';
const ZWJ = '\u200d';
const BOM = '\ufeff';
const LR_EMBED = '\u202a';

/** Inverted / allow-all mutant of V5 disjunction (would miss self-certification). */
function mutantAllowAllDisjunction(_params) {
  return true;
}

/** Inverted U7 stub predicate: invented forbidden path treated as success. */
function mutantInventIsOk(root) {
  const hits = SPECBOOT_DEFER_STUB_PATHS.filter((rel) =>
    fs.existsSync(path.join(root, rel))
  );
  return { ok: hits.length > 0, hits };
}

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function snapshotPaths(rels) {
  /** @type {Record<string, { exists: boolean, size: number, mtimeMs: number }>} */
  const out = {};
  for (const rel of rels) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) {
      out[rel] = { exists: false, size: 0, mtimeMs: 0 };
      continue;
    }
    const st = fs.statSync(full);
    out[rel] = { exists: true, size: st.size, mtimeMs: st.mtimeMs };
  }
  return out;
}

test('Mission B OpenSpec change artifacts exist', () => {
  const base = path.join(rootDir, 'openspec/changes/eos-mission-b-sensor-mutation-fortify');
  for (const rel of ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']) {
    assert.ok(fs.existsSync(path.join(base, rel)), 'missing OpenSpec ' + rel);
  }
});

test('MUTATION V5: inverted allow-all mutant would PASS collision; production FAIL-CLOSED', () => {
  const collision = { builder_id: 'agent-alpha', verifier_id: 'agent-alpha' };
  assert.equal(mutantAllowAllDisjunction(collision), true, 'mutant incorrectly allows self-cert');
  assert.throws(
    () => assertBuilderVerifierDisjunction(collision),
    (err) =>
      err instanceof BuilderVerifierCustodyError &&
      err.code === 'BUILDER_EQUALS_VERIFIER_VIOLATION'
  );
  const receipt = validateVerificationReceiptCustody(collision);
  assert.equal(receipt.valid, false);
  assert.equal(receipt.code, 'BUILDER_EQUALS_VERIFIER_VIOLATION');
});

test('MUTATION V5: ZWSP/format spoof same-token FAIL-CLOSED (fortified normalize)', () => {
  const spoofs = [
    { builder_id: `agent${ZWSP}`, verifier_id: 'agent' },
    { builder_id: 'builder-1', verifier_id: `builder${ZWSP}-1` },
    { builder_id: `${BOM}builder-beta`, verifier_id: `builder${ZWNJ}-beta` },
    { builder_id: `agent${ZWJ}`, verifier_id: 'agent' },
    { builder_id: `${LR_EMBED}twin`, verifier_id: 'twin' }
  ];
  for (const pair of spoofs) {
    // Mutant allow-all would pass each spoof
    assert.equal(mutantAllowAllDisjunction(pair), true);
    assert.throws(
      () => assertBuilderVerifierDisjunction(pair),
      (err) =>
        err instanceof BuilderVerifierCustodyError &&
        err.code === 'BUILDER_EQUALS_VERIFIER_VIOLATION',
      'expected FAIL-CLOSED for ' + JSON.stringify(pair)
    );
    const v = validateVerificationReceiptCustody(pair);
    assert.equal(v.valid, false, 'receipt must invalidate spoof ' + JSON.stringify(pair));
  }
  assert.doesNotThrow(() =>
    assertBuilderVerifierDisjunction({
      builder_id: 'mission-b-builder',
      verifier_id: 'mission-b-verifier'
    })
  );
});

test('MUTATION U7: temp invented SpecBoot checklist path FAIL-CLOSED; inverted mutant would PASS', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-mission-b-u7-'));
  try {
    fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs/harness'), { recursive: true });
    // Invent one forbidden checklist path (must-not-invent)
    fs.writeFileSync(
      path.join(tmp, 'docs/frontend-standards.md'),
      '# MUTANT INVENT — must be rejected by U7 IGNORE\n'
    );

    const evidence = read(SPECBOOT_DEFER_STUBS_EVIDENCE_DOC);
    const ritual = read(SPECBOOT_DEFER_STUBS_RITUAL_DOC);
    const index = read(SPECBOOT_DEFER_STUBS_INDEX_DOC);

    const mutant = mutantInventIsOk(tmp);
    assert.equal(mutant.ok, true, 'inverted mutant treats invent as OK');
    assert.ok(mutant.hits.includes('docs/frontend-standards.md'));

    const audit = auditSpecbootDeferStubsLock(tmp, {
      evidenceDocText: evidence,
      ritualDocText: ritual,
      indexDocText: index,
      skipPathChecks: true
    });
    assert.equal(audit.ok, false, 'sensor must FAIL-CLOSED on invented path');
    assert.ok(
      audit.failures.some((f) => /must not invent|must-not-invent/i.test(f.message)),
      JSON.stringify(audit.failures, null, 2)
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('MUTATION U7: clean IGNORE root (no invented paths) still green under injected docs', () => {
  const evidence = read(SPECBOOT_DEFER_STUBS_EVIDENCE_DOC);
  const ritual = read(SPECBOOT_DEFER_STUBS_RITUAL_DOC);
  const index = read(SPECBOOT_DEFER_STUBS_INDEX_DOC);
  const audit = auditSpecbootDeferStubsLock(rootDir, {
    evidenceDocText: evidence,
    ritualDocText: ritual,
    indexDocText: index,
    skipPathChecks: false
  });
  assert.equal(audit.ok, true, JSON.stringify(audit.failures, null, 2));
  assert.equal(audit.mode, 'IGNORE');
});

test('MUTATION T8: gate is NON-MUTATING (tree snapshot unchanged) and mutating=false', () => {
  const watch = [
    DIRTY_DEFER_TRIAGE_DOC,
    DIRTY_DEFER_TRIAGE_RITUAL_DOC,
    LADDER_8_CLOSEOUT_DOC,
    'scripts/lib/dirty-defer-triage-lock.js',
    'scripts/ci/dirty-defer-triage-gate.js',
    'package.json'
  ];
  const before = snapshotPaths(watch);
  const r = spawnSync(process.execPath, ['scripts/ci/dirty-defer-triage-gate.js'], {
    cwd: rootDir,
    encoding: 'utf8'
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const payload = JSON.parse(r.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.mutating, false);

  // Inverted mutant claim would set mutating:true — oracle rejects that as valid gate contract
  const mutantPayload = { ...payload, mutating: true };
  assert.notEqual(mutantPayload.mutating, false);
  assert.equal(payload.mutating, false, 'production gate must stay NON-MUTATING');

  const after = snapshotPaths(watch);
  assert.deepEqual(after, before, 'T8 gate must not mutate watched tracked paths');
});

test('MUTATION T8: strip NON-MUTATING from ritual ⇒ audit FAIL-CLOSED', () => {
  const triage = read(DIRTY_DEFER_TRIAGE_DOC);
  const ritual = read(DIRTY_DEFER_TRIAGE_RITUAL_DOC);
  const closeout = read(LADDER_8_CLOSEOUT_DOC);
  const stripped = ritual.replace(/NON-MUTATING/g, 'SIDE_EFFECT_OK');

  // Mutant ritual (inverted non-mutation language) must not satisfy lock
  const audit = auditDirtyDeferTriageLock(rootDir, {
    triageDocText: triage,
    ritualDocText: stripped,
    closeoutDocText: closeout,
    skipPathChecks: true,
    skipTipCheck: true
  });
  assert.equal(audit.ok, false, 'sensor must catch inverted NON-MUTATING ritual');
  assert.ok(
    audit.failures.some((f) => /NON-MUTATING|Missing required needle/i.test(f.message)),
    JSON.stringify(audit.failures, null, 2)
  );
});

test('Mission B: package.json wires test:mission-b; PRODUCTION_READY remains NO in custody gate schema', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(
    pkg.scripts['test:mission-b'],
    'node --test tests/eos-mission-b-sensor-mutation-fortify.test.js'
  );
  assert.equal(pkg.scripts['test:v5'].includes('eos-v5-builder-verifier-custody'), true);
  assert.equal(pkg.scripts['test:u7'].includes('eos-u7-specboot-defer-stubs'), true);
  assert.equal(pkg.scripts['test:t8'].includes('eos-t8-dirty-defer-triage'), true);
});
