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

/** Tip refresh post-#415 pinned tip: main@31f811ca / 31f811caf7ff28cc25aa9ac87add0e45f4abf650 (prior freeze tip 36c99107dfc6696aa8e54533a6a67622f1437fc8 tip-open-post-413 / L30 OPEN Audit MEASURED · DF–DJ pending then; #415 Merge pull request #415 Mission DF (SPEC-0115); tip honesty restored; L30 OPEN (Audit + DF MEASURED · DG–DJ pending; Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric); Formal Ladder 29 CLOSED retained; NEVER reopen L29; Do NOT claim DG–DJ MEASURED; Do NOT claim L30 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-open-413 needles OK) */
/** HIST tip-open-post-413 was main@36c99107 / 36c99107dfc6696aa8e54533a6a67622f1437fc8 (prior freeze tip 9e3c01916664bbb9cd2f5202024ec2cc0c5ec210 tip-refresh-post-411 / Formal Ladder 29 CLOSED retained; #413 Merge pull request #413 Ladder 30 Maturity Gap Audit; tip honesty restored; L30 OPEN (Audit MEASURED · DF–DJ pending; Sovereign Complexity Ceiling Governance & Maturity Hardening Fabric); Formal Ladder 29 CLOSED retained; NEVER reopen L29; Do NOT claim DF–DJ MEASURED; Do NOT claim L30 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-411/seal-410 needles OK) */
/** HIST tip-refresh-post-411 was main@9e3c0191 / 9e3c01916664bbb9cd2f5202024ec2cc0c5ec210 (prior freeze tip 2f52ee5e752f5ab035b1fa29e1b7287f0ff3e1dc tip-seal-post-410; Formal Ladder 29 CLOSED retained; #411 Merge pull request #411 tip-seal Formal Ladder 29 CLOSED; tip honesty restored; NEVER reopen L29; Do NOT claim PRODUCTION_READY; historical tip-seal-410 needles OK) */
/** HIST tip-seal-post-410 was main@2f52ee5e / 2f52ee5e752f5ab035b1fa29e1b7287f0ff3e1dc (prior freeze tip 4d8c6c594fba94fc0c975dd7c13fb7d183a8aade tip-refresh post-#407 / L29 OPEN (Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD–DE pending then); tip-refresh #408 @ 0a6dbe65; DD #409 @ d57b6ddb; tip-refresh post-#409 superseded by DE landing before apply; #410 Merge pull request #410 Mission DE (SPEC-0114) Ladder 29 seam-pack closeout; tip honesty restored; Formal Ladder 29 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DA+DB+DC+DD+DE MEASURED + seam-pack + closeout; Sovereign Observability & Evidence Economy Fabric); Formal L28 CLOSED retained; L17-L29 CLOSED retained; NEVER reopen L24; NEVER reopen L25; NEVER reopen L26; NEVER reopen L27; NEVER reopen L28; NEVER reopen L29; Do NOT start next ladder satellites unless separately audited; Do NOT claim PRODUCTION_READY; historical tip-409/407/405/403/tip-open-401 needles OK) */
/** Tip refresh post-#450 pinned tip: main@d667c6b5 / d667c6b578d5c1b5ff9995101272e86dd039f5be (prior freeze tip b485ae0b2472ef8b6f7213fde82fc3ed05ead33d tip-refresh-post-447 / tip-post-447 / Tip honesty post-#447 then; tip-refresh-post-450 / tip-post-450 / Tip honesty post-#450; Formal L30 CLOSED retained; Formal L31 CLOSED retained; Formal L32 CLOSED retained; L33 OPEN (Audit + DU + DV + DW MEASURED · DX–DY pending); NEVER reopen L17–L32; NEVER reopen L29; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; Do NOT claim DX–DY MEASURED; Do NOT claim L33 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-447 / tip-refresh-post-445 / tip-refresh-post-442 / tip-honesty-l30-l33 / tip-refresh-415 / tip-open-413 needles OK) */
/** Tip refresh post-#452 pinned tip: main@fe52fb3b / fe52fb3bbfa23aaedcca3efdaa53e1c16722a823 (prior freeze tip d667c6b578d5c1b5ff9995101272e86dd039f5be tip-refresh-post-450 / tip-post-450 / Tip honesty post-#450 then; tip-refresh-post-452 / tip-post-452 / Tip honesty post-#452; Formal L30 CLOSED retained; Formal L31 CLOSED retained; Formal L32 CLOSED retained; L33 OPEN (Audit + DU + DV + DW + DX MEASURED · DY pending); NEVER reopen L17–L32; NEVER reopen L29; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; Do NOT claim DY MEASURED; Do NOT claim L33 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-450 / tip-refresh-post-447 / tip-refresh-post-445 / tip-refresh-post-442 / tip-honesty-l30-l33 / tip-refresh-415 / tip-open-413 needles OK) */
/** Tip seal post-#485 pinned tip: main@079d90b2 / 079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6 (prior bdd53e30015040223267146ef551064473d771d1 tip-refresh-post-482; tip-refresh-post-484 / L35 OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric) then; Formal Ladder 35 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + EE + EF + EG + EH + EI MEASURED + seam-pack + closeout; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric); Formal L30+L31+L32+L33+L34 CLOSED retained; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; NEVER reopen L33; NEVER reopen L34; NEVER reopen L35; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-484 / tip-refresh-post-482 / tip-refresh-post-480 / tip-refresh-post-478 / tip-refresh-post-476 / tip-refresh-post-474 / tip-open-post-473 / tip-refresh-post-471 / tip-seal-post-470 needles OK) */
/** HIST tip-refresh-post-482 pinned tip: main@bdd53e30 / bdd53e30015040223267146ef551064473d771d1 (prior ff4b6d19132cfa0ab279109b9e09989e297dba71 tip-refresh-post-480 / tip-post-480 / Tip honesty post-#480 / L35 OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric); Formal L30+L31+L32+L33+L34 CLOSED retained; NEVER reopen L34; Do NOT claim EI MEASURED; Do NOT claim L35 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-480 / tip-refresh-post-478 / tip-refresh-post-476 / tip-refresh-post-474 / tip-open-post-473 / tip-refresh-post-471 / tip-seal-post-470 needles OK) */
/** HIST tip-refresh-post-480 pinned tip: main@ff4b6d19 / ff4b6d19132cfa0ab279109b9e09989e297dba71 (prior 732522086a161f257bb758a31350c84c33030bf9 tip-refresh-post-478 / tip-post-478 / Tip honesty post-#478 / L35 OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric); Formal L30+L31+L32+L33+L34 CLOSED retained; NEVER reopen L34; Do NOT claim EH–EI MEASURED; Do NOT claim L35 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-478 / tip-refresh-post-476 / tip-refresh-post-474 / tip-open-post-473 / tip-refresh-post-471 / tip-seal-post-470 needles OK) */
/** HIST tip-refresh-post-478 pinned tip: main@73252208 / 732522086a161f257bb758a31350c84c33030bf9 (prior 0a286ad8f4bfda1fafb8d5503de8babf89934a7c tip-refresh-post-476 / tip-post-476 / Tip honesty post-#476 / L35 OPEN (Audit MEASURED · EE MEASURED · EF–EI pending; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric); Formal L30+L31+L32+L33+L34 CLOSED retained; NEVER reopen L34; Do NOT claim EG–EI MEASURED; Do NOT claim L35 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-476 / tip-refresh-post-474 / tip-open-post-473 / tip-refresh-post-471 / tip-seal-post-470 needles OK) */
/** HIST tip-refresh-post-476 pinned tip: main@0a286ad8 / 0a286ad8f4bfda1fafb8d5503de8babf89934a7c (prior 9600063c07f82dff13720ddcfb35e0d78804113b tip-refresh-post-474 / tip-post-474 / Tip honesty post-#474 / L35 OPEN (Audit MEASURED · EE–EI pending; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric); Formal L30+L31+L32+L33+L34 CLOSED retained; NEVER reopen L34; Do NOT claim EF–EI MEASURED; Do NOT claim L35 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-474 / tip-open-post-473 / tip-refresh-post-471 / tip-seal-post-470 needles OK) */
/** HIST tip-refresh-post-474 pinned tip: main@9600063c / 9600063c07f82dff13720ddcfb35e0d78804113b (prior 0312795d300abc4af18d7d7b4a17ec0f618f534a tip-open-post-473 / tip-open L35 / Tip open post-#473 / L35 OPEN (Audit MEASURED · EE–EI pending; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric); Formal L30+L31+L32+L33+L34 CLOSED retained; NEVER reopen L34; Do NOT claim EE–EI MEASURED; Do NOT claim L35 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-open-post-473 / tip-refresh-post-471 / tip-seal-post-470 needles OK) */
/** HIST tip-open-post-473 pinned tip: main@0312795d / 0312795d300abc4af18d7d7b4a17ec0f618f534a (prior freeze tip 1153a289d9686f14f960e3c8fa9997b16c666bd4 tip-refresh-post-471 / tip-post-471 / Tip honesty post-#471 / Formal Ladder 34 CLOSED retained; #473 Merge pull request #473 Ladder 35 Maturity Gap Audit; tip honesty restored; L35 OPEN (Audit MEASURED · EE–EI pending; Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric); Formal L30+L31+L32+L33+L34 CLOSED retained; NEVER reopen L34; Do NOT claim EE–EI MEASURED; Do NOT claim L35 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-471 / tip-seal-post-470 needles OK) */
/** HIST tip-refresh-post-471 was main@1153a289 / 1153a289d9686f14f960e3c8fa9997b16c666bd4 (prior b2c582e4463e698f498bc6c0b2c3bae8c82584e7 tip-seal-post-470 / tip-seal L34 CLOSED / Formal Ladder 34 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DZ + EA + EB + EC + ED MEASURED + seam-pack + closeout; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric); Formal L34 CLOSED retained; Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; NEVER reopen L33; NEVER reopen L34; Do NOT claim PRODUCTION_READY; historical tip-seal-post-470 / tip-refresh-post-469 needles OK) */
/** HIST tip-seal-post-470 was main@b2c582e4 / b2c582e4463e698f498bc6c0b2c3bae8c82584e7 (prior 29586ab8f2c8a784eb84f5c5e9c899118c577427 tip-refresh-post-467; tip-refresh-post-469 / L34 OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED MEASURED · tip-seal pending; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric) then; Formal Ladder 34 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DZ + EA + EB + EC + ED MEASURED + seam-pack + closeout; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric); Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; NEVER reopen L33; NEVER reopen L34; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-469 / tip-refresh-post-467 needles OK) */
/** HIST tip-refresh-post-467 pinned tip: main@29586ab8 / 29586ab8f2c8a784eb84f5c5e9c899118c577427 (prior 19b353d8fa07ece41df251d4eaeaa8778c13ed81 tip-refresh-post-465 / tip-post-465 / Tip honesty post-#465 / L34 OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric)); Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L33; Do NOT claim ED MEASURED; Do NOT claim L34 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-465 / tip-refresh-post-463 / tip-refresh-post-461 / tip-open-post-458 / tip-refresh-post-456 / tip-seal-post-455 needles OK) */
/** HIST tip-refresh-post-465 pinned tip: main@19b353d8 / 19b353d8fa07ece41df251d4eaeaa8778c13ed81 (prior 037f95786724936aecf48bf3684b4dd5dc37e815 tip-refresh-post-463 / tip-post-463 / Tip honesty post-#463 / L34 OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric); Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L33; Do NOT claim EC–ED MEASURED; Do NOT claim L34 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-463 / tip-refresh-post-461 / tip-open-post-458 / tip-refresh-post-456 / tip-seal-post-455 needles OK) */
/** HIST tip-refresh-post-463 pinned tip: main@037f9578 / 037f95786724936aecf48bf3684b4dd5dc37e815 (prior 1f2234cffdecd7e0810d7271c5e92adc9f8c75f3 tip-refresh-post-461 / tip-post-461 / Tip honesty post-#461 / L34 OPEN (Audit MEASURED · DZ MEASURED · EA–ED pending; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric); Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L33; Do NOT claim EB–ED MEASURED; Do NOT claim L34 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-461 / tip-open-post-458 / tip-refresh-post-456 / tip-seal-post-455 needles OK) */
/** HIST tip-refresh-post-461 pinned tip: main@1f2234cf / 1f2234cffdecd7e0810d7271c5e92adc9f8c75f3 (prior b382d29bee2494f21652f9207170d900c7179f4c tip-refresh-post-459 / tip-post-459 / Tip honesty post-#459 / L34 OPEN (Audit MEASURED · DZ–ED pending; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric); Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L33; Do NOT claim EA–ED MEASURED; Do NOT claim L34 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-459 / tip-open-post-458 / tip-refresh-post-456 / tip-seal-post-455 needles OK) */
/** HIST tip-refresh-post-459 pinned tip: main@b382d29b / b382d29bee2494f21652f9207170d900c7179f4c (prior eb6134a42d6bff20bdbdd0c0a91297f808b2fe77 tip-open-post-458 / tip-open L34 / Tip open post-#458 / L34 OPEN (Audit MEASURED · DZ–ED pending; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric); Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L33; Do NOT claim DZ–ED MEASURED; Do NOT claim L34 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-open-post-458 / tip-refresh-post-456 / tip-seal-post-455 needles OK) */
/** HIST tip-open-post-458 pinned tip: main@eb6134a4 / eb6134a42d6bff20bdbdd0c0a91297f808b2fe77 (prior freeze tip 2b23f50454f2e8541f90a39aae7e6d067d320502 tip-refresh-post-456 / tip-post-456 / Tip honesty post-#456 / Formal Ladder 33 CLOSED retained; #458 Merge pull request #458 Ladder 34 Maturity Gap Audit; tip honesty restored; L34 OPEN (Audit MEASURED · DZ–ED pending; Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric); Formal L30+L31+L32+L33 CLOSED retained; NEVER reopen L33; Do NOT claim DZ–ED MEASURED; Do NOT claim L34 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-456 / tip-seal-post-455 needles OK) */
/** HIST tip-refresh-post-456 was main@2b23f504 / 2b23f50454f2e8541f90a39aae7e6d067d320502 (prior 446bbe49f2fbf9e83604faf16e50b36b70cdb216 tip-seal-post-455 / tip-seal L33 CLOSED / Formal Ladder 33 CLOSED; Formal Ladder 33 CLOSED retained (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DU + DV + DW + DX + DY MEASURED + seam-pack + closeout; Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric); Formal L30+L31+L32 CLOSED retained; NEVER reopen L30; NEVER reopen L31; NEVER reopen L32; NEVER reopen L33; Do NOT claim PRODUCTION_READY; historical tip-seal-post-455 / tip-refresh-post-454 / tip-refresh-post-452 needles OK) */
/** Tip-refresh post-#493 pinned tip: main@72697dd5 / 72697dd506284284e5cbbe3ebf2c68cef8fbf006 (prior 5e5af28130d3e742ae5274fab9913453317c913b tip-refresh-post-491 / tip-post-491 / Tip honesty post-#491 / L36 OPEN (Audit MEASURED · EJ MEASURED · EK–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric); Formal L30+L31+L32+L33+L34+L35 CLOSED retained; NEVER reopen L35; Do NOT claim EL–EN MEASURED; Do NOT claim L36 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-491 / tip-open-post-488 / tip-refresh-post-486 / tip-seal-post-485 needles OK) */
/** HIST tip-refresh-post-491 pinned tip: main@5e5af281 / 5e5af28130d3e742ae5274fab9913453317c913b (prior d7490fee0e419fc58602f67b0051ca06e649595a tip-refresh-post-489 / tip-post-489 / Tip honesty post-#489 / L36 OPEN (Audit MEASURED · EJ–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric); Formal L30+L31+L32+L33+L34+L35 CLOSED retained; NEVER reopen L35; Do NOT claim EK–EN MEASURED; Do NOT claim L36 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-489 / tip-open-post-488 / tip-refresh-post-486 / tip-seal-post-485 needles OK) */
/** HIST tip-refresh-post-489 pinned tip: main@d7490fee / d7490fee0e419fc58602f67b0051ca06e649595a (prior 73276cbab1e750fc69f3aaf71353e12d517e00ed tip-open-post-488 / tip-open L36 / Tip open post-#488 / L36 OPEN (Audit MEASURED · EJ–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric); Formal L30+L31+L32+L33+L34+L35 CLOSED retained; NEVER reopen L35; Do NOT claim EJ–EN MEASURED; Do NOT claim L36 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-open-post-488 / tip-refresh-post-486 / tip-seal-post-485 needles OK) */
/** HIST tip-open-post-488 pinned tip: main@73276cba / 73276cbab1e750fc69f3aaf71353e12d517e00ed (prior freeze tip 0903b037d29393bce5cdf7c3b23933d9613a192a tip-refresh-post-486 / tip-post-486 / Tip honesty post-#486 / Formal Ladder 35 CLOSED retained; #488 Merge pull request #488 Ladder 36 Maturity Gap Audit; tip honesty restored; L36 OPEN (Audit MEASURED · EJ–EN pending; Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric); Formal L30+L31+L32+L33+L34+L35 CLOSED retained; NEVER reopen L35; Do NOT claim EJ–EN MEASURED; Do NOT claim L36 CLOSED; Do NOT claim PRODUCTION_READY; historical tip-refresh-post-486 / tip-seal-post-485 needles OK) */
const EXPECTED_TIP = '72697dd506284284e5cbbe3ebf2c68cef8fbf006';

test('M4/tip: freeze gate main_tip matches OBSERVED full-SHA pattern', () => {
  const text = fs.readFileSync(FREEZE, 'utf8');
  const m = text.match(TIP_LINE);
  assert.ok(m, 'freeze gate must declare main_tip: <40-hex> in header fence');
  assert.match(m[1], FULL_SHA);
  assert.equal(m[1], EXPECTED_TIP, 'freeze main_tip must equal tip-refresh-post-493 pinned tip');
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
  assert.equal(evalTip, tip, 'evaluated_tip must equal tip-refresh-post-493 pinned tip');
  assert.equal(evalTip, EXPECTED_TIP, 'evaluated_tip must equal tip-refresh-post-493 pinned tip');
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
    'tip-refresh-post-392',
    'Tip refresh post #392',
    'tip-refresh-post-394',
    'Tip refresh post #394',
    'tip-refresh-post-396',
    'Tip refresh post #396',
    'tip-seal-post-398',
    'Tip seal post #398',
    'tip-refresh-post-399',
    'Tip refresh post #399',
    'Do NOT start Ladder 29 satellites until L29 audit MEASURED',
    'tip-open-post-401',
    'Tip-open post #401',
    'Ladder 29 Maturity Audit',
    'Ladder 29 OPEN',
    'L29 OPEN',
    'DA–DE pending',
    'Audit MEASURED · DA–DE pending',
    'Do NOT claim DA–DE MEASURED',
    'Do NOT claim L29 CLOSED',
    'Sovereign Observability & Evidence Economy Fabric',
    'SPEC-0110',
    'SPEC-0111',
    'SPEC-0112',
    'SPEC-0113',
    'SPEC-0114',
    'tip-refresh-post-403',
    'Tip refresh post #403',
    'Mission DA',
    'DA MEASURED',
    'DB–DE pending',
    'Audit MEASURED · DA MEASURED · DB–DE pending',
    'Do NOT start Mission DB',
    'Do NOT claim DB–DE MEASURED',
    'b51d5934',
    'tip-refresh-post-405',
    'Tip refresh post #405',
    'Mission DB',
    'DB MEASURED',
    'DC–DE pending',
    'Audit MEASURED · DA MEASURED · DB MEASURED · DC–DE pending',
    'Do NOT start Mission DC',
    'Do NOT claim DC–DE MEASURED',
    '3ba8df99',
    'tip-refresh-post-407',
    'Tip refresh post #407',
    'Mission DC',
    'DC MEASURED',
    'DD–DE pending',
    'Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD–DE pending',
    'Do NOT start Mission DD',
    'Do NOT claim DD–DE MEASURED',
    '0107b9b8',
    'tip-refresh-post-409',
    'Tip refresh post #409',
    'tip-seal-post-410',
    'tip-refresh-post-411',
    'tip-open-post-413',
    'tip-refresh-post-415',
    'tip-honesty-l30-l33',
    'tip-refresh-post-442',
    'tip-refresh-post-445',
    'tip-refresh-post-447',
    'tip-refresh-post-450',
    'tip-refresh-post-493',
    'tip-post-493',
    'Tip honesty post-#493',
    'tip-refresh-post-491',
    'tip-post-491',
    'Tip honesty post-#491',
    'tip-refresh-post-489',
    'tip-post-489',
    'Tip honesty post-#489',
    'tip-open-post-488',
    'tip-open L36',
    'Tip open post-#488',
    'L36 OPEN',
    'Ladder 36 OPEN',
    'Audit MEASURED · EJ–EN pending',
    'tip-refresh-post-486',
    'tip-post-486',
    'Tip honesty post-#486',
    'tip-seal-post-485',
    'tip-seal L35',
    'Tip seal post #485',
    'Tip seal post-#485',
    'Formal L35 CLOSED',
    'Ladder 35 CLOSED',
    'L35 CLOSED',
    'NEVER reopen L35',
    'Audit + EE + EF + EG + EH + EI MEASURED + seam-pack + closeout',
    'Mission EI',
    'EI MEASURED',
    'Mission EI MEASURED',
    'tip-refresh-post-484',
    'tip-post-484',
    'Tip honesty post-#484',
    'EI MEASURED',
    'Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED',
    'tip-refresh-post-482',
    'tip-post-482',
    'Tip honesty post-#482',
    'EH MEASURED',
    'Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending',
    'tip-refresh-post-480',
    'tip-post-480',
    'Tip honesty post-#480',
    'EG MEASURED',
    'Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending',
    'tip-refresh-post-478',
    'tip-post-478',
    'Tip honesty post-#478',
    'EF MEASURED',
    'Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending',
    'tip-refresh-post-476',
    'tip-post-476',
    'Tip honesty post-#476',
    'EE MEASURED',
    'Audit MEASURED · EE MEASURED · EF–EI pending',
    'tip-refresh-post-474',
    'tip-open-post-473',
    'tip-open L35',
    'Tip open post-#473',
    'L35 OPEN',
    'Ladder 35 OPEN',
    'Audit MEASURED · EE–EI pending',
    'tip-refresh-post-471',
    'tip-post-471',
    'Tip honesty post-#471',
    'tip-seal-post-470',
    'tip-seal L34',
    'Tip seal post #470',
    'Tip seal post-#470',
    'Formal L34 CLOSED',
    'Ladder 34 CLOSED',
    'L34 CLOSED',
    'NEVER reopen L34',
    'Audit + DZ + EA + EB + EC + ED MEASURED + seam-pack + closeout',
    'Mission ED',
    'ED MEASURED',
    'Mission ED MEASURED',
    'tip-refresh-post-469',
    'tip-post-469',
    'Tip honesty post-#469',
    'ED MEASURED',
    'tip-seal pending',
    'Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED MEASURED · tip-seal pending',
    'Audit MEASURED · DZ–ED MEASURED · tip-seal pending',
    'tip-refresh-post-467',
    'tip-post-467',
    'Tip honesty post-#467',
    'EC MEASURED',
    'Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending',
    'tip-refresh-post-465',
    'tip-post-465',
    'Tip honesty post-#465',
    'EB MEASURED',
    'Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending',
    'tip-refresh-post-463',
    'tip-post-463',
    'Tip honesty post-#463',
    'tip-refresh-post-461',
    'tip-post-461',
    'Tip honesty post-#461',
    'tip-open-post-458',
    'EA MEASURED',
    'DZ MEASURED',
    'Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending',
    'tip-refresh-post-456',
    'tip-post-456',
    'Tip honesty post-#456',
    'tip-seal-post-455',
    'tip-seal L33',
    'Tip seal post #455',
    'Tip seal post-#455',
    'Formal L33 CLOSED',
    'Ladder 33 CLOSED',
    'L33 CLOSED',
    'NEVER reopen L33',
    'Audit + DU + DV + DW + DX + DY MEASURED + seam-pack + closeout',
    'Mission DY',
    'DY MEASURED',
    'Mission DY MEASURED',
    'tip-refresh-post-454',
    'tip-post-454',
    'Tip honesty post-#454',
    'tip-refresh-post-452',
    'tip-post-452',
    'Tip honesty post-#452',
    'tip-post-450',
    'Tip honesty post-#450',
    'tip-post-447',
    'Tip honesty post-#447',
    'tip-post-445',
    'Tip honesty post-#445',
    'tip-post-442',
    'Tip honesty post-#442',
    'tip-seal L30–L32',
    'tip-open L33',
    'L30 OPEN',
    'Tip seal post #410',
    'Ladder 29 CLOSED',
    'L29 CLOSED',
    'Mission DE',
    'DE MEASURED',
    'Mission DE MEASURED',
    'Ladder 29 Closeout',
    'Audit + DA+DB+DC+DD+DE MEASURED + seam-pack + closeout',
    'NEVER reopen L29',
    'Mission DD',
    'DD MEASURED',
    'DE pending',
    'Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD MEASURED · DE pending',
    'Do NOT start Mission DE',
    'Do NOT claim DE MEASURED',
    '0a6dbe65',
    'Ladder 28 CLOSED',
    'L28 CLOSED',
    'Mission CZ',
    'CZ MEASURED',
    'Mission CZ MEASURED',
    'Ladder 28 Closeout',
    'Audit + CV+CW+CX+CY+CZ MEASURED + seam-pack + closeout',
    'NEVER reopen L28',
    'Do NOT claim PRODUCTION_READY',
    'Mission CV',
    'CV MEASURED',
    'Mission CW',
    'CW MEASURED',
    'Mission CX',
    'CX MEASURED',
    'Mission CY',
    'CY MEASURED',
    'CW–CZ pending',
    'CX–CZ pending',
    'CY–CZ pending',
    'CZ pending',
    'Audit MEASURED · CV MEASURED · CW–CZ pending',
    'Audit MEASURED · CV MEASURED · CW MEASURED · CX–CZ pending',
    'Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY–CZ pending',
    'Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY MEASURED · CZ pending',
    'Do NOT start Mission CW',
    'Do NOT start Mission CX',
    'Do NOT start Mission CY',
    'Do NOT start Mission CZ',
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
  // Tip honesty post-#410: Formal L29 CLOSED (Audit + DA+DB+DC+DD+DE MEASURED + seam-pack + closeout); Formal L28 CLOSED retained; Formal L27 CLOSED retained; NEVER reopen L27; NEVER reopen L28; NEVER reopen L29; Do NOT claim PRODUCTION_READY
  assert.match(freezeHeader, /L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(matrixHeader, /L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CL\+CM\+CN\+CO\+CP MEASURED/);
  assert.match(freezeHeader, /L27 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(matrixHeader, /L27 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(freezeHeader, /L28 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ CV\+CW\+CX\+CY\+CZ MEASURED/);
  assert.match(matrixHeader, /L28 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ CV\+CW\+CX\+CY\+CZ MEASURED/);
  assert.match(freezeHeader, /NEVER reopen L28|never reopen L28/);
  assert.match(matrixHeader, /NEVER reopen L28|never reopen L28/);
  assert.doesNotMatch(freezeHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY MEASURED · CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY MEASURED · CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW MEASURED · CX–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW MEASURED · CX–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L28 OPEN \(Audit MEASURED · CV MEASURED · CW–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /L28 OPEN \(Audit MEASURED · CV–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /L28 OPEN \(Audit MEASURED · CV–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CV–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CV–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CW–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CW–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /CX–CZ pending(?! then)/);
  assert.doesNotMatch(matrixHeader, /CX–CZ pending(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CV(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CV(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CW(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CW(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CX(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CX(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CZ(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CZ(?! then)/);
  assert.doesNotMatch(freezeHeader, /Do NOT start Mission CY(?! then)/);
  assert.doesNotMatch(matrixHeader, /Do NOT start Mission CY(?! then)/);
  assert.match(freezeHeader, /Do NOT claim PRODUCTION_READY|Do not claim PRODUCTION_READY/);
  assert.match(matrixHeader, /Do NOT claim PRODUCTION_READY|Do not claim PRODUCTION_READY/);
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
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CW–CZ MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CW–CZ MEASURED/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CX–CZ MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CX–CZ MEASURED/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CY–CZ MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CY–CZ MEASURED/);
  // Formal L28 CLOSED is now claimed; CZ MEASURED required in current-state
  assert.match(freezeHeader, /CZ MEASURED|CV\+CW\+CX\+CY\+CZ MEASURED|Audit \+ CV\+CW\+CX\+CY\+CZ MEASURED/);
  assert.match(matrixHeader, /CZ MEASURED|CV\+CW\+CX\+CY\+CZ MEASURED|Audit \+ CV\+CW\+CX\+CY\+CZ MEASURED/);
  assert.match(freezeHeader, /L28 CLOSED|Ladder 28 CLOSED|CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(matrixHeader, /L28 CLOSED|Ladder 28 CLOSED|CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freezeHeader, /L27 CLOSED|Ladder 27 CLOSED|CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(matrixHeader, /L27 CLOSED|Ladder 27 CLOSED|CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.doesNotMatch(freezeHeader, /(?<!Do NOT claim )CQ–CU MEASURED/);
  assert.doesNotMatch(matrixHeader, /(?<!Do NOT claim )CQ–CU MEASURED/);
  assert.match(freeze, /NEVER reopen L26|never reopen L26/);
  assert.match(matrix, /NEVER reopen L26|never reopen L26/);
  assert.match(freeze, /Ladder 27 is \*\*CLOSED\*\*|L27 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; CQ\+CR\+CS\+CT\+CU MEASURED/);
  assert.match(matrix, /Ladder 27 CLOSED|L27 CLOSED/);
  assert.match(freeze, /Ladder 28 is \*\*CLOSED\*\*|L28 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ CV\+CW\+CX\+CY\+CZ MEASURED/);
  assert.match(matrix, /Ladder 28 CLOSED|L28 CLOSED/);
  assert.match(freeze, /Ladder 29 is \*\*CLOSED\*\*|L29 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DA\+DB\+DC\+DD\+DE MEASURED/);
  assert.match(matrix, /Ladder 29 CLOSED|L29 CLOSED/);
  assert.match(freeze, /Ladder 29 OPEN|L29 OPEN/); // historical
  assert.match(matrix, /Ladder 29 OPEN|L29 OPEN/);
  assert.match(freeze, /NEVER reopen L29|never reopen L29/);
  assert.match(matrix, /NEVER reopen L29|never reopen L29/);
  assert.match(freeze, /DE MEASURED/);
  assert.match(matrix, /DE MEASURED/);
  assert.match(freeze, /tip-seal-post-410|Tip seal post #410|tip honesty post-#410/);
  assert.match(matrix, /tip-seal-post-410/);
  assert.match(freeze, /Ladder 28 OPEN|L28 OPEN/);  // historical
  assert.match(matrix, /Ladder 28 OPEN|L28 OPEN/);
  assert.match(freeze, /NEVER reopen L28|never reopen L28/);
  assert.match(matrix, /NEVER reopen L28|never reopen L28/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY|Do not claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY|Do not claim PRODUCTION_READY/);
  assert.match(freeze, /CZ MEASURED/);
  assert.match(matrix, /CZ MEASURED/);
  assert.match(freeze, /tip-seal-post-398|Tip seal post #398|tip honesty post-#398/);
  assert.match(matrix, /tip-seal-post-398/);
  assert.match(freeze, /tip-refresh-post-399|Tip refresh post #399|tip honesty post-#399/);
  assert.match(matrix, /tip-refresh-post-399/);
  assert.match(freeze, /Do NOT start Ladder 29 satellites until L29 audit MEASURED/);
  assert.match(matrix, /Do NOT start Ladder 29 satellites until L29 audit MEASURED/);
  assert.match(freeze, /tip-open-post-401|Tip-open post #401|tip honesty post-#401/);
  assert.match(matrix, /tip-open-post-401/);
  assert.match(freeze, /L29 OPEN \(Audit MEASURED · DA–DE pending/);
  assert.match(matrix, /L29 OPEN \(Audit MEASURED · DA–DE pending/);
  assert.match(freeze, /Do NOT claim DA–DE MEASURED/);
  assert.match(matrix, /Do NOT claim DA–DE MEASURED/);
  assert.match(freeze, /Do NOT claim L29 CLOSED/);
  assert.match(matrix, /Do NOT claim L29 CLOSED/);
  assert.match(freeze, /Sovereign Observability & Evidence Economy Fabric/);
  assert.match(matrix, /Sovereign Observability & Evidence Economy Fabric/);
  assert.match(freeze, /tip-refresh-post-403|Tip refresh post #403|tip honesty post-#403/);
  assert.match(matrix, /tip-refresh-post-403/);
  assert.match(freeze, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB–DE pending/);
  assert.match(matrix, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB–DE pending/);
  assert.match(freeze, /Do NOT start Mission DB/);
  assert.match(matrix, /Do NOT start Mission DB/);
  assert.match(freeze, /Do NOT claim DB–DE MEASURED/);
  assert.match(matrix, /Do NOT claim DB–DE MEASURED/);
  assert.match(freeze, /DA MEASURED/);
  assert.match(matrix, /DA MEASURED/);
  assert.match(freeze, /b51d5934/);
  assert.match(matrix, /b51d5934/);
  assert.match(freeze, /tip-refresh-post-405|Tip refresh post #405|tip honesty post-#405/);
  assert.match(matrix, /tip-refresh-post-405/);
  assert.match(freeze, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB MEASURED · DC–DE pending/);
  assert.match(matrix, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB MEASURED · DC–DE pending/);
  assert.match(freeze, /Do NOT start Mission DC/);
  assert.match(matrix, /Do NOT start Mission DC/);
  assert.match(freeze, /Do NOT claim DC–DE MEASURED/);
  assert.match(matrix, /Do NOT claim DC–DE MEASURED/);
  assert.match(freeze, /DB MEASURED/);
  assert.match(matrix, /DB MEASURED/);
  assert.match(freeze, /3ba8df99/);
  assert.match(matrix, /3ba8df99/);
  assert.match(freeze, /tip-refresh-post-407|Tip refresh post #407|tip honesty post-#407/);
  assert.match(matrix, /tip-refresh-post-407/);
  assert.match(freeze, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD–DE pending/);
  assert.match(matrix, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD–DE pending/);
  assert.match(freeze, /Do NOT start Mission DD/);
  assert.match(matrix, /Do NOT start Mission DD/);
  assert.match(freeze, /Do NOT claim DD–DE MEASURED/);
  assert.match(matrix, /Do NOT claim DD–DE MEASURED/);
  assert.match(freeze, /DC MEASURED/);
  assert.match(matrix, /DC MEASURED/);
  assert.match(freeze, /0107b9b8/);
  assert.match(matrix, /0107b9b8/);
  assert.match(freeze, /tip-refresh-post-409|Tip refresh post #409|tip honesty post-#409/);
  assert.match(matrix, /tip-refresh-post-409/);
  assert.match(freeze, /L29 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DA\+DB\+DC\+DD\+DE MEASURED|Ladder 29 is \*\*CLOSED\*\*/);
  assert.match(matrix, /L29 CLOSED|Ladder 29 CLOSED/);
  assert.match(freeze, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD MEASURED · DE pending/); // historical
  assert.match(matrix, /L29 OPEN \(Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD MEASURED · DE pending/);
  assert.match(freeze, /Do NOT start Mission DE/); // historical
  assert.match(matrix, /Do NOT start Mission DE/);
  assert.match(freeze, /Do NOT claim DE MEASURED/); // historical
  assert.match(matrix, /Do NOT claim DE MEASURED/);
  assert.match(freeze, /tip-seal-post-410|Tip seal post #410|tip honesty post-#410/);
  assert.match(matrix, /tip-seal-post-410/);
  assert.match(matrix, /\|\s*Tip seal post #410\s*\|/);
  assert.match(matrix, /\|\s*Ladder 29 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L29 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Mission DE\s*\|/);
  assert.match(matrix, /\|\s*DE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Mission DE MEASURED\s*\|/);
  assert.match(freeze, /DD MEASURED/);
  assert.match(matrix, /DD MEASURED/);
  assert.match(freeze, /0a6dbe65/);
  assert.match(matrix, /0a6dbe65/);
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
  assert.match(freeze, /tip-refresh-post-392|Tip refresh post #392|tip refresh post-#392/);
  assert.match(matrix, /tip-refresh-post-392/);
  assert.match(freeze, /tip-refresh-post-394|Tip refresh post #394|tip refresh post-#394/);
  assert.match(matrix, /tip-refresh-post-394/);
  assert.match(freeze, /tip-refresh-post-396|Tip refresh post #396|tip refresh post-#396/);
  assert.match(matrix, /tip-refresh-post-396/);
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
  assert.match(freeze, /CX–CZ pending/);
  assert.match(matrix, /CX–CZ pending/);
  assert.match(freeze, /Audit MEASURED · CV MEASURED · CW MEASURED · CX–CZ pending/);
  assert.match(matrix, /Audit MEASURED · CV MEASURED · CW MEASURED · CX–CZ pending/);
  assert.match(freeze, /CY–CZ pending/);
  assert.match(matrix, /CY–CZ pending/);
  assert.match(freeze, /Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY–CZ pending/);
  assert.match(matrix, /Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY–CZ pending/);
  assert.match(freeze, /CV MEASURED/);
  assert.match(matrix, /CV MEASURED/);
  assert.match(freeze, /CW MEASURED/);
  assert.match(matrix, /CW MEASURED/);
  assert.match(freeze, /CX MEASURED/);
  assert.match(matrix, /CX MEASURED/);
  assert.match(freeze, /CY MEASURED/);
  assert.match(matrix, /CY MEASURED/);
  assert.match(freeze, /CZ pending/);
  assert.match(matrix, /CZ pending/);
  assert.match(freeze, /Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY MEASURED · CZ pending/);
  assert.match(matrix, /Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY MEASURED · CZ pending/);
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
  assert.match(freeze, /SPEC-0106|Mission CW/);
  assert.match(matrix, /SPEC-0106|Mission CW/);
  assert.match(freeze, /SPEC-0107|Mission CX/);
  assert.match(matrix, /SPEC-0107|Mission CX/);
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
  assert.match(matrix, /\|\s*Tip refresh post #392\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #394\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #396\s*\|/);
  assert.match(matrix, /\|\s*Tip seal post #398\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #399\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Ladder 29 satellites until L29 audit MEASURED/);
  assert.match(matrix, /\|\s*Tip-open post #401\s*\|/);
  assert.match(matrix, /\|\s*Ladder 29 Maturity Audit\s*\|/);
  assert.match(matrix, /\|\s*Ladder 29 OPEN\s*\|/);
  assert.match(matrix, /\|\s*L29 OPEN\s*\|/);
  assert.match(matrix, /\|\s*DA–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DA–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT claim DA–DE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Do NOT claim L29 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #403\s*\|/);
  assert.match(matrix, /\|\s*Mission DA\s*\|/);
  assert.match(matrix, /\|\s*DA MEASURED\s*\|/);
  assert.match(matrix, /\|\s*DB–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DA MEASURED · DB–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission DB\s*\|/);
  assert.match(matrix, /\|\s*Do NOT claim DB–DE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #405\s*\|/);
  assert.match(matrix, /\|\s*Mission DB\s*\|/);
  assert.match(matrix, /\|\s*DB MEASURED\s*\|/);
  assert.match(matrix, /\|\s*DC–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DA MEASURED · DB MEASURED · DC–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission DC\s*\|/);
  assert.match(matrix, /\|\s*Do NOT claim DC–DE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #407\s*\|/);
  assert.match(matrix, /\|\s*Mission DC\s*\|/);
  assert.match(matrix, /\|\s*DC MEASURED\s*\|/);
  assert.match(matrix, /\|\s*DD–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD–DE pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission DD\s*\|/);
  assert.match(matrix, /\|\s*Do NOT claim DD–DE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Tip refresh post #409\s*\|/);
  assert.match(matrix, /\|\s*Mission DD\s*\|/);
  assert.match(matrix, /\|\s*DD MEASURED\s*\|/);
  assert.match(matrix, /\|\s*DE pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DA MEASURED · DB MEASURED · DC MEASURED · DD MEASURED · DE pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission DE\s*\|/);
  assert.match(matrix, /\|\s*Do NOT claim DE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Ladder 28 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*L28 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*Mission CZ\s*\|/);
  assert.match(matrix, /\|\s*CZ MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Mission CZ MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Mission CV\s*\|/);
  assert.match(matrix, /\|\s*Mission CW\s*\|/);
  assert.match(matrix, /\|\s*Mission CX\s*\|/);
  assert.match(matrix, /\|\s*Mission CY\s*\|/);
  assert.match(matrix, /\|\s*CV MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CW MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CX MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CY MEASURED\s*\|/);
  assert.match(matrix, /\|\s*CW–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*CX–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*CY–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · CV MEASURED · CW–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · CV MEASURED · CW MEASURED · CX–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY–CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · CV MEASURED · CW MEASURED · CX MEASURED · CY MEASURED · CZ pending\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission CW\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission CX\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission CY\s*\|/);
  assert.match(matrix, /\|\s*Do NOT start Mission CZ\s*\|/);


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
  assert.match(freeze, /Do NOT start Mission CX|Do not start Mission CX/);
  assert.match(matrix, /Do NOT start Mission CX|Do not start Mission CX/);
  assert.match(freeze, /Do NOT start Mission CY|Do not start Mission CY/);
  assert.match(matrix, /Do NOT start Mission CY|Do not start Mission CY/);
  assert.match(freeze, /Do NOT start Mission CZ|Do not start Mission CZ/);
  assert.match(matrix, /Do NOT start Mission CZ|Do not start Mission CZ/);
  assert.match(freeze, /Formal L26 CLOSED|Ladder 26 is \*\*CLOSED\*\*|L26 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY|Do not claim PRODUCTION_READY|CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY|CLOSED ≠ PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY|Do not claim PRODUCTION_READY|CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY|CLOSED ≠ PRODUCTION_READY|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim L27 CLOSED then|Do not claim L27 CLOSED then|Do NOT claim L27 CLOSED/);
  assert.match(matrix, /Do NOT claim L27 CLOSED then|Do not claim L27 CLOSED then|Do NOT claim L27 CLOSED/);
  assert.match(freeze, /Do NOT claim CT–CU MEASURED then|CT–CU MEASURED then|Do NOT claim CT–CU MEASURED/);
  assert.match(matrix, /Do NOT claim CT–CU MEASURED then|CT–CU MEASURED then|Do NOT claim CT–CU MEASURED/);
  assert.match(freeze, /Do NOT claim CV–CZ MEASURED|Do not claim CV–CZ MEASURED/);
  assert.match(matrix, /Do NOT claim CV–CZ MEASURED|Do not claim CV–CZ MEASURED/);
  assert.match(freeze, /Do NOT claim CX–CZ MEASURED|Do not claim CX–CZ MEASURED/);
  assert.match(matrix, /Do NOT claim CX–CZ MEASURED|Do not claim CX–CZ MEASURED/);
  assert.match(freeze, /Do NOT claim CY–CZ MEASURED|Do not claim CY–CZ MEASURED/);
  assert.match(matrix, /Do NOT claim CY–CZ MEASURED|Do not claim CY–CZ MEASURED/);
  assert.match(freeze, /Do NOT claim L28 CLOSED until CZ|Do NOT claim L28 CLOSED|Do not claim L28 CLOSED/);
  assert.match(matrix, /Do NOT claim L28 CLOSED until CZ|Do NOT claim L28 CLOSED|Do not claim L28 CLOSED/);
  assert.match(freeze, /Do NOT claim CZ MEASURED|Do not claim CZ MEASURED/);
  assert.match(matrix, /Do NOT claim CZ MEASURED|Do not claim CZ MEASURED/);
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

test('tip-open-post-413: L30 OPEN honesty needles', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-open-post-413|Tip-open post #413|tip honesty post-#413/);
  assert.match(matrix, /tip-open-post-413/);
  assert.match(freeze, /L30 OPEN \(Audit MEASURED · DF–DJ pending/);
  assert.match(matrix, /L30 OPEN \(Audit MEASURED · DF–DJ pending/);
  assert.match(freeze, /Do NOT claim DF–DJ MEASURED/);
  assert.match(matrix, /Do NOT claim DF–DJ MEASURED/);
  assert.match(freeze, /Do NOT claim L30 CLOSED/);
  assert.match(matrix, /Do NOT claim L30 CLOSED/);
  assert.match(matrix, /\|\s*L30 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DF–DJ pending\s*\|/);
});

test('tip-refresh-post-415: L30 OPEN DF MEASURED honesty needles', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-415|Tip refresh post #415|tip honesty post-#415/);
  assert.match(matrix, /tip-refresh-post-415/);
  assert.match(freeze, /L30 OPEN \(Audit \+ DF MEASURED · DG–DJ pending/);
  assert.match(matrix, /L30 OPEN \(Audit \+ DF MEASURED · DG–DJ pending/);
  assert.match(freeze, /DF MEASURED/);
  assert.match(matrix, /DF MEASURED/);
  assert.match(freeze, /Do NOT claim DG–DJ MEASURED/);
  assert.match(matrix, /Do NOT claim DG–DJ MEASURED/);
  assert.match(freeze, /Do NOT claim L30 CLOSED/);
  assert.match(matrix, /Do NOT claim L30 CLOSED/);
  assert.match(matrix, /\|\s*Audit \+ DF MEASURED · DG–DJ pending\s*\|/);
});


test('tip-honesty-l30-l33: Formal L30 CLOSED + NEVER reopen L30', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-honesty-l30-l33|tip-seal L30–L32|Tip honesty post-L33-audit/);
  assert.match(matrix, /tip-honesty-l30-l33|tip-seal L30–L32/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /CLOSED_FOR_LOCAL_GOVERNED_USE/);
  assert.match(matrix, /CLOSED_FOR_LOCAL_GOVERNED_USE/);
});

test('tip-honesty-l30-l33: Formal L31 CLOSED + NEVER reopen L31', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
});

test('tip-honesty-l30-l33: Formal L32 CLOSED + NEVER reopen L32', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
});

test('tip-honesty-l30-l33: L33 OPEN (Audit MEASURED · DU–DY pending)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-open L33|Tip honesty post-L33-audit/);
  assert.match(matrix, /tip-open L33/);
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(freeze, /Do NOT claim DU–DY MEASURED/);
  assert.match(matrix, /Do NOT claim DU–DY MEASURED/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  // Positive non-claims (avoid brittle negative lookbehind against inequality prose)
  assert.match(freeze, /Do NOT claim DU–DY MEASURED/);
  assert.match(matrix, /Do NOT claim DU–DY MEASURED/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);


});

test('tip-honesty-l30-l33: tip-seal / tip-open / tip-honesty needles + complexity prune dirty-defer', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-honesty-l30-l33/);
  assert.match(matrix, /tip-honesty-l30-l33/);
  assert.match(freeze, /tip-seal L30–L32/);
  assert.match(matrix, /tip-seal L30–L32/);
  assert.match(freeze, /tip-open L33/);
  assert.match(matrix, /tip-open L33/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /761110ec0c807717421f5018370a7ca49d648d80/);
  assert.match(matrix, /761110ec0c807717421f5018370a7ca49d648d80/);
  assert.match(freeze, /792e9c0a7008e944711426936cf739b0dbb50449|792e9c0a/); // lineage cite
});


test('tip-refresh-post-442: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-442|tip-post-442|Tip honesty post-#442/);
  assert.match(matrix, /tip-refresh-post-442|tip-post-442|Tip honesty post-#442/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
});

test('tip-refresh-post-442: L33 OPEN (Audit MEASURED · DU–DY pending) retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(freeze, /Do NOT claim DU–DY MEASURED/);
  assert.match(matrix, /Do NOT claim DU–DY MEASURED/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);


});

test('tip-refresh-post-442: tip-post-442 / Tip honesty post-#442 needles + pin b205ce8c + historical tip-honesty retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-442/);
  assert.match(matrix, /tip-refresh-post-442/);
  assert.match(freeze, /tip-post-442/);
  assert.match(matrix, /tip-post-442/);
  assert.match(freeze, /Tip honesty post-#442/);
  assert.match(matrix, /Tip honesty post-#442/);
  assert.match(freeze, /tip-honesty-l30-l33/);
  assert.match(matrix, /tip-honesty-l30-l33/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /b205ce8cc28e94bfbf27954af745f85420c4bd4c/);
  assert.match(matrix, /b205ce8cc28e94bfbf27954af745f85420c4bd4c/);
  assert.match(freeze, /761110ec0c807717421f5018370a7ca49d648d80|761110ec/); // prior tip-honesty lineage cite
});


test('tip-refresh-post-445: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-445|tip-post-445|Tip honesty post-#445/);
  assert.match(matrix, /tip-refresh-post-445|tip-post-445|Tip honesty post-#445/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
});

test('tip-refresh-post-445: L33 OPEN (Audit + DU MEASURED · DV–DY pending)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  assert.match(freeze, /Do NOT claim DV–DY MEASURED/);
  assert.match(matrix, /Do NOT claim DV–DY MEASURED/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);


  // Historical tip-refresh-post-442 / tip-honesty L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
});

test('tip-refresh-post-445: tip-post-445 / Tip honesty post-#445 needles + pin cd1512a9 + historical tip-refresh-post-442 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-445/);
  assert.match(matrix, /tip-refresh-post-445/);
  assert.match(freeze, /tip-post-445/);
  assert.match(matrix, /tip-post-445/);
  assert.match(freeze, /Tip honesty post-#445/);
  assert.match(matrix, /Tip honesty post-#445/);
  assert.match(freeze, /tip-refresh-post-442/);
  assert.match(matrix, /tip-refresh-post-442/);
  assert.match(freeze, /tip-honesty-l30-l33/);
  assert.match(matrix, /tip-honesty-l30-l33/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /cd1512a9f0180edfb18f8ea97cd169e8b2d289c3/);
  assert.match(matrix, /cd1512a9f0180edfb18f8ea97cd169e8b2d289c3/);
  assert.match(freeze, /b205ce8cc28e94bfbf27954af745f85420c4bd4c|b205ce8c/); // prior tip-refresh-post-442 lineage cite
});


test('tip-refresh-post-447: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-447|tip-post-447|Tip honesty post-#447/);
  assert.match(matrix, /tip-refresh-post-447|tip-post-447|Tip honesty post-#447/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
});

test('tip-refresh-post-447: L33 OPEN (Audit + DU + DV MEASURED · DW–DY pending)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  assert.match(freeze, /Do NOT claim DW–DY MEASURED/);
  assert.match(matrix, /Do NOT claim DW–DY MEASURED/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);


  // Historical tip-refresh-post-445 L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  // Historical tip-refresh-post-442 / tip-honesty L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
});

test('tip-refresh-post-447: tip-post-447 / Tip honesty post-#447 needles + pin b485ae0b + historical tip-refresh-post-445 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-447/);
  assert.match(matrix, /tip-refresh-post-447/);
  assert.match(freeze, /tip-post-447/);
  assert.match(matrix, /tip-post-447/);
  assert.match(freeze, /Tip honesty post-#447/);
  assert.match(matrix, /Tip honesty post-#447/);
  assert.match(freeze, /tip-refresh-post-445/);
  assert.match(matrix, /tip-refresh-post-445/);
  assert.match(freeze, /tip-refresh-post-442/);
  assert.match(matrix, /tip-refresh-post-442/);
  assert.match(freeze, /tip-honesty-l30-l33/);
  assert.match(matrix, /tip-honesty-l30-l33/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /b485ae0b2472ef8b6f7213fde82fc3ed05ead33d/);
  assert.match(matrix, /b485ae0b2472ef8b6f7213fde82fc3ed05ead33d/);
  assert.match(freeze, /cd1512a9f0180edfb18f8ea97cd169e8b2d289c3|cd1512a9/); // prior tip-refresh-post-445 lineage cite
});


test('tip-refresh-post-450: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-450|tip-post-450|Tip honesty post-#450/);
  assert.match(matrix, /tip-refresh-post-450|tip-post-450|Tip honesty post-#450/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
});

test('tip-refresh-post-450: L33 OPEN (Audit + DU + DV + DW MEASURED · DX–DY pending)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  assert.match(freeze, /Do NOT claim DX–DY MEASURED/);
  assert.match(matrix, /Do NOT claim DX–DY MEASURED/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);


  // Historical tip-refresh-post-447 L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  // Historical tip-refresh-post-445 L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  // Historical tip-refresh-post-442 / tip-honesty L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
});

test('tip-refresh-post-450: tip-post-450 / Tip honesty post-#450 needles + pin d667c6b5 + historical tip-refresh-post-447 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-450/);
  assert.match(matrix, /tip-refresh-post-450/);
  assert.match(freeze, /tip-post-450/);
  assert.match(matrix, /tip-post-450/);
  assert.match(freeze, /Tip honesty post-#450/);
  assert.match(matrix, /Tip honesty post-#450/);
  assert.match(freeze, /tip-refresh-post-447/);
  assert.match(matrix, /tip-refresh-post-447/);
  assert.match(freeze, /tip-refresh-post-445/);
  assert.match(matrix, /tip-refresh-post-445/);
  assert.match(freeze, /tip-refresh-post-442/);
  assert.match(matrix, /tip-refresh-post-442/);
  assert.match(freeze, /tip-honesty-l30-l33/);
  assert.match(matrix, /tip-honesty-l30-l33/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /d667c6b578d5c1b5ff9995101272e86dd039f5be/);
  assert.match(matrix, /d667c6b578d5c1b5ff9995101272e86dd039f5be/);
  assert.match(freeze, /b485ae0b2472ef8b6f7213fde82fc3ed05ead33d|b485ae0b/); // prior tip-refresh-post-447 lineage cite
});


test('tip-refresh-post-452: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-452|tip-post-452|Tip honesty post-#452/);
  assert.match(matrix, /tip-refresh-post-452|tip-post-452|Tip honesty post-#452/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
});

test('tip-refresh-post-452: L33 OPEN (Audit + DU + DV + DW + DX MEASURED · DY pending)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  assert.match(freeze, /Do NOT claim DY MEASURED/);
  assert.match(matrix, /Do NOT claim DY MEASURED/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);


  // Historical tip-refresh-post-450 L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  // Historical tip-refresh-post-447 L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  // Historical tip-refresh-post-445 L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  // Historical tip-refresh-post-442 / tip-honesty L33 status needle retained
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
});

test('tip-refresh-post-452: tip-post-452 / Tip honesty post-#452 needles + pin fe52fb3b + historical tip-refresh-post-450 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-452/);
  assert.match(matrix, /tip-refresh-post-452/);
  assert.match(freeze, /tip-post-452/);
  assert.match(matrix, /tip-post-452/);
  assert.match(freeze, /Tip honesty post-#452/);
  assert.match(matrix, /Tip honesty post-#452/);
  assert.match(freeze, /tip-refresh-post-450/);
  assert.match(matrix, /tip-refresh-post-450/);
  assert.match(freeze, /tip-refresh-post-447/);
  assert.match(matrix, /tip-refresh-post-447/);
  assert.match(freeze, /tip-refresh-post-445/);
  assert.match(matrix, /tip-refresh-post-445/);
  assert.match(freeze, /tip-refresh-post-442/);
  assert.match(matrix, /tip-refresh-post-442/);
  assert.match(freeze, /tip-honesty-l30-l33/);
  assert.match(matrix, /tip-honesty-l30-l33/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /fe52fb3bbfa23aaedcca3efdaa53e1c16722a823/);
  assert.match(matrix, /fe52fb3bbfa23aaedcca3efdaa53e1c16722a823/);
  assert.match(freeze, /d667c6b578d5c1b5ff9995101272e86dd039f5be|d667c6b5/); // prior tip-refresh-post-450 lineage cite
});

test('tip-refresh-post-454: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-454|tip-post-454|Tip honesty post-#454/);
  assert.match(matrix, /tip-refresh-post-454|tip-post-454|Tip honesty post-#454/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
});

test('tip-refresh-post-454: L33 OPEN (Audit + DU + DV + DW + DX + DY MEASURED · tip-seal pending)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED · tip-seal pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED · tip-seal pending/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/);
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);


  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX MEASURED · DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX MEASURED · DY pending/);
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW MEASURED · DX–DY pending/);
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV MEASURED · DW–DY pending/);
  assert.match(freeze, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU MEASURED · DV–DY pending/);
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
});

test('tip-refresh-post-454: tip-post-454 / Tip honesty post-#454 needles + pin 446bbe49 + historical tip-refresh-post-452 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-454/);
  assert.match(matrix, /tip-refresh-post-454/);
  assert.match(freeze, /tip-post-454/);
  assert.match(matrix, /tip-post-454/);
  assert.match(freeze, /Tip honesty post-#454/);
  assert.match(matrix, /Tip honesty post-#454/);
  assert.match(freeze, /tip-refresh-post-452/);
  assert.match(matrix, /tip-refresh-post-452/);
  assert.match(freeze, /tip-refresh-post-450/);
  assert.match(matrix, /tip-refresh-post-450/);
  assert.match(freeze, /tip-refresh-post-447/);
  assert.match(matrix, /tip-refresh-post-447/);
  assert.match(freeze, /tip-refresh-post-445/);
  assert.match(matrix, /tip-refresh-post-445/);
  assert.match(freeze, /tip-refresh-post-442/);
  assert.match(matrix, /tip-refresh-post-442/);
  assert.match(freeze, /tip-honesty-l30-l33/);
  assert.match(matrix, /tip-honesty-l30-l33/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /446bbe49f2fbf9e83604faf16e50b36b70cdb216/);
  assert.match(matrix, /446bbe49f2fbf9e83604faf16e50b36b70cdb216/);
  assert.match(freeze, /fe52fb3bbfa23aaedcca3efdaa53e1c16722a823|fe52fb3b/);
});


test('tip-seal-post-455: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-seal-post-455|tip-seal L33|Tip seal post-#455|Tip seal post #455/);
  assert.match(matrix, /tip-seal-post-455|tip-seal L33|Tip seal post-#455|Tip seal post #455/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(matrix, /NEVER reopen L33|never reopen L33/);
});

test('tip-seal-post-455: Formal L33 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DU + DV + DW + DX + DY MEASURED + seam-pack + closeout)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Ladder 33 is \*\*CLOSED\*\*|L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED/);
  assert.match(matrix, /Ladder 33 CLOSED|L33 CLOSED/);
  assert.match(freeze, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout|\|\s*L33 CLOSED\s*\|/);
  assert.match(freeze, /Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout/);
  assert.match(freeze, /Formal L33 CLOSED|Formal Ladder 33 CLOSED/);
  assert.match(matrix, /Formal L33 CLOSED|Ladder 33 CLOSED/);
  assert.match(freeze, /Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric/);
  assert.match(matrix, /Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric/);
  assert.match(freeze, /DY MEASURED/);
  assert.match(matrix, /DY MEASURED/);
  assert.match(freeze, /Mission DY/);
  assert.match(matrix, /Mission DY/);
  // Historical OPEN statuses retained (incl. tip-refresh-post-454)
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED · tip-seal pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED · tip-seal pending/);
  assert.match(freeze, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX MEASURED · DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit \+ DU \+ DV \+ DW \+ DX MEASURED · DY pending/);
  assert.match(freeze, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(matrix, /L33 OPEN \(Audit MEASURED · DU–DY pending/);
  assert.match(freeze, /Do NOT claim L33 CLOSED/); // historical
  assert.match(matrix, /Do NOT claim L33 CLOSED/);
});

test('tip-seal-post-455: NON-CLAIM PRODUCTION_READY + tip-seal needles + pin 446bbe49 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES|CLOSED_FOR_LOCAL_GOVERNED_USE != PRODUCTION_READY/);
  assert.match(freeze, /tip-seal-post-455/);
  assert.match(matrix, /tip-seal-post-455/);
  assert.match(freeze, /tip-seal L33|Tip seal post-#455|Tip seal post #455|Formal L33 CLOSED/);
  assert.match(matrix, /\|\s*Tip seal post #455\s*\||\|\s*tip-seal-post-455\s*\||\|\s*Formal L33 CLOSED\s*\||\|\s*Ladder 33 CLOSED\s*\||\|\s*L33 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*NEVER reopen L33\s*\|/);
  assert.match(matrix, /\|\s*Mission DY\s*\|/);
  assert.match(matrix, /\|\s*DY MEASURED\s*\|/);
  assert.match(freeze, /446bbe49f2fbf9e83604faf16e50b36b70cdb216/);
  assert.match(matrix, /446bbe49f2fbf9e83604faf16e50b36b70cdb216/);
  assert.match(freeze, /tip-refresh-post-454/);
  assert.match(matrix, /tip-refresh-post-454/);
  assert.match(freeze, /Fundacion Δ=0|Fundacion Delta=0/);
  assert.match(matrix, /Fundacion Delta=0|Fundacion Δ=0/);
});

test('tip-refresh-post-456: Formal L30+L31+L32 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-456|tip-post-456|Tip honesty post-#456/);
  assert.match(matrix, /tip-refresh-post-456|tip-post-456|Tip honesty post-#456/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(matrix, /NEVER reopen L33|never reopen L33/);
});

test('tip-refresh-post-456: Formal L33 CLOSED retained (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DU + DV + DW + DX + DY MEASURED + seam-pack + closeout)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Formal L33 CLOSED|Formal Ladder 33 CLOSED/);
  assert.match(matrix, /Formal L33 CLOSED|Ladder 33 CLOSED/);
  assert.match(freeze, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout|\|\s*L33 CLOSED\s*\|/);
  assert.match(freeze, /Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED \+ seam-pack \+ closeout/);
  assert.match(freeze, /Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric/);
  assert.match(matrix, /Sovereign Domain Event-Driven Architecture & Resilient Outbox Messaging Fabric/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
});

test('tip-refresh-post-456: tip-post-456 / Tip honesty post-#456 needles + pin 2b23f504 + historical tip-seal-post-455 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.match(freeze, /tip-post-456/);
  assert.match(matrix, /tip-post-456/);
  assert.match(freeze, /Tip honesty post-#456/);
  assert.match(matrix, /Tip honesty post-#456/);
  assert.match(freeze, /tip-seal-post-455/);
  assert.match(matrix, /tip-seal-post-455/);
  assert.match(freeze, /tip-refresh-post-454/);
  assert.match(matrix, /tip-refresh-post-454/);
  assert.match(freeze, /tip-refresh-post-452/);
  assert.match(matrix, /tip-refresh-post-452/);
  assert.match(freeze, /2b23f50454f2e8541f90a39aae7e6d067d320502/);
  assert.match(matrix, /2b23f50454f2e8541f90a39aae7e6d067d320502/);
  assert.match(freeze, /446bbe49f2fbf9e83604faf16e50b36b70cdb216/);
  assert.match(matrix, /446bbe49f2fbf9e83604faf16e50b36b70cdb216/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /Fundacion Δ=0|Fundacion Delta=0/);
  assert.match(matrix, /Fundacion Delta=0|Fundacion Δ=0/);
});

test('tip-open-post-458: L34 OPEN honesty needles', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-open-post-458|Tip-open post #458|Tip open post-#458|tip honesty post-#458/);
  assert.match(matrix, /tip-open-post-458/);
  assert.match(freeze, /tip-open L34|Tip open post-#458/);
  assert.match(matrix, /tip-open L34|Tip open post-#458/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(freeze, /Do NOT claim DZ–ED MEASURED/);
  assert.match(matrix, /Do NOT claim DZ–ED MEASURED/);
  assert.match(freeze, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /\|\s*L34 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ–ED pending\s*\|/);
  assert.match(freeze, /eb6134a42d6bff20bdbdd0c0a91297f808b2fe77/);
  assert.match(matrix, /eb6134a42d6bff20bdbdd0c0a91297f808b2fe77/);
  assert.match(freeze, /Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric/);
  assert.match(matrix, /Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric/);
});

test('tip-open-post-458: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Formal L33 CLOSED|Formal Ladder 33 CLOSED/);
  assert.match(matrix, /Formal L33 CLOSED|Ladder 33 CLOSED/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(matrix, /NEVER reopen L33|never reopen L33/);
  assert.match(freeze, /Formal L30 CLOSED|L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(freeze, /Formal L31 CLOSED|L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(freeze, /Formal L32 CLOSED|L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.match(freeze, /tip-seal-post-455/);
  assert.match(matrix, /tip-seal-post-455/);
  assert.match(freeze, /2b23f50454f2e8541f90a39aae7e6d067d320502/);
  assert.match(matrix, /2b23f50454f2e8541f90a39aae7e6d067d320502/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
  assert.doesNotMatch(matrix, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-459: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-459|tip-post-459|Tip honesty post-#459/);
  assert.match(matrix, /tip-refresh-post-459|tip-post-459|Tip honesty post-#459/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(matrix, /Formal L33 CLOSED|NEVER reopen L33|Ladder 33 CLOSED/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(freeze, /b382d29bee2494f21652f9207170d900c7179f4c/);
  assert.match(matrix, /b382d29bee2494f21652f9207170d900c7179f4c/);
  assert.match(freeze, /eb6134a42d6bff20bdbdd0c0a91297f808b2fe77/);
  assert.match(matrix, /eb6134a42d6bff20bdbdd0c0a91297f808b2fe77/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-459: tip-post-459 / Tip honesty post-#459 needles + pin b382d29b + historical tip-open-post-458 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-459/);
  assert.match(matrix, /tip-refresh-post-459/);
  assert.match(freeze, /tip-post-459|Tip honesty post-#459/);
  assert.match(matrix, /tip-post-459|Tip honesty post-#459/);
  assert.match(freeze, /tip-open-post-458/);
  assert.match(matrix, /tip-open-post-458/);
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.match(freeze, /b382d29bee2494f21652f9207170d900c7179f4c/);
  assert.match(matrix, /b382d29bee2494f21652f9207170d900c7179f4c/);
  assert.match(freeze, /1f2234cffdecd7e0810d7271c5e92adc9f8c75f3/);
  assert.match(matrix, /1f2234cffdecd7e0810d7271c5e92adc9f8c75f3/);
  assert.match(freeze, /037f95786724936aecf48bf3684b4dd5dc37e815/);
  assert.match(matrix, /037f95786724936aecf48bf3684b4dd5dc37e815/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006'); // current tip-refresh-post-484 pin; historical b382d29b retained in freeze/matrix
});

test('tip-refresh-post-461: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-461|tip-post-461|Tip honesty post-#461/);
  assert.match(matrix, /tip-refresh-post-461|tip-post-461|Tip honesty post-#461/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(matrix, /Formal L33 CLOSED|NEVER reopen L33|Ladder 33 CLOSED/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA–ED pending/);
  // Historical tip-refresh-post-459 / tip-open-post-458 L34 status needle retained
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(freeze, /1f2234cffdecd7e0810d7271c5e92adc9f8c75f3/);
  assert.match(matrix, /1f2234cffdecd7e0810d7271c5e92adc9f8c75f3/);
  assert.match(freeze, /b382d29bee2494f21652f9207170d900c7179f4c/);
  assert.match(matrix, /b382d29bee2494f21652f9207170d900c7179f4c/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-461: L34 OPEN (Audit MEASURED · DZ MEASURED · EA–ED pending) + DZ MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /DZ MEASURED/);
  assert.match(matrix, /DZ MEASURED/);
  assert.match(freeze, /Do NOT claim EA–ED MEASURED/);
  assert.match(matrix, /Do NOT claim EA–ED MEASURED/);
  assert.match(freeze, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /Do NOT claim L34 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  // Historical tip-open-post-458 / tip-refresh-post-459 Do NOT claim DZ–ED MEASURED retained
  assert.match(freeze, /Do NOT claim DZ–ED MEASURED/);
  assert.match(matrix, /Do NOT claim DZ–ED MEASURED/);
  assert.match(matrix, /\|\s*DZ MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA–ED pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ–ED pending\s*\|/);
});

test('tip-refresh-post-461: tip-post-461 / Tip honesty post-#461 needles + pin 1f2234cf + historical tip-refresh-post-459 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-461/);
  assert.match(matrix, /tip-refresh-post-461/);
  assert.match(freeze, /tip-post-461|Tip honesty post-#461/);
  assert.match(matrix, /tip-post-461|Tip honesty post-#461/);
  assert.match(freeze, /tip-refresh-post-459/);
  assert.match(matrix, /tip-refresh-post-459/);
  assert.match(freeze, /tip-open-post-458/);
  assert.match(matrix, /tip-open-post-458/);
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-463: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-463|tip-post-463|Tip honesty post-#463/);
  assert.match(matrix, /tip-refresh-post-463|tip-post-463|Tip honesty post-#463/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(matrix, /Formal L33 CLOSED|NEVER reopen L33|Ladder 33 CLOSED/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending/);
  // Historical tip-refresh-post-461 / tip-open-post-458 L34 status needle retained
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(freeze, /037f95786724936aecf48bf3684b4dd5dc37e815/);
  assert.match(matrix, /037f95786724936aecf48bf3684b4dd5dc37e815/);
  assert.match(freeze, /19b353d8fa07ece41df251d4eaeaa8778c13ed81/);
  assert.match(matrix, /19b353d8fa07ece41df251d4eaeaa8778c13ed81/);
  assert.match(freeze, /1f2234cffdecd7e0810d7271c5e92adc9f8c75f3/);
  assert.match(matrix, /1f2234cffdecd7e0810d7271c5e92adc9f8c75f3/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-463: L34 OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending) + DZ MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /DZ MEASURED/);
  assert.match(matrix, /DZ MEASURED/);
  assert.match(freeze, /Do NOT claim EB–ED MEASURED/);
  assert.match(matrix, /Do NOT claim EB–ED MEASURED/);
  assert.match(freeze, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /Do NOT claim L34 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  // Historical tip-open-post-458 / tip-refresh-post-461 Do NOT claim DZ–ED MEASURED retained
  assert.match(freeze, /Do NOT claim DZ–ED MEASURED/);
  assert.match(matrix, /Do NOT claim DZ–ED MEASURED/);
  assert.match(matrix, /\|\s*DZ MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ–ED pending\s*\|/);
});

test('tip-refresh-post-463: tip-post-463 / Tip honesty post-#463 needles + pin 037f9578 + historical tip-refresh-post-461 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-463/);
  assert.match(matrix, /tip-refresh-post-463/);
  assert.match(freeze, /tip-post-463|Tip honesty post-#463/);
  assert.match(matrix, /tip-post-463|Tip honesty post-#463/);
  assert.match(freeze, /tip-refresh-post-461/);
  assert.match(matrix, /tip-refresh-post-461/);
  assert.match(freeze, /tip-open-post-458/);
  assert.match(matrix, /tip-open-post-458/);
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-465: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-465|tip-post-465|Tip honesty post-#465/);
  assert.match(matrix, /tip-refresh-post-465|tip-post-465|Tip honesty post-#465/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(matrix, /Formal L33 CLOSED|NEVER reopen L33|Ladder 33 CLOSED/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending/);
  // Historical tip-refresh-post-463 / tip-open-post-458 L34 status needles retained
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(freeze, /19b353d8fa07ece41df251d4eaeaa8778c13ed81/);
  assert.match(matrix, /19b353d8fa07ece41df251d4eaeaa8778c13ed81/);
  assert.match(freeze, /29586ab8f2c8a784eb84f5c5e9c899118c577427/);
  assert.match(matrix, /29586ab8f2c8a784eb84f5c5e9c899118c577427/);
  assert.match(freeze, /037f95786724936aecf48bf3684b4dd5dc37e815/);
  assert.match(matrix, /037f95786724936aecf48bf3684b4dd5dc37e815/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-465: L34 OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending) + EB MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /EB MEASURED/);
  assert.match(matrix, /EB MEASURED/);
  assert.match(freeze, /Do NOT claim EC–ED MEASURED/);
  assert.match(matrix, /Do NOT claim EC–ED MEASURED/);
  assert.match(freeze, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /Do NOT claim L34 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  // Historical tip-refresh-post-463 Do NOT claim EB–ED MEASURED retained
  assert.match(freeze, /Do NOT claim EB–ED MEASURED/);
  assert.match(matrix, /Do NOT claim EB–ED MEASURED/);
  assert.match(freeze, /Do NOT claim DZ–ED MEASURED/);
  assert.match(matrix, /Do NOT claim DZ–ED MEASURED/);
  assert.match(matrix, /\|\s*EB MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ–ED pending\s*\|/);
});

test('tip-refresh-post-465: tip-post-465 / Tip honesty post-#465 needles + pin 19b353d8 + historical tip-refresh-post-463 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-465/);
  assert.match(matrix, /tip-refresh-post-465/);
  assert.match(freeze, /tip-post-465|Tip honesty post-#465/);
  assert.match(matrix, /tip-post-465|Tip honesty post-#465/);
  assert.match(freeze, /tip-refresh-post-463/);
  assert.match(matrix, /tip-refresh-post-463/);
  assert.match(freeze, /tip-refresh-post-461/);
  assert.match(matrix, /tip-refresh-post-461/);
  assert.match(freeze, /tip-open-post-458/);
  assert.match(matrix, /tip-open-post-458/);
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-467: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-467|tip-post-467|Tip honesty post-#467/);
  assert.match(matrix, /tip-refresh-post-467|tip-post-467|Tip honesty post-#467/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(matrix, /Formal L33 CLOSED|NEVER reopen L33|Ladder 33 CLOSED/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending/);
  // Historical tip-refresh-post-465 / tip-refresh-post-463 L34 status needles retained
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending/);
  assert.match(freeze, /29586ab8f2c8a784eb84f5c5e9c899118c577427/);
  assert.match(matrix, /29586ab8f2c8a784eb84f5c5e9c899118c577427/);
  assert.match(freeze, /19b353d8fa07ece41df251d4eaeaa8778c13ed81/);
  assert.match(matrix, /19b353d8fa07ece41df251d4eaeaa8778c13ed81/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-467: L34 OPEN (Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending) + EC MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /EC MEASURED/);
  assert.match(matrix, /EC MEASURED/);
  assert.match(freeze, /Do NOT claim ED MEASURED/);
  assert.match(matrix, /Do NOT claim ED MEASURED/);
  assert.match(freeze, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /Do NOT claim L34 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  // Historical tip-refresh-post-465 Do NOT claim EC–ED MEASURED retained
  assert.match(freeze, /Do NOT claim EC–ED MEASURED/);
  assert.match(matrix, /Do NOT claim EC–ED MEASURED/);
  assert.match(freeze, /Do NOT claim EB–ED MEASURED/);
  assert.match(matrix, /Do NOT claim EB–ED MEASURED/);
  assert.match(matrix, /\|\s*EC MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB–ED pending\s*\|/);
});

test('tip-refresh-post-467: tip-post-467 / Tip honesty post-#467 needles + pin 29586ab8 + historical tip-refresh-post-465 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-467/);
  assert.match(matrix, /tip-refresh-post-467/);
  assert.match(freeze, /tip-post-467|Tip honesty post-#467/);
  assert.match(matrix, /tip-post-467|Tip honesty post-#467/);
  assert.match(freeze, /tip-refresh-post-465/);
  assert.match(matrix, /tip-refresh-post-465/);
  assert.match(freeze, /tip-refresh-post-463/);
  assert.match(matrix, /tip-refresh-post-463/);
  assert.match(freeze, /tip-open-post-458/);
  assert.match(matrix, /tip-open-post-458/);
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-469: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L30/L31/L32/L33', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-469|tip-post-469|Tip honesty post-#469/);
  assert.match(matrix, /tip-refresh-post-469|tip-post-469|Tip honesty post-#469/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(matrix, /Formal L33 CLOSED|NEVER reopen L33|Ladder 33 CLOSED/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED MEASURED · tip-seal pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED MEASURED · tip-seal pending/);
  // Historical tip-refresh-post-467 L34 status needles retained
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC–ED pending/);
  assert.match(freeze, /b2c582e4463e698f498bc6c0b2c3bae8c82584e7/);
  assert.match(matrix, /b2c582e4463e698f498bc6c0b2c3bae8c82584e7/);
  assert.match(freeze, /29586ab8f2c8a784eb84f5c5e9c899118c577427/);
  assert.match(matrix, /29586ab8f2c8a784eb84f5c5e9c899118c577427/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-469: L34 OPEN (ED MEASURED · tip-seal pending) + ED MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /ED MEASURED/);
  assert.match(matrix, /ED MEASURED/);
  assert.match(freeze, /tip-seal pending/);
  assert.match(matrix, /tip-seal pending/);
  assert.match(freeze, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /Do NOT claim L34 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /Tip-seal Formal L34 CLOSED = SEPARATE next/);
  assert.match(matrix, /Tip-seal Formal L34 CLOSED = SEPARATE next/);
  // Historical tip-refresh-post-467 Do NOT claim ED MEASURED retained
  assert.match(freeze, /Do NOT claim ED MEASURED/);
  assert.match(matrix, /Do NOT claim ED MEASURED/);
  assert.match(freeze, /Do NOT claim EC–ED MEASURED/);
  assert.match(matrix, /Do NOT claim EC–ED MEASURED/);
  assert.match(matrix, /\|\s*ED MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED MEASURED · tip-seal pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ–ED MEASURED · tip-seal pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending\s*\|/);
});

test('tip-refresh-post-469: tip-post-469 / Tip honesty post-#469 needles + pin b2c582e4 + historical tip-refresh-post-467 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-469/);
  assert.match(matrix, /tip-refresh-post-469/);
  assert.match(freeze, /tip-post-469|Tip honesty post-#469/);
  assert.match(matrix, /tip-post-469|Tip honesty post-#469/);
  assert.match(freeze, /tip-refresh-post-467/);
  assert.match(matrix, /tip-refresh-post-467/);
  assert.match(freeze, /tip-refresh-post-465/);
  assert.match(matrix, /tip-refresh-post-465/);
  assert.match(freeze, /tip-open-post-458/);
  assert.match(matrix, /tip-open-post-458/);
  assert.match(freeze, /tip-refresh-post-456/);
  assert.match(matrix, /tip-refresh-post-456/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});


test('tip-seal-post-470: Formal L30+L31+L32+L33 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-seal-post-470|tip-seal L34|Tip seal post-#470|Tip seal post #470/);
  assert.match(matrix, /tip-seal-post-470|tip-seal L34|Tip seal post-#470|Tip seal post #470/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED/);
  assert.match(matrix, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED|\|\s*L33 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(matrix, /NEVER reopen L33|never reopen L33/);
  assert.match(freeze, /NEVER reopen L34|never reopen L34/);
  assert.match(matrix, /NEVER reopen L34|never reopen L34/);
});

test('tip-seal-post-470: Formal L34 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DZ + EA + EB + EC + ED MEASURED + seam-pack + closeout)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Ladder 34 is \*\*CLOSED\*\*|L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED/);
  assert.match(matrix, /Ladder 34 CLOSED|L34 CLOSED/);
  assert.match(freeze, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout|\|\s*L34 CLOSED\s*\|/);
  assert.match(freeze, /Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout/);
  assert.match(freeze, /Formal L34 CLOSED|Formal Ladder 34 CLOSED/);
  assert.match(matrix, /Formal L34 CLOSED|Ladder 34 CLOSED/);
  assert.match(freeze, /Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric/);
  assert.match(matrix, /Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric/);
  assert.match(freeze, /ED MEASURED/);
  assert.match(matrix, /ED MEASURED/);
  assert.match(freeze, /Mission ED/);
  assert.match(matrix, /Mission ED/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED MEASURED · tip-seal pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED MEASURED · tip-seal pending/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ MEASURED · EA MEASURED · EB MEASURED · EC MEASURED · ED pending/);
  assert.match(freeze, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(matrix, /L34 OPEN \(Audit MEASURED · DZ–ED pending/);
  assert.match(freeze, /Do NOT claim L34 CLOSED/);
  assert.match(matrix, /Do NOT claim L34 CLOSED/);
});

test('tip-seal-post-470: NON-CLAIM PRODUCTION_READY + tip-seal needles + pin b2c582e4 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES|CLOSED_FOR_LOCAL_GOVERNED_USE != PRODUCTION_READY/);
  assert.match(freeze, /tip-seal-post-470/);
  assert.match(matrix, /tip-seal-post-470/);
  assert.match(freeze, /tip-seal L34|Tip seal post-#470|Tip seal post #470|Formal L34 CLOSED/);
  assert.match(matrix, /\|\s*Tip seal post #470\s*\||\|\s*tip-seal-post-470\s*\||\|\s*Formal L34 CLOSED\s*\||\|\s*Ladder 34 CLOSED\s*\||\|\s*L34 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*NEVER reopen L34\s*\|/);
  assert.match(matrix, /\|\s*Mission ED\s*\|/);
  assert.match(matrix, /\|\s*ED MEASURED\s*\|/);
  assert.match(freeze, /b2c582e4463e698f498bc6c0b2c3bae8c82584e7/);
  assert.match(matrix, /b2c582e4463e698f498bc6c0b2c3bae8c82584e7/);
  assert.match(freeze, /tip-refresh-post-469/);
  assert.match(matrix, /tip-refresh-post-469/);
  assert.match(freeze, /Fundacion Δ=0|Fundacion Delta=0/);
  assert.match(matrix, /Fundacion Delta=0|Fundacion Δ=0/);
});

test('tip-refresh-post-471: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-471|tip-post-471|Tip honesty post-#471/);
  assert.match(matrix, /tip-refresh-post-471|tip-post-471|Tip honesty post-#471/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED/);
  assert.match(matrix, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED|\|\s*L33 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(matrix, /NEVER reopen L33|never reopen L33/);
  assert.match(freeze, /NEVER reopen L34|never reopen L34/);
  assert.match(matrix, /NEVER reopen L34|never reopen L34/);
});

test('tip-refresh-post-471: Formal L34 CLOSED retained (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + DZ + EA + EB + EC + ED MEASURED + seam-pack + closeout)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Formal L34 CLOSED|Formal Ladder 34 CLOSED/);
  assert.match(matrix, /Formal L34 CLOSED|Ladder 34 CLOSED/);
  assert.match(freeze, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout|\|\s*L34 CLOSED\s*\|/);
  assert.match(freeze, /Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED \+ seam-pack \+ closeout/);
  assert.match(freeze, /Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric/);
  assert.match(matrix, /Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
});

test('tip-refresh-post-471: tip-post-471 / Tip honesty post-#471 needles + pin 1153a289 + historical tip-seal-post-470 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.match(freeze, /tip-post-471/);
  assert.match(matrix, /tip-post-471/);
  assert.match(freeze, /Tip honesty post-#471/);
  assert.match(matrix, /Tip honesty post-#471/);
  assert.match(freeze, /tip-seal-post-470/);
  assert.match(matrix, /tip-seal-post-470/);
  assert.match(freeze, /tip-refresh-post-469/);
  assert.match(matrix, /tip-refresh-post-469/);
  assert.match(freeze, /1153a289d9686f14f960e3c8fa9997b16c666bd4/);
  assert.match(matrix, /1153a289d9686f14f960e3c8fa9997b16c666bd4/);
  assert.match(freeze, /b2c582e4463e698f498bc6c0b2c3bae8c82584e7/);
  assert.match(matrix, /b2c582e4463e698f498bc6c0b2c3bae8c82584e7/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /Fundacion Δ=0|Fundacion Delta=0/);
  assert.match(matrix, /Fundacion Delta=0|Fundacion Δ=0/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-open-post-473: L35 OPEN honesty needles', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-open-post-473|Tip-open post #473|Tip open post-#473|tip honesty post-#473/);
  assert.match(matrix, /tip-open-post-473/);
  assert.match(freeze, /tip-open L35|Tip open post-#473/);
  assert.match(matrix, /tip-open L35|Tip open post-#473/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EE–EI MEASURED/);
  assert.match(freeze, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /\|\s*L35 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE–EI pending\s*\|/);
  assert.match(freeze, /0312795d300abc4af18d7d7b4a17ec0f618f534a/);
  assert.match(matrix, /0312795d300abc4af18d7d7b4a17ec0f618f534a/);
  assert.match(freeze, /Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric/);
  assert.match(matrix, /Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric/);
});

test('tip-open-post-473: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Formal L34 CLOSED|Formal Ladder 34 CLOSED/);
  assert.match(matrix, /Formal L34 CLOSED|Ladder 34 CLOSED/);
  assert.match(freeze, /NEVER reopen L34|never reopen L34/);
  assert.match(matrix, /NEVER reopen L34|never reopen L34/);
  assert.match(freeze, /Formal L30 CLOSED|L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(freeze, /Formal L31 CLOSED|L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(freeze, /Formal L32 CLOSED|L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(freeze, /Formal L33 CLOSED|Formal Ladder 33 CLOSED/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.match(freeze, /tip-seal-post-470/);
  assert.match(matrix, /tip-seal-post-470/);
  assert.match(freeze, /1153a289d9686f14f960e3c8fa9997b16c666bd4/);
  assert.match(matrix, /1153a289d9686f14f960e3c8fa9997b16c666bd4/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
  assert.doesNotMatch(matrix, /PRODUCTION_READY:\s*YES/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});


test('tip-refresh-post-474: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-474|tip-post-474|Tip honesty post-#474/);
  assert.match(matrix, /tip-refresh-post-474|tip-post-474|Tip honesty post-#474/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(matrix, /Formal L34 CLOSED|NEVER reopen L34|Ladder 34 CLOSED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /9600063c07f82dff13720ddcfb35e0d78804113b/);
  assert.match(matrix, /9600063c07f82dff13720ddcfb35e0d78804113b/);
  assert.match(freeze, /0a286ad8f4bfda1fafb8d5503de8babf89934a7c/);
  assert.match(matrix, /0a286ad8f4bfda1fafb8d5503de8babf89934a7c/);
  assert.match(freeze, /0312795d300abc4af18d7d7b4a17ec0f618f534a/);
  assert.match(matrix, /0312795d300abc4af18d7d7b4a17ec0f618f534a/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-474: tip-post-474 / Tip honesty post-#474 needles + pin 9600063c + historical tip-open-post-473 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-474/);
  assert.match(matrix, /tip-refresh-post-474/);
  assert.match(freeze, /tip-post-474|Tip honesty post-#474/);
  assert.match(matrix, /tip-post-474|Tip honesty post-#474/);
  assert.match(freeze, /tip-open-post-473/);
  assert.match(matrix, /tip-open-post-473/);
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-476: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-476|tip-post-476|Tip honesty post-#476/);
  assert.match(matrix, /tip-refresh-post-476|tip-post-476|Tip honesty post-#476/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(matrix, /Formal L34 CLOSED|NEVER reopen L34|Ladder 34 CLOSED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(matrix, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(freeze, /bdd53e30015040223267146ef551064473d771d1/);
  assert.match(matrix, /bdd53e30015040223267146ef551064473d771d1/);
  assert.match(freeze, /ff4b6d19132cfa0ab279109b9e09989e297dba71/);
  assert.match(matrix, /ff4b6d19132cfa0ab279109b9e09989e297dba71/);
  assert.match(freeze, /732522086a161f257bb758a31350c84c33030bf9/);
  assert.match(matrix, /732522086a161f257bb758a31350c84c33030bf9/);
  assert.match(freeze, /0a286ad8f4bfda1fafb8d5503de8babf89934a7c/);
  assert.match(matrix, /0a286ad8f4bfda1fafb8d5503de8babf89934a7c/);
  assert.match(freeze, /9600063c07f82dff13720ddcfb35e0d78804113b/);
  assert.match(matrix, /9600063c07f82dff13720ddcfb35e0d78804113b/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-476: L35 OPEN (Audit MEASURED · EE MEASURED · EF–EI pending) + EE MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /EE MEASURED/);
  assert.match(matrix, /EE MEASURED/);
  assert.match(freeze, /Do NOT claim EF–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EF–EI MEASURED/);
  assert.match(freeze, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /Do NOT claim L35 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /\|\s*EE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE–EI pending\s*\|/);
});

test('tip-refresh-post-476: tip-post-476 / Tip honesty post-#476 needles + pin 0a286ad8 + historical tip-refresh-post-474 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-476/);
  assert.match(matrix, /tip-refresh-post-476/);
  assert.match(freeze, /tip-post-476|Tip honesty post-#476/);
  assert.match(matrix, /tip-post-476|Tip honesty post-#476/);
  assert.match(freeze, /tip-refresh-post-474/);
  assert.match(matrix, /tip-refresh-post-474/);
  assert.match(freeze, /tip-open-post-473/);
  assert.match(matrix, /tip-open-post-473/);
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-478: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-478|tip-post-478|Tip honesty post-#478/);
  assert.match(matrix, /tip-refresh-post-478|tip-post-478|Tip honesty post-#478/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(matrix, /Formal L34 CLOSED|NEVER reopen L34|Ladder 34 CLOSED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /732522086a161f257bb758a31350c84c33030bf9/);
  assert.match(matrix, /732522086a161f257bb758a31350c84c33030bf9/);
  assert.match(freeze, /0a286ad8f4bfda1fafb8d5503de8babf89934a7c/);
  assert.match(matrix, /0a286ad8f4bfda1fafb8d5503de8babf89934a7c/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-478: L35 OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending) + EF MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /EF MEASURED/);
  assert.match(matrix, /EF MEASURED/);
  assert.match(freeze, /EE MEASURED/);
  assert.match(matrix, /EE MEASURED/);
  assert.match(freeze, /Do NOT claim EG–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EG–EI MEASURED/);
  assert.match(freeze, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /Do NOT claim L35 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /Do NOT claim EF–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EF–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /\|\s*EF MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE–EI pending\s*\|/);
});

test('tip-refresh-post-478: tip-post-478 / Tip honesty post-#478 needles + pin 73252208 + historical tip-refresh-post-476 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-478/);
  assert.match(matrix, /tip-refresh-post-478/);
  assert.match(freeze, /tip-post-478|Tip honesty post-#478/);
  assert.match(matrix, /tip-post-478|Tip honesty post-#478/);
  assert.match(freeze, /tip-refresh-post-476/);
  assert.match(matrix, /tip-refresh-post-476/);
  assert.match(freeze, /tip-refresh-post-474/);
  assert.match(matrix, /tip-refresh-post-474/);
  assert.match(freeze, /tip-open-post-473/);
  assert.match(matrix, /tip-open-post-473/);
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-480: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-480|tip-post-480|Tip honesty post-#480/);
  assert.match(matrix, /tip-refresh-post-480|tip-post-480|Tip honesty post-#480/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(matrix, /Formal L34 CLOSED|NEVER reopen L34|Ladder 34 CLOSED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /ff4b6d19132cfa0ab279109b9e09989e297dba71/);
  assert.match(matrix, /ff4b6d19132cfa0ab279109b9e09989e297dba71/);
  assert.match(freeze, /732522086a161f257bb758a31350c84c33030bf9/);
  assert.match(matrix, /732522086a161f257bb758a31350c84c33030bf9/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-480: L35 OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending) + EG MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /EG MEASURED/);
  assert.match(matrix, /EG MEASURED/);
  assert.match(freeze, /EF MEASURED/);
  assert.match(matrix, /EF MEASURED/);
  assert.match(freeze, /EE MEASURED/);
  assert.match(matrix, /EE MEASURED/);
  assert.match(freeze, /Do NOT claim EH–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EH–EI MEASURED/);
  assert.match(freeze, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /Do NOT claim L35 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /Do NOT claim EG–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EG–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EF–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EF–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /\|\s*EG MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EF MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE–EI pending\s*\|/);
});

test('tip-refresh-post-480: tip-post-480 / Tip honesty post-#480 needles + pin ff4b6d19 + historical tip-refresh-post-478 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-480/);
  assert.match(matrix, /tip-refresh-post-480/);
  assert.match(freeze, /tip-post-480|Tip honesty post-#480/);
  assert.match(matrix, /tip-post-480|Tip honesty post-#480/);
  assert.match(freeze, /tip-refresh-post-478/);
  assert.match(matrix, /tip-refresh-post-478/);
  assert.match(freeze, /tip-refresh-post-476/);
  assert.match(matrix, /tip-refresh-post-476/);
  assert.match(freeze, /tip-refresh-post-474/);
  assert.match(matrix, /tip-refresh-post-474/);
  assert.match(freeze, /tip-open-post-473/);
  assert.match(matrix, /tip-open-post-473/);
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-482: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-482|tip-post-482|Tip honesty post-#482/);
  assert.match(matrix, /tip-refresh-post-482|tip-post-482|Tip honesty post-#482/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(matrix, /Formal L34 CLOSED|NEVER reopen L34|Ladder 34 CLOSED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /bdd53e30015040223267146ef551064473d771d1/);
  assert.match(matrix, /bdd53e30015040223267146ef551064473d771d1/);
  assert.match(freeze, /ff4b6d19132cfa0ab279109b9e09989e297dba71/);
  assert.match(matrix, /ff4b6d19132cfa0ab279109b9e09989e297dba71/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-482: L35 OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending) + EH MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /EH MEASURED/);
  assert.match(matrix, /EH MEASURED/);
  assert.match(freeze, /EG MEASURED/);
  assert.match(matrix, /EG MEASURED/);
  assert.match(freeze, /EF MEASURED/);
  assert.match(matrix, /EF MEASURED/);
  assert.match(freeze, /EE MEASURED/);
  assert.match(matrix, /EE MEASURED/);
  assert.match(freeze, /Do NOT claim EI MEASURED/);
  assert.match(matrix, /Do NOT claim EI MEASURED/);
  assert.match(freeze, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /Do NOT claim L35 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /Do NOT claim EH–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EH–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EG–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EG–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EF–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EF–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /\|\s*EH MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EG MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EF MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE–EI pending\s*\|/);
});

test('tip-refresh-post-482: tip-post-482 / Tip honesty post-#482 needles + pin bdd53e30 + historical tip-refresh-post-480 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-482/);
  assert.match(matrix, /tip-refresh-post-482/);
  assert.match(freeze, /tip-post-482|Tip honesty post-#482/);
  assert.match(matrix, /tip-post-482|Tip honesty post-#482/);
  assert.match(freeze, /tip-refresh-post-480/);
  assert.match(matrix, /tip-refresh-post-480/);
  assert.match(freeze, /tip-refresh-post-478/);
  assert.match(matrix, /tip-refresh-post-478/);
  assert.match(freeze, /tip-refresh-post-476/);
  assert.match(matrix, /tip-refresh-post-476/);
  assert.match(freeze, /tip-refresh-post-474/);
  assert.match(matrix, /tip-refresh-post-474/);
  assert.match(freeze, /tip-open-post-473/);
  assert.match(matrix, /tip-open-post-473/);
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-484: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-484|tip-post-484|Tip honesty post-#484/);
  assert.match(matrix, /tip-refresh-post-484|tip-post-484|Tip honesty post-#484/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(matrix, /Formal L34 CLOSED|NEVER reopen L34|Ladder 34 CLOSED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF–EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(matrix, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(freeze, /bdd53e30015040223267146ef551064473d771d1/);
  assert.match(matrix, /bdd53e30015040223267146ef551064473d771d1/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-484: L35 OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED) + EI MEASURED + tip-seal SEPARATE', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /EI MEASURED/);
  assert.match(matrix, /EI MEASURED/);
  assert.match(freeze, /EH MEASURED/);
  assert.match(matrix, /EH MEASURED/);
  assert.match(freeze, /EG MEASURED/);
  assert.match(matrix, /EG MEASURED/);
  assert.match(freeze, /EF MEASURED/);
  assert.match(matrix, /EF MEASURED/);
  assert.match(freeze, /EE MEASURED/);
  assert.match(matrix, /EE MEASURED/);
  assert.match(freeze, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /Do NOT claim L35 CLOSED/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /tip-seal Formal L35 CLOSED is SEPARATE|tip-seal Formal L35 CLOSED SEPARATE|tip-seal SEPARATE/);
  assert.match(matrix, /tip-seal Formal L35 CLOSED SEPARATE|tip-seal SEPARATE|tip-seal pending SEPARATE/);
  assert.match(freeze, /Do NOT claim EI MEASURED/);
  assert.match(matrix, /Do NOT claim EI MEASURED/);
  assert.match(freeze, /Do NOT claim EH–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EH–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EG–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EG–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EF–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EF–EI MEASURED/);
  assert.match(freeze, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /Do NOT claim EE–EI MEASURED/);
  assert.match(matrix, /\|\s*EI MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EH MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EG MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EF MEASURED\s*\|/);
  assert.match(matrix, /\|\s*EE MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE MEASURED · EF–EI pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EE–EI pending\s*\|/);
});

test('tip-refresh-post-484: tip-post-484 / Tip honesty post-#484 needles + pin 079d90b2 + historical tip-refresh-post-482 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-484/);
  assert.match(matrix, /tip-refresh-post-484/);
  assert.match(freeze, /tip-post-484|Tip honesty post-#484/);
  assert.match(matrix, /tip-post-484|Tip honesty post-#484/);
  assert.match(freeze, /tip-refresh-post-482/);
  assert.match(matrix, /tip-refresh-post-482/);
  assert.match(freeze, /tip-refresh-post-480/);
  assert.match(matrix, /tip-refresh-post-480/);
  assert.match(freeze, /tip-refresh-post-478/);
  assert.match(matrix, /tip-refresh-post-478/);
  assert.match(freeze, /tip-refresh-post-476/);
  assert.match(matrix, /tip-refresh-post-476/);
  assert.match(freeze, /tip-refresh-post-474/);
  assert.match(matrix, /tip-refresh-post-474/);
  assert.match(freeze, /tip-open-post-473/);
  assert.match(matrix, /tip-open-post-473/);
  assert.match(freeze, /tip-refresh-post-471/);
  assert.match(matrix, /tip-refresh-post-471/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});


test('tip-seal-post-485: Formal L30+L31+L32+L33+L34 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34/L35', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-seal-post-485|tip-seal L35|Tip seal post-#485|Tip seal post #485/);
  assert.match(matrix, /tip-seal-post-485|tip-seal L35|Tip seal post-#485|Tip seal post #485/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED/);
  assert.match(matrix, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED|\|\s*L33 CLOSED\s*\|/);
  assert.match(freeze, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED/);
  assert.match(matrix, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED|\|\s*L34 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(matrix, /NEVER reopen L33|never reopen L33/);
  assert.match(freeze, /NEVER reopen L34|never reopen L34/);
  assert.match(matrix, /NEVER reopen L34|never reopen L34/);
  assert.match(freeze, /NEVER reopen L35|never reopen L35/);
  assert.match(matrix, /NEVER reopen L35|never reopen L35/);
});

test('tip-seal-post-485: Formal L35 CLOSED (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + EE + EF + EG + EH + EI MEASURED + seam-pack + closeout)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Ladder 35 is \*\*CLOSED\*\*|L35 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED/);
  assert.match(matrix, /Ladder 35 CLOSED|L35 CLOSED/);
  assert.match(freeze, /L35 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /L35 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout|\|\s*L35 CLOSED\s*\|/);
  assert.match(freeze, /Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout/);
  assert.match(freeze, /Formal L35 CLOSED|Formal Ladder 35 CLOSED/);
  assert.match(matrix, /Formal L35 CLOSED|Ladder 35 CLOSED/);
  assert.match(freeze, /Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric/);
  assert.match(matrix, /Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric/);
  assert.match(freeze, /EI MEASURED/);
  assert.match(matrix, /EI MEASURED/);
  assert.match(freeze, /Mission EI/);
  assert.match(matrix, /Mission EI/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI MEASURED/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH MEASURED · EI pending/);
  assert.match(freeze, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(matrix, /L35 OPEN \(Audit MEASURED · EE–EI pending/);
  assert.match(freeze, /Do NOT claim L35 CLOSED/);
  assert.match(matrix, /Do NOT claim L35 CLOSED/);
});

test('tip-seal-post-485: NON-CLAIM PRODUCTION_READY + tip-seal needles + pin 079d90b2 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
  assert.match(freeze, /CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES|CLOSED_FOR_LOCAL_GOVERNED_USE != PRODUCTION_READY/);
  assert.match(freeze, /tip-seal-post-485/);
  assert.match(matrix, /tip-seal-post-485/);
  assert.match(freeze, /tip-seal L35|Tip seal post-#485|Tip seal post #485|Formal L35 CLOSED/);
  assert.match(matrix, /\|\s*Tip seal post #485\s*\||\|\s*tip-seal-post-485\s*\||\|\s*Formal L35 CLOSED\s*\||\|\s*Ladder 35 CLOSED\s*\||\|\s*L35 CLOSED\s*\|/);
  assert.match(matrix, /\|\s*NEVER reopen L35\s*\|/);
  assert.match(matrix, /\|\s*Mission EI\s*\|/);
  assert.match(matrix, /\|\s*EI MEASURED\s*\|/);
  assert.match(freeze, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(matrix, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(freeze, /tip-refresh-post-484/);
  assert.match(matrix, /tip-refresh-post-484/);
  assert.match(freeze, /Fundacion Δ=0|Fundacion Delta=0/);
  assert.match(matrix, /Fundacion Delta=0|Fundacion Δ=0/);
});

test('tip-refresh-post-486: Formal L30+L31+L32+L33+L34+L35 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34/L35', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-486|tip-post-486|Tip honesty post-#486/);
  assert.match(matrix, /tip-refresh-post-486|tip-post-486|Tip honesty post-#486/);
  assert.match(freeze, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(matrix, /L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED|\|\s*L30 CLOSED\s*\|/);
  assert.match(freeze, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(matrix, /L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED|\|\s*L31 CLOSED\s*\|/);
  assert.match(freeze, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(matrix, /L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED|\|\s*L32 CLOSED\s*\|/);
  assert.match(freeze, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED/);
  assert.match(matrix, /L33 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DU \+ DV \+ DW \+ DX \+ DY MEASURED|\|\s*L33 CLOSED\s*\|/);
  assert.match(freeze, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED/);
  assert.match(matrix, /L34 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ DZ \+ EA \+ EB \+ EC \+ ED MEASURED|\|\s*L34 CLOSED\s*\|/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(matrix, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(matrix, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(matrix, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(matrix, /NEVER reopen L33|never reopen L33/);
  assert.match(freeze, /NEVER reopen L34|never reopen L34/);
  assert.match(matrix, /NEVER reopen L34|never reopen L34/);
  assert.match(freeze, /NEVER reopen L35|never reopen L35/);
  assert.match(matrix, /NEVER reopen L35|never reopen L35/);
});

test('tip-refresh-post-486: Formal L35 CLOSED retained (CLOSED_FOR_LOCAL_GOVERNED_USE; Audit + EE + EF + EG + EH + EI MEASURED + seam-pack + closeout)', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Formal L35 CLOSED|Formal Ladder 35 CLOSED/);
  assert.match(matrix, /Formal L35 CLOSED|Ladder 35 CLOSED/);
  assert.match(freeze, /L35 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /L35 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout|\|\s*L35 CLOSED\s*\|/);
  assert.match(freeze, /Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout/);
  assert.match(matrix, /Audit \+ EE \+ EF \+ EG \+ EH \+ EI MEASURED \+ seam-pack \+ closeout/);
  assert.match(freeze, /Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric/);
  assert.match(matrix, /Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(freeze, /Do NOT claim PRODUCTION_READY/);
  assert.match(matrix, /Do NOT claim PRODUCTION_READY/);
});

test('tip-refresh-post-486: tip-post-486 / Tip honesty post-#486 needles + pin 0903b037 + historical tip-seal-post-485 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-486/);
  assert.match(matrix, /tip-refresh-post-486/);
  assert.match(freeze, /tip-post-486/);
  assert.match(matrix, /tip-post-486/);
  assert.match(freeze, /Tip honesty post-#486/);
  assert.match(matrix, /Tip honesty post-#486/);
  assert.match(freeze, /tip-seal-post-485/);
  assert.match(matrix, /tip-seal-post-485/);
  assert.match(freeze, /tip-refresh-post-484/);
  assert.match(matrix, /tip-refresh-post-484/);
  assert.match(freeze, /0903b037d29393bce5cdf7c3b23933d9613a192a/);
  assert.match(matrix, /0903b037d29393bce5cdf7c3b23933d9613a192a/);
  assert.match(freeze, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(matrix, /079d90b2ffdcde0445a34e2eaaabcdb07b4f34c6/);
  assert.match(freeze, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(matrix, /Complexity prune deferred PO-gated \(inventory≠delete\)|inventory≠delete/);
  assert.match(freeze, /Fundacion Δ=0|Fundacion Delta=0/);
  assert.match(matrix, /Fundacion Delta=0|Fundacion Δ=0/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-open-post-488: L36 OPEN honesty needles', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-open-post-488|Tip-open post #488|Tip open post-#488|tip honesty post-#488/);
  assert.match(matrix, /tip-open-post-488/);
  assert.match(freeze, /tip-open L36|Tip open post-#488/);
  assert.match(matrix, /tip-open L36|Tip open post-#488/);
  assert.match(freeze, /L36 OPEN \(Audit MEASURED · EJ–EN pending/);
  assert.match(matrix, /L36 OPEN \(Audit MEASURED · EJ–EN pending/);
  assert.match(freeze, /Do NOT claim EJ–EN MEASURED/);
  assert.match(matrix, /Do NOT claim EJ–EN MEASURED/);
  assert.match(freeze, /Do NOT claim L36 CLOSED/);
  assert.match(matrix, /Do NOT claim L36 CLOSED/);
  assert.match(matrix, /\|\s*L36 OPEN\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EJ–EN pending\s*\|/);
  assert.match(freeze, /73276cbab1e750fc69f3aaf71353e12d517e00ed/);
  assert.match(matrix, /73276cbab1e750fc69f3aaf71353e12d517e00ed/);
  assert.match(freeze, /Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric/);
  assert.match(matrix, /Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric/);
});

test('tip-open-post-488: Formal L30+L31+L32+L33+L34+L35 CLOSED retained + NEVER reopen L35', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /Formal L35 CLOSED|Formal Ladder 35 CLOSED/);
  assert.match(matrix, /Formal L35 CLOSED|Ladder 35 CLOSED/);
  assert.match(freeze, /NEVER reopen L35|never reopen L35/);
  assert.match(matrix, /NEVER reopen L35|never reopen L35/);
  assert.match(freeze, /Formal L30 CLOSED|L30 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DF–DJ MEASURED/);
  assert.match(freeze, /Formal L31 CLOSED|L31 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DK–DO MEASURED/);
  assert.match(freeze, /Formal L32 CLOSED|L32 CLOSED \(CLOSED_FOR_LOCAL_GOVERNED_USE; DP–DT MEASURED/);
  assert.match(freeze, /Formal L33 CLOSED|Formal Ladder 33 CLOSED/);
  assert.match(freeze, /Formal L34 CLOSED|Formal Ladder 34 CLOSED/);
  assert.match(freeze, /NEVER reopen L30|never reopen L30/);
  assert.match(freeze, /NEVER reopen L31|never reopen L31/);
  assert.match(freeze, /NEVER reopen L32|never reopen L32/);
  assert.match(freeze, /NEVER reopen L33|never reopen L33/);
  assert.match(freeze, /NEVER reopen L34|never reopen L34/);
  assert.match(freeze, /tip-refresh-post-486/);
  assert.match(matrix, /tip-refresh-post-486/);
  assert.match(freeze, /tip-seal-post-485/);
  assert.match(matrix, /tip-seal-post-485/);
  assert.match(freeze, /0903b037d29393bce5cdf7c3b23933d9613a192a/);
  assert.match(matrix, /0903b037d29393bce5cdf7c3b23933d9613a192a/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.match(matrix, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
  assert.doesNotMatch(matrix, /PRODUCTION_READY:\s*YES/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-489: Formal L30+L31+L32+L33+L34+L35 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34/L35', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-489|tip-post-489|Tip honesty post-#489/);
  assert.match(matrix, /tip-refresh-post-489|tip-post-489|Tip honesty post-#489/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(freeze, /Formal L35 CLOSED|NEVER reopen L35/);
  assert.match(matrix, /Formal L35 CLOSED|NEVER reopen L35|Ladder 35 CLOSED/);
  assert.match(freeze, /L36 OPEN \(Audit MEASURED · EJ–EN pending/);
  assert.match(matrix, /L36 OPEN \(Audit MEASURED · EJ–EN pending/);
  assert.match(freeze, /d7490fee0e419fc58602f67b0051ca06e649595a/);
  assert.match(matrix, /d7490fee0e419fc58602f67b0051ca06e649595a/);
  assert.match(freeze, /73276cbab1e750fc69f3aaf71353e12d517e00ed/);
  assert.match(matrix, /73276cbab1e750fc69f3aaf71353e12d517e00ed/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
});

test('tip-refresh-post-489: tip-post-489 / Tip honesty post-#489 needles + pin d7490fee + historical tip-open-post-488 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-489/);
  assert.match(matrix, /tip-refresh-post-489/);
  assert.match(freeze, /tip-post-489|Tip honesty post-#489/);
  assert.match(matrix, /tip-post-489|Tip honesty post-#489/);
  assert.match(freeze, /tip-open-post-488/);
  assert.match(matrix, /tip-open-post-488/);
  assert.match(freeze, /tip-refresh-post-486/);
  assert.match(matrix, /tip-refresh-post-486/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-491: Formal L30+L31+L32+L33+L34+L35 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34/L35 + EJ MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-491|tip-post-491|Tip honesty post-#491/);
  assert.match(matrix, /tip-refresh-post-491|tip-post-491|Tip honesty post-#491/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(freeze, /Formal L35 CLOSED|NEVER reopen L35/);
  assert.match(matrix, /Formal L35 CLOSED|NEVER reopen L35|Ladder 35 CLOSED/);
  assert.match(freeze, /L36 OPEN \(Audit MEASURED · EJ MEASURED · EK–EN pending/);
  assert.match(matrix, /L36 OPEN \(Audit MEASURED · EJ MEASURED · EK–EN pending/);
  assert.match(freeze, /L36 OPEN \(Audit MEASURED · EJ–EN pending/);
  assert.match(matrix, /L36 OPEN \(Audit MEASURED · EJ–EN pending/);
  assert.match(freeze, /Do NOT claim EK–EN MEASURED/);
  assert.match(matrix, /Do NOT claim EK–EN MEASURED/);
  assert.match(freeze, /5e5af28130d3e742ae5274fab9913453317c913b/);
  assert.match(matrix, /5e5af28130d3e742ae5274fab9913453317c913b/);
  assert.match(freeze, /d7490fee0e419fc58602f67b0051ca06e649595a/);
  assert.match(matrix, /d7490fee0e419fc58602f67b0051ca06e649595a/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-491: tip-post-491 / Tip honesty post-#491 needles + pin 5e5af281 + historical tip-refresh-post-489 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-491/);
  assert.match(matrix, /tip-refresh-post-491/);
  assert.match(freeze, /tip-post-491|Tip honesty post-#491/);
  assert.match(matrix, /tip-post-491|Tip honesty post-#491/);
  assert.match(freeze, /tip-refresh-post-489/);
  assert.match(matrix, /tip-refresh-post-489/);
  assert.match(freeze, /tip-open-post-488/);
  assert.match(matrix, /tip-open-post-488/);
  assert.match(freeze, /tip-refresh-post-486/);
  assert.match(matrix, /tip-refresh-post-486/);
  assert.match(matrix, /\|\s*EJ MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EJ MEASURED · EK–EN pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EJ–EN pending\s*\|/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-493: Formal L30+L31+L32+L33+L34+L35 CLOSED retained + NEVER reopen L30/L31/L32/L33/L34/L35 + EK MEASURED', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-493|tip-post-493|Tip honesty post-#493/);
  assert.match(matrix, /tip-refresh-post-493|tip-post-493|Tip honesty post-#493/);
  assert.match(freeze, /Formal L30 CLOSED|NEVER reopen L30/);
  assert.match(freeze, /Formal L31 CLOSED|NEVER reopen L31/);
  assert.match(freeze, /Formal L32 CLOSED|NEVER reopen L32/);
  assert.match(freeze, /Formal L33 CLOSED|NEVER reopen L33/);
  assert.match(freeze, /Formal L34 CLOSED|NEVER reopen L34/);
  assert.match(freeze, /Formal L35 CLOSED|NEVER reopen L35/);
  assert.match(matrix, /Formal L35 CLOSED|NEVER reopen L35|Ladder 35 CLOSED/);
  assert.match(freeze, /L36 OPEN \(Audit MEASURED · EJ MEASURED · EK MEASURED · EL–EN pending/);
  assert.match(matrix, /L36 OPEN \(Audit MEASURED · EJ MEASURED · EK MEASURED · EL–EN pending/);
  assert.match(freeze, /L36 OPEN \(Audit MEASURED · EJ MEASURED · EK–EN pending/);
  assert.match(matrix, /L36 OPEN \(Audit MEASURED · EJ MEASURED · EK–EN pending/);
  assert.match(freeze, /Do NOT claim EL–EN MEASURED/);
  assert.match(matrix, /Do NOT claim EL–EN MEASURED/);
  assert.match(freeze, /72697dd506284284e5cbbe3ebf2c68cef8fbf006/);
  assert.match(matrix, /72697dd506284284e5cbbe3ebf2c68cef8fbf006/);
  assert.match(freeze, /5e5af28130d3e742ae5274fab9913453317c913b/);
  assert.match(matrix, /5e5af28130d3e742ae5274fab9913453317c913b/);
  assert.match(freeze, /PRODUCTION_READY:\s*NO|PRODUCTION_READY=NO/);
  assert.doesNotMatch(freeze, /PRODUCTION_READY:\s*YES/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});

test('tip-refresh-post-493: tip-post-493 / Tip honesty post-#493 needles + pin 72697dd5 + historical tip-refresh-post-491 retained', () => {
  const freeze = fs.readFileSync(FREEZE, 'utf8');
  const matrix = fs.readFileSync(MATRIX, 'utf8');
  assert.match(freeze, /tip-refresh-post-493/);
  assert.match(matrix, /tip-refresh-post-493/);
  assert.match(freeze, /tip-post-493|Tip honesty post-#493/);
  assert.match(matrix, /tip-post-493|Tip honesty post-#493/);
  assert.match(freeze, /tip-refresh-post-491/);
  assert.match(matrix, /tip-refresh-post-491/);
  assert.match(freeze, /tip-open-post-488/);
  assert.match(matrix, /tip-open-post-488/);
  assert.match(freeze, /tip-refresh-post-486/);
  assert.match(matrix, /tip-refresh-post-486/);
  assert.match(matrix, /\|\s*EJ MEASURED\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EJ MEASURED · EK MEASURED · EL–EN pending\s*\|/);
  assert.match(matrix, /\|\s*Audit MEASURED · EJ MEASURED · EK–EN pending\s*\|/);
  assert.equal(EXPECTED_TIP, '72697dd506284284e5cbbe3ebf2c68cef8fbf006');
});
