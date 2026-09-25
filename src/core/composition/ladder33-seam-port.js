/**
 * @module ladder33-seam-port
 * SPEC-0135 / Mission DY — Ladder 33 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports DU/DV/DW/DX when present; soft-fail safe; observed true|false.
 * Seals DY-RCPT-*. Does NOT tip-seal L33 CLOSED. Soft-observe pin: fe52fb3b.
 * PRODUCTION_READY: NO
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  DY_PRODUCTION_READY,
  sha256Canonical,
  buildLadder33SeamReceipt,
  verifyLadder33SeamReceipt,
  DY_FREEZE_PIN_SHORT
} from './ladder33-seam-receipt.js';

import { Ladder33SeamPolicyGate, DY_CODES } from './ladder33-seam-policy-gate.js';

/** @type {'NO'} */
export const DY_PORT_PRODUCTION_READY = 'NO';
export const DY_PORT_KIND = 'eos-ladder33-seam-port';

export const DY_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L32_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L33_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_DY_MERGE',
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
    path.join(boxRoot, 'eos-mission-du', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-dv', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-dw', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-dx', 'src', 'core', 'composition'),
    '/workspace/eos-mission-du/src/core/composition',
    '/workspace/eos-mission-dv/src/core/composition',
    '/workspace/eos-mission-dw/src/core/composition',
    '/workspace/eos-mission-dx/src/core/composition'
  ];
  // Host EOS composition (Windows hermetic / applied host)
  const hostComp = process.env.EOS_HOST_COMPOSITION;
  if (hostComp) roots.push(hostComp);
  // Common Windows host path soft-observe (non-overwrite)
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

export async function softObserveDuPublisher() {
  const r = await softImportModule('domain-event-publisher-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('domain-event-publisher-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.DomainEventPublisherPort,
    PRODUCTION_READY: r.mod.DU_PORT_PRODUCTION_READY,
    KIND: r.mod.DU_PORT_KIND,
    CODES: gate.mod?.DU_CODES
  };
}

export async function softObserveDvOutbox() {
  const r = await softImportModule('transactional-outbox-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('transactional-outbox-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.TransactionalOutboxPort,
    PRODUCTION_READY: r.mod.DV_PORT_PRODUCTION_READY,
    KIND: r.mod.DV_PORT_KIND,
    CODES: gate.mod?.DV_CODES
  };
}

export async function softObserveDwConsumer() {
  const r = await softImportModule('idempotent-message-consumer-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('idempotent-message-consumer-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.IdempotentMessageConsumerPort,
    PRODUCTION_READY: r.mod.DW_PORT_PRODUCTION_READY,
    KIND: r.mod.DW_PORT_KIND,
    CODES: gate.mod?.DW_CODES
  };
}

export async function softObserveDxBreaker() {
  const r = await softImportModule('circuit-breaker-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('circuit-breaker-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.CircuitBreakerPort,
    PRODUCTION_READY: r.mod.DX_PORT_PRODUCTION_READY,
    KIND: r.mod.DX_PORT_KIND,
    CODES: gate.mod?.DX_CODES
  };
}

function mockDomainEvent(overrides = {}) {
  return {
    eventType: 'OrderPlaced',
    aggregateId: 'agg-order-dy-001',
    aggregateType: 'Order',
    payload: { orderId: 'ord-dy-001', totalCents: 4200, currency: 'USD' },
    occurredAt: new Date().toISOString(),
    ...overrides
  };
}

function mockOutboxRecord(overrides = {}) {
  return { outboxId: 'outbox-dy-001', payloadDigest: sha256Canonical('dy-outbox'), ...overrides };
}

function mockMessage(overrides = {}) {
  return {
    messageId: 'msg-dy-001',
    payload: { orderId: 'ord-dy-001', totalCents: 4200, currency: 'USD' },
    occurredAt: new Date().toISOString(),
    ...overrides
  };
}

export class Ladder33SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder33SeamPolicyGate();
    this.trail = [];
    this.productionReady = DY_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const du = await softObserveDuPublisher();
    const dv = await softObserveDvOutbox();
    const dw = await softObserveDwConsumer();
    const dx = await softObserveDxBreaker();
    return { du, dv, dw, dx };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const domainEvent = input.domainEvent || mockDomainEvent();
    const outboxRecord = input.outboxRecord || mockOutboxRecord({ outboxId: 'outbox-dy-' + Date.now() });
    const message = input.message || mockMessage({ messageId: 'msg-dy-' + Date.now() });

    if (sats.du.observed && sats.du.Port) {
      const du = await new sats.du.Port().govern({
        planId: input.planId || 'plan-l33-dy-du',
        changeId: 'eos-ladder-33-mission-du',
        ritualMode: 'ACTIVE',
        domainEvent
      });
      if (du.ok && du.receipt?.receiptId) {
        prefixes.push(du.receipt.receiptId.slice(0, 8));
        satelliteReceipts.du = du.receipt.receiptId;
      }
    }

    if (sats.dv.observed && sats.dv.Port) {
      const dv = await new sats.dv.Port().govern({
        planId: input.planId || 'plan-l33-dy-dv',
        changeId: 'eos-ladder-33-mission-dv',
        ritualMode: 'ACTIVE',
        domainEvent,
        outboxRecord
      });
      if (dv.ok && dv.receipt?.receiptId) {
        prefixes.push(dv.receipt.receiptId.slice(0, 8));
        satelliteReceipts.dv = dv.receipt.receiptId;
      }
    }

    if (sats.dw.observed && sats.dw.Port) {
      const dw = await new sats.dw.Port().govern({
        planId: input.planId || 'plan-l33-dy-dw',
        changeId: 'eos-ladder-33-mission-dw',
        ritualMode: 'ACTIVE',
        consumerId: 'consumer-dy-seam',
        message
      });
      if (dw.ok && dw.receipt?.receiptId) {
        prefixes.push(dw.receipt.receiptId.slice(0, 8));
        satelliteReceipts.dw = dw.receipt.receiptId;
      }
    }

    if (sats.dx.observed && sats.dx.Port) {
      const dx = await new sats.dx.Port().govern({
        planId: input.planId || 'plan-l33-dy-dx',
        changeId: 'eos-ladder-33-mission-dx',
        ritualMode: 'ACTIVE',
        breakerId: 'breaker-dy-seam',
        protectedOperation: 'consume-payment-event',
        failureThreshold: 3,
        cooldownMs: 1000,
        outcome: 'SUCCESS',
        domainEvent,
        outboxRecord,
        messageRecord: message
      });
      if (dx.ok && dx.receipt?.receiptId) {
        prefixes.push(dx.receipt.receiptId.slice(0, 8));
        satelliteReceipts.dx = dx.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      duObserved: !!sats.du.observed,
      dvObserved: !!sats.dv.observed,
      dwObserved: !!sats.dw.observed,
      dxObserved: !!sats.dx.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder33SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-33-mission-dy',
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
      const holdReceipt = buildLadder33SeamReceipt({
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
      return { ok:true, decision:'HOLD', code:DY_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder33SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'SEAM_CHAIN_DU_DV_DW_DX',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: DY_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: DY_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder33SeamReceipt(passReceipt)
    };
  }
}

export { verifyLadder33SeamReceipt, DY_CODES, DY_FREEZE_PIN_SHORT };
