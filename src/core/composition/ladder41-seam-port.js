/**
 * @module ladder41-seam-port
 * SPEC-0175 / Mission FM — Ladder 41 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports FI/FJ/FK/FL when present; soft-fail safe; observed true|false.
 * Seals FM-RCPT-*. Does NOT tip-seal L41 CLOSED. Soft-observe pin: f5948926.
 * PRODUCTION_READY: NO · L41 remains OPEN until tip-seal (NOT this package).
 * Distinct from FH L40 seam / FC L39 seam / EX L38 / ES L37.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

import {
  FM_PRODUCTION_READY,
  FM_FREEZE_PIN_SHORT,
  FM_CHAIN_ORDER,
  FM_SATELLITE_SPECS,
  sha256Canonical,
  computeSeamDigest,
  buildLadder41SeamReceipt,
  verifyLadder41SeamReceipt
} from './ladder41-seam-receipt.js';

import { Ladder41SeamPolicyGate, FM_CODES } from './ladder41-seam-policy-gate.js';

/** @type {'NO'} */
export const FM_PORT_PRODUCTION_READY = 'NO';
export const FM_PORT_KIND = 'eos-ladder41-seam-port';

export const FM_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L40_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L41_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_FM_MERGE',
  'A11_REFUSE_TIP_SEAL_IN_PRODUCT_CLAIM',
  'A12_REFUSE_SCHEMA_JSON_ADD',
  'A13_REFUSE_GHA_GREEN_CLAIM'
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Attempts a set of import URLs in order.
 * The try/catch deliberately wraps the FULL `await import(url)` — module evaluation
 * included, not just resolution. A module that exists but throws while evaluating
 * must degrade to `observed: false`, never crash the seam suite.
 *
 * @param {string[]} urls
 * @returns {Promise<{ observed: boolean, mod?: object, attemptCount: number }>}
 */
export async function softImportUrls(urls = []) {
  let attemptCount = 0;
  for (const url of urls) {
    attemptCount += 1;
    try {
      const mod = await import(url);
      return { observed: true, mod, attemptCount };
    } catch {
      // module missing OR evaluation threw — try next candidate, never rethrow
    }
  }
  return { observed: false, attemptCount };
}

function candidateUrls(fileName) {
  const urls = [];
  const local = path.join(__dirname, fileName);
  if (fs.existsSync(local)) urls.push(pathToFileURL(local).href);
  const hostComp = process.env.EOS_HOST_COMPOSITION;
  if (hostComp) {
    const p = path.join(hostComp, fileName);
    if (fs.existsSync(p)) urls.push(pathToFileURL(p).href);
  }
  return urls;
}

export async function softImportModule(fileName) {
  return softImportUrls(candidateUrls(fileName));
}

export async function softObserveFi() {
  const r = await softImportModule('bidirectional-delivery-correlation-registry-port.js');
  if (!r.observed) return { observed: false, satellite: 'FI', present: false };
  return {
    observed: true,
    satellite: 'FI',
    present: true,
    Port: r.mod.BidirectionalDeliveryCorrelationRegistryPort,
    PRODUCTION_READY: r.mod.FI_PORT_PRODUCTION_READY,
    KIND: r.mod.FI_PORT_KIND
  };
}

export async function softObserveFj() {
  const r = await softImportModule('round-trip-request-reply-integrity-port.js');
  if (!r.observed) return { observed: false, satellite: 'FJ', present: false };
  return {
    observed: true,
    satellite: 'FJ',
    present: true,
    Port: r.mod.RoundTripRequestReplyIntegrityPort,
    PRODUCTION_READY: r.mod.FJ_PORT_PRODUCTION_READY,
    KIND: r.mod.FJ_PORT_KIND
  };
}

export async function softObserveFk() {
  const r = await softImportModule('bidirectional-mismatch-quarantine-deny-port.js');
  if (!r.observed) return { observed: false, satellite: 'FK', present: false };
  return {
    observed: true,
    satellite: 'FK',
    present: true,
    Port: r.mod.BidirectionalMismatchQuarantineDenyPort,
    PRODUCTION_READY: r.mod.FK_PORT_PRODUCTION_READY,
    KIND: r.mod.FK_PORT_KIND
  };
}

export async function softObserveFl() {
  const r = await softImportModule('bidirectional-delivery-honesty-attestation-port.js');
  if (!r.observed) return { observed: false, satellite: 'FL', present: false };
  return {
    observed: true,
    satellite: 'FL',
    present: true,
    Port: r.mod.BidirectionalDeliveryHonestyAttestationPort,
    PRODUCTION_READY: r.mod.FL_PORT_PRODUCTION_READY,
    KIND: r.mod.FL_PORT_KIND
  };
}

const HEX_A = 'a'.repeat(64);
const HEX_B = 'b'.repeat(64);
const HEX_C = 'c'.repeat(64);

function mockBinding(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fm-001',
    ingressId: 'ing-opaque-fm-001',
    sourceId: 'src-opaque-fm-001',
    targetId: 'tgt-opaque-fm-001',
    deliveryId: 'dlv-opaque-fm-001',
    correlationClass: 'bidirectional-delivery-correlation',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

function mockRoundTrip(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fm-001',
    bindingId: 'bind-opaque-fm-001',
    roundTripId: 'rt-opaque-fm-001',
    requestId: 'req-opaque-fm-001',
    replyId: 'rep-opaque-fm-001',
    requestDigest: HEX_A,
    replyDigest: HEX_B,
    correlationClass: 'bidirectional-delivery-correlation',
    integrityClass: 'round-trip-request-reply',
    desiredIntegrity: 'VERIFIED',
    observedIntegrity: 'VERIFIED',
    authorized: true,
    ...overrides
  };
}

function mockMismatch(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fm-001',
    bindingId: 'bind-opaque-fm-001',
    roundTripId: 'rt-opaque-fm-001',
    requestId: 'req-opaque-fm-001',
    replyId: 'rep-opaque-fm-001',
    requestDigest: HEX_A,
    replyDigest: HEX_B,
    mismatchClass: 'round-trip-integrity-mismatch',
    desiredDisposition: 'QUARANTINE',
    observedVerdict: 'MISMATCH',
    authorized: true,
    ...overrides
  };
}

function mockAttestation(overrides = {}) {
  return {
    correlationId: 'corr-opaque-fm-001',
    bindingId: 'bind-opaque-fm-001',
    roundTripId: 'rt-opaque-fm-001',
    requestId: 'req-opaque-fm-001',
    replyId: 'rep-opaque-fm-001',
    quarantineDecisionId: 'fk-dec-opaque-fm-001',
    requestDigest: HEX_A,
    replyDigest: HEX_B,
    mismatchDigest: HEX_C,
    attestationClass: 'bidirectional-delivery-honesty-claim',
    desiredAttestation: 'ATTEST_INTEGRITY',
    observedClaim: 'CONSISTENT',
    authorized: true,
    ...overrides
  };
}

export class Ladder41SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder41SeamPolicyGate();
    this.trail = [];
    this.productionReady = FM_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const fi = await softObserveFi();
    const fj = await softObserveFj();
    const fk = await softObserveFk();
    const fl = await softObserveFl();
    return { fi, fj, fk, fl };
  }

  /**
   * Runs the end-to-end chain FI -> FJ -> FK -> FL with hermetic opaque inputs.
   * Absent satellites are skipped (soft-observe); present ones must govern.
   * @param {object} input
   * @param {object} sats
   * @returns {Promise<{ prefixes: string[], satelliteReceipts: object, steps: object }>}
   */
  async chainGovern(input = {}, sats = {}) {
    const prefixes = [];
    const satelliteReceipts = {};
    const steps = {};

    const binding = input.binding || mockBinding();
    const roundTrip = input.roundTrip || mockRoundTrip();
    const mismatch = input.mismatch || mockMismatch();
    const attestation = input.attestation || mockAttestation();

    if (sats.fi && sats.fi.observed && sats.fi.Port) {
      const res = await new sats.fi.Port().govern({
        planId: input.planId || 'plan-l41-fm-fi',
        changeId: 'eos-ladder-41-mission-fi',
        ritualMode: 'ACTIVE',
        binding
      });
      steps.fi = res.decision;
      if (res.ok && res.receipt && res.receipt.receiptId) {
        prefixes.push(res.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fi = res.receipt.receiptId;
      }
    }

    if (sats.fj && sats.fj.observed && sats.fj.Port) {
      const res = await new sats.fj.Port().govern({
        planId: input.planId || 'plan-l41-fm-fj',
        changeId: 'eos-ladder-41-mission-fj',
        ritualMode: 'ACTIVE',
        roundTrip
      });
      steps.fj = res.decision;
      if (res.ok && res.receipt && res.receipt.receiptId) {
        prefixes.push(res.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fj = res.receipt.receiptId;
      }
    }

    if (sats.fk && sats.fk.observed && sats.fk.Port) {
      const res = await new sats.fk.Port().govern({
        planId: input.planId || 'plan-l41-fm-fk',
        changeId: 'eos-ladder-41-mission-fk',
        ritualMode: 'ACTIVE',
        mismatch
      });
      steps.fk = res.decision;
      if (res.ok && res.receipt && res.receipt.receiptId) {
        prefixes.push(res.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fk = res.receipt.receiptId;
      }
    }

    if (sats.fl && sats.fl.observed && sats.fl.Port) {
      const res = await new sats.fl.Port().govern({
        planId: input.planId || 'plan-l41-fm-fl',
        changeId: 'eos-ladder-41-mission-fl',
        ritualMode: 'ACTIVE',
        attestation
      });
      steps.fl = res.decision;
      if (res.ok && res.receipt && res.receipt.receiptId) {
        prefixes.push(res.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fl = res.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts, steps };
  }

  /**
   * Governs the Ladder 41 seam-pack consolidation / closeout ritual.
   * Never tip-seals. Never mutates the freeze pin.
   * @param {object} input
   */
  async seam(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainBase = {
      fi: !!sats.fi.observed,
      fj: !!sats.fj.observed,
      fk: !!sats.fk.observed,
      fl: !!sats.fl.observed
    };
    const prev = this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64);

    if (!gateRes.ok) {
      const denied = buildLadder41SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-41-mission-fm',
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        operation: 'SEAM_DENY',
        seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, denied: true, code: gateRes.code })),
        chainObserve: { ...chainBase, prefixes: [] },
        prevReceiptHash: prev
      });
      this.trail.push(denied);
      return {
        ok: false,
        decision: 'DENY',
        code: gateRes.code,
        reason: gateRes.reason,
        receipt: denied,
        satellites: chainBase
      };
    }

    if (input.ritualMode === 'HOLD' || gateRes.decision === 'HOLD') {
      const held = buildLadder41SeamReceipt({
        planId: input.planId,
        changeId: input.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        operation: 'SEAM_HOLD',
        seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, mode: 'HOLD' })),
        chainObserve: { ...chainBase, prefixes: [] },
        prevReceiptHash: prev
      });
      this.trail.push(held);
      return { ok: true, decision: 'HOLD', code: FM_CODES.HOLD, receipt: held, satellites: chainBase };
    }

    const chained = await this.chainGovern(input, sats);
    const observedChainComplete =
      chainBase.fi && chainBase.fj && chainBase.fk && chainBase.fl;
    const seamDigest = computeSeamDigest({
      chain: chainBase,
      seamClass: 'ladder-41-seam-pack',
      desiredSeal: 'SEAM_PACK',
      observedChainComplete
    });

    const passReceipt = buildLadder41SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER41_SEAM_PACK_CLOSEOUT',
      seamDigest,
      chainObserve: { ...chainBase, prefixes: chained.prefixes },
      satelliteReceipts: chained.satelliteReceipts,
      prevReceiptHash: prev
    });
    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FM_CODES.OK,
      receipt: passReceipt,
      satellites: chainBase,
      chainOrder: FM_CHAIN_ORDER,
      satelliteSpecs: FM_SATELLITE_SPECS,
      steps: chained.steps,
      verify: verifyLadder41SeamReceipt(passReceipt)
    };
  }

  /**
   * Verifies the cryptographic chain integrity of the seam trail.
   * @returns {{ ok: boolean, verifiedCount: number, error?: string }}
   */
  verifyTrail() {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.trail.length; i += 1) {
      const receipt = this.trail[i];
      const res = verifyLadder41SeamReceipt(receipt);
      if (!res.ok) {
        return { ok: false, verifiedCount: i, error: `Invalid receipt at ${i}: ${res.reason}` };
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

void FM_PRODUCTION_READY;
