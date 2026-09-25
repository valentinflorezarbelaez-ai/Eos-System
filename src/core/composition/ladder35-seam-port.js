/**
 * @module ladder35-seam-port
 * SPEC-0145 / Mission EI — Ladder 35 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports EE/EF/EG/EH when present; soft-fail safe; observed true|false.
 * Seals EI-RCPT-*. Does NOT tip-seal L35 CLOSED. Soft-observe pin: bdd53e30.
 * PRODUCTION_READY: NO · L35 remains OPEN until tip-seal (NOT this package).
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  EI_PRODUCTION_READY,
  sha256Canonical,
  buildLadder35SeamReceipt,
  verifyLadder35SeamReceipt,
  EI_FREEZE_PIN_SHORT
} from './ladder35-seam-receipt.js';

import { Ladder35SeamPolicyGate, EI_CODES } from './ladder35-seam-policy-gate.js';

/** @type {'NO'} */
export const EI_PORT_PRODUCTION_READY = 'NO';
export const EI_PORT_KIND = 'eos-ladder35-seam-port';

export const EI_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L34_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L35_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_EI_MERGE',
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
    path.join(boxRoot, 'eos-mission-ee', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ef', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-eg', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-eh', 'src', 'core', 'composition'),
    '/workspace/eos-mission-ee/src/core/composition',
    '/workspace/eos-mission-ef/src/core/composition',
    '/workspace/eos-mission-eg/src/core/composition',
    '/workspace/eos-mission-eh/src/core/composition'
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

export async function softObserveEeDeadline() {
  const r = await softImportModule('temporal-deadline-ttl-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('temporal-deadline-ttl-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.TemporalDeadlineTtlPort,
    PRODUCTION_READY: r.mod.EE_PORT_PRODUCTION_READY,
    KIND: r.mod.EE_PORT_KIND,
    CODES: gate.mod?.EE_CODES
  };
}

export async function softObserveEfSchedule() {
  const r = await softImportModule('schedule-wake-deferred-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('schedule-wake-deferred-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.ScheduleWakeDeferredPort,
    PRODUCTION_READY: r.mod.EF_PORT_PRODUCTION_READY,
    KIND: r.mod.EF_PORT_KIND,
    CODES: gate.mod?.EF_CODES
  };
}

export async function softObserveEgCompensation() {
  const r = await softImportModule('process-timeout-compensation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('process-timeout-compensation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.ProcessTimeoutCompensationPort,
    PRODUCTION_READY: r.mod.EG_PORT_PRODUCTION_READY,
    KIND: r.mod.EG_PORT_KIND,
    CODES: gate.mod?.EG_CODES
  };
}

export async function softObserveEhAttestation() {
  const r = await softImportModule('temporal-honesty-attestation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('temporal-honesty-attestation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.TemporalHonestyAttestationPort,
    PRODUCTION_READY: r.mod.EH_PORT_PRODUCTION_READY,
    KIND: r.mod.EH_PORT_KIND,
    CODES: gate.mod?.EH_CODES
  };
}

function mockDeadline(overrides = {}) {
  return {
    processId: 'proc-deadline-ei-001',
    deadlineAt: '2026-09-26T12:00:00.000Z',
    ttlMs: 3600000,
    clockSkewBudgetMs: 5000,
    triggerEvent: 'SagaStepAwaiting',
    ...overrides
  };
}

function mockSchedule(overrides = {}) {
  return {
    scheduleId: 'sched-wake-ei-001',
    wakeAt: '2026-09-26T18:00:00.000Z',
    deferredFromProcessId: 'proc-deadline-ei-001',
    triggerKind: 'DEFERRED',
    payloadDigest: sha256Canonical('ei-deferred-payload'),
    ...overrides
  };
}

function mockCompensation(overrides = {}) {
  return {
    processId: 'proc-timeout-ei-001',
    timeoutReason: 'DEADLINE_TTL_EXPIRED',
    relatedDeadlineReceiptId: 'EE-RCPT-0001',
    compensationPlan: 'hermetic-rollback-step',
    observedTimedOut: false,
    ...overrides
  };
}

function mockAttestation(overrides = {}) {
  return {
    subjectReceiptId: 'EG-RCPT-0001',
    subjectKind: 'COMPENSATION',
    honestyClaims: {
      softObserveFreeze: true,
      noLiveTimer: true,
      productionReadyNo: true,
      schemasAtCeiling: true
    },
    ...overrides
  };
}

export class Ladder35SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder35SeamPolicyGate();
    this.trail = [];
    this.productionReady = EI_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const ee = await softObserveEeDeadline();
    const ef = await softObserveEfSchedule();
    const eg = await softObserveEgCompensation();
    const eh = await softObserveEhAttestation();
    return { ee, ef, eg, eh };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const deadline = input.deadline || mockDeadline();
    const schedule = input.schedule || mockSchedule();
    const compensation = input.compensation || mockCompensation();
    const attestation = input.attestation || mockAttestation();

    if (sats.ee.observed && sats.ee.Port) {
      const ee = await new sats.ee.Port().govern({
        planId: input.planId || 'plan-l35-ei-ee',
        changeId: 'eos-ladder-35-mission-ee',
        ritualMode: 'ACTIVE',
        deadline
      });
      if (ee.ok && ee.receipt?.receiptId) {
        prefixes.push(ee.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ee = ee.receipt.receiptId;
      }
    }

    if (sats.ef.observed && sats.ef.Port) {
      const ef = await new sats.ef.Port().govern({
        planId: input.planId || 'plan-l35-ei-ef',
        changeId: 'eos-ladder-35-mission-ef',
        ritualMode: 'ACTIVE',
        schedule
      });
      if (ef.ok && ef.receipt?.receiptId) {
        prefixes.push(ef.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ef = ef.receipt.receiptId;
      }
    }

    if (sats.eg.observed && sats.eg.Port) {
      const eg = await new sats.eg.Port().govern({
        planId: input.planId || 'plan-l35-ei-eg',
        changeId: 'eos-ladder-35-mission-eg',
        ritualMode: 'ACTIVE',
        compensation
      });
      if (eg.ok && eg.receipt?.receiptId) {
        prefixes.push(eg.receipt.receiptId.slice(0, 8));
        satelliteReceipts.eg = eg.receipt.receiptId;
      }
    }

    if (sats.eh.observed && sats.eh.Port) {
      const eh = await new sats.eh.Port().govern({
        planId: input.planId || 'plan-l35-ei-eh',
        changeId: 'eos-ladder-35-mission-eh',
        ritualMode: 'ACTIVE',
        attestation
      });
      if (eh.ok && eh.receipt?.receiptId) {
        prefixes.push(eh.receipt.receiptId.slice(0, 8));
        satelliteReceipts.eh = eh.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      eeObserved: !!sats.ee.observed,
      efObserved: !!sats.ef.observed,
      egObserved: !!sats.eg.observed,
      ehObserved: !!sats.eh.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder35SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-35-mission-ei',
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
      const holdReceipt = buildLadder35SeamReceipt({
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
      return { ok:true, decision:'HOLD', code:EI_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder35SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER35_SEAM_PACK_CLOSEOUT',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: EI_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: EI_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder35SeamReceipt(passReceipt)
    };
  }
}

export { verifyLadder35SeamReceipt, EI_CODES, EI_FREEZE_PIN_SHORT };
