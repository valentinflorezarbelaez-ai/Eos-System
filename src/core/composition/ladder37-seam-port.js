/**
 * @module ladder37-seam-port
 * SPEC-0155 / Mission ES — Ladder 37 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports EO/EP/EQ/ER when present; soft-fail safe; observed true|false.
 * Seals ES-RCPT-*. Does NOT tip-seal L37 CLOSED. Soft-observe pin: 22289f5d.
 * PRODUCTION_READY: NO · L37 remains OPEN until tip-seal (NOT this package).
 * Distinct from EN L36 seam and EI L35 seam.
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  ES_PRODUCTION_READY,
  sha256Canonical,
  buildLadder37SeamReceipt,
  verifyLadder37SeamReceipt,
  ES_FREEZE_PIN_SHORT
} from './ladder37-seam-receipt.js';

import { Ladder37SeamPolicyGate, ES_CODES } from './ladder37-seam-policy-gate.js';

/** @type {'NO'} */
export const ES_PORT_PRODUCTION_READY = 'NO';
export const ES_PORT_KIND = 'eos-ladder37-seam-port';

export const ES_SAFE_AUTOMATION_IDS = Object.freeze([
  'A5_PRESERVE_FUNDACION_ALWAYS_DENY',
  'A6_PRESERVE_HUMAN_PROD_GATE',
  'A7_REFUSE_TIP_PIN_REWRITE',
  'A8_REFUSE_L30_L36_REOPEN',
  'A9_REFUSE_UNSUPERVISED_L37_AUTO_CLOSE',
  'A10_TIP_SEAL_SEPARATE_AFTER_ES_MERGE',
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
    path.join(boxRoot, 'eos-mission-eo', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-ep', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-eq', 'src', 'core', 'composition'),
    path.join(boxRoot, 'eos-mission-er', 'src', 'core', 'composition'),
    '/workspace/eos-mission-eo/src/core/composition',
    '/workspace/eos-mission-ep/src/core/composition',
    '/workspace/eos-mission-eq/src/core/composition',
    '/workspace/eos-mission-er/src/core/composition'
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

export async function softObserveEoFeatureFlag() {
  const r = await softImportModule('feature-flag-runtime-toggle-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('feature-flag-runtime-toggle-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.FeatureFlagRuntimeTogglePort,
    PRODUCTION_READY: r.mod.EO_PORT_PRODUCTION_READY,
    KIND: r.mod.EO_PORT_KIND,
    CODES: gate.mod?.EO_CODES
  };
}

export async function softObserveEpPolicyPack() {
  const r = await softImportModule('policy-pack-binding-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('policy-pack-binding-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.PolicyPackBindingPort,
    PRODUCTION_READY: r.mod.EP_PORT_PRODUCTION_READY,
    KIND: r.mod.EP_PORT_KIND,
    CODES: gate.mod?.EP_CODES
  };
}

export async function softObserveEqStagedActivation() {
  const r = await softImportModule('config-staged-activation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('config-staged-activation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.ConfigStagedActivationPort,
    PRODUCTION_READY: r.mod.EQ_PORT_PRODUCTION_READY,
    KIND: r.mod.EQ_PORT_KIND,
    CODES: gate.mod?.EQ_CODES
  };
}

export async function softObserveErConfigHonesty() {
  const r = await softImportModule('config-honesty-attestation-port.js');
  if (!r.observed) return { observed: false };
  const gate = await softImportModule('config-honesty-attestation-policy-gate.js');
  return {
    observed: true,
    Port: r.mod.ConfigHonestyAttestationPort,
    PRODUCTION_READY: r.mod.ER_PORT_PRODUCTION_READY,
    KIND: r.mod.ER_PORT_KIND,
    CODES: gate.mod?.ER_CODES
  };
}

function mockToggle(overrides = {}) {
  return {
    flagKey: 'eos.feature.demo-toggle',
    toggleClass: 'runtime-feature',
    desiredState: 'ON',
    observedState: 'ON',
    authorized: true,
    ...overrides
  };
}

function mockBinding(overrides = {}) {
  return {
    packId: 'eos.policy.demo-pack',
    bindingClass: 'policy-pack',
    desiredBinding: 'BOUND',
    observedBinding: 'BOUND',
    authorized: true,
    ...overrides
  };
}

function mockActivation(overrides = {}) {
  return {
    configKey: 'eos.config.demo-flag',
    activationClass: 'staged-activation',
    desiredStage: 'STAGED',
    observedActivation: 'STAGED',
    authorized: true,
    ...overrides
  };
}

function mockAttestation(overrides = {}) {
  return {
    subjectReceiptId: 'EQ-RCPT-0001',
    subjectKind: 'STAGED_ACTIVATION',
    honestyClaims: {
      softObserveFreeze: true,
      noLiveFlagStore: true,
      productionReadyNo: true,
      schemasAtCeiling: true
    },
    observedClaim: {
      claimKind: 'STAGED_ACTIVATION',
      claimValue: 'STAGED'
    },
    authorized: true,
    ...overrides
  };
}

export class Ladder37SeamPort {
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder37SeamPolicyGate();
    this.trail = [];
    this.productionReady = ES_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const eo = await softObserveEoFeatureFlag();
    const ep = await softObserveEpPolicyPack();
    const eq = await softObserveEqStagedActivation();
    const er = await softObserveErConfigHonesty();
    return { eo, ep, eq, er };
  }

  async chainGovern(input, sats) {
    const prefixes = [];
    const satelliteReceipts = {};
    const toggle = input.toggle || mockToggle();
    const binding = input.binding || mockBinding();
    const activation = input.activation || mockActivation();
    const attestation = input.attestation || mockAttestation();

    if (sats.eo.observed && sats.eo.Port) {
      const eo = await new sats.eo.Port().govern({
        planId: input.planId || 'plan-l37-es-eo',
        changeId: 'eos-ladder-37-mission-eo',
        ritualMode: 'ACTIVE',
        toggle
      });
      if (eo.ok && eo.receipt?.receiptId) {
        prefixes.push(eo.receipt.receiptId.slice(0, 8));
        satelliteReceipts.eo = eo.receipt.receiptId;
      }
    }

    if (sats.ep.observed && sats.ep.Port) {
      const ep = await new sats.ep.Port().govern({
        planId: input.planId || 'plan-l37-es-ep',
        changeId: 'eos-ladder-37-mission-ep',
        ritualMode: 'ACTIVE',
        binding
      });
      if (ep.ok && ep.receipt?.receiptId) {
        prefixes.push(ep.receipt.receiptId.slice(0, 8));
        satelliteReceipts.ep = ep.receipt.receiptId;
      }
    }

    if (sats.eq.observed && sats.eq.Port) {
      const eq = await new sats.eq.Port().govern({
        planId: input.planId || 'plan-l37-es-eq',
        changeId: 'eos-ladder-37-mission-eq',
        ritualMode: 'ACTIVE',
        activation
      });
      if (eq.ok && eq.receipt?.receiptId) {
        prefixes.push(eq.receipt.receiptId.slice(0, 8));
        satelliteReceipts.eq = eq.receipt.receiptId;
      }
    }

    if (sats.er.observed && sats.er.Port) {
      const er = await new sats.er.Port().govern({
        planId: input.planId || 'plan-l37-es-er',
        changeId: 'eos-ladder-37-mission-er',
        ritualMode: 'ACTIVE',
        attestation: {
          ...attestation,
          subjectReceiptId: satelliteReceipts.eq || attestation.subjectReceiptId
        }
      });
      if (er.ok && er.receipt?.receiptId) {
        prefixes.push(er.receipt.receiptId.slice(0, 8));
        satelliteReceipts.er = er.receipt.receiptId;
      }
    }

    return { prefixes, satelliteReceipts };
  }

  async govern(input = {}) {
    const gateRes = this.policyGate.evaluatePreconditions(input);
    const sats = await this.observeSatellites();
    const chainObserveBase = {
      eoObserved: !!sats.eo.observed,
      epObserved: !!sats.ep.observed,
      eqObserved: !!sats.eq.observed,
      erObserved: !!sats.er.observed
    };

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder37SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: input.changeId || 'eos-ladder-37-mission-es',
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
      const holdReceipt = buildLadder37SeamReceipt({
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
      return { ok:true, decision:'HOLD', code:ES_CODES.HOLD, receipt:holdReceipt, satellites:chainObserveBase };
    }

    const { prefixes, satelliteReceipts } = await this.chainGovern(input, sats);
    const passReceipt = buildLadder37SeamReceipt({
      planId: input.planId,
      changeId: input.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      operation: 'LADDER37_SEAM_PACK_CLOSEOUT',
      seamDigest: sha256Canonical(JSON.stringify({ planId: input.planId, prefixes, pin: ES_FREEZE_PIN_SHORT })),
      chainObserve: { ...chainObserveBase, prefixes },
      satelliteReceipts,
      prevReceiptHash: this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64)
    });
    this.trail.push(passReceipt);
    return {
      ok: true,
      decision: 'PASS',
      code: ES_CODES.OK,
      receipt: passReceipt,
      satellites: chainObserveBase,
      verify: verifyLadder37SeamReceipt(passReceipt)
    };
  }
}

export { verifyLadder37SeamReceipt, ES_CODES, ES_FREEZE_PIN_SHORT };