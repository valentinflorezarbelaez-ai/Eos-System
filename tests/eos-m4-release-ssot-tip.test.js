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

/** Tip refresh post-#342 pinned tip: main@4383dc9 / 4383dc9a07034c2ed77ed0614a02e94c2bbf5fd8 (prior sealed tip a4abb4205e94a19ff9f1932cf9a146b809667609 Mission CE #340 / tip-refresh-post-340; tip refresh #341 on main (`f8ad51a35eba1333a7d2a13fa62c39e563ae6128`) with freeze staying on Mission CE tip until this refresh; #342 feat(ci): Mission CF Ladder 24 seam-pack consolidation & closeout (SPEC-0089) (#342); tip honesty restored; Formal Ladder 24 CLOSED (CB+CC+CD+CE+CF MEASURED + seam-pack + closeout); L17-L23 CLOSED retained; never reopen L24; Do NOT open Ladder 25; historical tip-340/338/336/334/332/330 needles OK) */
const EXPECTED_TIP = '4383dc9a07034c2ed77ed0614a02e94c2bbf5fd8';

test('M4/tip: freeze gate main_tip matches OBSERVED full-SHA pattern', () => {
  const text = fs.readFileSync(FREEZE, 'utf8');
  const m = text.match(TIP_LINE);
  assert.ok(m, 'freeze gate must declare main_tip: <40-hex> in header fence');
  assert.match(m[1], FULL_SHA);
  assert.equal(m[1], EXPECTED_TIP, 'freeze main_tip must equal tip-refresh-post-342 pinned tip');
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
  assert.equal(evalTip, EXPECTED_TIP, 'evaluated_tip must equal tip-refresh-post-342 pinned tip');
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
    'Tip refresh post #298',
    'Tip refresh post #299',
    'Tip refresh post #301',
    'Mission BM',
    'Mission BN',
    'SPEC-0070',
    'SPEC-0071',
    'test:mission-bm',
    'test:mission-bn',
    'test:agent-identity-attestation',
    'test:continuous-integrity-sentinel',
    'Agent Identity Attestation',
    'Continuous Integrity Sentinel',
    'tip-refresh-post-297',
    'tip-refresh-post-299',
    'tip-refresh-post-301',
    'Tip refresh post #296',
    'Ladder 21 Maturity Audit',
    'Ladder 21 CLOSED',
    'L21 CLOSED',
    'Ladder 21 Closeout',
    'NEVER reopen L21',
    'Mission BO',
    'Mission BP',
    'Mission BQ',
    'SPEC-0072',
    'SPEC-0073',
    'SPEC-0074',
    'test:mission-bo',
    'test:mission-bp',
    'test:mission-bq',
    'test:two-key-consensus-gate',
    'test:telemetry-forensic-trail',
    'test:ladder21-pack',
    'Tip refresh post #303',
    'Tip refresh post #305',
    'Tip refresh post #307',
    'tip-refresh-post-303',
    'tip-refresh-post-305',
    'tip-refresh-post-307',
    'BO MEASURED',
    'BP MEASURED',
    'BQ MEASURED',
    'BM MEASURED',
    'BN MEASURED',
    'Sovereign Multi-Agent Provenance',
    'Continuous Sentinel Fabric',
    'BM+BN+BO+BP+BQ',
    'Ladder 22 Maturity Audit',
    'Ladder 22 CLOSED',
    'L22 CLOSED',
    'BR–BV',
    'BR–BV pending',
    'Audit MEASURED · BR–BV pending',
    'Sovereign Intent Decomposition',
    'Dynamic Workflow Orchestration',
    'Tip refresh post #309',
    'tip-refresh-post-309',
    'Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric',
    'Ladder 22 Closeout',
    'CLOSED_FOR_LOCAL_GOVERNED_USE',
    'Ladder 23 Maturity Audit',
    'Ladder 23 OPEN',
    'L23 OPEN',
    'Ladder 23 CLOSED',
    'L23 CLOSED',
    'Ladder 23 Closeout',
    'Mission BW',
    'Mission BX',
    'Mission BY',
    'Mission BZ',
    'Mission CA',
    'BW MEASURED',
    'BX MEASURED',
    'BY MEASURED',
    'BZ MEASURED',
    'CA MEASURED',
    'BW+BX+BY MEASURED',
    'BW+BX+BY+BZ MEASURED',
    'BW+BX+BY+BZ+CA MEASURED',
    'BZ–CA pending',
    'CA pending',
    'Audit + BW+BX+BY MEASURED · BZ–CA pending',
    'Audit + BW+BX+BY+BZ MEASURED · CA pending',
    'SPEC-0080',
    'SPEC-0081',
    'SPEC-0082',
    'SPEC-0083',
    'SPEC-0084',
    'Autonomous EARS/BDD Spec Synthesizer',
    'Continuous Merkle Ledger Notarization',
    'Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric',
    'Tip refresh post #326',
    'tip-refresh-post-326',
    'Tip refresh post #328',
    'tip-refresh-post-328',
    'Tip refresh post #330',
    'tip-refresh-post-330',
    'Ladder 24 Maturity Audit',
    'Ladder 24 CLOSED',
    'L24 CLOSED',
    'Ladder 24 Closeout',
    'Ladder 24 OPEN',
    'L24 OPEN',
    'CB–CF pending',
    'Audit MEASURED · CB–CF pending',
    'Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric',
    'Tip refresh post #332',
    'tip-refresh-post-332',
    'Tip refresh post #331',
    'SPEC-0085',
    'SPEC-0086',
    'SPEC-0087',
    'SPEC-0088',
    'SPEC-0089',
    'Mission CB',
    'Tip refresh post #333',
    'Tip refresh post #334',
    'tip-refresh-post-334',
    'Tip refresh post #335',
    'Tip refresh post #336',
    'tip-refresh-post-336',
    'Mission CC',
    'Tip refresh post #337',
    'Tip refresh post #338',
    'tip-refresh-post-338',
    'Mission CD',
    'CB MEASURED',
    'CC MEASURED',
    'CD MEASURED',
    'CC–CF pending',
    'CD–CF pending',
    'CE–CF pending',
    'Audit + CB MEASURED · CC–CF pending',
    'Audit + CB + CC MEASURED · CD–CF pending',
    'Audit + CB + CC + CD MEASURED · CE–CF pending',
    'Tip refresh post #339',
    'Tip refresh post #340',
    'tip-refresh-post-340',
    'Mission CE',
    'CE MEASURED',
    'CF pending',
    'Audit + CB + CC + CD + CE MEASURED · CF pending',
    'CF MEASURED',
    'CB+CC+CD+CE+CF MEASURED',
    'Tip refresh post #341',
    'Tip refresh post #342',
    'tip-refresh-post-342',
    'Mission CF',
    'never reopen L24',
    'NEVER reopen L24',
    'NEVER reopen L22',
    'never reopen L22',
    'NEVER reopen L23',
    'never reopen L23'

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

  // Formal L21 CLOSED after #307 Mission BQ MEASURED
  assert.match(matrix, /\|\s*Ladder 21 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 21 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L21 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 21 Closeout\s*\|/);
  assert.doesNotMatch(matrix, /\|\s*Ladder 21 OPEN\s*\|/);
  assert.doesNotMatch(matrix, /\|\s*L21 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #297\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #299\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #301\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #303\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #305\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #307\s*\|/);
  assert.match(matrix, /\|\s*Mission BM\s*\|/);
  assert.match(matrix, /\|\s*Mission BN\s*\|/);
  assert.match(matrix, /\|\s*Mission BO\s*\|/);
  assert.match(matrix, /\|\s*Mission BP\s*\|/);
  assert.match(matrix, /\|\s*Mission BQ\s*\|/);
  assert.match(freeze, /Formal L21 CLOSED seal|Ladder 21 is \*\*CLOSED\*\*|L21 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /NEVER reopen L21|never reopen L21/);
  assert.match(matrix, /NEVER reopen L21|never reopen L21/);
  assert.match(freeze, /tip-refresh-post-307|Tip refresh post #307|tip refresh post-#307/);
  assert.match(matrix, /tip-refresh-post-307/);
  assert.match(freeze, /BQ MEASURED/);
  assert.match(matrix, /BQ MEASURED/);
  assert.match(freeze, /tip-refresh-post-305|Tip refresh post #305|tip refresh post-#305/);
  assert.match(matrix, /tip-refresh-post-305/);
  assert.match(freeze, /BP MEASURED/);
  assert.match(matrix, /BP MEASURED/);
  assert.match(freeze, /tip-refresh-post-303|Tip refresh post #303|tip refresh post-#303/);
  assert.match(matrix, /tip-refresh-post-303/);
  assert.match(freeze, /BO MEASURED/);
  assert.match(matrix, /BO MEASURED/);
  assert.match(freeze, /tip-refresh-post-301|Tip refresh post #301|tip refresh post-#301/);
  assert.match(matrix, /tip-refresh-post-301/);
  assert.match(freeze, /BN MEASURED/);
  assert.match(matrix, /BN MEASURED/);
  assert.match(freeze, /tip-refresh-post-299|Tip refresh post #299|tip refresh post-#299/);
  assert.match(matrix, /tip-refresh-post-299/);
  assert.match(freeze, /tip-refresh-post-297|Tip refresh post #297|tip refresh post-#297/);
  assert.match(matrix, /tip-refresh-post-297/);
  assert.match(freeze, /Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric/);
  assert.match(matrix, /Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric/);
  assert.match(freezeHeader, /L21 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BM\+BN\+BO\+BP\+BQ MEASURED/);
  assert.match(matrixHeader, /L21 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BM\+BN\+BO\+BP\+BQ MEASURED/);
  assert.doesNotMatch(freezeHeader, /L21 OPEN/);
  assert.doesNotMatch(matrixHeader, /L21 OPEN/);
  assert.match(freezeHeader, /L20 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BH\+BI\+BJ\+BK\+BL MEASURED/);
  assert.match(matrixHeader, /L20 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BH\+BI\+BJ\+BK\+BL MEASURED/);

  // Formal L22 CLOSED retained; Formal L23 CLOSED retained after #330; Formal L24 CLOSED after #342 Mission CF (CB+CC+CD+CE+CF MEASURED + seam-pack + closeout); historical tip-340/338/336/334/332/330 OK
  assert.match(matrix, /\|\s*Ladder 22 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 22 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L22 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 22 Closeout\s*\|/);
  assert.match(matrix, /\|\s*Ladder 23 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 23 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L23 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 23 Closeout\s*\|/);
  assert.match(matrix, /\|\s*Mission BW\s*\|/);
  assert.match(matrix, /\|\s*Mission BX\s*\|/);
  assert.match(matrix, /\|\s*Mission BY\s*\|/);
  assert.match(matrix, /\|\s*Mission BZ\s*\|/);
  assert.match(matrix, /\|\s*Mission CA\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #309\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #326\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #328\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #330\s*\|/);
  assert.doesNotMatch(matrix, /\|\s*Ladder 22 OPEN\s*\|/);
  assert.doesNotMatch(matrix, /\|\s*L22 OPEN\s*\|/);
  // Historical tip-328 rows may retain | Ladder 23 OPEN | / | L23 OPEN | as historical/superseded; current-state CLOSED rows required above
  assert.match(freeze, /tip-refresh-post-309|Tip refresh post #309|tip refresh post-#309|tip-refresh-post-326|Tip refresh post #326|tip refresh post-#326/);
  assert.match(matrix, /tip-refresh-post-309|tip-refresh-post-326/);
  assert.match(freeze, /tip-refresh-post-326|Tip refresh post #326|tip refresh post-#326/);
  assert.match(matrix, /tip-refresh-post-326/);
  assert.match(freeze, /tip-refresh-post-328|Tip refresh post #328|tip refresh post-#328/);
  assert.match(matrix, /tip-refresh-post-328/);
  assert.match(freeze, /tip-refresh-post-330|Tip refresh post #330|tip refresh post-#330/);
  assert.match(matrix, /tip-refresh-post-330/);
  assert.match(freeze, /Ladder 22 Maturity Gap Audit|Ladder 22 Maturity Audit|Ladder 22 Closeout/);
  assert.match(matrix, /Ladder 22 Maturity Gap Audit|Ladder 22 Maturity Audit|Ladder 22 Closeout/);
  assert.match(freeze, /Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric/);
  assert.match(matrix, /Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric/);
  assert.match(freeze, /Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric/);
  assert.match(matrix, /Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric/);
  assert.match(freeze, /Mission BY|Autonomous EARS\/BDD Spec Synthesizer|SPEC-0082/);
  assert.match(matrix, /Mission BY|Autonomous EARS\/BDD Spec Synthesizer|SPEC-0082/);
  assert.match(freeze, /Mission BZ|Continuous Merkle Ledger Notarization|SPEC-0083/);
  assert.match(matrix, /Mission BZ|Continuous Merkle Ledger Notarization|SPEC-0083/);
  assert.match(freeze, /Mission CA|SPEC-0084|Ladder 23 CI Seam-Pack|ladder23-seam/);
  assert.match(matrix, /Mission CA|SPEC-0084|Ladder 23 CI Seam-Pack/);
  assert.match(freezeHeader, /L22 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BR\+BS\+BT\+BU\+BV MEASURED/);
  assert.match(matrixHeader, /L22 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BR\+BS\+BT\+BU\+BV MEASURED/);
  assert.match(freezeHeader, /L23 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BW\+BX\+BY\+BZ\+CA MEASURED/);
  assert.match(matrixHeader, /L23 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BW\+BX\+BY\+BZ\+CA MEASURED/);
  assert.doesNotMatch(freezeHeader, /L22 OPEN \(Audit MEASURED · BR–BV pending/);
  assert.doesNotMatch(matrixHeader, /L22 OPEN \(Audit MEASURED · BR–BV pending/);
  // Current-state header must not still claim L23 OPEN / CA pending (historical tip-328/326 notes may retain those strings)
  assert.doesNotMatch(freezeHeader, /L23 OPEN \(Audit \+ BW\+BX\+BY\+BZ MEASURED · CA pending/);
  assert.doesNotMatch(matrixHeader, /L23 OPEN \(Audit \+ BW\+BX\+BY\+BZ MEASURED · CA pending/);
  assert.doesNotMatch(freezeHeader, /BZ–CA pending/);
  assert.doesNotMatch(matrixHeader, /BZ–CA pending/);
  assert.doesNotMatch(freezeHeader, /CA pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CA pending(?! then)/);
  assert.match(freeze, /NEVER reopen L22|never reopen L22/);
  assert.match(matrix, /NEVER reopen L22|never reopen L22/);
  assert.match(freeze, /NEVER reopen L23|never reopen L23/);
  assert.match(matrix, /NEVER reopen L23|never reopen L23/);
  assert.match(freeze, /Formal L23 CLOSED seal|Ladder 23 is \*\*CLOSED\*\*|L23 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /BY MEASURED/);
  assert.match(matrix, /BY MEASURED/);
  assert.match(freeze, /BW MEASURED/);
  assert.match(matrix, /BW MEASURED/);
  assert.match(freeze, /BX MEASURED/);
  assert.match(matrix, /BX MEASURED/);
  assert.match(freeze, /BZ MEASURED/);
  assert.match(matrix, /BZ MEASURED/);
  assert.match(freeze, /CA MEASURED/);
  assert.match(matrix, /CA MEASURED/);
  assert.match(freeze, /BW\+BX\+BY\+BZ MEASURED/);
  assert.match(matrix, /BW\+BX\+BY\+BZ MEASURED/);
  assert.match(freeze, /BW\+BX\+BY\+BZ\+CA MEASURED/);
  assert.match(matrix, /BW\+BX\+BY\+BZ\+CA MEASURED/);

  // Formal L24 CLOSED after #342 Mission CF (CB+CC+CD+CE+CF MEASURED + seam-pack + closeout); L17–L23 CLOSED retained; never reopen L24; Do NOT open Ladder 25
  // Historical tip-340/338/336/334/332/330 needles remain OK in matrix/freeze body
  assert.match(matrix, /\|\s*Ladder 24 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 24 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L24 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 24 Closeout\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #332\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #331\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #333\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #334\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #335\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #336\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #337\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #338\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #339\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #340\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #341\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #342\s*\|/);
  assert.match(matrix, /\|\s*Mission CE\s*\|/);
  assert.match(matrix, /\|\s*Mission CF\s*\|/);
  assert.match(freeze, /tip-refresh-post-332|Tip refresh post #332|tip refresh post-#332/);
  assert.match(matrix, /tip-refresh-post-332/);
  assert.match(freeze, /tip-refresh-post-334|Tip refresh post #334|tip refresh post-#334/);
  assert.match(matrix, /tip-refresh-post-334/);
  assert.match(freeze, /tip-refresh-post-336|Tip refresh post #336|tip refresh post-#336/);
  assert.match(matrix, /tip-refresh-post-336/);
  assert.match(freeze, /tip-refresh-post-338|Tip refresh post #338|tip refresh post-#338/);
  assert.match(matrix, /tip-refresh-post-338/);
  assert.match(freeze, /tip-refresh-post-340|Tip refresh post #340|tip refresh post-#340/);
  assert.match(matrix, /tip-refresh-post-340/);
  assert.match(freeze, /tip-refresh-post-342|Tip refresh post #342|tip refresh post-#342/);
  assert.match(matrix, /tip-refresh-post-342/);
  assert.match(freeze, /Ladder 24 Maturity Gap Audit|Ladder 24 Maturity Audit|Ladder 24 Closeout/);
  assert.match(matrix, /Ladder 24 Maturity Gap Audit|Ladder 24 Maturity Audit|Ladder 24 Closeout/);
  assert.match(freeze, /Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric/);
  assert.match(matrix, /Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric/);
  // Historical tip-332 CB–CF pending needles OK
  assert.match(freeze, /CB–CF pending/);
  assert.match(matrix, /CB–CF pending/);
  assert.match(freeze, /Audit MEASURED · CB–CF pending/);
  assert.match(matrix, /Audit MEASURED · CB–CF pending/);
  // Historical tip-334 CC–CF pending / Audit + CB MEASURED · CC–CF pending needles OK
  assert.match(freeze, /CC–CF pending/);
  assert.match(matrix, /CC–CF pending/);
  assert.match(freeze, /Audit \+ CB MEASURED · CC–CF pending/);
  assert.match(matrix, /Audit \+ CB MEASURED · CC–CF pending/);
  // Current-state CB+CC+CD+CE+CF MEASURED; historical CF pending OK in body
  assert.match(freeze, /CB MEASURED/);
  assert.match(matrix, /CB MEASURED/);
  assert.match(freeze, /CC MEASURED/);
  assert.match(matrix, /CC MEASURED/);
  assert.match(freeze, /CD MEASURED/);
  assert.match(matrix, /CD MEASURED/);
  assert.match(freeze, /CE MEASURED/);
  assert.match(matrix, /CE MEASURED/);
  assert.match(freeze, /CF MEASURED/);
  assert.match(matrix, /CF MEASURED/);
  assert.match(freeze, /CD–CF pending/);
  assert.match(matrix, /CD–CF pending/);
  assert.match(freeze, /CE–CF pending/);
  assert.match(matrix, /CE–CF pending/);
  assert.match(freeze, /CF pending/);
  assert.match(matrix, /CF pending/);
  assert.match(freeze, /Audit \+ CB \+ CC MEASURED · CD–CF pending/);
  assert.match(matrix, /Audit \+ CB \+ CC MEASURED · CD–CF pending/);
  assert.match(freeze, /Audit \+ CB \+ CC \+ CD MEASURED · CE–CF pending/);
  assert.match(matrix, /Audit \+ CB \+ CC \+ CD MEASURED · CE–CF pending/);
  assert.match(freeze, /Audit \+ CB \+ CC \+ CD \+ CE MEASURED · CF pending/);
  assert.match(matrix, /Audit \+ CB \+ CC \+ CD \+ CE MEASURED · CF pending/);
  assert.match(freeze, /CB\+CC\+CD\+CE\+CF MEASURED/);
  assert.match(matrix, /CB\+CC\+CD\+CE\+CF MEASURED/);
  assert.match(freeze, /SPEC-0085|Mission CB/);
  assert.match(matrix, /SPEC-0085|Mission CB/);
  assert.match(freeze, /SPEC-0086|Mission CC/);
  assert.match(matrix, /SPEC-0086|Mission CC/);
  assert.match(freeze, /SPEC-0087|Mission CD/);
  assert.match(matrix, /SPEC-0087|Mission CD/);
  assert.match(freeze, /SPEC-0088|Mission CE/);
  assert.match(matrix, /SPEC-0088|Mission CE/);
  assert.match(freeze, /SPEC-0089|Mission CF/);
  assert.match(matrix, /SPEC-0089|Mission CF/);
  assert.match(freezeHeader, /L24 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CB\+CC\+CD\+CE\+CF MEASURED/);
  assert.match(matrixHeader, /L24 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CB\+CC\+CD\+CE\+CF MEASURED/);
  assert.match(freezeHeader, /L23 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BW\+BX\+BY\+BZ\+CA MEASURED/);
  assert.match(matrixHeader, /L23 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BW\+BX\+BY\+BZ\+CA MEASURED/);
  assert.match(freeze, /Formal L24 CLOSED seal|Ladder 24 is \*\*CLOSED\*\*|L24 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /NEVER reopen L24|never reopen L24/);
  assert.match(matrix, /NEVER reopen L24|never reopen L24/);
  // Current-state header must show Formal L24 CLOSED; must NOT still claim L24 OPEN / CF pending as current (historical "then" OK); L23 stays CLOSED; Do NOT open L25
  assert.doesNotMatch(freezeHeader, /L24 OPEN \(Audit \+ CB \+ CC \+ CD \+ CE MEASURED · CF pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L24 OPEN \(Audit \+ CB \+ CC \+ CD \+ CE MEASURED · CF pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L24 OPEN \(Audit MEASURED · CB–CF pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L24 OPEN \(Audit MEASURED · CB–CF pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L24 OPEN \(Audit \+ CB MEASURED · CC–CF pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L24 OPEN \(Audit \+ CB MEASURED · CC–CF pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L24 OPEN \(Audit \+ CB \+ CC MEASURED · CD–CF pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L24 OPEN \(Audit \+ CB \+ CC MEASURED · CD–CF pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L24 OPEN \(Audit \+ CB \+ CC \+ CD MEASURED · CE–CF pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L24 OPEN \(Audit \+ CB \+ CC \+ CD MEASURED · CE–CF pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CF pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CF pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L23 OPEN \(Audit MEASURED/);
  assert.doesNotMatch(matrixHeader, /L23 OPEN \(Audit MEASURED/);
  assert.doesNotMatch(freezeHeader, /Ladder 25/);
  assert.doesNotMatch(matrixHeader, /Ladder 25/);

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
