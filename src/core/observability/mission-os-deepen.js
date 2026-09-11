/**
 * @module mission-os-deepen
 * Ladder 9 U4 / K4 — Mission OS deepen beyond T4 fixture observe pack.
 *
 * Deepens (CI-safe, local, N small):
 *   1) T4 observe baseline (coherence + sealEvd + tip ALIGNED fixture)
 *   2) ATS↔loop honesty pack (relations overlay_corresponds; control states ATS-only;
 *      roles claim ADR-0014; no invented loop twins)
 *   3) EVD custody chain observe recurrente (multi-seal + verify PASS count>=2)
 *   4) HUD wiring fragment (observeFreezeTipVsHead + coherence claim surface)
 *
 * NON-CLAIM: deepen ≠ production soak; observe ≠ soak-prod;
 * tip MATCH is informational; PRODUCTION_READY remains NO.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  assertCoherenceMapComplete,
  getMissionOsCoherenceMap,
  MISSION_LOOP_TO_ATS,
  ATS_CONTROL_STATES,
  FSM_ROLES
} from './mission-os-coherence.js';
import {
  runMissionOsEvdObservePack,
  createAlignedObserveFixture,
  OBSERVE_PACK_SCHEMA,
  OBSERVE_PACK_ID
} from './mission-os-evd-observe-pack.js';
import { observeFreezeTipVsHead } from './operator-hud.js';
import { EvidenceCustody, CUSTODY_EVENT_TYPES } from '../sdd/evidence-custody.js';
import { sealEvd } from '../sdd/evd-seal-path.js';
import { MISSION_LOOP_ORDER } from '../mcp/mission-loop.js';

export const DEEPEN_SCHEMA = 'eos.mission-os-deepen.v1';
export const DEEPEN_ID = 'MISSION_OS_DEEPEN';

export const DEEPEN_NON_CLAIMS = Object.freeze([
  'Mission OS deepen is NOT a production soak (local CI-safe deepen beyond T4 fixture only)',
  'observe / deepen ≠ soak-prod; long-run / GameDay ≠ soak-prod; tip ALIGNED is informational OBSERVED',
  'PRODUCTION_READY remains NO; Fundacion Delta=0; no silent MCP prune; AT_CEILING',
  'Deepen ritual ≠ verify:strict full audit; HUD fragment ≠ production readiness',
  'doctor≠verify residual stands; U3 path observe ≠ this deepen body'
]);

export const DEEPEN_REQUIRED_PATHS = Object.freeze([
  'src/core/observability/mission-os-deepen.js',
  'scripts/ci/mission-os-deepen.js',
  'tests/eos-u4-mission-os-deepen.test.js',
  'docs/releases/EOS_U4_MISSION_OS_DEEPEN_2026-09-09.md'
]);

/**
 * Richer ATS↔loop honesty checks beyond assertCoherenceMapComplete.
 * @returns {{ ok: true, relations_ok: number, control_ats_only: number, roles_claim: string }}
 */
export function assertAtsLoopHonesty() {
  const base = assertCoherenceMapComplete();
  const map = getMissionOsCoherenceMap();

  let relationsOk = 0;
  for (const stage of MISSION_LOOP_ORDER) {
    const entry = MISSION_LOOP_TO_ATS[stage];
    if (!entry || entry.relation !== 'overlay_corresponds') {
      const err = new Error(
        `ATS_LOOP_HONESTY_RELATION: stage=${stage} relation=${entry?.relation || 'missing'} (expected overlay_corresponds)`
      );
      err.code = 'ATS_LOOP_HONESTY_RELATION';
      throw err;
    }
    relationsOk += 1;
  }

  // Control states must remain ATS-only (no invented mission-loop twin keys).
  const loopKeys = new Set(Object.keys(MISSION_LOOP_TO_ATS));
  for (const ats of ATS_CONTROL_STATES) {
    if (loopKeys.has(ats)) {
      const err = new Error(
        `ATS_LOOP_HONESTY_INVENTED_TWIN: control state ${ats} must not appear as mission-loop stage`
      );
      err.code = 'ATS_LOOP_HONESTY_INVENTED_TWIN';
      throw err;
    }
  }

  const rolesClaim = map.claim || FSM_ROLES.MISSION_LOOP.claim || '';
  if (!/does not replace ATS|does NOT replace ATS/i.test(rolesClaim)) {
    const err = new Error('ATS_LOOP_HONESTY_ROLES_CLAIM: missing ADR-0014 non-replace claim');
    err.code = 'ATS_LOOP_HONESTY_ROLES_CLAIM';
    throw err;
  }

  if (!map.unmapped_ats_note || !/ATS-only|control states/i.test(map.unmapped_ats_note)) {
    const err = new Error('ATS_LOOP_HONESTY_CONTROL_NOTE: missing ATS-only control-states note');
    err.code = 'ATS_LOOP_HONESTY_CONTROL_NOTE';
    throw err;
  }

  return {
    ok: true,
    mission_loop_mapped: base.mission_loop_mapped,
    ats_documented: base.ats_documented,
    relations_ok: relationsOk,
    control_ats_only: ATS_CONTROL_STATES.length,
    roles_claim: rolesClaim,
    epistemic: 'OBSERVED'
  };
}

/**
 * HUD wiring fragment — surfaces tip observe + coherence claim for HUD consumers.
 * Does not claim PRODUCTION_READY.
 *
 * @param {string} sandboxRoot
 * @param {object} [options]
 * @param {string} [options.liveHead]
 * @returns {object}
 */
export function buildDeepenHudFragment(sandboxRoot, options = {}) {
  const freezeTip = observeFreezeTipVsHead(sandboxRoot, {
    liveHead: options.liveHead
  });
  const map = getMissionOsCoherenceMap();
  return {
    schema: 'eos.mission-os-deepen-hud-fragment.v1',
    epistemic: 'OBSERVED',
    PRODUCTION_READY: 'NO',
    soak_claim: false,
    observe_pack_id: OBSERVE_PACK_ID,
    observe_pack_schema: OBSERVE_PACK_SCHEMA,
    deepen_id: DEEPEN_ID,
    tip: {
      match: freezeTip.match === true,
      freeze_main_tip: freezeTip.freeze_main_tip,
      live_head: freezeTip.live_head,
      epistemic: freezeTip.epistemic
    },
    coherence_claim: map.claim,
    coherence_schema: map.schema,
    bindings: Object.freeze({
      observe_pack_module: 'src/core/observability/mission-os-evd-observe-pack.js',
      deepen_module: 'src/core/observability/mission-os-deepen.js',
      hud_module: 'src/core/observability/operator-hud.js'
    }),
    non_claims: Object.freeze([
      'HUD fragment ≠ production soak',
      'tip MATCH informational; PRODUCTION_READY remains NO'
    ])
  };
}

/**
 * Recurrent EVD custody observe: seal ≥2 events then verify chain PASS.
 *
 * @param {object} options
 * @param {string} options.sandboxRoot
 * @param {object} [options.baselineSealed] - optional T4 sealed evidence to include in report
 * @returns {{ ok: boolean, custody_verify: object, seals: object[], detail: string }}
 */
export function runCustodyChainRecurrent(options = {}) {
  const sandboxRoot = options.sandboxRoot;
  if (!sandboxRoot) {
    throw new Error('CUSTODY_RECURRENT_NO_SANDBOX');
  }

  const evidenceDir = path.join(sandboxRoot, 'docs', 'evidence');
  const custodyDir = path.join(sandboxRoot, '.eos', 'custody');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(custodyDir, { recursive: true });

  const custody = new EvidenceCustody({
    controlPlaneRoot: sandboxRoot,
    baseDir: custodyDir,
    enabled: true
  });

  const seals = [];
  const ts = Date.now();

  const first = sealEvd({
    controlPlaneRoot: sandboxRoot,
    evidenceDir,
    custody,
    record: {
      id: `EVD-U4-DEEPEN-A-${ts}`,
      status: 'OBSERVED',
      related_spec: 'openspec/changes/eos-u4-mission-os-deepen/proposal.md',
      related_project: 'eos-u4-mission-os-deepen',
      deepen_pack: DEEPEN_SCHEMA,
      PRODUCTION_READY: 'NO',
      phase: 'custody_recurrent_a'
    }
  });
  seals.push({
    evidence_id: first.evidence_id,
    path: first.path,
    custody: Boolean(first.custody_event)
  });

  const second = sealEvd({
    controlPlaneRoot: sandboxRoot,
    evidenceDir,
    custody,
    record: {
      id: `EVD-U4-DEEPEN-B-${ts}`,
      status: 'OBSERVED',
      related_spec: 'openspec/changes/eos-u4-mission-os-deepen/proposal.md',
      related_project: 'eos-u4-mission-os-deepen',
      deepen_pack: DEEPEN_SCHEMA,
      PRODUCTION_READY: 'NO',
      phase: 'custody_recurrent_b'
    }
  });
  seals.push({
    evidence_id: second.evidence_id,
    path: second.path,
    custody: Boolean(second.custody_event)
  });

  // Optional third: VERIFY_RECEIPT style append for chain richness (still CI-safe).
  const receipt = custody.sealVerifyReceipt({
    receipt_id: `RCP-U4-DEEPEN-${ts}`,
    status: 'OBSERVED',
    builder_id: 'mission-os-deepen-builder',
    verifier_id: 'mission-os-deepen-verifier'
  });

  const custodyVerify = custody.verify({ failClosed: true });
  const events = custody.listEvents();
  const ok =
    custodyVerify.valid === true &&
    custodyVerify.count >= 2 &&
    seals.every((s) => s.custody) &&
    fs.existsSync(first.path) &&
    fs.existsSync(second.path);

  return {
    ok,
    custody_verify: {
      valid: custodyVerify.valid,
      verdict: custodyVerify.verdict,
      count: custodyVerify.count,
      lastHash: custodyVerify.lastHash || null
    },
    seals,
    receipt_event_type: receipt?.event_type || CUSTODY_EVENT_TYPES.VERIFY_RECEIPT,
    event_count: events.length,
    detail: `custody_valid=${custodyVerify.valid}; count=${custodyVerify.count}; seals=${seals.length}; events=${events.length}`
  };
}

/**
 * Run Mission OS deepen ritual (CI-safe).
 *
 * @param {object} [options]
 * @param {string} [options.sandboxRoot]
 * @param {string} [options.tip]
 * @param {boolean} [options.keepSandbox=false]
 * @param {boolean} [options.requireAligned=true]
 * @param {string} [options.liveHead]
 * @returns {object} deepen report
 */
export function runMissionOsDeepen(options = {}) {
  const requireAligned = options.requireAligned !== false;
  const keepSandbox = options.keepSandbox === true;
  let ownedSandbox = false;
  let sandboxRoot = options.sandboxRoot || null;
  let tip = options.tip || null;

  if (!sandboxRoot) {
    const fixture = createAlignedObserveFixture(tip ? { tip } : {});
    sandboxRoot = fixture.sandboxRoot;
    tip = fixture.tip;
    ownedSandbox = true;
  }

  const startedAt = new Date().toISOString();
  const checks = [];
  const failures = [];

  // 1) T4 observe baseline (compose)
  let t4 = null;
  try {
    t4 = runMissionOsEvdObservePack({
      sandboxRoot,
      tip: tip || undefined,
      liveHead: options.liveHead,
      requireAligned,
      keepSandbox: true
    });
    checks.push({
      id: 'T4_BASELINE',
      ok: t4.ok === true,
      detail: `t4_ok=${t4.ok}; failures=${(t4.failures || []).join(',') || 'none'}`
    });
    if (!t4.ok) failures.push('T4_BASELINE');
  } catch (err) {
    checks.push({ id: 'T4_BASELINE', ok: false, detail: err.message });
    failures.push('T4_BASELINE');
  }

  // 2) ATS↔loop honesty deepen
  let honesty = null;
  try {
    honesty = assertAtsLoopHonesty();
    checks.push({
      id: 'ATS_LOOP_HONESTY',
      ok: honesty.ok === true,
      detail: `relations_ok=${honesty.relations_ok}; control_ats_only=${honesty.control_ats_only}; mapped=${honesty.mission_loop_mapped}`
    });
  } catch (err) {
    checks.push({ id: 'ATS_LOOP_HONESTY', ok: false, detail: err.message });
    failures.push('ATS_LOOP_HONESTY');
  }

  // 3) Custody chain recurrent
  let custody = null;
  try {
    custody = runCustodyChainRecurrent({ sandboxRoot, baselineSealed: t4?.sealed_evidence });
    checks.push({
      id: 'CUSTODY_CHAIN_RECURRENT',
      ok: custody.ok === true,
      detail: custody.detail
    });
    if (!custody.ok) failures.push('CUSTODY_CHAIN_RECURRENT');
  } catch (err) {
    checks.push({ id: 'CUSTODY_CHAIN_RECURRENT', ok: false, detail: err.message });
    failures.push('CUSTODY_CHAIN_RECURRENT');
  }

  // 4) HUD wiring fragment
  let hudFragment = null;
  try {
    hudFragment = buildDeepenHudFragment(sandboxRoot, {
      liveHead: options.liveHead || tip
    });
    const tipOk = requireAligned ? hudFragment.tip.match === true : true;
    const wired =
      hudFragment.bindings?.observe_pack_module &&
      hudFragment.bindings?.deepen_module &&
      hudFragment.bindings?.hud_module &&
      hudFragment.PRODUCTION_READY === 'NO' &&
      hudFragment.soak_claim === false;
    checks.push({
      id: 'HUD_WIRING',
      ok: tipOk && wired,
      detail: `tip_match=${hudFragment.tip.match}; wired=${wired}; epistemic=${hudFragment.epistemic}`
    });
    if (!(tipOk && wired)) failures.push('HUD_WIRING');
  } catch (err) {
    checks.push({ id: 'HUD_WIRING', ok: false, detail: err.message });
    failures.push('HUD_WIRING');
  }

  const ok = failures.length === 0;
  const finishedAt = new Date().toISOString();
  const report = {
    schema: DEEPEN_SCHEMA,
    id: DEEPEN_ID,
    ok,
    PRODUCTION_READY: 'NO',
    soak_claim: false,
    epistemic: 'OBSERVED',
    started_at: startedAt,
    finished_at: finishedAt,
    sandbox_root: sandboxRoot,
    checks,
    failures,
    t4_baseline: t4
      ? {
          ok: t4.ok,
          schema: t4.schema,
          soak_claim: t4.soak_claim,
          sealed_evidence_id: t4.sealed_evidence?.evidence_id || null
        }
      : null,
    ats_loop_honesty: honesty,
    custody_chain: custody
      ? {
          ok: custody.ok,
          verify: custody.custody_verify,
          seal_count: custody.seals?.length || 0,
          event_count: custody.event_count
        }
      : null,
    hud_fragment: hudFragment,
    non_claims: [...DEEPEN_NON_CLAIMS]
  };

  if (ownedSandbox && !keepSandbox) {
    try {
      fs.rmSync(sandboxRoot, { recursive: true, force: true });
      report.sandbox_root = '(cleaned)';
    } catch {
      // leave path if cleanup fails
    }
  }

  return report;
}

/**
 * @param {object} report
 * @returns {string}
 */
export function formatDeepenReport(report) {
  const lines = [
    'EOS U4 MISSION OS DEEPEN (post T4)',
    `schema=${report.schema} ok=${report.ok} PRODUCTION_READY=${report.PRODUCTION_READY} soak_claim=${report.soak_claim}`,
    `sandbox=${report.sandbox_root}`,
    ''
  ];
  for (const c of report.checks || []) {
    lines.push(`  [${c.ok ? 'PASS' : 'FAIL'}] ${c.id} — ${c.detail}`);
  }
  lines.push('');
  lines.push('NON-CLAIMS:');
  for (const n of report.non_claims || []) {
    lines.push(`  - ${n}`);
  }
  if (report.custody_chain) {
    lines.push('');
    lines.push(
      `CUSTODY: ok=${report.custody_chain.ok} count=${report.custody_chain.verify?.count} seals=${report.custody_chain.seal_count}`
    );
  }
  if (report.hud_fragment) {
    lines.push(
      `HUD: tip_match=${report.hud_fragment.tip?.match} PRODUCTION_READY=${report.hud_fragment.PRODUCTION_READY}`
    );
  }
  return lines.join('\n');
}
