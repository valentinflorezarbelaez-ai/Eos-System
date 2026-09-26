/**
 * @module ladder38-seam-port
 * SPEC-0160 / Mission EX — Ladder 38 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports ET/EU/EV/EW when present; soft-fail safe; observed true|false.
 * Seals EX-RCPT-*. Does NOT tip-seal L38 CLOSED. Soft-observe pin: b09467a2.
 * PRODUCTION_READY: NO · L38 remains OPEN until tip-seal (NOT this package).
 * Distinct from ES L37 seam / EN L36 / EI L35 / AU secrets runtime.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EX_PRODUCTION_READY,
  sha256Canonical,
  buildLadder38SeamReceipt,
  verifyLadder38SeamReceipt,
  EX_FREEZE_PIN_SHORT
} from './ladder38-seam-receipt.js';

import { Ladder38SeamPolicyGate, EX_CODES } from './ladder38-seam-policy-gate.js';

/** @type {'NO'} */
export const EX_PORT_PRODUCTION_READY = 'NO';
export const EX_PORT_KIND = 'eos-ladder38-seam-port';

export const EX_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L37_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L38_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_EX_MERGE',
  'A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM',
  'A12_REFUSE_SCHEMA_JSON_ADD',
  'A13_REFUSE_GHA_GREEN_CLAIM'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function candidateUrls(fileName, siblingDirs) {
  const urls = [];
  const local = path.join(__dirname, fileName);

  // ⚡ Bolt: Performance optimization
  // Generating candidate URLs blindly instead of using synchronous fs.existsSync.
  // This unblocks the Node.js event loop by eliminating synchronous I/O,
  // relies on async import() error handling, and avoids a TOCTOU race condition.
  urls.push(pathToFileURL(local).href);
  for (const dir of siblingDirs) {
    const p = path.join(dir, fileName);
    urls.push(pathToFileURL(p).href);
  }
  return urls;
}

function siblingRoots() {
  const boxRoot = path.resolve(__dirname, '../../../..');
  const roots = [
    path.join(boxRoot, 'eos-mission-et', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-eu', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ev', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ew', 'src', 'core', 'composition'),
    '/workspace/eos-mission-et/src/core/composition',
    '/workspace/eos-mission-eu/src/core/composition',
    '/workspace/eos-mission-ev/src/core/composition',
    '/workspace/eos-mission-ew/src/core/composition'
  ];
  const hostComp = process.env.EOS_HOST_COMPOSITION;
  if (hostComp) roots.push(hostComp);
  return roots;
}

export async function softImportModule(fileName) {
  const urls = candidateUrls(fileName, siblingRoots());
  for (const url of urls) {
    try {
      const mod = await import(url);
      return { observed: true, mod };
    } catch {
      // try next
    }
  }
  return { observed: false };
}

export async function softObserveEtCredentialHandleRegistry() {
  const r = await softImportModule('credential-handle-registry-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('credential-handle-registry-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.CredentialHandleRegistryPort,
    PRODUCTION_READY: r.mod.ET_PORT_PRODUCTION_READY,
    KIND: r.mod.ET_PORT_KIND,
    CODES: gate.mod?.ET_CODES
  };
}

export async function softObserveEuSecretZeroLeakDeny() {
  const r = await softImportModule('secret-zero-leak-deny-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('secret-zero-leak-deny-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.SecretZeroLeakDenyPort,
    PRODUCTION_READY: r.mod.EU_PORT_PRODUCTION_READY,
    KIND: r.mod.EU_PORT_KIND,
    CODES: gate.mod?.EU_CODES
  };
}

export async function softObserveEvCredentialHandleLifecycle() {
  const r = await softImportModule('credential-handle-lifecycle-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('credential-handle-lifecycle-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.CredentialHandleLifecyclePort,
    PRODUCTION_READY: r.mod.EV_PORT_PRODUCTION_READY,
    KIND: r.mod.EV_PORT_KIND,
    CODES: gate.mod?.EV_CODES
  };
}

export async function softObserveEwCredentialHonestyAttestation() {
  const r = await softImportModule('credential-honesty-attestation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('credential-honesty-attestation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.CredentialHonestyAttestationPort,
    PRODUCTION_READY: r.mod.EW_PORT_PRODUCTION_READY,
    KIND: r.mod.EW_PORT_KIND,
    CODES: gate.mod?.EW_CODES
  };
}

function mockBinding(overrides = {}) {
  return {
    handleId: 'hdl-opaque-ex-et-001',
    handleClass: 'credential-handle',
    bindingClass: 'credential-handle',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

function mockClaim(overrides = {}) {
  return {
    subjectKind: 'RECEIPT',
    desiredAction: 'DENY_LEAK',
    leakClass: 'CONFIRMED',
    observedScan: { leakDetected: true },
    authorized: true,
    ...overrides
  };
}

function mockLifecycle(overrides = {}) {
  return {
    handleId: 'hdl-opaque-ex-ev-001',
    handleClass: 'credential-handle',
    desiredStage: 'STAGED_ROTATE',
    observedLifecycle: 'STAGED_ROTATE',
    authorized: true,
    ...overrides
  };
}

function mockAttestation(overrides = {}) {
  return {
    handleId: 'hdl-opaque-ex-ew-001',
    handleClass: 'credential-handle',
    subjectKind: 'CREDENTIAL_HANDLE',
    attestationStage: 'BINDING_MATCH',
    bindingMatch: true,
    digestConsistent: true,
    honestyClaims: {
      softObserveFreeze: true,
      noLiveSecretStore: true,
      productionReadyNo: true,
      schemasAtCeiling: true,
      secretZeroHeld: true
    },
    observedClaim: {
      claimKind: 'CREDENTIAL_HANDLE',
      claimValue: 'BOUND'
    },
    authorized: true,
    ...overrides
  };
}

export class Ladder38SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder38SeamPolicyGate();
    this.trail = [];
    this.productionReady = EX_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const et = await softObserveEtCredentialHandleRegistry();
    const eu = await softObserveEuSecretZeroLeakDeny();
    const ev = await softObserveEvCredentialHandleLifecycle();
    const ew = await softObserveEwCredentialHonestyAttestation();
    return { et, eu, ev, ew };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const binding = input.binding || mockBinding();
    const claim = input.claim || mockClaim();
    const lifecycle = input.lifecycle || mockLifecycle();
    const attestation = input.attestation || mockAttestation();

    if (sats.et.observed && sats.et.Port) {
      const et = await new sats.et.Port().govern({
        planId: input.planId || 'plan-l38-ex-et',
        changeId: 'eos-ladder-38-mission-et',
        ritualMode: 'ACTIVE',
        binding
      });
      if (et.ok && et.receipt?.receiptId) {
        prefixes.push(et.receipt.receiptId.slice(0, 8));
        satelliteReceipts.et = et.receipt.receiptId;
      }
    }

    if (sats.eu.observed && sats.eu.Port) {
      const eu = await new sats.eu.Port().govern({
        planId: input.planId || 'plan-l38-ex-eu',
        changeId: 'eos-ladder-38-mission-eu',
        ritualMode: 'ACTIVE',
        claim
      });
      if (eu.ok && eu.receipt?.receiptId) {
        prefixes.push(eu.receipt.receiptId.slice(0, 8));
        satelliteReceipts.eu = eu.receipt.receiptId;
      }
    }

    if (sats.ev.observed && sats.ev.Port) {
      const ev = await new sats.ev.Port().govern({
        planId: input.planId || 'plan-l38-ex-ev',
        changeId: 'eos-ladder-38-mission-ev',
        ritualMode: 'ACTIVE',
        lifecycle
      });
      if (ev.ok && ev.receipt?.receiptId) {
        prefixes.push(ev.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ev = ev.receipt.receiptId;
      }
    }

    if (sats.ew.observed && sats.ew.Port) {
      const ew = await new sats.ew.Port().govern({
        planId: input.planId || 'plan-l38-ex-ew',
        changeId: 'eos-ladder-38-mission-ew',
        ritualMode: 'ACTIVE',
        attestation
      });
      if (ew.ok && ew.receipt?.receiptId) {
        prefixes.push(ew.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ew = ew.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      etObserved: !!sats.et.observed,
      euObserved: !!sats.eu.observed,
      evObserved: !!sats.ev.observed,
      ewObserved: !!sats.ew.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder38SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-38-mission-ex',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        operation: 'SEAM_DENY',
        seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true })),
        chainObserve: { ...chainObserveBase, prefixes: [] },
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(deniedReceipt);
      return { ok:false, decision:'DENY', code:gateRes.code, reason:gateRes.reason, receipt:deniedReceipt, satellites:chainObserveBase };
    }

    if (input.ritualMode === 'HOLD' || gateRes.decision === 'HOLD') {
      const holdReceipt = buildLadder38SeamReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        operation: 'SEAM_HOLD',
        seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        chainObserve: { ...chainObserveBase, prefixes: [] },
        prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
      });
      this.trail.push(holdReceipt);
      return { ok:true, decision:'HOLD', code:EX_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder38SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER38_SEAM_PACK_CLOSEOUT',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: EX_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: EX_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder38SeamReceipt(passReceipt)
    };
  }
}

export { verifyLadder38SeamReceipt, EX_CODES, EX_FREEZE_PIN_SHORT };