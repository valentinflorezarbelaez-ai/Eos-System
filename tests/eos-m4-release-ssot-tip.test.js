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

/** Tip refresh post-#297 pinned tip: main@707f234 / 707f234599eb922d8b2bc0b0aba34cdc988a9882 (prior tip-296/post-#295 pin 5e0f94d5ccb9e04384cc8d5970294760ba289ad5 (L20 CLOSED seal tip refresh) + #297 Ladder 21 Maturity Gap Audit; tip honesty restored; L17-L20 CLOSED retained (never reopen); L21 OPEN (Audit MEASURED · BM–BQ pending; Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric)) */
const EXPECTED_TIP = '707f234599eb922d8b2bc0b0aba34cdc988a9882';

test('M4/tip: freeze gate main_tip matches OBSERVED full-SHA pattern', () => {
  const text = fs.readFileSync(FREEZE, 'utf8');
  const m = text.match(TIP_LINE);
  assert.ok(m, 'freeze gate must declare main_tip: <40-hex> in header fence');
  assert.match(m[1], FULL_SHA);
  assert.equal(m[1], EXPECTED_TIP, 'freeze main_tip must equal tip-refresh-post-297 pinned tip');
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
  assert.equal(evalTip, EXPECTED_TIP, 'evaluated_tip must equal tip-refresh-post-297 pinned tip');
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
    'Tip refresh post #281',
    'Tip refresh post #282',
    'tip-refresh-post-282',
    'Ladder 19 Maturity Audit',
    'L19 CLOSED',
    'Ladder 19 CLOSED',
    'Ladder 19 Closeout',
    'audit MEASURED',
    'BC MEASURED',
    'BD MEASURED',
    'BE MEASURED',
    'BF MEASURED',
    'BG MEASURED',
    'Mission BF MEASURED',
    'Mission BE MEASURED',
    'Mission BG MEASURED',
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
    'test:mission-bg',
    'test:ladder19-pack',
    'Local RC Packaging',
    'Artifact Notary',
    'Governed Patch',
    'Multi-Worktree',
    'Verification Replay',
    'Golden Receipt',
    'never reopen',
    'NEVER reopen L18',
    'NEVER reopen L19',
    'never reopen L19',
    'BC+BD+BE+BF+BG',
    'Tip refresh post #286',
    'Tip refresh post #287',
    'tip-refresh-post-287',
    'Tip refresh post #288',
    'Tip refresh post #289',
    'Tip refresh post #290',
    'Tip refresh post #291',
    'Tip refresh post #293',
    'Tip refresh post #294',
    'Tip refresh post #295',
    'tip-refresh-post-291',
    'tip-refresh-post-293',
    'tip-refresh-post-295',
    'Mission BH',
    'Mission BH MEASURED',
    'BH MEASURED',
    'Mission BI',
    'Mission BI MEASURED',
    'BI MEASURED',
    'Mission BJ',
    'Mission BJ MEASURED',
    'BJ MEASURED',
    'Mission BK',
    'Mission BK MEASURED',
    'BK MEASURED',
    'Mission BL',
    'Mission BL MEASURED',
    'BL MEASURED',
    'L20 CLOSED',
    'Ladder 20 CLOSED',
    'Ladder 20 Closeout',
    'Ladder 20 Maturity Audit',
    'SPEC-0065',
    'SPEC-0066',
    'SPEC-0067',
    'SPEC-0068',
    'SPEC-0069',
    'test:mission-bh',
    'test:mission-bi',
    'test:cross-session-continuity',
    'test:mission-bj',
    'test:operator-dashboard-hud',
    'test:mission-bk',
    'test:governed-external-write',
    'test:mission-bl',
    'test:ladder20-pack',
    'Mission Lifecycle State Machine',
    'Cross-Session Continuity',
    'Replay Fabric',
    'Operator Dashboard',
    'HUD Fabric',
    'Governed External Write Orchestrator',
    'Sovereign Mission Continuity & Operator Fabric',
    'never reopen L16',
    'NEVER reopen L20',
    'Tip refresh post #297',
    'tip-refresh-post-297',
    'Tip refresh post #296',
    'Ladder 21 Maturity Audit',
    'Ladder 21 OPEN',
    'L21 OPEN',
    'BM–BQ',
    'Sovereign Multi-Agent Provenance',
    'Continuous Sentinel Fabric',
    'Audit MEASURED · BM–BQ pending'

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

    // Formal L19 CLOSED retained + Formal L20 CLOSED after #295 Mission BL — current-state must show BH–BL MEASURED; NO current-state L20 OPEN / BL pending
  assert.doesNotMatch(matrix, /\|\s*Ladder 19 OPEN\s*\|/);
  assert.doesNotMatch(matrix, /\|\s*Ladder 19 PENDING\s*\|/);
  assert.match(matrix, /\|\s*Ladder 19 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 19 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 19 Closeout\s*\|/);
  assert.match(freeze, /Formal L19 CLOSED seal|Ladder 19 is \*\*CLOSED\*\*|L19 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /L19 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BC\+BD\+BE\+BF\+BG MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /L19 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BC\+BD\+BE\+BF\+BG MEASURED \+ seam-pack \+ closeout/);
  assert.match(freeze, /Sovereign Delivery & Verification Fabric/);
  assert.match(matrix, /Sovereign Delivery & Verification Fabric/);
  assert.match(freeze, /Sovereign Mission Continuity & Operator Fabric/);
  assert.match(matrix, /Sovereign Mission Continuity & Operator Fabric/);
  assert.match(freeze, /never reopen L17|NEVER reopen L17/);
  assert.match(freeze, /never reopen L18|NEVER reopen L18/);
  assert.match(freeze, /never reopen L19|NEVER reopen L19/);
  assert.match(matrix, /never reopen L17|NEVER reopen L17/);
  assert.match(matrix, /never reopen L18|NEVER reopen L18/);
  assert.match(matrix, /never reopen L19|NEVER reopen L19/);
  // Prohibit exact current-state L19 OPEN seal string (historical "was OPEN" / "pending then" remain allowed)
  assert.doesNotMatch(freeze, /Ladder 19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED via #280; BG pending\)/);
  assert.doesNotMatch(matrix, /Ladder 19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED via #280; BG pending\)/);
  assert.doesNotMatch(freeze, /L19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED via #280; BG pending\)/);
  assert.doesNotMatch(matrix, /L19 OPEN \(BC MEASURED \+ BD MEASURED \+ BE MEASURED \+ BF MEASURED via #280; BG pending\)/);
  const freezeHeader = freeze.split('```')[1] || '';
  const matrixHeader = matrix.split('```')[1] || '';
  assert.match(freezeHeader, /L19 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BC\+BD\+BE\+BF\+BG MEASURED/);
  assert.match(freezeHeader, /L20 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.doesNotMatch(freezeHeader, /L19 OPEN \(BC MEASURED/);
  assert.doesNotMatch(freezeHeader, /L20 PENDING/);
  assert.doesNotMatch(freezeHeader, /L20 OPEN \(BH MEASURED \+ BI MEASURED \+ BJ MEASURED \+ BK MEASURED via #293; BL pending/);
  assert.doesNotMatch(freezeHeader, /BL pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /BG pending(?! then)/);
  assert.match(matrixHeader, /L19 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BC\+BD\+BE\+BF\+BG MEASURED/);
  assert.match(matrixHeader, /L20 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.doesNotMatch(matrixHeader, /L19 OPEN \(BC MEASURED/);
  assert.doesNotMatch(matrixHeader, /L20 PENDING/);
  assert.doesNotMatch(matrixHeader, /L20 OPEN \(BH MEASURED \+ BI MEASURED \+ BJ MEASURED \+ BK MEASURED via #293; BL pending/);
  assert.doesNotMatch(matrixHeader, /BL pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /BG pending(?! then)/);
  assert.match(matrix, /\|\s*Mission BC\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BD\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BE\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BF\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BG\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BH\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BI\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BJ\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BK\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Mission BL\s*\|\s*COMPLETE\s*\|\s*MEASURED/);
  assert.match(matrix, /\|\s*Ladder 20 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 20 Closeout\s*\|/);
  assert.match(matrix, /\|\s*L20 CLOSED\s*\|/);
  assert.doesNotMatch(matrix, /\|\s*L20 OPEN\s*\|/);
  assert.match(freeze, /Formal L20 CLOSED seal|Ladder 20 is \*\*CLOSED\*\*|L20 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /NEVER reopen L20|never reopen L20/);
  assert.match(matrix, /NEVER reopen L20|never reopen L20/);
  assert.doesNotMatch(freeze, /L20 OPEN \(BH MEASURED \+ BI MEASURED \+ BJ MEASURED \+ BK MEASURED via #293; BL pending\)/);
  assert.doesNotMatch(matrix, /L20 OPEN \(BH MEASURED \+ BI MEASURED \+ BJ MEASURED \+ BK MEASURED via #293; BL pending\)/);
  assert.doesNotMatch(matrix, /\|\s*L20 PENDING\s*\|/);

  assert.match(freeze, /BC MEASURED/);
  assert.match(matrix, /BC MEASURED/);
  assert.match(freeze, /BD MEASURED/);
  assert.match(matrix, /BD MEASURED/);
  assert.match(freeze, /BE MEASURED/);
  assert.match(matrix, /BE MEASURED/);
  assert.match(freeze, /BF MEASURED/);
  assert.match(matrix, /BF MEASURED/);
  assert.match(freeze, /BG MEASURED/);
  assert.match(matrix, /BG MEASURED/);
  assert.match(freeze, /BH MEASURED/);
  assert.match(matrix, /BH MEASURED/);
  assert.match(freeze, /Mission BH MEASURED|Mission BH Mission Lifecycle|Mission BH/);
  assert.match(matrix, /Mission BH MEASURED/);
  assert.match(freeze, /BI MEASURED/);
  assert.match(matrix, /BI MEASURED/);
  assert.match(freeze, /Mission BI MEASURED|Mission BI Cross-Session|Mission BI/);
  assert.match(matrix, /Mission BI MEASURED/);
  assert.match(freeze, /BJ MEASURED/);
  assert.match(matrix, /BJ MEASURED/);
  assert.match(freeze, /Mission BJ MEASURED|Mission BJ Operator|Mission BJ/);
  assert.match(matrix, /Mission BJ MEASURED/);
  assert.match(freeze, /BK MEASURED/);
  assert.match(matrix, /BK MEASURED/);
  assert.match(freeze, /Mission BK MEASURED|Mission BK Governed|Mission BK/);
  assert.match(matrix, /Mission BK MEASURED/);
  assert.match(freeze, /BL MEASURED/);
  assert.match(matrix, /BL MEASURED/);
  assert.match(freeze, /Mission BL MEASURED|Mission BL Ladder|Mission BL/);
  assert.match(matrix, /Mission BL MEASURED/);
  assert.match(freeze, /tip-refresh-post-295|Tip refresh post #295|tip refresh post-#295/);
  assert.match(matrix, /tip-refresh-post-295/);
  assert.match(freeze, /tip-refresh-post-293|Tip refresh post #293|tip refresh post-#293/);
  assert.match(matrix, /tip-refresh-post-293/);
  assert.match(freeze, /L17 CLOSED|never reopen L17|NEVER reopen L17/);
  assert.match(matrix, /L18 CLOSED|Ladder 18 CLOSED/);
  assert.match(freeze, /L19 CLOSED|Ladder 19 CLOSED/);
  assert.match(matrix, /L19 CLOSED|Ladder 19 CLOSED/);
  assert.match(freeze, /L20 CLOSED/);
  assert.match(matrix, /L20 CLOSED/);
  // BI+BJ+BK MEASURED required in current-state headers; never claim BL MEASURED as current-state
  assert.match(freezeHeader, /BI MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(matrixHeader, /BI MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(freezeHeader, /BJ MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(matrixHeader, /BJ MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(freezeHeader, /BK MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(matrixHeader, /BK MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(freezeHeader, /BL MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(matrixHeader, /BL MEASURED|BH\+BI\+BJ\+BK\+BL MEASURED/);
  // Never leave current-state BI–BL, BJ–BL, or BK–BL pending (pending is BL)
  assert.doesNotMatch(freezeHeader, /BI–BL pending/);
  assert.doesNotMatch(matrixHeader, /BI–BL pending/);
  assert.doesNotMatch(freezeHeader, /BJ–BL pending/);
  assert.doesNotMatch(matrixHeader, /BJ–BL pending/);
  assert.doesNotMatch(freezeHeader, /BK–BL pending/);
  assert.doesNotMatch(matrixHeader, /BK–BL pending/);

  // Formal L21 OPEN after #297 Ladder 21 audit
  assert.match(matrix, /\|\s*Ladder 21 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 21 OPEN\s*\|/);
  assert.match(matrix, /\|\s*L21 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #297\s*\|/);
  assert.match(freeze, /L21 OPEN \(Audit MEASURED · BM–BQ pending/);
  assert.match(matrix, /L21 OPEN \(Audit MEASURED · BM–BQ pending/);
  assert.match(freeze, /tip-refresh-post-297|Tip refresh post #297|tip refresh post-#297/);
  assert.match(matrix, /tip-refresh-post-297/);
  assert.match(freeze, /Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric/);
  assert.match(matrix, /Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric/);
  assert.match(freezeHeader, /L21 OPEN \(Audit MEASURED · BM–BQ pending/);
  assert.match(matrixHeader, /L21 OPEN \(Audit MEASURED · BM–BQ pending/);
  assert.doesNotMatch(freezeHeader, /L21 CLOSED/);
  assert.doesNotMatch(matrixHeader, /L21 CLOSED/);
  assert.match(freezeHeader, /L20 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(matrixHeader, /L20 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BH\+BI\+BJ\+BK\+BL MEASURED/);

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
