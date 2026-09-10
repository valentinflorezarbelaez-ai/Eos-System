/**
 * @module mission-os-evd-observe-pack
 * Ladder 8 T4 / K5 — local CI-safe Mission OS + EVD observe ritual.
 *
 * Exercises (N=1 fixture):
 *   1) mission-os-coherence assertCoherenceMapComplete
 *   2) sealEvd SSOT write + EvidenceCustody under sandbox
 *   3) HUD freeze tip ALIGNED (MATCH) against fixture liveHead
 *   4) seals an EVD evidence record documenting the observe run
 *
 * NON-CLAIM: observe pack ≠ production soak; long-run ≠ soak-prod;
 * tip MATCH is informational; PRODUCTION_READY remains NO.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertCoherenceMapComplete, getMissionOsCoherenceMap } from './mission-os-coherence.js';
import { observeFreezeTipVsHead } from './operator-hud.js';
import { EvidenceCustody } from '../sdd/evidence-custody.js';
import { sealEvd } from '../sdd/evd-seal-path.js';

export const OBSERVE_PACK_SCHEMA = 'eos.mission-os-evd-observe-pack.v1';
export const OBSERVE_PACK_ID = 'MISSION_OS_EVD_OBSERVE_PACK';

export const OBSERVE_PACK_NON_CLAIMS = Object.freeze([
  'Observe pack is NOT a production soak (local CI-safe N=1 fixture only)',
  'long-run / GameDay ≠ soak-prod; tip ALIGNED is informational OBSERVED',
  'PRODUCTION_READY remains NO; Fundacion Delta=0; no silent MCP prune',
  'Coherence + sealEvd exercise ≠ verify:strict full audit surface'
]);

export const OBSERVE_PACK_REQUIRED_PATHS = Object.freeze([
  'src/core/observability/mission-os-evd-observe-pack.js',
  'scripts/ci/mission-os-evd-observe-pack.js',
  'tests/eos-t4-mission-os-evd-observe-pack.test.js',
  'docs/releases/EOS_T4_MISSION_OS_EVD_OBSERVE_PACK_2026-09-09.md'
]);

const FIXTURE_TIP = '428106f77bda2c4e893af69a9ae1ede757bb8e84';

/**
 * Build a minimal workspace where freeze main_tip matches liveHead (ALIGNED).
 * @param {object} [options]
 * @param {string} [options.tip]
 * @returns {{ sandboxRoot: string, tip: string }}
 */
export function createAlignedObserveFixture(options = {}) {
  const tip = options.tip || FIXTURE_TIP;
  const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-t4-observe-'));
  const freezeDir = path.join(sandboxRoot, 'docs', 'releases');
  fs.mkdirSync(freezeDir, { recursive: true });
  fs.mkdirSync(path.join(sandboxRoot, 'docs', 'evidence'), { recursive: true });
  fs.mkdirSync(path.join(sandboxRoot, '.eos', 'custody'), { recursive: true });
  fs.writeFileSync(
    path.join(freezeDir, 'EOS_FREEZE_GATE_STATUS.md'),
    [
      '# Freeze gate status — OBSERVE FIXTURE',
      '',
      '```text',
      `main_tip: ${tip}`,
      'dictamen: COMPLETE_FOR_LOCAL_GOVERNED_USE',
      'PRODUCTION_READY: NO',
      '```',
      ''
    ].join('\n'),
    'utf8'
  );
  return { sandboxRoot, tip };
}

/**
 * Run the CI-safe Mission OS / EVD observe pack.
 * Default: ephemeral sandbox with tip ALIGNED; cleans unless keepSandbox.
 *
 * @param {object} [options]
 * @param {string} [options.sandboxRoot] - reuse existing sandbox
 * @param {string} [options.tip]
 * @param {boolean} [options.keepSandbox=false]
 * @param {boolean} [options.requireAligned=true]
 * @param {string} [options.liveHead] - override tip observe live head
 * @returns {object} observe report
 */
export function runMissionOsEvdObservePack(options = {}) {
  const requireAligned = options.requireAligned !== false;
  const keepSandbox = options.keepSandbox === true;
  let ownedSandbox = false;
  let sandboxRoot = options.sandboxRoot || null;
  let tip = options.tip || FIXTURE_TIP;

  if (!sandboxRoot) {
    const fixture = createAlignedObserveFixture({ tip });
    sandboxRoot = fixture.sandboxRoot;
    tip = fixture.tip;
    ownedSandbox = true;
  }

  const startedAt = new Date().toISOString();
  const checks = [];
  const failures = [];

  // 1) Coherence map
  let coherence = null;
  try {
    coherence = assertCoherenceMapComplete();
    const map = getMissionOsCoherenceMap();
    checks.push({
      id: 'COHERENCE',
      ok: coherence.ok === true,
      detail: `mission_loop_mapped=${coherence.mission_loop_mapped}; ats_documented=${coherence.ats_documented}; schema=${map.schema}`
    });
  } catch (err) {
    checks.push({ id: 'COHERENCE', ok: false, detail: err.message });
    failures.push('COHERENCE');
  }

  // 2) Tip ALIGNED via HUD observeFreezeTipVsHead
  const liveHead = options.liveHead || tip;
  let freezeTip = null;
  try {
    freezeTip = observeFreezeTipVsHead(sandboxRoot, { liveHead });
    const aligned = freezeTip.match === true;
    checks.push({
      id: 'TIP_ALIGNED',
      ok: requireAligned ? aligned : true,
      detail: `match=${freezeTip.match}; freeze=${freezeTip.freeze_main_tip}; live=${freezeTip.live_head}; epistemic=${freezeTip.epistemic}`
    });
    if (requireAligned && !aligned) failures.push('TIP_ALIGNED');
  } catch (err) {
    checks.push({ id: 'TIP_ALIGNED', ok: false, detail: err.message });
    failures.push('TIP_ALIGNED');
  }

  // 3) sealEvd + custody under sandbox
  const evidenceDir = path.join(sandboxRoot, 'docs', 'evidence');
  const custodyDir = path.join(sandboxRoot, '.eos', 'custody');
  let sealed = null;
  try {
    const custody = new EvidenceCustody({
      controlPlaneRoot: sandboxRoot,
      baseDir: custodyDir,
      enabled: true
    });
    const evdId = `EVD-T4-OBSERVE-${Date.now()}`;
    sealed = sealEvd({
      controlPlaneRoot: sandboxRoot,
      evidenceDir,
      custody,
      record: {
        id: evdId,
        status: 'OBSERVED',
        related_spec: 'openspec/changes/eos-t4-mission-os-evd-observe-pack/proposal.md',
        related_project: 'eos-t4-mission-os-evd-observe-pack',
        observe_pack: OBSERVE_PACK_SCHEMA,
        PRODUCTION_READY: 'NO',
        non_claims: [...OBSERVE_PACK_NON_CLAIMS],
        coherence_ok: coherence?.ok === true,
        tip_aligned: freezeTip?.match === true,
        started_at: startedAt
      }
    });
    const custodyOk = Boolean(sealed.custody_event) && fs.existsSync(sealed.path);
    checks.push({
      id: 'SEAL_EVD',
      ok: custodyOk,
      detail: `evidence_id=${sealed.evidence_id}; path=${sealed.path}; custody=${Boolean(sealed.custody_event)}`
    });
    if (!custodyOk) failures.push('SEAL_EVD');
  } catch (err) {
    checks.push({ id: 'SEAL_EVD', ok: false, detail: err.message });
    failures.push('SEAL_EVD');
  }

  const ok = failures.length === 0;
  const finishedAt = new Date().toISOString();
  const report = {
    schema: OBSERVE_PACK_SCHEMA,
    id: OBSERVE_PACK_ID,
    ok,
    PRODUCTION_READY: 'NO',
    soak_claim: false,
    epistemic: 'OBSERVED',
    started_at: startedAt,
    finished_at: finishedAt,
    sandbox_root: sandboxRoot,
    checks,
    failures,
    coherence,
    freeze_tip: freezeTip,
    sealed_evidence: sealed
      ? {
          evidence_id: sealed.evidence_id,
          path: sealed.path,
          custody_event_type: sealed.custody_event?.event_type || null
        }
      : null,
    non_claims: [...OBSERVE_PACK_NON_CLAIMS]
  };

  if (ownedSandbox && !keepSandbox) {
    try {
      fs.rmSync(sandboxRoot, { recursive: true, force: true });
      report.sandbox_root = '(cleaned)';
    } catch {
      // leave path if cleanup fails; report still valid
    }
  }

  return report;
}

/**
 * Format a human-readable observe report.
 * @param {object} report
 * @returns {string}
 */
export function formatObservePackReport(report) {
  const lines = [
    'EOS T4 MISSION OS / EVD OBSERVE PACK',
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
  if (report.sealed_evidence) {
    lines.push('');
    lines.push(
      `EVD: ${report.sealed_evidence.evidence_id} custody=${report.sealed_evidence.custody_event_type || 'none'}`
    );
  }
  return lines.join('\n');
}