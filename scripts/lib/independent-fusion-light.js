/**
 * @module independent-fusion-light
 * N5 — Independent verifier fusion-light pack (Ladder 3 H5).
 * Q3 — Optional Ladder4 observe subset: hooks-install / mcp-catalog / mission-local.
 * R3 — Optional Ladder5 observe subset: mission-artifact-write / p6-inventory-lock.
 * T3 — Optional Ladder7 observe subset: context-pack / loop-engineering / worktree / SpecBoot-AGY / KEEP / model-routing-ratchet.
 * U3 — Optional T4–T8 observe subset: mission-os-evd / keep-po-prune-hold / complexity-ceiling-hold / agy-workstation / dirty-defer-triage.
 *
 * Fail-closed path existence + light import/API smoke for EvidenceCustody,
 * EngramContract, fusion-cp-lock, evd-seal-path, Q3 L4, R3 L5, T3 L7, and U3 T4–T8 observe modules.
 * Reuses POST_FUSION_CRITICAL_PATHS ids from operator-doctor.
 *
 * This is NOT verify:strict, NOT full GameDay soak, NOT production certification.
 * Light checks do NOT run full hooks-install / mcp-catalog / mission-local /
 * mission-artifact-write / p6-inventory-lock / context-pack / loop-engineering / worktree / SpecBoot / KEEP / model-routing-ratchet / mission-os-evd / keep-po-prune-hold / complexity-ceiling-hold / agy-workstation / dirty-defer-triage audit bodies (those remain verify:strict).
 * PRODUCTION_READY: NO
 */
import fs from 'node:fs';
import path from 'node:path';

import { POST_FUSION_CRITICAL_PATHS } from '../../src/core/runtime/operator-doctor.js';
import {
  EvidenceCustody,
  CUSTODY_CHAIN_ID,
  CUSTODY_EVENT_TYPES
} from '../../src/core/sdd/evidence-custody.js';
import {
  ENGRAM_SCHEMA_ID,
  ENGRAM_RELATIVE_STORAGE,
  verifyEngramContract,
  assertEngramPath
} from '../../src/core/memory/engram-contract.js';
import {
  auditFusionControlPlane,
  FUSION_CP_REQUIRED_PATHS
} from './fusion-cp-lock.js';
import {
  sealEvd,
  CANONICAL_EVD_SEAL_MODULE,
  auditCanonicalEvdWritePaths,
  auditMissionLocalEvdWritePaths
} from '../../src/core/sdd/evd-seal-path.js';
import {
  auditHooksInstallSurface,
  HOOKS_INSTALL_REQUIRED_PATHS
} from './hooks-install-smoke.js';
import {
  auditMcpCatalogLock,
  MCP_CATALOG_REQUIRED_PATHS
} from './mcp-catalog-lock.js';
import {
  auditMissionArtifactWritePaths,
  writeMissionArtifactFile
} from '../../src/core/runtime/mission-artifact-write.js';
import {
  auditP6InventoryLock,
  P6_INVENTORY_REQUIRED_PATHS
} from './p6-inventory-lock.js';
import {
  auditContextPackLock,
  CONTEXT_PACK_REQUIRED_PATHS
} from './context-pack-lock.js';
import {
  auditLoopEngineeringLock,
  LOOP_ENGINEERING_REQUIRED_PATHS
} from './loop-engineering-lock.js';
import {
  auditWorktreePolicyLock,
  WORKTREE_POLICY_REQUIRED_PATHS
} from './worktree-policy-lock.js';
import {
  auditSpecbootCycleLock,
  SPECBOOT_CYCLE_REQUIRED_PATHS
} from './specboot-cycle-lock.js';
import {
  auditMcpToolKeepLock,
  MCP_TOOL_KEEP_REQUIRED_PATHS
} from './mcp-tool-keep-lock.js';
import {
  auditModelRoutingRatchetLock,
  MODEL_ROUTING_RATCHET_REQUIRED_PATHS
} from './model-routing-ratchet-lock.js';
import {
  runMissionOsEvdObservePack,
  OBSERVE_PACK_REQUIRED_PATHS
} from '../../src/core/observability/mission-os-evd-observe-pack.js';
import {
  auditKeepPoPruneHoldLock,
  KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS
} from './keep-po-prune-hold-lock.js';
import {
  auditComplexityCeilingHoldLock,
  COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS
} from './complexity-ceiling-hold-lock.js';
import {
  auditAgyWorkstationLock,
  AGY_WORKSTATION_REQUIRED_PATHS
} from './agy-workstation-lock.js';
import {
  auditDirtyDeferTriageLock,
  DIRTY_DEFER_TRIAGE_REQUIRED_PATHS
} from './dirty-defer-triage-lock.js';

/** Subset of doctor post-fusion paths covered by independent fusion-light. */
export const FUSION_LIGHT_PATH_IDS = Object.freeze([
  'FUSION_CP',
  'CUSTODY',
  'ENGRAM',
  'EVD_SEAL',
  'HOOKS_INSTALL',
  'MCP_CATALOG',
  'MISSION_LOCAL_EVD',
  'MISSION_ARTIFACT_WRITE',
  'P6_INVENTORY_LOCK',
  'CONTEXT_PACK',
  'LOOP_ENGINEERING',
  'WORKTREE_POLICY',
  'SPECBOOT_CYCLE',
  'MCP_TOOL_KEEP',
  'MODEL_ROUTING_RATCHET',
  'MISSION_OS_EVD',
  'KEEP_PO_PRUNE_HOLD',
  'COMPLEXITY_CEILING_HOLD',
  'AGY_WORKSTATION',
  'DIRTY_DEFER_TRIAGE'
]);

export const FUSION_LIGHT_REQUIRED_PATHS = Object.freeze(
  POST_FUSION_CRITICAL_PATHS.filter((p) => FUSION_LIGHT_PATH_IDS.includes(p.id)).map((p) => p.rel)
);

/**
 * Explicit NON-CLAIM residual: what fusion-light deliberately does not certify.
 * Docs and harness output must match this list.
 */
export const FUSION_LIGHT_NON_CLAIMS = Object.freeze([
  'NOT verify:strict full REQUIRED_PATHS / governance suite',
  'NOT full fusion-cp GameDay soak or long-run adversarial campaign',
  'NOT production readiness / EXTERNAL EMPIRICALLY_VALIDATED (I4)',
  'NOT App Fuerza delivery certification',
  'NOT Fundacion mutation authorization (Fundacion Delta=0 retained)',
  'NOT GitHub branch-protection enforcement (local surrogate only)',
  'NOT replacement of ROI4 custody:verify / ROI6 engram:verify deep suites',
  'NOT full hooks-install smoke / mcp-catalog reconcile / mission-local EVD audit bodies (Q3 observe = path + light export only; verify:strict owns those audits)',
  'NOT full mission-artifact-write / p6-inventory-lock audit bodies (R3 observe = path + light export only; verify:strict owns those audits)',
  'NOT full context-pack / loop-engineering / worktree-policy / SpecBoot-AGY / mcp-tool-keep / model-routing-ratchet audit bodies (T3 observe = path + light export only; verify:strict owns those audits)',
  'NOT full mission-os-evd / keep-po-prune-hold / complexity-ceiling-hold / agy-workstation / dirty-defer-triage audit bodies (U3 observe = path + light export only; verify:strict owns those audits)'
]);

/**
 * @param {string} rootDir control-plane root (EOS repo)
 * @returns {{ ok: boolean, enabled: true, mode: string, checks: object[], failures: object[], nonClaims: string[], requiredPaths: string[] }}
 */
export function auditFusionLight(rootDir) {
  const checks = [];
  const failures = [];
  const root = path.resolve(rootDir || process.cwd());

  for (const rel of FUSION_LIGHT_REQUIRED_PATHS) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      failures.push({
        path: rel,
        message: 'Fusion-light required path missing',
        type: 'fusion-light-path'
      });
    } else {
      checks.push({
        path: rel,
        status: 'VERIFIED',
        type: 'fusion-light-path'
      });
    }
  }

  if (failures.length > 0) {
    return {
      ok: false,
      enabled: true,
      mode: 'fusion-light',
      checks,
      failures,
      nonClaims: [...FUSION_LIGHT_NON_CLAIMS],
      requiredPaths: [...FUSION_LIGHT_REQUIRED_PATHS]
    };
  }

  try {
    if (typeof EvidenceCustody !== 'function') {
      throw new Error('EvidenceCustody export missing');
    }
    if (CUSTODY_CHAIN_ID !== 'CP-EVIDENCE') {
      throw new Error('CUSTODY_CHAIN_ID drift');
    }
    if (!CUSTODY_EVENT_TYPES || typeof CUSTODY_EVENT_TYPES !== 'object') {
      throw new Error('CUSTODY_EVENT_TYPES missing');
    }
    checks.push({
      path: 'EvidenceCustody (class + CP-EVIDENCE + event types)',
      status: 'VERIFIED',
      type: 'fusion-light-custody'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/sdd/evidence-custody.js',
      message: 'EvidenceCustody light import failed: ' + err.message,
      type: 'fusion-light-custody'
    });
  }

  try {
    if (!ENGRAM_SCHEMA_ID || typeof ENGRAM_SCHEMA_ID !== 'string') {
      throw new Error('ENGRAM_SCHEMA_ID missing');
    }
    if (typeof verifyEngramContract !== 'function' || typeof assertEngramPath !== 'function') {
      throw new Error('EngramContract API surface incomplete');
    }
    const storageNorm = String(ENGRAM_RELATIVE_STORAGE).replace(/\\/g, '/');
    if (!storageNorm.includes('.eos/engram')) {
      throw new Error('ENGRAM_RELATIVE_STORAGE drift');
    }
    checks.push({
      path: 'EngramContract (schema=' + ENGRAM_SCHEMA_ID + ' + verify/assert)',
      status: 'VERIFIED',
      type: 'fusion-light-engram'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/memory/engram-contract.js',
      message: 'EngramContract light import failed: ' + err.message,
      type: 'fusion-light-engram'
    });
  }

  try {
    if (typeof auditFusionControlPlane !== 'function') {
      throw new Error('auditFusionControlPlane missing');
    }
    if (!Array.isArray(FUSION_CP_REQUIRED_PATHS) || FUSION_CP_REQUIRED_PATHS.length < 8) {
      throw new Error('FUSION_CP_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'fusion-cp-lock (auditFusionControlPlane + REQUIRED_PATHS n=' + FUSION_CP_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-fusion-cp'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/fusion-cp-lock.js',
      message: 'fusion-cp-lock light import failed: ' + err.message,
      type: 'fusion-light-fusion-cp'
    });
  }

  try {
    if (typeof sealEvd !== 'function' || typeof auditCanonicalEvdWritePaths !== 'function') {
      throw new Error('evd-seal-path API surface incomplete');
    }
    if (CANONICAL_EVD_SEAL_MODULE !== 'src/core/sdd/evd-seal-path.js') {
      throw new Error('CANONICAL_EVD_SEAL_MODULE drift');
    }
    checks.push({
      path: 'evd-seal-path (sealEvd + audit + canonical module)',
      status: 'VERIFIED',
      type: 'fusion-light-evd-seal'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/sdd/evd-seal-path.js',
      message: 'evd-seal-path light import failed: ' + err.message,
      type: 'fusion-light-evd-seal'
    });
  }

  // Q3 Ladder4 observe (light export only; do NOT invoke full audit bodies)
  try {
    if (typeof auditHooksInstallSurface !== 'function') {
      throw new Error('auditHooksInstallSurface export missing');
    }
    if (!Array.isArray(HOOKS_INSTALL_REQUIRED_PATHS) || HOOKS_INSTALL_REQUIRED_PATHS.length < 4) {
      throw new Error('HOOKS_INSTALL_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'hooks-install-smoke (auditHooksInstallSurface export + REQUIRED_PATHS n=' + HOOKS_INSTALL_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-hooks-install'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/hooks-install-smoke.js',
      message: 'hooks-install-smoke light import failed: ' + err.message,
      type: 'fusion-light-hooks-install'
    });
  }

  try {
    if (typeof auditMcpCatalogLock !== 'function') {
      throw new Error('auditMcpCatalogLock export missing');
    }
    if (!Array.isArray(MCP_CATALOG_REQUIRED_PATHS) || MCP_CATALOG_REQUIRED_PATHS.length < 3) {
      throw new Error('MCP_CATALOG_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'mcp-catalog-lock (auditMcpCatalogLock export + REQUIRED_PATHS n=' + MCP_CATALOG_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-mcp-catalog'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/mcp-catalog-lock.js',
      message: 'mcp-catalog-lock light import failed: ' + err.message,
      type: 'fusion-light-mcp-catalog'
    });
  }

  try {
    if (typeof auditMissionLocalEvdWritePaths !== 'function') {
      throw new Error('auditMissionLocalEvdWritePaths export missing');
    }
    checks.push({
      path: 'mission-local EVD (auditMissionLocalEvdWritePaths export; body owned by verify:strict)',
      status: 'VERIFIED',
      type: 'fusion-light-mission-local'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/sdd/evd-seal-path.js#auditMissionLocalEvdWritePaths',
      message: 'mission-local EVD light import failed: ' + err.message,
      type: 'fusion-light-mission-local'
    });
  }

  // R3 Ladder5 observe (light export only; do NOT invoke full audit bodies)
  try {
    if (typeof auditMissionArtifactWritePaths !== 'function') {
      throw new Error('auditMissionArtifactWritePaths export missing');
    }
    if (typeof writeMissionArtifactFile !== 'function') {
      throw new Error('writeMissionArtifactFile export missing');
    }
    checks.push({
      path: 'mission-artifact-write (auditMissionArtifactWritePaths + writeMissionArtifactFile exports; body owned by verify:strict)',
      status: 'VERIFIED',
      type: 'fusion-light-mission-artifact'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/runtime/mission-artifact-write.js',
      message: 'mission-artifact-write light import failed: ' + err.message,
      type: 'fusion-light-mission-artifact'
    });
  }

  try {
    if (typeof auditP6InventoryLock !== 'function') {
      throw new Error('auditP6InventoryLock export missing');
    }
    if (!Array.isArray(P6_INVENTORY_REQUIRED_PATHS) || P6_INVENTORY_REQUIRED_PATHS.length < 3) {
      throw new Error('P6_INVENTORY_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'p6-inventory-lock (auditP6InventoryLock export + REQUIRED_PATHS n=' + P6_INVENTORY_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-p6-inventory'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/p6-inventory-lock.js',
      message: 'p6-inventory-lock light import failed: ' + err.message,
      type: 'fusion-light-p6-inventory'
    });
  }

  // T3 Ladder7 observe (light export only; do NOT invoke full audit bodies)
  try {
    if (typeof auditContextPackLock !== 'function') {
      throw new Error('auditContextPackLock export missing');
    }
    if (!Array.isArray(CONTEXT_PACK_REQUIRED_PATHS) || CONTEXT_PACK_REQUIRED_PATHS.length < 2) {
      throw new Error('CONTEXT_PACK_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'context-pack-lock (auditContextPackLock export + REQUIRED_PATHS n=' + CONTEXT_PACK_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-context-pack'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/context-pack-lock.js',
      message: 'context-pack-lock light import failed: ' + err.message,
      type: 'fusion-light-context-pack'
    });
  }

  try {
    if (typeof auditLoopEngineeringLock !== 'function') {
      throw new Error('auditLoopEngineeringLock export missing');
    }
    if (!Array.isArray(LOOP_ENGINEERING_REQUIRED_PATHS) || LOOP_ENGINEERING_REQUIRED_PATHS.length < 2) {
      throw new Error('LOOP_ENGINEERING_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'loop-engineering-lock (auditLoopEngineeringLock export + REQUIRED_PATHS n=' + LOOP_ENGINEERING_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-loop-engineering'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/loop-engineering-lock.js',
      message: 'loop-engineering-lock light import failed: ' + err.message,
      type: 'fusion-light-loop-engineering'
    });
  }

  try {
    if (typeof auditWorktreePolicyLock !== 'function') {
      throw new Error('auditWorktreePolicyLock export missing');
    }
    if (!Array.isArray(WORKTREE_POLICY_REQUIRED_PATHS) || WORKTREE_POLICY_REQUIRED_PATHS.length < 2) {
      throw new Error('WORKTREE_POLICY_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'worktree-policy-lock (auditWorktreePolicyLock export + REQUIRED_PATHS n=' + WORKTREE_POLICY_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-worktree-policy'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/worktree-policy-lock.js',
      message: 'worktree-policy-lock light import failed: ' + err.message,
      type: 'fusion-light-worktree-policy'
    });
  }

  try {
    if (typeof auditSpecbootCycleLock !== 'function') {
      throw new Error('auditSpecbootCycleLock export missing');
    }
    if (!Array.isArray(SPECBOOT_CYCLE_REQUIRED_PATHS) || SPECBOOT_CYCLE_REQUIRED_PATHS.length < 2) {
      throw new Error('SPECBOOT_CYCLE_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'specboot-cycle-lock (auditSpecbootCycleLock export + REQUIRED_PATHS n=' + SPECBOOT_CYCLE_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-specboot-cycle'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/specboot-cycle-lock.js',
      message: 'specboot-cycle-lock light import failed: ' + err.message,
      type: 'fusion-light-specboot-cycle'
    });
  }

  try {
    if (typeof auditMcpToolKeepLock !== 'function') {
      throw new Error('auditMcpToolKeepLock export missing');
    }
    if (!Array.isArray(MCP_TOOL_KEEP_REQUIRED_PATHS) || MCP_TOOL_KEEP_REQUIRED_PATHS.length < 2) {
      throw new Error('MCP_TOOL_KEEP_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'mcp-tool-keep-lock (auditMcpToolKeepLock export + REQUIRED_PATHS n=' + MCP_TOOL_KEEP_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-mcp-tool-keep'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/mcp-tool-keep-lock.js',
      message: 'mcp-tool-keep-lock light import failed: ' + err.message,
      type: 'fusion-light-mcp-tool-keep'
    });
  }

  try {
    if (typeof auditModelRoutingRatchetLock !== 'function') {
      throw new Error('auditModelRoutingRatchetLock export missing');
    }
    if (!Array.isArray(MODEL_ROUTING_RATCHET_REQUIRED_PATHS) || MODEL_ROUTING_RATCHET_REQUIRED_PATHS.length < 2) {
      throw new Error('MODEL_ROUTING_RATCHET_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'model-routing-ratchet-lock (auditModelRoutingRatchetLock export + REQUIRED_PATHS n=' + MODEL_ROUTING_RATCHET_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-model-routing-ratchet'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/model-routing-ratchet-lock.js',
      message: 'model-routing-ratchet-lock light import failed: ' + err.message,
      type: 'fusion-light-model-routing-ratchet'
    });
  }

  // U3 T4–T8 observe (light export only; do NOT invoke full audit bodies)
  try {
    if (typeof runMissionOsEvdObservePack !== 'function') {
      throw new Error('runMissionOsEvdObservePack export missing');
    }
    if (!Array.isArray(OBSERVE_PACK_REQUIRED_PATHS) || OBSERVE_PACK_REQUIRED_PATHS.length < 2) {
      throw new Error('OBSERVE_PACK_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'mission-os-evd-observe-pack (runMissionOsEvdObservePack export + REQUIRED_PATHS n=' + OBSERVE_PACK_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-mission-os-evd'
    });
  } catch (err) {
    failures.push({
      path: 'src/core/observability/mission-os-evd-observe-pack.js',
      message: 'mission-os-evd-observe-pack light import failed: ' + err.message,
      type: 'fusion-light-mission-os-evd'
    });
  }

  try {
    if (typeof auditKeepPoPruneHoldLock !== 'function') {
      throw new Error('auditKeepPoPruneHoldLock export missing');
    }
    if (!Array.isArray(KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS) || KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS.length < 2) {
      throw new Error('KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'keep-po-prune-hold-lock (auditKeepPoPruneHoldLock export + REQUIRED_PATHS n=' + KEEP_PO_PRUNE_HOLD_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-keep-po-prune-hold'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/keep-po-prune-hold-lock.js',
      message: 'keep-po-prune-hold-lock light import failed: ' + err.message,
      type: 'fusion-light-keep-po-prune-hold'
    });
  }

  try {
    if (typeof auditComplexityCeilingHoldLock !== 'function') {
      throw new Error('auditComplexityCeilingHoldLock export missing');
    }
    if (!Array.isArray(COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS) || COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS.length < 2) {
      throw new Error('COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'complexity-ceiling-hold-lock (auditComplexityCeilingHoldLock export + REQUIRED_PATHS n=' + COMPLEXITY_CEILING_HOLD_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-complexity-ceiling-hold'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/complexity-ceiling-hold-lock.js',
      message: 'complexity-ceiling-hold-lock light import failed: ' + err.message,
      type: 'fusion-light-complexity-ceiling-hold'
    });
  }

  try {
    if (typeof auditAgyWorkstationLock !== 'function') {
      throw new Error('auditAgyWorkstationLock export missing');
    }
    if (!Array.isArray(AGY_WORKSTATION_REQUIRED_PATHS) || AGY_WORKSTATION_REQUIRED_PATHS.length < 2) {
      throw new Error('AGY_WORKSTATION_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'agy-workstation-lock (auditAgyWorkstationLock export + REQUIRED_PATHS n=' + AGY_WORKSTATION_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-agy-workstation'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/agy-workstation-lock.js',
      message: 'agy-workstation-lock light import failed: ' + err.message,
      type: 'fusion-light-agy-workstation'
    });
  }

  try {
    if (typeof auditDirtyDeferTriageLock !== 'function') {
      throw new Error('auditDirtyDeferTriageLock export missing');
    }
    if (!Array.isArray(DIRTY_DEFER_TRIAGE_REQUIRED_PATHS) || DIRTY_DEFER_TRIAGE_REQUIRED_PATHS.length < 2) {
      throw new Error('DIRTY_DEFER_TRIAGE_REQUIRED_PATHS incomplete');
    }
    checks.push({
      path: 'dirty-defer-triage-lock (auditDirtyDeferTriageLock export + REQUIRED_PATHS n=' + DIRTY_DEFER_TRIAGE_REQUIRED_PATHS.length + ')',
      status: 'VERIFIED',
      type: 'fusion-light-dirty-defer-triage'
    });
  } catch (err) {
    failures.push({
      path: 'scripts/lib/dirty-defer-triage-lock.js',
      message: 'dirty-defer-triage-lock light import failed: ' + err.message,
      type: 'fusion-light-dirty-defer-triage'
    });
  }


  return {
    ok: failures.length === 0,
    enabled: true,
    mode: 'fusion-light',
    checks,
    failures,
    nonClaims: [...FUSION_LIGHT_NON_CLAIMS],
    requiredPaths: [...FUSION_LIGHT_REQUIRED_PATHS]
  };
}

/**
 * Disabled mode: explicit NON-CLAIM only (not preferred for CI).
 */
export function fusionLightDisabledReport() {
  return {
    ok: true,
    enabled: false,
    mode: 'fusion-light-disabled',
    checks: [],
    failures: [],
    nonClaims: [
      'FUSION-LIGHT DISABLED via --no-fusion-light: custody/engram/fusion-cp/evd-seal/hooks-install/mcp-catalog/mission-local/mission-artifact-write/p6-inventory-lock/context-pack/loop-engineering/worktree/SpecBoot/KEEP/model-routing-ratchet/mission-os-evd/keep-po/ceiling/agy-workstation/dirty-defer NOT independently light-checked',
      ...FUSION_LIGHT_NON_CLAIMS
    ],
    requiredPaths: [...FUSION_LIGHT_REQUIRED_PATHS]
  };
}

export default auditFusionLight;