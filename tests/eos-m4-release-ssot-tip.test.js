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

/** Tip refresh post-#390 pinned tip: main@d86d7525 / d86d7525d2a2d4c87c27230b5349b9745bad3c23 (prior freeze tip 62d430fb9f53641809d8825ee9e676f13bc5b48c tip-refresh post-#385 / L28 Audit MEASURED; L28 was OPEN (Audit MEASURED · CV–CZ pending then); tip-open #386; prune #387 @ a83ece67; #390 Merge pull request #390 Mission CV HUD/Doctor Honesty Ritual Composition Port (SPEC-0105); tip honesty restored; Ladder 28 OPEN (Audit MEASURED · CV MEASURED · CW–CZ pending); Formal L27 CLOSED retained; L17-L27 CLOSED retained; NEVER reopen L24; NEVER reopen L25; NEVER reopen L26; NEVER reopen L27; Do NOT start Mission CW; Do NOT claim CW–CZ MEASURED; Do NOT claim CV–CZ MEASURED; Do NOT claim L28 CLOSED; historical tip-385/383/380/377/375/373/365 needles OK) */
const EXPECTED_TIP = 'd86d7525d2a2d4c87c27230b5349b9745bad3c23';

test('M4/tip: freeze gate main_tip matches OBSERVED full-SHA pattern', () => {
  const text = fs.readFileSync(FREEZE, 'utf8');
  const m = text.match(TIP_LINE);
  assert.ok(m, 'freeze gate must declare main_tip: <40-hex> in header fence');
  assert.match(m[1], FULL_SHA);
  assert.equal(m[1], EXPECTED_TIP, 'freeze main_tip must equal tip-refresh-post-390 pinned tip');
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
  assert.equal(evalTip, EXPECTED_TIP, 'evaluated_tip must equal tip-refresh-post-390 pinned tip');
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
    'never reopen L23',
    'Tip refresh post #353',
    'Tip refresh post #354',
    'tip-refresh-post-354',
    'Tip seal #355',
    'Tip refresh post #356',
    'tip-refresh-post-356',
    'Tip refresh post #357',
    'Tip refresh post #358',
    'tip-refresh-post-358',
    'Tip refresh post #359',
    'Tip refresh post #360',
    'tip-refresh-post-360',
    'Tip refresh post #361',
    'Tip refresh post #362',
    'tip-refresh-post-365',
    'Tip refresh post #366',
    'tip-refresh-post-373',
    'Tip refresh post #373',
    'tip-refresh-post-373',
    'Tip refresh post #375',
    'tip-refresh-post-375',
    'Tip refresh post #377',
    'tip-refresh-post-377',
    'Tip refresh post #380',
    'tip-refresh-post-380',
    'tip-refresh-post-383',
    'Tip refresh post #383',
    'tip-refresh-post-385',
    'Tip refresh post #385',
    'tip-refresh-post-390',
    'Tip refresh post #390',
    'Mission CV',
    'CV MEASURED',
    'CW–CZ pending',
    'Audit MEASURED · CV MEASURED · CW–CZ pending',
    'Do NOT start Mission CW',
    'Tip-seal #384',
    'Ladder 28 Maturity Audit',
    'Ladder 28 OPEN',
    'L28 OPEN',
    'CV–CZ pending',
    'Audit MEASURED · CV–CZ pending',
    'Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric',
    'SPEC-0105',
    'SPEC-0106',
    'SPEC-0107',
    'SPEC-0108',
    'SPEC-0109',
    'Do NOT start Mission CV',
    'Formal L27 CLOSED retained',
    'Complexity prune deferred PO-gated',
    'Mission CQ',
    'CQ MEASURED',
    'Mission CR',
    'CR MEASURED',
    'Mission CS',
    'CS MEASURED',
    'CR–CU pending',
    'Audit + CQ MEASURED · CR–CU pending',
    'CT–CU pending',
    'Audit + CQ + CR + CS MEASURED · CT–CU pending',
    'Do NOT start Mission CR',
    'Do NOT start Mission CT',
    'Tip-open #376',
    'Ladder 27 Maturity Audit',
    'Ladder 27 OPEN',
    'L27 OPEN',
    'CQ–CU pending',
    'Audit MEASURED · CQ–CU pending',
    'Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric',
    'SPEC-0100',
    'SPEC-0101',
    'SPEC-0102',
    'SPEC-0103',
    'SPEC-0104',
    'Do NOT start Mission CQ',
    'NEVER reopen L26',
    'Formal L26 CLOSED retained',
    'Tip refresh post #373',
    'Tip seal #366',
    'post-L26 perfection',
    'Post-L26 A',
    'Post-L26 B',
    'Post-L26 C',
    'Post-L26 D',
    'Post-L26 E',
    'Post-L26 F',
    'Fundacion Δ=0 game-day',
    'post-L26 F',
    'Mission CM',
    'CM MEASURED',
    'Mission CN',
    'CN MEASURED',
    'CN–CP pending',
    'Audit + CL + CM MEASURED · CN–CP pending',
    'CO–CP pending',
    'Audit + CL + CM + CN MEASURED · CO–CP pending',
    'Mission CK',
    'CK MEASURED',
    'CG+CH+CI+CJ+CK MEASURED',
    'Ladder 25 CLOSED',
    'L25 CLOSED',
    'Ladder 25 Closeout',
    'never reopen L25',
    'NEVER reopen L25',
    'Do NOT open Ladder 26',
    'Ladder 26 Maturity Audit',
    'Ladder 26 OPEN',
    'L26 OPEN',
    'Ladder 26 CLOSED',
    'L26 CLOSED',
    'Ladder 26 Closeout',
    'Mission CL',
    'Mission CO',
    'Mission CP',
    'CL MEASURED',
    'CM–CP pending',
    'Audit + CL MEASURED · CM–CP pending',
    'CL–CP pending',
    'Audit MEASURED · CL–CP pending',
    'Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric',
    'SPEC-0095',
    'SPEC-0096',
    'SPEC-0097',
    'SPEC-0098',
    'SPEC-0099',

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

  // Formal L24 CLOSED retained; Formal L25 CLOSED retained; Formal L26 CLOSED retained after #365 Mission CP + tip-seal #366 (CL+CM+CN+CO+CP MEASURED + seam-pack + closeout); post-L26 perfection A–F (#368–#373) landed after seal without reopening L26; tip honesty post-#373; L17–L26 CLOSED retained; NEVER reopen L24; NEVER reopen L25; NEVER reopen L26; Do NOT open Ladder 27
  // Historical tip-354/352/350/348/346/344/342/340/338/336/334/332/330 needles remain OK in matrix/freeze body
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
  assert.match(matrix, /\|\s*Tip refresh post #344\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #345\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #346\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #347\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #348\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #349\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #350\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #351\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #352\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #353\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #354\s*\|/);
  assert.match(matrix, /\|\s*Tip seal #355\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #356\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #358\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #359\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #360\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #361\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #362\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #363\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #365\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #366\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #373\s*\|/);
  assert.match(matrix, /\|\s*Mission CM\s*\|/);
  assert.match(matrix, /\|\s*Mission CN\s*\|/);
  assert.match(matrix, /\|\s*Mission CO\s*\|/);
  assert.match(matrix, /\|\s*Mission CP\s*\|/);
  assert.match(matrix, /\|\s*Mission CL\s*\|/);
  assert.match(matrix, /\|\s*Mission CJ\s*\|/);
  assert.match(matrix, /\|\s*Mission CK\s*\|/);
  assert.match(matrix, /\|\s*Tip seal #343\s*\|/);
  assert.match(matrix, /\|\s*Ladder 25 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 25 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L25 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 25 Closeout\s*\|/);
  // Historical OPEN rows retained
  assert.match(matrix, /\|\s*Ladder 25 OPEN\s*\|/);
  assert.match(matrix, /\|\s*L25 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Ladder 26 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 26 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L26 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 26 Closeout\s*\|/);
  // Historical OPEN rows retained
  assert.match(matrix, /\|\s*Ladder 26 OPEN\s*\|/);
  assert.match(matrix, /\|\s*L26 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Mission CE\s*\|/);
  assert.match(matrix, /\|\s*Mission CF\s*\|/);
  assert.match(matrix, /\|\s*Mission CG\s*\|/);
  assert.match(matrix, /\|\s*Mission CH\s*\|/);
  assert.match(matrix, /\|\s*Mission CI\s*\|/);
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
  assert.match(freeze, /tip-refresh-post-344|Tip refresh post #344|tip refresh post-#344/);
  assert.match(matrix, /tip-refresh-post-344/);
  assert.match(freeze, /tip-refresh-post-346|Tip refresh post #346|tip refresh post-#346/);
  assert.match(matrix, /tip-refresh-post-346/);
  assert.match(freeze, /tip-refresh-post-348|Tip refresh post #348|tip refresh post-#348/);
  assert.match(matrix, /tip-refresh-post-348/);
  assert.match(freeze, /tip-refresh-post-350|Tip refresh post #350|tip refresh post-#350/);
  assert.match(matrix, /tip-refresh-post-350/);
  assert.match(freeze, /tip-refresh-post-352|Tip refresh post #352|tip refresh post-#352/);
  assert.match(matrix, /tip-refresh-post-352/);
  assert.match(freeze, /tip-refresh-post-354|Tip refresh post #354|tip refresh post-#354/);
  assert.match(matrix, /tip-refresh-post-354/);
  assert.match(freeze, /tip-refresh-post-356|Tip refresh post #356|tip refresh post-#356/);
  assert.match(matrix, /tip-refresh-post-356/);
  assert.match(freeze, /tip-refresh-post-358|Tip refresh post #358|tip refresh post-#358/);
  assert.match(matrix, /tip-refresh-post-358/);
  assert.match(freeze, /tip-refresh-post-360|Tip refresh post #360|tip refresh post-#360/);
  assert.match(matrix, /tip-refresh-post-360/);
  assert.match(freeze, /tip-refresh-post-362|Tip refresh post #362|tip refresh post-#362/);
  assert.match(matrix, /tip-refresh-post-362/);
  assert.match(freeze, /tip-refresh-post-365|Tip refresh post #365|tip refresh post-#365/);
  assert.match(matrix, /tip-refresh-post-365/);
  assert.match(freeze, /Tip refresh post #361|tip refresh post-#361|tip-361/);
  assert.match(matrix, /Tip refresh post #361/);
  assert.match(freeze, /Ladder 24 Maturity Gap Audit|Ladder 24 Maturity Audit|Ladder 24 Closeout/);
  assert.match(matrix, /Ladder 24 Maturity Gap Audit|Ladder 24 Maturity Audit|Ladder 24 Closeout/);
  assert.match(freeze, /Ladder 25 Maturity Gap Audit|Ladder 25 Maturity Audit|Ladder 25 Closeout|L25 CLOSED/);
  assert.match(matrix, /Ladder 25 Maturity Gap Audit|Ladder 25 Maturity Audit|Ladder 25 Closeout|L25 CLOSED/);
  assert.match(freeze, /Ladder 26 Maturity Gap Audit|Ladder 26 Maturity Audit|Ladder 26 Closeout|L26 CLOSED/);
  assert.match(matrix, /Ladder 26 Maturity Gap Audit|Ladder 26 Maturity Audit|Ladder 26 Closeout|L26 CLOSED/);
  assert.match(freeze, /Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric/);
  assert.match(matrix, /Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric/);
  assert.match(freeze, /Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric/);
  assert.match(matrix, /Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric/);
  assert.match(freeze, /Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric/);
  assert.match(matrix, /Sovereign Spec↔Code↔Evidence Traceability & Release Integrity Fabric/);
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
  // Current-state CB+CC+CD+CE+CF MEASURED retained; historical CF pending OK in body
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
  // L25 historical OPEN needles + historical CG–CK / CH–CK / CI–CK / CJ–CK / CK pending + current CG+CH+CI+CJ+CK MEASURED retained
  assert.match(freeze, /CG–CK pending/);
  assert.match(matrix, /CG–CK pending/);
  assert.match(freeze, /Audit MEASURED · CG–CK pending/);
  assert.match(matrix, /Audit MEASURED · CG–CK pending/);
  assert.match(freeze, /CH–CK pending/);
  assert.match(matrix, /CH–CK pending/);
  assert.match(freeze, /Audit \+ CG MEASURED · CH–CK pending/);
  assert.match(matrix, /Audit \+ CG MEASURED · CH–CK pending/);
  assert.match(freeze, /CI–CK pending/);
  assert.match(matrix, /CI–CK pending/);
  assert.match(freeze, /Audit \+ CG \+ CH MEASURED · CI–CK pending/);
  assert.match(matrix, /Audit \+ CG \+ CH MEASURED · CI–CK pending/);
  assert.match(freeze, /CJ–CK pending/);
  assert.match(matrix, /CJ–CK pending/);
  assert.match(freeze, /Audit \+ CG \+ CH \+ CI MEASURED · CJ–CK pending/);
  assert.match(matrix, /Audit \+ CG \+ CH \+ CI MEASURED · CJ–CK pending/);
  assert.match(freeze, /CK pending/);
  assert.match(matrix, /CK pending/);
  assert.match(freeze, /Audit \+ CG \+ CH \+ CI \+ CJ MEASURED · CK pending/);
  assert.match(matrix, /Audit \+ CG \+ CH \+ CI \+ CJ MEASURED · CK pending/);
  assert.match(freeze, /CG MEASURED/);
  assert.match(matrix, /CG MEASURED/);
  assert.match(freeze, /CH MEASURED/);
  assert.match(matrix, /CH MEASURED/);
  assert.match(freeze, /CI MEASURED/);
  assert.match(matrix, /CI MEASURED/);
  assert.match(freeze, /CJ MEASURED/);
  assert.match(matrix, /CJ MEASURED/);
  assert.match(freeze, /CK MEASURED/);
  assert.match(matrix, /CK MEASURED/);
  assert.match(freeze, /CG\+CH\+CI\+CJ\+CK MEASURED/);
  assert.match(matrix, /CG\+CH\+CI\+CJ\+CK MEASURED/);
  assert.match(freeze, /SPEC-0090|Mission CG/);
  assert.match(matrix, /SPEC-0090|Mission CG/);
  assert.match(freeze, /SPEC-0091|Mission CH/);
  assert.match(matrix, /SPEC-0091|Mission CH/);
  assert.match(freeze, /SPEC-0092|Mission CI/);
  assert.match(matrix, /SPEC-0092|Mission CI/);
  assert.match(freeze, /SPEC-0093|Mission CJ/);
  assert.match(matrix, /SPEC-0093|Mission CJ/);
  assert.match(freeze, /SPEC-0094|Mission CK/);
  assert.match(matrix, /SPEC-0094|Mission CK/);
  // L26 historical OPEN needles + CO–CP / CN–CP / CM–CP / CL–CP / CP pending historical + current CL+CM+CN+CO+CP MEASURED
  assert.match(freeze, /CO–CP pending/);
  assert.match(matrix, /CO–CP pending/);
  assert.match(freeze, /Audit \+ CL \+ CM \+ CN MEASURED · CO–CP pending/);
  assert.match(matrix, /Audit \+ CL \+ CM \+ CN MEASURED · CO–CP pending/);
  assert.match(freeze, /CN–CP pending/);
  assert.match(matrix, /CN–CP pending/);
  assert.match(freeze, /Audit \+ CL \+ CM MEASURED · CN–CP pending/);
  assert.match(matrix, /Audit \+ CL \+ CM MEASURED · CN–CP pending/);
  assert.match(freeze, /CM–CP pending/);
  assert.match(matrix, /CM–CP pending/);
  assert.match(freeze, /Audit \+ CL MEASURED · CM–CP pending/);
  assert.match(matrix, /Audit \+ CL MEASURED · CM–CP pending/);
  assert.match(freeze, /CL–CP pending/);
  assert.match(matrix, /CL–CP pending/);
  assert.match(freeze, /Audit MEASURED · CL–CP pending/);
  assert.match(matrix, /Audit MEASURED · CL–CP pending/);
  assert.match(freeze, /CP pending/);
  assert.match(matrix, /CP pending/);
  assert.match(freeze, /Audit \+ CL \+ CM \+ CN \+ CO MEASURED · CP pending/);
  assert.match(matrix, /Audit \+ CL \+ CM \+ CN \+ CO MEASURED · CP pending/);
  assert.match(freeze, /CL MEASURED|Mission CL/);
  assert.match(matrix, /CL MEASURED|Mission CL/);
  assert.match(freeze, /CM MEASURED|Mission CM/);
  assert.match(matrix, /CM MEASURED|Mission CM/);
  assert.match(freeze, /CN MEASURED|Mission CN/);
  assert.match(matrix, /CN MEASURED|Mission CN/);
  assert.match(freeze, /CO MEASURED|Mission CO/);
  assert.match(matrix, /CO MEASURED|Mission CO/);
  assert.match(freeze, /CP MEASURED|Mission CP/);
  assert.match(matrix, /CP MEASURED|Mission CP/);
  assert.match(freeze, /CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(matrix, /CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(freeze, /SPEC-0095|Mission CL/);
  assert.match(matrix, /SPEC-0095|Mission CL/);
  assert.match(freeze, /SPEC-0096|Mission CM/);
  assert.match(matrix, /SPEC-0096|Mission CM/);
  assert.match(freeze, /SPEC-0097|Mission CN/);
  assert.match(matrix, /SPEC-0097|Mission CN/);
  assert.match(freeze, /SPEC-0098|Mission CO/);
  assert.match(matrix, /SPEC-0098|Mission CO/);
  assert.match(freeze, /SPEC-0099|Mission CP/);
  assert.match(matrix, /SPEC-0099|Mission CP/);
  // Header: L24 CLOSED retained + L25 CLOSED retained + L26 CLOSED; L23 CLOSED retained
  assert.match(freezeHeader, /L24 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CB\+CC\+CD\+CE\+CF MEASURED/);
  assert.match(matrixHeader, /L24 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CB\+CC\+CD\+CE\+CF MEASURED/);
  assert.match(freezeHeader, /L23 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BW\+BX\+BY\+BZ\+CA MEASURED/);
  assert.match(matrixHeader, /L23 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; BW\+BX\+BY\+BZ\+CA MEASURED/);
  assert.match(freezeHeader, /L25 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CG\+CH\+CI\+CJ\+CK MEASURED/);
  assert.match(matrixHeader, /L25 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CG\+CH\+CI\+CJ\+CK MEASURED/);
  assert.match(freezeHeader, /L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(matrixHeader, /L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(freeze, /Formal L24 CLOSED seal|Ladder 24 is \*\*CLOSED\*\*|L24 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /NEVER reopen L24|never reopen L24/);
  assert.match(matrix, /NEVER reopen L24|never reopen L24/);
  assert.match(freeze, /Formal L25 CLOSED seal|Ladder 25 is \*\*CLOSED\*\*|L25 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /NEVER reopen L25|never reopen L25/);
  assert.match(matrix, /NEVER reopen L25|never reopen L25/);
  assert.match(freeze, /Formal L26 CLOSED seal|Ladder 26 is \*\*CLOSED\*\*|L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /NEVER reopen L26|never reopen L26/);
  assert.match(matrix, /NEVER reopen L26|never reopen L26/);
  assert.match(freeze, /Do NOT open Ladder 27|Do not open Ladder 27/);
  assert.match(matrix, /Do NOT open Ladder 27|Do not open Ladder 27/);
  assert.match(freeze, /Ladder 26 is \*\*CLOSED\*\*|L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(matrix, /Ladder 26 CLOSED|L26 CLOSED/);
  // Current-state header must show Formal L26 CLOSED; must NOT claim L26 OPEN / CO–CP pending / CP pending as current (historical "then" OK); L25/L24 stay CLOSED; Do NOT open L27
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
  // Forbid current-state L25 OPEN (without historical "then")
  assert.doesNotMatch(freezeHeader, /L25 OPEN \(Audit \+ CG \+ CH \+ CI \+ CJ MEASURED · CK pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L25 OPEN \(Audit \+ CG \+ CH \+ CI \+ CJ MEASURED · CK pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L25 OPEN \(Audit MEASURED · CG–CK pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L25 OPEN \(Audit MEASURED · CG–CK pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L25 OPEN \(Audit \+ CG MEASURED · CH–CK pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L25 OPEN \(Audit \+ CG MEASURED · CH–CK pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L25 OPEN \(Audit \+ CG \+ CH MEASURED · CI–CK pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L25 OPEN \(Audit \+ CG \+ CH MEASURED · CI–CK pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L25 OPEN \(Audit \+ CG \+ CH \+ CI MEASURED · CJ–CK pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L25 OPEN \(Audit \+ CG \+ CH \+ CI MEASURED · CJ–CK pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CK pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CK pending(?! then)/);
  // Forbid current-state L26 OPEN (without historical "then"); forbid CO–CP/CP pending as current; forbid Do NOT start Mission CO/CP without then
  assert.doesNotMatch(freezeHeader, /L26 OPEN \(Audit \+ CL \+ CM \+ CN MEASURED · CO–CP pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L26 OPEN \(Audit \+ CL \+ CM \+ CN MEASURED · CO–CP pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L26 OPEN \(Audit MEASURED · CL–CP pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L26 OPEN \(Audit MEASURED · CL–CP pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L26 OPEN \(Audit \+ CL MEASURED · CM–CP pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L26 OPEN \(Audit \+ CL MEASURED · CM–CP pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L26 OPEN \(Audit \+ CL \+ CM MEASURED · CN–CP pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L26 OPEN \(Audit \+ CL \+ CM MEASURED · CN–CP pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L26 OPEN \(Audit \+ CL \+ CM \+ CN \+ CO MEASURED · CP pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L26 OPEN \(Audit \+ CL \+ CM \+ CN \+ CO MEASURED · CP pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CO–CP pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CO–CP pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CP pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CP pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CL(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CL(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CM(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CM(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CN(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CN(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CO(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CO(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CP(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CP(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT open Ladder 26(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT open Ladder 26(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CK(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CK(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CJ(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CJ(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CI(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CI(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CH(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CH(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CG(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CG(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT open Ladder 25(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT open Ladder 25(?! then)/);
  assert.doesNotMatch(freezeHeader, /CJ–CK MEASURED/);
  assert.doesNotMatch(matrixHeader, /CJ–CK MEASURED/);
  assert.doesNotMatch(freezeHeader, /CI–CK MEASURED/);
  assert.doesNotMatch(matrixHeader, /CI–CK MEASURED/);
  assert.doesNotMatch(freezeHeader, /CH–CK MEASURED/);
  assert.doesNotMatch(matrixHeader, /CH–CK MEASURED/);
  assert.doesNotMatch(freezeHeader, /CG–CK MEASURED/);
  assert.doesNotMatch(matrixHeader, /CG–CK MEASURED/);


  assert.match(freeze, /tip-refresh-post-373|Tip refresh post #373|tip refresh post-#373/);
  assert.match(matrix, /tip-refresh-post-373/);
  assert.match(freeze, /Tip refresh post #366|tip-seal #366|Tip seal #366/);
  assert.match(matrix, /Tip refresh post #366|Tip seal #366/);
  assert.match(freeze, /post-L26 perfection A–F|Post-L26 A|Post-L26 F|post-L26 F/);
  assert.match(matrix, /Post-L26 A|Post-L26 F|post-L26 perfection/);
  assert.match(freeze, /Fundacion Δ=0 game-day|Fundacion Delta=0 game-day|game-day drill CL/);
  assert.match(matrix, /Fundacion Δ=0 game-day|Post-L26 F|game-day drill/);
  // Tip honesty post-#390: L28 OPEN (Audit MEASURED · CV MEASURED · CW–CZ pending); Formal L27 CLOSED retained; NEVER reopen L27; Do NOT start Mission CW
  assert.match(freezeHeader, /L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(matrixHeader, /L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(freezeHeader, /L27 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(matrixHeader, /L27 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(freezeHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW–CZ pending/);
  assert.match(matrixHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW–CZ pending/);
  assert.doesNotMatch(freezeHeader, /L28 OPEN \(Audit MEASURED · CV–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L28 OPEN \(Audit MEASURED · CV–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CV–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CV–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CV(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CV(?! then)/);
  assert.match(freezeHeader, /Do NOT start Mission CW/);
  assert.match(matrixHeader, /Do NOT start Mission CW/);
  assert.match(freezeHeader, /NEVER reopen L27|never reopen L27/);
  assert.match(matrixHeader, /NEVER reopen L27|never reopen L27/);
  assert.doesNotMatch(freezeHeader, /Do NOT open Ladder 28(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT open Ladder 28(?! then)/);
  assert.doesNotMatch(freezeHeader, /L26 OPEN(?!.*then)/);
  assert.doesNotMatch(matrixHeader, /L26 OPEN(?!.*then)/);
  assert.doesNotMatch(freezeHeader, /L27 OPEN \(Audit \+ CQ \+ CR \+ CS MEASURED · CT–CU pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L27 OPEN \(Audit \+ CQ \+ CR \+ CS MEASURED · CT–CU pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CT–CU pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CT–CU pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CT(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CT(?! then)/);
  assert.doesNotMatch(freezeHeader, /CQ–CU pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CQ–CU pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CR–CU pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CR–CU pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L27 OPEN \(Audit MEASURED · CQ–CU pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L27 OPEN \(Audit MEASURED · CQ–CU pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L27 OPEN \(Audit \+ CQ MEASURED · CR–CU pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L27 OPEN \(Audit \+ CQ MEASURED · CR–CU pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CQ(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CQ(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CR(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CR(?! then)/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CT–CU MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CT–CU MEASURED/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CR–CU MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CR–CU MEASURED/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CV–CZ MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CV–CZ MEASURED/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )L28 CLOSED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )L28 CLOSED/);
  assert.match(freezeHeader, /L27 CLOSED|Ladder 27 CLOSED|CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(matrixHeader, /L27 CLOSED|Ladder 27 CLOSED|CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CQ–CU MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CQ–CU MEASURED/);
  assert.match(freeze, /NEVER reopen L26|never reopen L26/);
  assert.match(matrix, /NEVER reopen L26|never reopen L26/);
  assert.match(freeze, /Ladder 27 is \*\*CLOSED\*\*|L27 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(matrix, /Ladder 27 CLOSED|L27 CLOSED/);
  assert.match(freeze, /Ladder 28 is \*\*OPEN\*\*|L28 OPEN \(Audit MEASURED · CV MEASURED · CW–CZ pending/);
  assert.match(matrix, /Ladder 28 OPEN|L28 OPEN/);
  assert.match(freeze, /Ladder 27 OPEN|L27 OPEN/);  // historical
  assert.match(matrix, /Ladder 27 OPEN|L27 OPEN/);
  assert.match(freeze, /tip-refresh-post-380|Tip refresh post #380|tip refresh post-#380/);
  assert.match(matrix, /tip-refresh-post-380/);
  assert.match(freeze, /tip-refresh-post-383|Tip refresh post #383|tip refresh post-#383/);
  assert.match(matrix, /tip-refresh-post-383/);
  assert.match(freeze, /tip-refresh-post-385|Tip refresh post #385|tip refresh post-#385/);
  assert.match(matrix, /tip-refresh-post-385/);
  assert.match(freeze, /tip-refresh-post-390|Tip refresh post #390|tip refresh post-#390/);
  assert.match(matrix, /tip-refresh-post-390/);
  assert.match(freeze, /tip-refresh-post-377|Tip refresh post #377|tip refresh post-#377/);
  assert.match(matrix, /tip-refresh-post-377/);
  assert.match(freeze, /tip-refresh-post-375|Tip refresh post #375|tip refresh post-#375/);
  assert.match(matrix, /tip-refresh-post-375/);
  assert.match(freeze, /CT–CU pending/);
  assert.match(matrix, /CT–CU pending/);
  assert.match(freeze, /Audit \+ CQ \+ CR \+ CS MEASURED · CT–CU pending/);
  assert.match(matrix, /Audit \+ CQ \+ CR \+ CS MEASURED · CT–CU pending/);
  assert.match(freeze, /CR–CU pending/);
  assert.match(matrix, /CR–CU pending/);
  assert.match(freeze, /Audit \+ CQ MEASURED · CR–CU pending/);
  assert.match(matrix, /Audit \+ CQ MEASURED · CR–CU pending/);
  assert.match(freeze, /CQ MEASURED/);
  assert.match(matrix, /CQ MEASURED/);
  assert.match(freeze, /CR MEASURED/);
  assert.match(matrix, /CR MEASURED/);
  assert.match(freeze, /CS MEASURED/);
  assert.match(matrix, /CS MEASURED/);
  assert.match(freeze, /CQ–CU pending/);
  assert.match(matrix, /CQ–CU pending/);
  assert.match(freeze, /Audit MEASURED · CQ–CU pending/);
  assert.match(matrix, /Audit MEASURED · CQ–CU pending/);
  assert.match(freeze, /CV–CZ pending/);
  assert.match(matrix, /CV–CZ pending/);
  assert.match(freeze, /Audit MEASURED · CV–CZ pending/);
  assert.match(matrix, /Audit MEASURED · CV–CZ pending/);
  assert.match(freeze, /CW–CZ pending/);
  assert.match(matrix, /CW–CZ pending/);
  assert.match(freeze, /Audit MEASURED · CV MEASURED · CW–CZ pending/);
  assert.match(matrix, /Audit MEASURED · CV MEASURED · CW–CZ pending/);
  assert.match(freeze, /CV MEASURED/);
  assert.match(matrix, /CV MEASURED/);
  assert.match(freeze, /SPEC-0100|Mission CQ/);
  assert.match(matrix, /SPEC-0100|Mission CQ/);
  assert.match(freeze, /SPEC-0101|Mission CR/);
  assert.match(matrix, /SPEC-0101|Mission CR/);
  assert.match(freeze, /SPEC-0102|Mission CS/);
  assert.match(matrix, /SPEC-0102|Mission CS/);
  assert.match(freeze, /SPEC-0103|Mission CT/);
  assert.match(matrix, /SPEC-0103|Mission CT/);
  assert.match(freeze, /SPEC-0104|Mission CU/);
  assert.match(matrix, /SPEC-0104|Mission CU/);
  assert.match(freeze, /SPEC-0105|Mission CV/);
  assert.match(matrix, /SPEC-0105|Mission CV/);
  assert.match(freeze, /SPEC-0109|Mission CZ/);
  assert.match(matrix, /SPEC-0109|Mission CZ/);
  assert.match(matrix, /\|\s*Ladder 27 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 27 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L27 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 27 Closeout\s*\|/);
  assert.match(matrix, /\|\s*Ladder 27 OPEN\s*\|/);  // historical
  assert.match(matrix, /\|\s*L27 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Ladder 28 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 28 OPEN\s*\|/);
  assert.match(matrix, /\|\s*L28 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #375\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #377\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #380\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #383\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #385\s*\|/);
  assert.match(matrix, /\|\s*Mission CQ\s*\|/);
  assert.match(matrix, /\|\s*Mission CR\s*\|/);
  assert.match(matrix, /\|\s*Mission CS\s*\|/);
  assert.match(matrix, /\|\s*Mission CT\s*\|/);
  assert.match(matrix, /\|\s*Mission CU\s*\|/);
  assert.match(matrix, /\|\s*CQ MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CR MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CS MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CR–CU pending\s*\|/);
  assert.match(matrix, /\|\s*CT–CU pending\s*\|/);
  assert.match(matrix, /\|\s*Audit \+ CQ MEASURED · CR–CU pending\s*\|/);
  assert.match(matrix, /\|\s*Audit \+ CQ \+ CR \+ CS MEASURED · CT–CU pending\s*\|/);
  assert.match(matrix, /\|\s*CV–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · CV–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission CV\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #390\s*\|/);
  assert.match(matrix, /\|\s*Mission CV\s*\|/);
  assert.match(matrix, /\|\s*CV MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CW–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · CV MEASURED · CW–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission CW\s*\|/);


  assert.match(freeze, /Do NOT start Mission CT|Do not start Mission CT/);
  assert.match(matrix, /Do NOT start Mission CT|Do not start Mission CT/);
  assert.match(freeze, /NEVER reopen L27|never reopen L27/);
  assert.match(matrix, /NEVER reopen L27|never reopen L27/);
  assert.match(freeze, /Do NOT start Mission CR|Do not start Mission CR/);
  assert.match(matrix, /Do NOT start Mission CR|Do not start Mission CR/);
  assert.match(freeze, /Do NOT start Mission CQ|Do not start Mission CQ/);
  assert.match(matrix, /Do NOT start Mission CQ|Do not start Mission CQ/);
  assert.match(freeze, /Do NOT start Mission CV|Do not start Mission CV/);
  assert.match(matrix, /Do NOT start Mission CV|Do not start Mission CV/);
  assert.match(freeze, /Do NOT start Mission CW|Do not start Mission CW/);
  assert.match(matrix, /Do NOT start Mission CW|Do not start Mission CW/);
  assert.match(freeze, /Formal L26 CLOSED|Ladder 26 is \*\*CLOSED\*\*|L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim L27 CLOSED then|Do not claim L27 CLOSED then|Do NOT claim L27 CLOSED/);
  assert.match(matrix, /Do NOT claim L27 CLOSED then|Do not claim L27 CLOSED then|Do NOT claim L27 CLOSED/);
  assert.match(freeze, /Do NOT claim CT–CU MEASURED then|CT–CU MEASURED then|Do NOT claim CT–CU MEASURED/);
  assert.match(matrix, /Do NOT claim CT–CU MEASURED then|CT–CU MEASURED then|Do NOT claim CT–CU MEASURED/);
  assert.match(freeze, /Do NOT claim CV–CZ MEASURED|Do not claim CV–CZ MEASURED/);
  assert.match(matrix, /Do NOT claim CV–CZ MEASURED|Do not claim CV–CZ MEASURED/);
  assert.match(freeze, /Do NOT claim L28 CLOSED|Do not claim L28 CLOSED/);
  assert.match(matrix, /Do NOT claim L28 CLOSED|Do not claim L28 CLOSED/);
  assert.match(freeze, /CT MEASURED/);
  assert.match(matrix, /CT MEASURED/);
  assert.match(freeze, /CU MEASURED/);
  assert.match(matrix, /CU MEASURED/);
  assert.match(freeze, /CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(matrix, /CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(freeze, /Sovereign Operator Control-Plane Composition & HUD\/Doctor Ritual Fabric/);
  assert.match(matrix, /Sovereign Operator Control-Plane Composition & HUD\/Doctor Ritual Fabric/);
  assert.match(freeze, /Complexity prune|inventory≠delete|PO-gated/);
  assert.match(matrix, /Complexity prune deferred PO-gated|inventory≠delete/);

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
