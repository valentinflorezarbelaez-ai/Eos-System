/**
 * @module ladder40-seam-port
 * SPEC-0170 / Mission FH — Ladder 40 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports FD/FE/FF/FG when present; soft-fail safe; observed true|false.
 * Seals FH-RCPT-*. Does NOT tip-seal L40 CLOSED. Soft-observe pin: 1376ac54.
 * PRODUCTION_READY: NO · L40 remains OPEN until tip-seal (NOT this package).
 * Distinct from FC L39 seam / EX L38 / ES L37 / EN L36 / EI L35 / AU secrets runtime.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  FH_PRODUCTION_READY,
  sha256Canonical,
  buildLadder40SeamReceipt,
  verifyLadder40SeamReceipt,
  FH_FREEZE_PIN_SHORT
} from './ladder40-seam-receipt.js';

import { Ladder40SeamPolicyGate, FH_CODES } from './ladder40-seam-policy-gate.js';

/** @type {'NO'} */
export const FH_PORT_PRODUCTION_READY = 'NO';
export const FH_PORT_KIND = 'eos-ladder40-seam-port';

export const FH_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L39_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L40_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_FH_MERGE',
  'A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM',
  'A12_REFUSE_SCHEMA_JSON_ADD',
  'A13_REFUSE_GHA_GREEN_CLAIM'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function candidateUrls(fileName, siblingDirs) {
  const urls = [];
  const local = path.join(__dirname, fileName);
  if (fs.existsSync(local)) urls.push(pathToFileURL(local).href);
  for (const dir of siblingDirs) {
    const p = path.join(dir, fileName);
    if (fs.existsSync(p)) urls.push(pathToFileURL(p).href);
  }
  return urls;
}

function siblingRoots() {
  const boxRoot = path.resolve(__dirname, '../../../..');
  const roots = [
    path.join(boxRoot, 'eos-mission-fd', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-fe', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ff', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-fg', 'src', 'core', 'composition'),
    '/workspace/eos-mission-fd/src/core/composition',
    '/workspace/eos-mission-fe/src/core/composition',
    '/workspace/eos-mission-ff/src/core/composition',
    '/workspace/eos-mission-fg/src/core/composition'
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

export async function softObserveFdOutboundDeliveryCallbackRegistry() {
  const r = await softImportModule('outbound-delivery-callback-registry-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('outbound-delivery-callback-registry-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.OutboundDeliveryCallbackRegistryPort,
    PRODUCTION_READY: r.mod.FD_PORT_PRODUCTION_READY,
    KIND: r.mod.FD_PORT_KIND,
    CODES: gate.mod?.FD_CODES
  };
}

export async function softObserveFeOutboundCallbackAuthenticity() {
  const r = await softImportModule('outbound-callback-authenticity-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('outbound-callback-authenticity-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.OutboundCallbackAuthenticityPort,
    PRODUCTION_READY: r.mod.FE_PORT_PRODUCTION_READY,
    KIND: r.mod.FE_PORT_KIND,
    CODES: gate.mod?.FE_CODES
  };
}

export async function softObserveFfOutboundDeliveryQuarantineRetryDeny() {
  const r = await softImportModule('outbound-delivery-quarantine-retry-deny-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('outbound-delivery-quarantine-retry-deny-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.OutboundDeliveryQuarantineRetryDenyPort,
    PRODUCTION_READY: r.mod.FF_PORT_PRODUCTION_READY,
    KIND: r.mod.FF_PORT_KIND,
    CODES: gate.mod?.FF_CODES
  };
}

export async function softObserveFgOutboundDeliveryHonestyAttestation() {
  const r = await softImportModule('outbound-delivery-honesty-attestation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('outbound-delivery-honesty-attestation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.OutboundDeliveryHonestyAttestationPort,
    PRODUCTION_READY: r.mod.FG_PORT_PRODUCTION_READY,
    KIND: r.mod.FG_PORT_KIND,
    CODES: gate.mod?.FG_CODES
  };
}

function mockBinding(overrides = {}) {
  return {
    targetId: 'tgt-opaque-fh-fd-001',
    deliveryId: 'dlv-opaque-fh-fd-001',
    targetClass: 'outbound-delivery-callback',
    bindingClass: 'outbound-delivery-callback',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

function mockSign(overrides = {}) {
  return {
    handleId: 'hdl-opaque-fh-fe-001',
    targetId: 'tgt-opaque-fh-fe-001',
    deliveryId: 'dlv-opaque-fh-fe-001',
    authenticityClass: 'outbound-callback-authenticity',
    signClass: 'outbound-callback-authenticity',
    desiredVerdict: 'SIGNED',
    observedVerdict: 'SIGNED',
    authorized: true,
    ...overrides
  };
}

function mockQuarantine(overrides = {}) {
  return {
    deliveryId: 'dlv-opaque-fh-ff-001',
    targetId: 'tgt-opaque-fh-ff-001',
    authenticityRef: 'auth-opaque-fh-fe-001',
    quarantineClass: 'outbound-delivery-quarantine',
    desiredStage: 'QUARANTINE',
    observedStage: 'QUARANTINE',
    authorized: true,
    ...overrides
  };
}

function mockAttestation(overrides = {}) {
  return {
    deliveryId: 'dlv-opaque-fh-fg-001',
    targetId: 'tgt-opaque-fh-fg-001',
    authenticityRef: 'aref-opaque-fh-fe-001',
    quarantineRef: 'qref-opaque-fh-ff-001',
    subjectKind: 'OUTBOUND_DELIVERY',
    attestationStage: 'BINDING_MATCH',
    bindingMatch: true,
    digestConsistent: true,
    honestyClaims: {
      softObserveFreeze: true,
      noLiveOutboundDeliveryMutation: true,
      productionReadyNo: true,
      schemasAtCeiling: true,
      secretZeroHeld: true
    },
    observedClaim: {
      claimKind: 'OUTBOUND_DELIVERY',
      claimValue: 'BOUND'
    },
    authorized: true,
    ...overrides
  };
}

export class Ladder40SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder40SeamPolicyGate();
    this.trail = [];
    this.productionReady = FH_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const fd = await softObserveFdOutboundDeliveryCallbackRegistry();
    const fe = await softObserveFeOutboundCallbackAuthenticity();
    const ff = await softObserveFfOutboundDeliveryQuarantineRetryDeny();
    const fg = await softObserveFgOutboundDeliveryHonestyAttestation();
    return { fd, fe, ff, fg };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const binding = input.binding || mockBinding();
    const sign = input.sign || mockSign();
    const quarantine = input.quarantine || mockQuarantine();
    const attestation = input.attestation || mockAttestation();

    if (sats.fd.observed && sats.fd.Port) {
      const fd = await new sats.fd.Port().govern({
        planId: input.planId || 'plan-l40-fh-fd',
        changeId: 'eos-ladder-40-mission-fd',
        ritualMode: 'ACTIVE',
        binding
      });
      if (fd.ok && fd.receipt?.receiptId) {
        prefixes.push(fd.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fd = fd.receipt.receiptId;
      }
    }

    if (sats.fe.observed && sats.fe.Port) {
      const fe = await new sats.fe.Port().govern({
        planId: input.planId || 'plan-l40-fh-fe',
        changeId: 'eos-ladder-40-mission-fe',
        ritualMode: 'ACTIVE',
        sign
      });
      if (fe.ok && fe.receipt?.receiptId) {
        prefixes.push(fe.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fe = fe.receipt.receiptId;
      }
    }

    if (sats.ff.observed && sats.ff.Port) {
      const ff = await new sats.ff.Port().govern({
        planId: input.planId || 'plan-l40-fh-ff',
        changeId: 'eos-ladder-40-mission-ff',
        ritualMode: 'ACTIVE',
        quarantine
      });
      if (ff.ok && ff.receipt?.receiptId) {
        prefixes.push(ff.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ff = ff.receipt.receiptId;
      }
    }

    if (sats.fg.observed && sats.fg.Port) {
      const fg = await new sats.fg.Port().govern({
        planId: input.planId || 'plan-l40-fh-fg',
        changeId: 'eos-ladder-40-mission-fg',
        ritualMode: 'ACTIVE',
        attestation
      });
      if (fg.ok && fg.receipt?.receiptId) {
        prefixes.push(fg.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fg = fg.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      fdObserved: !!sats.fd.observed,
      feObserved: !!sats.fe.observed,
      ffObserved: !!sats.ff.observed,
      fgObserved: !!sats.fg.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder40SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-40-mission-fh',
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
      const holdReceipt = buildLadder40SeamReceipt({
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
      return { ok:true, decision:'HOLD', code:FH_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder40SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER40_SEAM_PACK_CLOSEOUT',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: FH_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: FH_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder40SeamReceipt(passReceipt)
    };
  }

  /**
   * Verifies the cryptographic chain integrity of the port's receipt trail.
   * @returns {{ ok: boolean, verifiedCount: number, error?: string }}
   */
  verifyTrail() {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.trail.length; i++) {
      const receipt = this.trail[i];
      if (!verifyLadder40SeamReceipt(receipt)) {
        return { ok: false, verifiedCount: i, error: `Invalid receipt at ${i}` };
      }
      if (receipt.prevReceiptHash !== prevHash) {
        return {
          ok: false,
          verifiedCount: i,
          error: `Chain broken at ${i}: prevHash mismatch. Expected ${prevHash}, got ${receipt.prevReceiptHash}`
        };
      }
      prevHash = receipt.receiptHash;
    }
    return { ok: true, verifiedCount: this.trail.length };
  }
}

export { verifyLadder40SeamReceipt, FH_CODES, FH_FREEZE_PIN_SHORT };
void FH_PRODUCTION_READY;
