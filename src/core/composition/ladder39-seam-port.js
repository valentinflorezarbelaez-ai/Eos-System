/**
 * @module ladder39-seam-port
 * SPEC-0165 / Mission FC — Ladder 39 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports EY/EZ/FA/FB when present; soft-fail safe; observed true|false.
 * Seals FC-RCPT-*. Does NOT tip-seal L39 CLOSED. Soft-observe pin: d1041230.
 * PRODUCTION_READY: NO · L39 remains OPEN until tip-seal (NOT this package).
 * Distinct from EX L38 seam / ES L37 / EN L36 / EI L35 / AU secrets runtime.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  FC_PRODUCTION_READY,
  sha256Canonical,
  buildLadder39SeamReceipt,
  verifyLadder39SeamReceipt,
  FC_FREEZE_PIN_SHORT
} from './ladder39-seam-receipt.js';

import { Ladder39SeamPolicyGate, FC_CODES } from './ladder39-seam-policy-gate.js';

/** @type {'NO'} */
export const FC_PORT_PRODUCTION_READY = 'NO';
export const FC_PORT_KIND = 'eos-ladder39-seam-port';

export const FC_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L38_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L39_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_FC_MERGE',
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
    path.join(boxRoot, 'eos-mission-ey', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ez', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-fa', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-fb', 'src', 'core', 'composition'),
    '/workspace/eos-mission-ey/src/core/composition',
    '/workspace/eos-mission-ez/src/core/composition',
    '/workspace/eos-mission-fa/src/core/composition',
    '/workspace/eos-mission-fb/src/core/composition'
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

export async function softObserveEyExternalEventIngressRegistry() {
  const r = await softImportModule('external-event-ingress-registry-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('external-event-ingress-registry-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.ExternalEventIngressRegistryPort,
    PRODUCTION_READY: r.mod.EY_PORT_PRODUCTION_READY,
    KIND: r.mod.EY_PORT_KIND,
    CODES: gate.mod?.EY_CODES
  };
}

export async function softObserveEzWebhookAuthenticity() {
  const r = await softImportModule('webhook-authenticity-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('webhook-authenticity-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.WebhookAuthenticityPort,
    PRODUCTION_READY: r.mod.EZ_PORT_PRODUCTION_READY,
    KIND: r.mod.EZ_PORT_KIND,
    CODES: gate.mod?.EZ_CODES
  };
}

export async function softObserveFaIngressQuarantineReplayDeny() {
  const r = await softImportModule('ingress-quarantine-replay-deny-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('ingress-quarantine-replay-deny-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.IngressQuarantineReplayDenyPort,
    PRODUCTION_READY: r.mod.FA_PORT_PRODUCTION_READY,
    KIND: r.mod.FA_PORT_KIND,
    CODES: gate.mod?.FA_CODES
  };
}

export async function softObserveFbIngressHonestyAttestation() {
  const r = await softImportModule('ingress-honesty-attestation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('ingress-honesty-attestation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.IngressHonestyAttestationPort,
    PRODUCTION_READY: r.mod.FB_PORT_PRODUCTION_READY,
    KIND: r.mod.FB_PORT_KIND,
    CODES: gate.mod?.FB_CODES
  };
}

function mockBinding(overrides = {}) {
  return {
    ingressId: 'ing-opaque-fc-ey-001',
    sourceId: 'src-opaque-fc-ey-001',
    sourceClass: 'external-event-ingress',
    bindingClass: 'external-event-ingress',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

function mockVerify(overrides = {}) {
  return {
    handleId: 'hdl-opaque-fc-ez-001',
    sourceId: 'src-opaque-fc-ez-001',
    authenticityClass: 'webhook-authenticity',
    verifyClass: 'webhook-authenticity',
    desiredVerdict: 'AUTHENTIC',
    observedVerdict: 'AUTHENTIC',
    authorized: true,
    ...overrides
  };
}

function mockQuarantine(overrides = {}) {
  return {
    ingressId: 'ing-opaque-fc-fa-001',
    sourceId: 'src-opaque-fc-fa-001',
    authenticityRef: 'auth-opaque-fc-ez-001',
    quarantineClass: 'ingress-quarantine',
    desiredStage: 'QUARANTINE',
    observedStage: 'QUARANTINE',
    authorized: true,
    ...overrides
  };
}

function mockAttestation(overrides = {}) {
  return {
    ingressId: 'ing-opaque-fc-fb-001',
    sourceId: 'src-opaque-fc-fb-001',
    handleId: 'hdl-opaque-fc-fb-001',
    subjectKind: 'EXTERNAL_EVENT_INGRESS',
    attestationStage: 'BINDING_MATCH',
    bindingMatch: true,
    digestConsistent: true,
    honestyClaims: {
      softObserveFreeze: true,
      noLiveIngressMutation: true,
      productionReadyNo: true,
      schemasAtCeiling: true,
      secretZeroHeld: true
    },
    observedClaim: {
      claimKind: 'EXTERNAL_EVENT_INGRESS',
      claimValue: 'BOUND'
    },
    authorized: true,
    ...overrides
  };
}

export class Ladder39SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder39SeamPolicyGate();
    this.trail = [];
    this.productionReady = FC_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const ey = await softObserveEyExternalEventIngressRegistry();
    const ez = await softObserveEzWebhookAuthenticity();
    const fa = await softObserveFaIngressQuarantineReplayDeny();
    const fb = await softObserveFbIngressHonestyAttestation();
    return { ey, ez, fa, fb };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const binding = input.binding || mockBinding();
    const verify = input.verify || mockVerify();
    const quarantine = input.quarantine || mockQuarantine();
    const attestation = input.attestation || mockAttestation();

    if (sats.ey.observed && sats.ey.Port) {
      const ey = await new sats.ey.Port().govern({
        planId: input.planId || 'plan-l39-fc-ey',
        changeId: 'eos-ladder-39-mission-ey',
        ritualMode: 'ACTIVE',
        binding
      });
      if (ey.ok && ey.receipt?.receiptId) {
        prefixes.push(ey.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ey = ey.receipt.receiptId;
      }
    }

    if (sats.ez.observed && sats.ez.Port) {
      const ez = await new sats.ez.Port().govern({
        planId: input.planId || 'plan-l39-fc-ez',
        changeId: 'eos-ladder-39-mission-ez',
        ritualMode: 'ACTIVE',
        verify
      });
      if (ez.ok && ez.receipt?.receiptId) {
        prefixes.push(ez.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ez = ez.receipt.receiptId;
      }
    }

    if (sats.fa.observed && sats.fa.Port) {
      const fa = await new sats.fa.Port().govern({
        planId: input.planId || 'plan-l39-fc-fa',
        changeId: 'eos-ladder-39-mission-fa',
        ritualMode: 'ACTIVE',
        quarantine
      });
      if (fa.ok && fa.receipt?.receiptId) {
        prefixes.push(fa.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fa = fa.receipt.receiptId;
      }
    }

    if (sats.fb.observed && sats.fb.Port) {
      const fb = await new sats.fb.Port().govern({
        planId: input.planId || 'plan-l39-fc-fb',
        changeId: 'eos-ladder-39-mission-fb',
        ritualMode: 'ACTIVE',
        attestation
      });
      if (fb.ok && fb.receipt?.receiptId) {
        prefixes.push(fb.receipt.receiptId.slice(0, 8));
        satelliteReceipts.fb = fb.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      eyObserved: !!sats.ey.observed,
      ezObserved: !!sats.ez.observed,
      faObserved: !!sats.fa.observed,
      fbObserved: !!sats.fb.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder39SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-39-mission-fc',
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
      const holdReceipt = buildLadder39SeamReceipt({
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
      return { ok:true, decision:'HOLD', code:FC_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder39SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER39_SEAM_PACK_CLOSEOUT',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: FC_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: FC_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder39SeamReceipt(passReceipt)
    };
  }
}

export { verifyLadder39SeamReceipt, FC_CODES, FC_FREEZE_PIN_SHORT };
