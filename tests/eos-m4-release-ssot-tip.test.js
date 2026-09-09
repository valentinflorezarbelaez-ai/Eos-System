import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const FREEZE = path.join(rootDir, 'docs/releases/EOS_FREEZE_GATE_STATUS.md');
const MATRIX = path.join(rootDir, 'docs/releases/RELEASE_CAPABILITY_MATRIX.md');
const HITL = path.join(rootDir, 'docs/releases/ROI3_BRANCH_PROTECTION_HITL.md');

/** OBSERVED pattern used by operator-hud observeFreezeTipVsHead: main_tip: <hex> */
const TIP_LINE = /^main_tip:\s*([0-9a-f]{40})\b/m;
const EVAL_TIP = /^evaluated_tip:\s*([0-9a-f]{40})\b/m;
const FULL_SHA = /^[0-9a-f]{40}$/;

/** S1 pinned tip: main after Ladder 7 audit #74 (L6 close was e431e2c) */
const EXPECTED_TIP = '1d1b224cb41d32aa7de6519af7a7a48b5968f87f';

test('M4/S1: freeze gate main_tip matches OBSERVED full-SHA pattern', () => {
  const text = fs.readFileSync(FREEZE, 'utf8');
  const m = text.match(TIP_LINE);
  assert.ok(m, 'freeze gate must declare main_tip: <40-hex> in header fence');
  assert.match(m[1], FULL_SHA);
  assert.equal(m[1], EXPECTED_TIP, 'freeze main_tip must equal S1 pinned tip');
  assert.match(text, /^dictamen:\s*COMPLETE_FOR_LOCAL_GOVERNED_USE\b/m);
  assert.match(text, /^PRODUCTION_READY:\s*NO\b/m);
  // Stale unmerged ROI narration must not remain as current header hygiene claim
  assert.doesNotMatch(text, /branch_hygiene:.*roi4-i3-custody/i);
  assert.doesNotMatch(text, /Branch cursor\/roi4-i3-custody — do not merge/i);
  assert.doesNotMatch(text, /Branch cursor\/roi6-engram-unify — LAST ROI; do not merge/i);
});

test('M4/S1: capability matrix evaluated_tip equals freeze main_tip (SSOT)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  const tip = freeze.match(TIP_LINE)?.[1];
  const evalTip = matrix.match(EVAL_TIP)?.[1];
  assert.ok(tip, 'freeze main_tip missing');
  assert.ok(evalTip, 'matrix evaluated_tip missing');
  assert.equal(evalTip, tip, 'evaluated_tip must equal freeze main_tip after tip refresh');
  assert.equal(evalTip, EXPECTED_TIP, 'evaluated_tip must equal S1 pinned tip');
  assert.match(matrix, /PRODUCTION_READY:\s*NO/);
  assert.match(matrix, /COMPLETE_FOR_LOCAL_GOVERNED_USE/);
  // Evidence rows for closed surfaces (fail-closed presence checks)
  for (const needle of [
    'Write Barrier sandbox',
    'Mission loop enforcement',
    'Evidence custody',
    'Engram path/envelope',
    'Long-run GameDay',
    'fusion control-plane lock',
    'Local main-push surrogate',
    'Operator HUD post-fusion',
    'CI GameDay / ROI seam-pack',
    'Mission OS ATS to mission-loop coherence',
    'EVD custody seal path',
    'EVD scripts+bin seal',
    'Operator doctor',
    'HUD + fusion-cp post-G7/M6',
    'Independent verifier fusion-light',
    'Sentinel/FDIR strict-verify lock',
    'Ladder4 tip refresh',
    'CI seam-pack N2-N6',
    'Hooks install CI/verify smoke',
    'Mission-local EVD seal',
    'MCP catalog reconcile',
    'Complexity prune inventory',
    'Ladder 5 maturity gap audit',
    'Ladder5 tip refresh',
    'CI seam-pack P-tests',
    'Doctor / fusion-light L4 surfaces',
    'Complexity budget recount',
    'Q5 mission artifact write governance',
    'P6 inventory verify lock',
    'Ladder 6 maturity gap audit',
    'Ladder6 tip refresh',
    'CI seam-pack Q-tests',
    'Doctor / fusion-light L5 surfaces',
    'AT_CEILING schema gate',
    'Deferred writers Choice B',
    'Complexity verify closeout',
    'Ladder 7 LIDR harness adoption'
  ]) {
    assert.ok(matrix.includes(needle), 'matrix missing row for: ' + needle);
  }
  assert.doesNotMatch(matrix, /\|\s*Merge to main\s*\|\s*FUTURE\s*\|\s*BLOCKED\s*\|/i);
});

test('S1: HITL lists 5th check display name without claiming GH enforcement', () => {
  const text = fs.readFileSync(HITL, 'utf8');
  assert.match(text, /CI GameDay \/ ROI seam pack/);
  assert.match(text, /RULE_CREATED_NOT_ENFORCED/);
  assert.match(text, /Not enforced/i);
  // Must not claim current GH enforcement as active (negation phrases OK)
  assert.doesNotMatch(text, /\*\*Status:\s*ENFORCED\*\*/i);
  assert.doesNotMatch(text, /branch protection is enforced/i);
});

test('M4: package script test:m4 exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:m4'], 'node --test tests/eos-m4-release-ssot-tip.test.js');
});
