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

/** Tip refresh post-#280 pinned tip: main@37a36e9 / 37a36e9f0ed9dab61b3d997edd777e49d2eb7a16 (prior tip-278 pin c753cdcaef62b20b7f4c98b8140237713460d3ee (BE MEASURED) + #279 tip post-#278 21189a3719265921c38901a734ddd1154323c761 + #280 Mission BF Local RC Packaging & Artifact Notary Port; tip honesty restored; Ladder 14 CLOSED; Ladder 15 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; AI+AJ+AK+AL+AM MEASURED + seam-pack + closeout); Ladder 16 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; AN+AO+AP+AQ+AR MEASURED + seam-pack + closeout); Ladder 17 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; AS+AT+AU+AV+AW MEASURED + seam-pack + closeout; never reopen; AS–AW MEASURED); Ladder 18 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; AX+AY+AZ+BA+BB MEASURED + seam-pack + closeout; Sovereign Developer Engine; Mission AX–BB MEASURED; NEVER leave L18 OPEN or BB pending; never reopen L18); L19 OPEN (BC MEASURED + BD MEASURED + BE MEASURED + BF MEASURED via #280; BG pending; Sovereign Delivery & Verification Fabric)) */
const EXPECTED_TIP = '37a36e9f0ed9dab61b3d997edd777e49d2eb7a16';

test('M4/tip: freeze gate main_tip matches OBSERVED full-SHA pattern', () => {
  const text = fs.readFileSync(FREEZE, 'utf8');
  const m = text.match(TIP_LINE);
  assert.ok(m, 'freeze gate must declare main_tip: <40-hex> in header fence');
  assert.match(m[1], FULL_SHA);
  assert.equal(m[1], EXPECTED_TIP, 'freeze main_tip must equal tip-refresh-post-280 pinned tip');
  assert.match(text, /^dictamen:\s*COMPLETE_FOR_LOCAL_GOVERNED_USE\b/m);
  assert.match(text, /^PRODUCTION_READY:\s*NO\b/m);
  // Stale unmerged ROI narration must not remain as current header hygiene claim
  assert.doesNotMatch(text, /branch_hygiene:.*roi4-i3-custody/i);
  assert.doesNotMatch(text, /Branch cursor\/roi4-i3-custody — do not merge/i);
  assert.doesNotMatch(text, /Branch cursor\/roi6-engram-unify — LAST ROI; do not merge/i);
});

test('M4/tip: capability matrix evaluated_tip equals freeze main_tip (SSOT)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  const tip = freeze.match(TIP_LINE)?.[1];
  const evalTip = matrix.match(EVAL_TIP)?.[1];
  assert.ok(tip, 'freeze main_tip missing');
  assert.ok(evalTip, 'matrix evaluated_tip missing');
  assert.equal(evalTip, tip, 'evaluated_tip must equal freeze main_tip after tip refresh');
  assert.equal(evalTip, EXPECTED_TIP, 'evaluated_tip must equal tip-refresh-post-280 pinned tip');
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
    'Ladder 7 LIDR harness adoption',
    'Ladder7 tip refresh',
    'Context Pack TPC',
    'Loop Engineering 4Q',
    'Worktree isolation',
    'SpecBoot cycle + Antigravity-first',
    'MCP/tool KEEP inventory',
    'Model routing + ratchet',
    'Ladder 7 harness adoption closeout',
    'CI seam-pack L7 locks',
    'Doctor / fusion-light L7 surfaces',
    'Mission OS / EVD observe pack',
    'KEEP PO-named prune HOLD',
    'Complexity ceiling HOLD',
    'AGY workstation evidence',
    'Dirty DEFER triage',
    'Ladder 8 T1–T8 closeout',
    'Ladder 9 maturity gap audit',
    'U1 tip refresh post L8',
    'Ladder 9 closeout',
    'Ladder 10 maturity gap audit',
    'Observation budget & token hygiene',
    'Typed multi-agent handoff contract',
    'FDIR sentinel & graph healing gate',
    'Runtime enforcement BUILDER != VERIFIER',
    'Ladder 10 closeout',
    'Tip refresh post L10',
    'Tip refresh post #106',
    'Tip refresh post #108',
    'Tip refresh post #110',
    'Tip refresh post #112',
    'Tip refresh post #114',
    'Mission F MCP adversarial',
    'Tip refresh post #116',
    'Mission G MCP tool dispatcher',
    'Tip refresh post #118',
    'Mission H worker tool execution',
    'Tip refresh post #120',
    'Google Gemini AI provider (SPEC-0013)',
    'Tip refresh post #122',
    'Mission I Gemini tool bridge',
    'Tip refresh post #124',
    'Mission J Stitch UI generator bridge',
    'Tip refresh post #126',
    'Mission K Browser QA Runner',
    'Tip refresh post #128',
    'Mission L Stitch worker bridge',
    'Tip refresh post #132',
    'Mission M Browser QA worker bridge',
    'Tip refresh post #134',
    'Mission N multi-native compose',
    'Tip refresh post #136',
    'Mission O native-tools adversarial',
    'Tip refresh post #145',
    'Mission P Loop × Worker orchestration',
    'Tip refresh post #147',
    'Mission Q Worker runtime daemon',
    'Tip refresh post #165',
    'Mission R FDIR Sentinel Runtime',
    'Tip refresh post #170',
    'Mission S SpecBoot Agent Runner',
    'Tip refresh post #172',
    'Mission T External Write Gateway',
    'Tip refresh post #174',
    'Mission U Native Suite Seam-Pack',
    'Tip refresh post #176',
    'Mission V FDIR Remediation Loop',
    'Tip refresh post #178',
    'Mission W Sovereign Session Coordinator',
    'Tip refresh post #180',
    'Mission X Interactive Developer Shell',
    'Tip refresh post #182',
    'Mission Y Ladder 12',
    'Ladder 12 Closeout',
    'Tip refresh post #184',
    'Ladder 13 Maturity Audit',
    'Tip refresh post #186',
    'Mission Z',
    'Tip refresh post #188',
    'Mission AA',
    'Tip refresh post #190',
    'Mission AB',
    'Tip refresh post #192',
    'Mission AC',
    'Ladder 13 Closeout',
    'Tip refresh post #194',
    'Mission AD',
    'Tip refresh post #197',
    'Mission AE',
    'Tip refresh post #199',
    'Mission AF',
    'Tip refresh post #201',
    'Autonomous Execution Loop',
    'MODEL_ROUTING',
    'LLM Provider Port',
    'Token-Budget',
    'ECR',
    'Mission AG',
    'Tip refresh post #203',
    'Live Tool Engine',
    'Mission AH',
    'Ladder 14 Closeout',
    'Tip refresh post-AH',
    'tip-refresh-post-ah',
    'Ladder 15 Maturity Audit',
    'Tip refresh post #220',
    'Mission AI',
    'Tip refresh post #222',
    'Mission AJ',
    'Tip refresh post #225',
    'Mission AK',
    'Tip refresh post #227',
    'Mission AL',
    'Tip refresh post #229',
    'Mission AM',
    'Tip refresh post-AM',
    'tip-refresh-post-am',
    'Ladder 15 Closeout',
    'Ladder 16 Maturity Audit',
    'Tip refresh post #233',
    'tip-refresh-post-233',
    'Mission AN',
    'Tip refresh post #235',
    'tip-refresh-post-235',
    'Mission AO',
    'Tip refresh post #237',
    'tip-refresh-post-237',
    'Mission AP',
    'Tip refresh post #239',
    'tip-refresh-post-239',
    'Mission AQ',
    'Tip refresh post #241',
    'tip-refresh-post-241',
    'Mission AR',
    'Tip refresh post #243',
    'tip-refresh-post-243',
    'Ladder 16 CLOSED',
    'CLOSED_FOR_LOCAL_GOVERNED_USE',
    'ladder16-pack',
    'Ladder 17 Maturity Audit',
    'Tip refresh post #245',
    'tip-refresh-post-245',
    'Mission AS',
    'Tip refresh post #247',
    'tip-refresh-post-247',
    'SPEC-0050',
    'cross-satellite',
    'Mission AT',
    'Tip refresh post #249',
    'tip-refresh-post-249',
    'SPEC-0051',
    'Operator Continuity',
    'Crash-Recovery',
    'Mission AU',
    'Tip refresh post #252',
    'tip-refresh-post-260',
    'SPEC-0052',
    'Law VI',
    'Secret Runtime Broker',
    'AS16',
    'Ladder 17 OPEN',
    'AS MEASURED',
    'AT MEASURED',
    'AU MEASURED',
    'AS+AT',
    'AS+AT+AU',
    'AV–AW',
    'AU–AW',
    'AS–AW',
    'Sovereign Operator Continuity',
    'Composition',
    'Evidence Export',
    'Notarization',
    'HITL/PO Authority',
    'Provider Failover',
    'Resilience',
    'Multi-Workstation',
    'Federation',
    'ladder15-pack',
    'Autonomy Replay',
    'Forensic Observer',
    'Constitution Runtime',
    'Policy Gate',
    'Evidence Economy',
    'Multi-Session',
    'Maturity',
    'Mission AV',
    'Tip refresh post #252',
    'tip-refresh-post-252',
    'Release Honesty',
    'Freeze-Drift',
    'SPEC-0053',
    'Mission AW',
    'Ladder 17 Closeout',
    'ladder17-pack',
    'SPEC-0054',
    'Tip refresh post #259',
    'Ladder 17 CLOSED',
    'AS–AW',
    'AS+AT+AU+AV+AW',
    'Ladder 18 Maturity Audit',
    'Tip refresh post #260',
    'tip-refresh-post-260',
    'Ladder 18 CLOSED',
    'Sovereign Developer Engine',
    'AX–BB',
    'AX/AY/AZ/BA/BB',
    'SPEC-0055',
    'SPEC-0056',
    'SPEC-0057',
    'SPEC-0058',
    'SPEC-0059',
    'Mission AX',
    'Mission AX MEASURED',
    'Tip refresh post #262',
    'tip-refresh-post-262',
    'test:mission-ax',
    'test:developer-engine-core',
    'Sovereign Developer Engine Core',
    'Autonomous Code Loop',
    'Mission AY',
    'Mission AY MEASURED',
    'Tip refresh post #264',
    'tip-refresh-post-264',
    'test:mission-ay',
    'test:ast-semantic-port',
    'AST & Semantic Graph',
    'SPEC-0056',
    'AY–BB',
    'AZ–BB',
    'AZ/BA/BB',
    'AX+AY MEASURED',
    'AX MEASURED',
    'Mission AZ',
    'Mission AZ MEASURED',
    'Tip refresh post #266',
    'tip-refresh-post-266',
    'test:mission-az',
    'test:self-repair-bridge',
    'Deterministic Self-Repair',
    'FDIR Remediation Bridge',
    'SPEC-0057',
    'BA–BB',
        'AX+AY+AZ MEASURED',
    'AZ MEASURED',
    'Mission BA',
    'Mission BA MEASURED',
    'Tip refresh post #268',
    'tip-refresh-post-268',
    'test:mission-ba',
    'test:local-sandbox-port',
    'Local Sandboxed Container',
    'Worker Isolation Port',
    'SPEC-0058',
    'AX+AY+AZ+BA MEASURED',
    'BA MEASURED',
    'Mission BB',
    'Mission BB MEASURED',
    'Tip refresh post #270',
    'tip-refresh-post-270',
    'test:mission-bb',
    'test:ladder18-pack',
    'Ladder 18 Closeout',
    'Ladder 18 CLOSED',
    'AX+AY+AZ+BA+BB',
    'AX+AY+AZ+BA+BB MEASURED',
    'SPEC-0059',
    'L19 PENDING',
    'CLOSED_FOR_LOCAL_GOVERNED_USE',
    'Tip refresh post #271',
    'Tip refresh post #272',
    'Tip refresh post #273',
    'Tip refresh post #274',
    'tip-refresh-post-274',
    'Tip refresh post #275',
    'Tip refresh post #276',
    'tip-refresh-post-276',
    'Tip refresh post #277',
    'Tip refresh post #278',
    'tip-refresh-post-278',
    'Tip refresh post #279',
    'Tip refresh post #280',
    'tip-refresh-post-280',
    'Ladder 19 Maturity Audit',
    'L19 OPEN',
    'audit MEASURED',
    'BC MEASURED',
    'BD MEASURED',
    'BE MEASURED',
    'BG pending',
    'BF MEASURED',
    'Mission BF MEASURED',
    'Mission BE MEASURED',
    'Sovereign Delivery & Verification Fabric',
    'Mission BC',
    'Mission BC MEASURED',
    'Mission BD',
    'Mission BD MEASURED',
    'Mission BE',
    'Mission BF',
    'Mission BG',
    'SPEC-0060',
    'SPEC-0061',
    'SPEC-0062',
    'SPEC-0063',
    'SPEC-0064',
    'test:mission-bc',
    'test:governed-patch-apply',
    'test:mission-bd',
    'test:multi-target-delivery',
    'test:mission-be',
    'test:verification-replay',
    'test:mission-bf',
    'test:local-rc-packaging',
    'Local RC Packaging',
    'Artifact Notary',
    'Governed Patch',
    'Multi-Worktree',
    'Verification Replay',
    'Golden Receipt',
    'never reopen',
    'NEVER reopen L18'

  ]) {
    assert.ok(matrix.includes(needle), 'matrix missing row for: ' + needle);
  }

  assert.doesNotMatch(matrix, /\|\s*Ladder 18 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Ladder 18 CLOSED\s*\|/);
  assert.match(matrix, /Mission BB/);
  assert.match(matrix, /AX\+AY\+AZ\+BA\+BB/);
  assert.match(freeze, /Formal L18 CLOSED seal|Ladder 18 is \*\*CLOSED\*\*|L18 CLOSED seal retained/);
  // Prohibit exact current-state OPEN seal string (historical "was OPEN" / "pending then" remain allowed)
  assert.doesNotMatch(freeze, /Ladder 18 OPEN \(AX\+AY\+AZ\+BA MEASURED; BB pending\)/);
  assert.doesNotMatch(matrix, /Ladder 18 OPEN \(AX\+AY\+AZ\+BA MEASURED; BB pending\)/);

    // L19 OPEN after #280 Mission BF — current-state must show BC+BD+BE+BF MEASURED; BG pending
  assert.doesNotMatch(matrix, /\|\s*Ladder 19 PENDING\s*\|/);
  assert.match(matrix, /\|\s*Ladder 19 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Ladder 19 Maturity Audit\s*\|/);
  assert.match(freeze, /L19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED via #280; BG pending/);
  assert.match(matrix, /L19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED via #280; BG pending/);
  assert.match(freeze, /Sovereign Delivery & Verification Fabric/);
  assert.match(matrix, /Sovereign Delivery & Verification Fabric/);
  assert.match(freeze, /never reopen L17|NEVER reopen L17/);
  assert.match(freeze, /never reopen L18|NEVER reopen L18/);
  assert.match(matrix, /never reopen L17|NEVER reopen L17/);
  assert.match(matrix, /never reopen L18|NEVER reopen L18/);
  const freezeHeader = freeze.split('```')[1] || '';
  const matrixHeader = matrix.split('```')[1] || '';
  assert.match(freezeHeader, /L19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED/);
  assert.doesNotMatch(freezeHeader, /L19 PENDING \(Maturity Gap Audit next; no L19 impl\)/);
  assert.doesNotMatch(freezeHeader, /L19 PENDING \(no L19 impl\)/);
  assert.doesNotMatch(freezeHeader, /BF–BG pending/);
  assert.doesNotMatch(freezeHeader, /BE–BG pending/);
  assert.match(matrixHeader, /L19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED/);
  assert.doesNotMatch(matrixHeader, /L19 PENDING \(no L19 impl\)/);
  assert.doesNotMatch(matrixHeader, /BF–BG pending/);
  assert.doesNotMatch(matrixHeader, /BE–BG pending/);
  assert.match(matrix, /\|\s*Mission BC\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BD\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BE\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BF\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.doesNotMatch(matrix, /\|\s*Mission BG[^\n]*\|\s*COMPLETE\s*\|\s*MEASURED/);

  assert.match(freeze, /BC MEASURED/);
  assert.match(matrix, /BC MEASURED/);
  assert.match(freeze, /BD MEASURED/);
  assert.match(matrix, /BD MEASURED/);
  assert.match(freeze, /BE MEASURED/);
  assert.match(matrix, /BE MEASURED/);
  assert.match(freeze, /BF MEASURED/);
  assert.match(matrix, /BF MEASURED/);
  assert.match(freeze, /BG pending/);
  assert.match(matrix, /BG pending/);
  // No current-state BF–BG pending (historical "BF–BG pending then" allowed)
  assert.doesNotMatch(freezeHeader, /BF–BG pending/);
  assert.doesNotMatch(matrixHeader, /BF–BG pending/);
  assert.match(freeze, /Mission BF MEASURED/);
  assert.match(matrix, /Mission BF MEASURED/);
  assert.match(freeze, /Mission BE MEASURED/);
  assert.match(matrix, /Mission BE MEASURED/);
  assert.match(freeze, /L17 CLOSED|never reopen L17|NEVER reopen L17/);
  assert.match(matrix, /L18 CLOSED|Ladder 18 CLOSED/);

  assert.doesNotMatch(matrix, /\|\s*Merge to main\s*\|\s*FUTURE\s*\|\s*BLOCKED\s*\|/i);
});

test('tip: HITL lists 5th check display name without claiming GH enforcement', () => {
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
