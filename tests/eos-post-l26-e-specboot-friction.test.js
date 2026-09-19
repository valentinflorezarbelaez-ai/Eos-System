/**
 * Post-L26 Workstream E — SpecBoot friction gate tests.
 * Minimal harness matrix: happy path + refusal paths
 * (missing prereqs, dirty, stale, ambiguous ownership, human-gate refuse).
 *
 * NON-CLAIM: green tests ≠ automatic closure ≠ PRODUCTION_READY flip.
 * PRODUCTION_READY: NO
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');

const HEAD = '4828087faaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CHANGE_TIP = '4828087faaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OWNER = 'Valentin Florez';

async function load() {
  return import('../src/core/specboot/specboot-friction-gate.js');
}

/** Happy-path fixture file map for a propose/apply-ready change. */
function happyFileMap(changeId = 'eos-demo-change') {
  const dir = `openspec/changes/${changeId}`;
  return {
    'docs/harness/SPECBOOT_CYCLE.md': '# SpecBoot cycle\n',
    [`${dir}/proposal.md`]: '# Proposal\n',
    [`${dir}/tasks.md`]: '- [ ] T1. do thing\n'
  };
}

function baseHappy(mod, overrides = {}) {
  const changeId = overrides.changeId || 'eos-demo-change';
  return {
    step: 'apply',
    changeId,
    fileMap: happyFileMap(changeId),
    dirty: false,
    primaryOwner: OWNER,
    owners: [OWNER],
    expectedOperator: OWNER,
    changeTip: CHANGE_TIP,
    headSha: HEAD,
    allowHeadAhead: false,
    lagCommits: 0,
    ...overrides
  };
}

// ─── constants / inventory ───────────────────────────────────────────────────

test('E/const: schema + PRODUCTION_READY=NO + LIDR steps', async () => {
  const mod = await load();
  assert.equal(mod.FRICTION_GATE_SCHEMA, 'eos.specboot-friction-gate.v1');
  assert.equal(mod.FRICTION_GATE_PRODUCTION_READY, 'NO');
  assert.ok(mod.LIDR_STEPS.includes('enrich_us'));
  assert.ok(mod.LIDR_STEPS.includes('propose'));
  assert.ok(mod.LIDR_STEPS.includes('apply'));
  assert.ok(mod.LIDR_STEPS.includes('verify'));
  assert.ok(mod.LIDR_STEPS.includes('archive'));
  assert.ok(mod.LIDR_STEPS.includes('commit'));
  assert.ok(mod.LIDR_STEPS.includes('publish'));
  assert.ok(mod.FRICTION_INVENTORY_IDS.length >= 8);
  assert.ok(mod.SAFE_AUTOMATION_IDS.includes('A6_PRESERVE_HUMAN_SEAL_GATE'));
  assert.ok(mod.SAFE_AUTOMATION_IDS.includes('A7_PRESERVE_HUMAN_PROD_GATE'));
});

test('E/step: normalizeStep aliases enrich-us / ff / adversarial-review', async () => {
  const mod = await load();
  assert.equal(mod.normalizeStep('/enrich-us'), 'enrich_us');
  assert.equal(mod.normalizeStep('ff'), 'propose');
  assert.equal(mod.normalizeStep('adversarial-review'), 'code_review');
  assert.equal(mod.normalizeStep('not-a-step'), null);
});

// ─── HAPPY PATH ──────────────────────────────────────────────────────────────

test('E/pass: clean apply with owner + fresh tip + prereqs → ok', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(baseHappy(mod));
  assert.equal(gate.ok, true);
  assert.equal(gate.exit_code, mod.EXIT.PASS);
  assert.equal(gate.PRODUCTION_READY, 'NO');
  assert.equal(gate.step, 'apply');
  assert.equal(gate.auto_seal, false);
  assert.equal(gate.auto_production_ready_flip, false);
  assert.equal(gate.fundacion_delta, 0);
  assert.equal(gate.dirty.dirty, false);
  assert.equal(gate.stale.stale, false);
  assert.equal(gate.ownership.ok, true);
  assert.equal(gate.prerequisites.ok, true);
  assert.match(gate.note, /FRICTION_GATE_PASS/);
  assert.ok(gate.non_claims.some((c) => /Fewer manual steps/i.test(c)));
});

test('E/pass: enrich_us with SPECBOOT_CYCLE present', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'enrich_us',
      fileMap: {
        'docs/harness/SPECBOOT_CYCLE.md': '# cycle\n'
      }
    })
  );
  assert.equal(gate.ok, true);
  assert.equal(gate.step, 'enrich_us');
});

test('E/pass: verify with evidence + clean state', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'verify',
      verifyEvidence: { pass_count: 12, fail_count: 0 }
    })
  );
  assert.equal(gate.ok, true);
});

test('E/pass: archive with verify_evidence + human not required yet', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'archive',
      verifyEvidence: true
    })
  );
  assert.equal(gate.ok, true);
  assert.equal(gate.step, 'archive');
});

test('E/pass: commit with humanCommitAck', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'commit',
      humanCommitAck: true
    })
  );
  assert.equal(gate.ok, true);
});

test('E/pass: HEAD ahead with allowHeadAhead+lagCommits>0 not stale', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      headSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      changeTip: CHANGE_TIP,
      allowHeadAhead: true,
      lagCommits: 2
    })
  );
  assert.equal(gate.ok, true);
  assert.equal(gate.stale.stale, false);
});

// ─── REFUSAL: missing prerequisites ──────────────────────────────────────────

test('E/refuse/prereq: apply without proposal.md → MISSING_PREREQUISITES', async () => {
  const mod = await load();
  const changeId = 'eos-demo-change';
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      changeId,
      fileMap: {
        'docs/harness/SPECBOOT_CYCLE.md': '#\n',
        [`openspec/changes/${changeId}/tasks.md`]: '- [ ] T1\n'
        // proposal.md missing
      }
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.MISSING_PREREQUISITES);
  assert.equal(gate.exit_code, mod.EXIT.MISSING_PREREQUISITES);
  assert.ok(
    gate.refuses.some((r) => /proposal\.md/i.test(r.detail || '') || (r.missing || []).some((m) => /proposal/.test(m)))
  );
  assert.ok(gate.refuses[0].actionable);
});

test('E/refuse/prereq: archive without verify_evidence → MISSING_PREREQUISITES', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'archive'
      // no verifyEvidence
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.MISSING_PREREQUISITES);
  assert.ok(gate.prerequisites.missing.includes('verify_evidence'));
});

// ─── REFUSAL: dirty state ────────────────────────────────────────────────────

test('E/refuse/dirty: dirty tree → DIRTY_STATE', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      dirty: true,
      dirtyPaths: ['src/core/specboot/specboot-friction-gate.js']
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.DIRTY_STATE);
  assert.equal(gate.exit_code, mod.EXIT.DIRTY_STATE);
  assert.equal(gate.dirty.blocked, true);
  assert.match(gate.dirty.diagnostic || gate.refuses[0].detail, /DIRTY_STATE/);
});

test('E/refuse/dirty: missing git adapter without injected dirty → fail-closed', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate({
    step: 'apply',
    changeId: 'eos-demo-change',
    fileMap: happyFileMap(),
    primaryOwner: OWNER,
    // no dirty, no git → refuse inventing clean
    skipStaleCheck: true
  });
  assert.equal(gate.ok, false);
  assert.ok(
    gate.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.MISSING_PREREQUISITES ||
        r.code === mod.REFUSE_CODES.DIRTY_STATE
    )
  );
  assert.match(
    gate.refuses.map((r) => r.detail).join(' '),
    /refuse to invent clean|git status/i
  );
});

// ─── REFUSAL: stale inputs ───────────────────────────────────────────────────

test('E/refuse/stale: changeTip ≠ HEAD without allowHeadAhead → STALE_INPUTS', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      changeTip: CHANGE_TIP,
      headSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      allowHeadAhead: false
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.STALE_INPUTS);
  assert.equal(gate.exit_code, mod.EXIT.STALE_INPUTS);
  assert.equal(gate.stale.stale, true);
});

test('E/refuse/stale: explicit stale=true → STALE_INPUTS', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      stale: true,
      staleReason: 'STALE_INPUTS: proposal older than HEAD by 3 commits'
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.STALE_INPUTS);
});

test('E/refuse/stale: inputAgeMs > maxAgeMs → STALE_INPUTS', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      inputAgeMs: 86_400_000,
      maxAgeMs: 3_600_000
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.stale.stale, true);
  assert.ok(gate.stale.issues.some((i) => /inputAgeMs/.test(i)));
});

// ─── REFUSAL: ambiguous ownership ────────────────────────────────────────────

test('E/refuse/owner: no owner → AMBIGUOUS_OWNERSHIP', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      primaryOwner: undefined,
      owners: undefined,
      expectedOperator: undefined
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.AMBIGUOUS_OWNERSHIP);
  assert.equal(gate.exit_code, mod.EXIT.AMBIGUOUS_OWNERSHIP);
  assert.match(gate.ownership.diagnostic, /no owner/i);
});

test('E/refuse/owner: multiple owners without primary → AMBIGUOUS_OWNERSHIP', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      primaryOwner: undefined,
      owners: ['Alice', 'Bob'],
      expectedOperator: undefined
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.AMBIGUOUS_OWNERSHIP);
  assert.match(gate.ownership.diagnostic, /multiple owners/i);
});

// ─── REFUSAL: human gates (seal / prod / publish) ────────────────────────────

test('E/refuse/seal: autoSeal without humanSealAck → AUTO_SEAL_REFUSED', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'apply',
      autoSeal: true
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.AUTO_SEAL_REFUSED);
  assert.equal(gate.exit_code, mod.EXIT.HUMAN_GATE_REQUIRED);
  assert.equal(gate.auto_seal, false);
});

test('E/refuse/prod: flipProductionReady without ack → AUTO_PRODUCTION_FLIP_REFUSED', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'verify',
      flipProductionReady: true
    })
  );
  assert.equal(gate.ok, false);
  assert.equal(
    gate.primary_refuse,
    mod.REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED
  );
  assert.equal(gate.PRODUCTION_READY, 'NO');
  assert.equal(gate.auto_production_ready_flip, false);
});

test('E/refuse/publish: publish without humanPublishAck → HUMAN_GATE_REQUIRED', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'publish'
      // no humanPublishAck
    })
  );
  assert.equal(gate.ok, false);
  assert.ok(
    gate.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.HUMAN_GATE_REQUIRED ||
        r.code === mod.REFUSE_CODES.MISSING_PREREQUISITES
    )
  );
});

test('E/refuse/commit: commit without humanCommitAck → HUMAN_GATE_REQUIRED', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, {
      step: 'commit'
    })
  );
  assert.equal(gate.ok, false);
  assert.ok(
    gate.refuses.some(
      (r) =>
        r.code === mod.REFUSE_CODES.HUMAN_GATE_REQUIRED ||
        r.code === mod.REFUSE_CODES.MISSING_PREREQUISITES
    )
  );
});

test('E/refuse/invalid: unknown step → INVALID_STEP', async () => {
  const mod = await load();
  const gate = mod.runSpecbootFrictionGate({
    step: 'dance',
    dirty: false,
    primaryOwner: OWNER,
    skipStaleCheck: true
  });
  assert.equal(gate.ok, false);
  assert.equal(gate.primary_refuse, mod.REFUSE_CODES.INVALID_STEP);
  assert.equal(gate.exit_code, mod.EXIT.INVALID_STEP);
});

// ─── helpers / format ────────────────────────────────────────────────────────

test('E/helpers: memory git + ownership + formatGateSummary', async () => {
  const mod = await load();
  const git = mod.createMemoryGit({
    dirty: false,
    head: HEAD,
    branch: 'grok/demo'
  });
  assert.equal(git.status().dirty, false);
  assert.equal(git.revParseHead(), HEAD);

  const own = mod.evaluateOwnership({
    primaryOwner: OWNER,
    owners: [OWNER],
    expectedOperator: OWNER
  });
  assert.equal(own.ok, true);

  const gate = mod.runSpecbootFrictionGate(
    baseHappy(mod, { git, dirty: undefined })
  );
  assert.equal(gate.ok, true);
  const summary = mod.formatGateSummary(gate);
  assert.match(summary, /FRICTION_GATE_PASS|ok: true/);
  assert.match(summary, /PRODUCTION_READY: NO/);
  assert.equal(mod.exitCodeFromGate(gate), 0);
});

test('E/helpers: evaluateStaleInputs + checkPrerequisites standalone', async () => {
  const mod = await load();
  const stale = mod.evaluateStaleInputs({
    changeTip: 'aaaaaaa',
    headSha: 'bbbbbbb',
    allowHeadAhead: false
  });
  assert.equal(stale.stale, true);

  const fsA = mod.createMemoryFs({
    'docs/harness/SPECBOOT_CYCLE.md': 'x'
  });
  const p = mod.checkPrerequisites({ step: 'enrich_us' }, fsA);
  assert.equal(p.ok, true);
});
