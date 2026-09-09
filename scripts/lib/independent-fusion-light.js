/**
 * @module independent-fusion-light
 * N5 — Independent verifier fusion-light pack (Ladder 3 H5).
 *
 * Fail-closed path existence + light import/API smoke for EvidenceCustody,
 * EngramContract, fusion-cp-lock, and evd-seal-path. Reuses
 * POST_FUSION_CRITICAL_PATHS ids from operator-doctor.
 *
 * This is NOT verify:strict, NOT full GameDay soak, NOT production certification.
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
  auditCanonicalEvdWritePaths
} from '../../src/core/sdd/evd-seal-path.js';

/** Subset of doctor post-fusion paths covered by independent fusion-light. */
export const FUSION_LIGHT_PATH_IDS = Object.freeze([
  'FUSION_CP',
  'CUSTODY',
  'ENGRAM',
  'EVD_SEAL'
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
  'NOT replacement of ROI4 custody:verify / ROI6 engram:verify deep suites'
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
      'FUSION-LIGHT DISABLED via --no-fusion-light: custody/engram/fusion-cp/evd-seal NOT independently light-checked',
      ...FUSION_LIGHT_NON_CLAIMS
    ],
    requiredPaths: [...FUSION_LIGHT_REQUIRED_PATHS]
  };
}

export default auditFusionLight;