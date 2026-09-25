/**
 * @module ladder34-seam-port
 * SPEC-0140 / Mission ED — Ladder 34 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports DZ/EA/EB/EC when present; soft-fail safe; observed true|false.
 * Seals ED-RCPT-*. Does NOT tip-seal L34 CLOSED. Soft-observe pin: 29586ab8.
 * PRODUCTION_READY: NO · L34 remains OPEN until tip-seal (NOT this package).
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  ED_PRODUCTION_READY,
  sha256Canonical,
  buildLadder34SeamReceipt,
  verifyLadder34SeamReceipt,
  ED_FREEZE_PIN_SHORT
} from './ladder34-seam-receipt.js';

import { Ladder34SeamPolicyGate, ED_CODES } from './ladder34-seam-policy-gate.js';

/** @type {'NO'} */
export const ED_PORT_PRODUCTION_READY = 'NO';
export const ED_PORT_KIND = 'eos-ladder34-seam-port';

export const ED_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L33_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L34_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_ED_MERGE',
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
    path.join(boxRoot, 'eos-mission-dz', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ea', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-eb', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ec', 'src', 'core', 'composition'),
    '/workspace/eos-mission-dz/src/core/composition',
    '/workspace/eos-mission-ea/src/core/composition',
    '/workspace/eos-mission-eb/src/core/composition',
    '/workspace/eos-mission-ec/src/core/composition'
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

export async function softObserveDzSaga() {
  const r = await softImportModule('process-manager-saga-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('process-manager-saga-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.ProcessManagerSagaPort,
    PRODUCTION_READY: r.mod.DZ_PORT_PRODUCTION_READY,
    KIND: r.mod.DZ_PORT_KIND,
    CODES: gate.mod?.DZ_CODES
  };
}

export async function softObserveEaProjection() {
  const r = await softImportModule('cqrs-read-model-projection-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('cqrs-read-model-projection-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.CqrsReadModelProjectionPort,
    PRODUCTION_READY: r.mod.EA_PORT_PRODUCTION_READY,
    KIND: r.mod.EA_PORT_KIND,
    CODES: gate.mod?.EA_CODES
  };
}

export async function softObserveEbQuarantine() {
  const r = await softImportModule('dead-letter-quarantine-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('dead-letter-quarantine-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.DeadLetterQuarantinePort,
    PRODUCTION_READY: r.mod.EB_PORT_PRODUCTION_READY,
    KIND: r.mod.EB_PORT_KIND,
    CODES: gate.mod?.EB_CODES
  };
}

export async function softObserveEcCompatibility() {
  const r = await softImportModule('domain-event-compatibility-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('domain-event-compatibility-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.DomainEventCompatibilityPort,
    PRODUCTION_READY: r.mod.EC_PORT_PRODUCTION_READY,
    KIND: r.mod.EC_PORT_KIND,
    CODES: gate.mod?.EC_CODES
  };
}

function mockProcessInstance(overrides = {}) {
  return {
    processId: 'proc-order-ed-001',
    processType: 'OrderFulfillmentSaga',
    step: 'ReserveInventory',
    triggerEvent: {
      eventType: 'OrderPlaced',
      aggregateId: 'agg-order-ed-001',
      payload: { orderId: 'ord-ed-001', sku: 'SKU-34', qty: 1 }
    },
    compensationPlan: { steps: ['ReleaseInventory'] },
    ...overrides
  };
}

function mockProjection(overrides = {}) {
  return {
    projectionId: 'proj-order-summary-ed-001',
    projectionType: 'OrderSummaryReadModel',
    sourceEvent: {
      eventType: 'OrderPlaced',
      aggregateId: 'agg-order-ed-001',
      payload: { orderId: 'ord-ed-001', sku: 'SKU-34', qty: 1 }
    },
    checkpoint: { streamPosition: 34, lastEventId: 'evt-ed-034' },
    ...overrides
  };
}

function mockQuarantine(overrides = {}) {
  return {
    messageId: 'msg-poison-ed-001',
    poisonReason: 'deserialization-failure',
    sourceConsumer: 'order-events-consumer-ed',
    attemptCount: 5,
    payloadDigest: sha256Canonical('ed-poison-payload'),
    disposition: undefined,
    ...overrides
  };
}

function mockEvolution(overrides = {}) {
  return {
    eventType: 'OrderPlaced',
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    changeKind: 'COMPATIBLE',
    contractDigest: sha256Canonical('ed-contract'),
    ...overrides
  };
}

export class Ladder34SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder34SeamPolicyGate();
    this.trail = [];
    this.productionReady = ED_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const dz = await softObserveDzSaga();
    const ea = await softObserveEaProjection();
    const eb = await softObserveEbQuarantine();
    const ec = await softObserveEcCompatibility();
    return { dz, ea, eb, ec };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const processInstance = input.processInstance || mockProcessInstance();
    const projection = input.projection || mockProjection();
    const quarantine = input.quarantine || mockQuarantine();
    const evolution = input.evolution || mockEvolution();

    if (sats.dz.observed && sats.dz.Port) {
      const dz = await new sats.dz.Port().govern({
        planId: input.planId || 'plan-l34-ed-dz',
        changeId: 'eos-ladder-34-mission-dz',
        ritualMode: 'ACTIVE',
        processInstance
      });
      if (dz.ok && dz.receipt?.receiptId) {
        prefixes.push(dz.receipt.receiptId.slice(0, 8));
        satelliteReceipts.dz = dz.receipt.receiptId;
      }
    }

    if (sats.ea.observed && sats.ea.Port) {
      const ea = await new sats.ea.Port().govern({
        planId: input.planId || 'plan-l34-ed-ea',
        changeId: 'eos-ladder-34-mission-ea',
        ritualMode: 'ACTIVE',
        projection
      });
      if (ea.ok && ea.receipt?.receiptId) {
        prefixes.push(ea.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ea = ea.receipt.receiptId;
      }
    }

    if (sats.eb.observed && sats.eb.Port) {
      const eb = await new sats.eb.Port().govern({
        planId: input.planId || 'plan-l34-ed-eb',
        changeId: 'eos-ladder-34-mission-eb',
        ritualMode: 'ACTIVE',
        quarantine
      });
      if (eb.ok && eb.receipt?.receiptId) {
        prefixes.push(eb.receipt.receiptId.slice(0, 8));
        satelliteReceipts.eb = eb.receipt.receiptId;
      }
    }

    if (sats.ec.observed && sats.ec.Port) {
      const ec = await new sats.ec.Port().govern({
        planId: input.planId || 'plan-l34-ed-ec',
        changeId: 'eos-ladder-34-mission-ec',
        ritualMode: 'ACTIVE',
        evolution
      });
      if (ec.ok && ec.receipt?.receiptId) {
        prefixes.push(ec.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ec = ec.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      dzObserved: !!sats.dz.observed,
      eaObserved: !!sats.ea.observed,
      ebObserved: !!sats.eb.observed,
      ecObserved: !!sats.ec.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder34SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-34-mission-ed',
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
      const holdReceipt = buildLadder34SeamReceipt({
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
      return { ok:true, decision:'HOLD', code:ED_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder34SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER34_SEAM_PACK_CLOSEOUT',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: ED_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: ED_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder34SeamReceipt(passReceipt)
    };
  }
}

export { verifyLadder34SeamReceipt, ED_CODES, ED_FREEZE_PIN_SHORT };
