/**
 * @module ladder36-seam-port
 * SPEC-0150 / Mission EN — Ladder 36 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports EJ/EK/EL/EM when present; soft-fail safe; observed true|false.
 * Seals EN-RCPT-*. Does NOT tip-seal L36 CLOSED. Soft-observe pin: 9fd2be07.
 * PRODUCTION_READY: NO · L36 remains OPEN until tip-seal (NOT this package).
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  EN_PRODUCTION_READY,
  sha256Canonical,
  buildLadder36SeamReceipt,
  verifyLadder36SeamReceipt,
  EN_FREEZE_PIN_SHORT
} from './ladder36-seam-receipt.js';

import { Ladder36SeamPolicyGate, EN_CODES } from './ladder36-seam-policy-gate.js';

/** @type {'NO'} */
export const EN_PORT_PRODUCTION_READY = 'NO';
export const EN_PORT_KIND = 'eos-ladder36-seam-port';

export const EN_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L35_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L36_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_EN_MERGE',
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
    path.join(boxRoot, 'eos-mission-ej', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ek', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-el', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-em', 'src', 'core', 'composition'),
    '/workspace/eos-mission-ej/src/core/composition',
    '/workspace/eos-mission-ek/src/core/composition',
    '/workspace/eos-mission-el/src/core/composition',
    '/workspace/eos-mission-em/src/core/composition'
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

export async function softObserveEjAdmission() {
  const r = await softImportModule('admission-control-intake-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('admission-control-intake-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.AdmissionControlIntakePort,
    PRODUCTION_READY: r.mod.EJ_PORT_PRODUCTION_READY,
    KIND: r.mod.EJ_PORT_KIND,
    CODES: gate.mod?.EJ_CODES
  };
}

export async function softObserveEkBackpressure() {
  const r = await softImportModule('backpressure-load-shed-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('backpressure-load-shed-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.BackpressureLoadShedPort,
    PRODUCTION_READY: r.mod.EK_PORT_PRODUCTION_READY,
    KIND: r.mod.EK_PORT_KIND,
    CODES: gate.mod?.EK_CODES
  };
}

export async function softObserveElBulkhead() {
  const r = await softImportModule('resource-isolation-bulkhead-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('resource-isolation-bulkhead-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.ResourceIsolationBulkheadPort,
    PRODUCTION_READY: r.mod.EL_PORT_PRODUCTION_READY,
    KIND: r.mod.EL_PORT_KIND,
    CODES: gate.mod?.EL_CODES
  };
}

export async function softObserveEmHonesty() {
  const r = await softImportModule('capacity-honesty-attestation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('capacity-honesty-attestation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.CapacityHonestyAttestationPort,
    PRODUCTION_READY: r.mod.EM_PORT_PRODUCTION_READY,
    KIND: r.mod.EM_PORT_KIND,
    CODES: gate.mod?.EM_CODES
  };
}

function mockIntake(overrides = {}) {
  return {
    intakeId: 'intake-en-001',
    workClass: 'standard',
    maxConcurrent: 10,
    maxQueueDepth: 50,
    observedInflight: 2,
    observedQueued: 5,
    ...overrides
  };
}

function mockLoad(overrides = {}) {
  return {
    loadId: 'load-en-001',
    resourceClass: 'saga-worker',
    pressureThreshold: 80,
    observedPressure: 40,
    ...overrides
  };
}

function mockBulkhead(overrides = {}) {
  return {
    bulkheadId: 'bulkhead-en-001',
    poolId: 'pool-alpha',
    capacity: 20,
    observedOccupancy: 5,
    crossBulkheadTouch: false,
    ...overrides
  };
}

function mockAttestation(overrides = {}) {
  return {
    subjectReceiptId: 'EL-RCPT-0001',
    subjectKind: 'BULKHEAD',
    honestyClaims: {
      softObserveFreeze: true,
      noLiveMetrics: true,
      productionReadyNo: true,
      schemasAtCeiling: true
    },
    ...overrides
  };
}

export class Ladder36SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder36SeamPolicyGate();
    this.trail = [];
    this.productionReady = EN_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const ej = await softObserveEjAdmission();
    const ek = await softObserveEkBackpressure();
    const el = await softObserveElBulkhead();
    const em = await softObserveEmHonesty();
    return { ej, ek, el, em };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const intake = input.intake || mockIntake();
    const load = input.load || mockLoad();
    const bulkhead = input.bulkhead || mockBulkhead();
    const attestation = input.attestation || mockAttestation();

    if (sats.ej.observed && sats.ej.Port) {
      const ej = await new sats.ej.Port().govern({
        planId: input.planId || 'plan-l36-en-ej',
        changeId: 'eos-ladder-36-mission-ej',
        ritualMode: 'ACTIVE',
        intake
      });
      if (ej.ok && ej.receipt?.receiptId) {
        prefixes.push(ej.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ej = ej.receipt.receiptId;
      }
    }

    if (sats.ek.observed && sats.ek.Port) {
      const ek = await new sats.ek.Port().govern({
        planId: input.planId || 'plan-l36-en-ek',
        changeId: 'eos-ladder-36-mission-ek',
        ritualMode: 'ACTIVE',
        load
      });
      if (ek.ok && ek.receipt?.receiptId) {
        prefixes.push(ek.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ek = ek.receipt.receiptId;
      }
    }

    if (sats.el.observed && sats.el.Port) {
      const el = await new sats.el.Port().govern({
        planId: input.planId || 'plan-l36-en-el',
        changeId: 'eos-ladder-36-mission-el',
        ritualMode: 'ACTIVE',
        bulkhead
      });
      if (el.ok && el.receipt?.receiptId) {
        prefixes.push(el.receipt.receiptId.slice(0, 8));
        satelliteReceipts.el = el.receipt.receiptId;
      }
    }

    if (sats.em.observed && sats.em.Port) {
      const em = await new sats.em.Port().govern({
        planId: input.planId || 'plan-l36-en-em',
        changeId: 'eos-ladder-36-mission-em',
        ritualMode: 'ACTIVE',
        attestation
      });
      if (em.ok && em.receipt?.receiptId) {
        prefixes.push(em.receipt.receiptId.slice(0, 8));
        satelliteReceipts.em = em.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      ejObserved: !!sats.ej.observed,
      ekObserved: !!sats.ek.observed,
      elObserved: !!sats.el.observed,
      emObserved: !!sats.em.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder36SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-36-mission-en',
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
      const holdReceipt = buildLadder36SeamReceipt({
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
      return { ok:true, decision:'HOLD', code:EN_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder36SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER36_SEAM_PACK_CLOSEOUT',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: EN_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: EN_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder36SeamReceipt(passReceipt)
    };
  }
}

export { verifyLadder36SeamReceipt, EN_CODES, EN_FREEZE_PIN_SHORT };
