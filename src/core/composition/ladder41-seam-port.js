/**
 * @module ladder41-seam-port
 * SPEC-0175 / Mission FM — Ladder 41 CI Seam-Pack Consolidation & Closeout Port.
 * Soft-imports the FI/FJ/FK/FL satellites when present; soft-fail safe; present true|false.
 * Seals FM-RCPT-*. Does NOT tip-seal L41. Soft-observe pin: f5948926.
 * PRODUCTION_READY: NO · L41 remains OPEN until tip-seal (NOT this package).
 * Distinct from FH L40 seam / FC L39 seam / FI–FL satellites.
 *
 * Law VI: seals opaque chain booleans, labels and spec ordinals only —
 * never payload bytes, never secrets, never a false SEAM_PACK over a partial chain.
 * Never auto-closes L41 without humanGateHeld; never tip-seals in the product package.
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import {
  FM_PRODUCTION_READY,
  FM_CHAIN_ORDER,
  FM_SATELLITE_SPECS,
  FM_FREEZE_PIN_SHORT,
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
  const roots = [];
  for (const mission of ['fi', 'fj', 'fk', 'fl']) {
    roots.push(path.join(boxRoot, `eos-mission-${mission}`, 'src', 'core', 'composition'));
    roots.push(`/workspace/eos-mission-${mission}/src/core/composition`);
  }
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

async function observeSatellite(fileName, kind) {
  const r = await softImportModule(fileName);
  if (!r.observed) return { present: false, observed: false };
  return {
    present: true,
    observed: true,
    module: fileName,
    kind: r.mod?.[kind] || null,
    productionReady: r.mod?.PRODUCTION_READY || FM_PRODUCTION_READY
  };
}

export async function softObserveFi() {
  return observeSatellite(
    'bidirectional-delivery-correlation-registry-port.js',
    'FI_PORT_KIND'
  );
}

export async function softObserveFj() {
  return observeSatellite('round-trip-request-reply-integrity-port.js', 'FJ_PORT_KIND');
}

export async function softObserveFk() {
  return observeSatellite('bidirectional-mismatch-quarantine-deny-port.js', 'FK_PORT_KIND');
}

export async function softObserveFl() {
  return observeSatellite(
    'bidirectional-delivery-honesty-attestation-port.js',
    'FL_PORT_KIND'
  );
}

function resolveChainFlag(override, observed) {
  if (override && typeof override === 'object' && typeof override[observed.member] === 'boolean') {
    return override[observed.member];
  }
  return observed.present === true;
}

export class Ladder41SeamPort {
  /**
   * @param {object} [opts]
   * @param {Ladder41SeamPolicyGate} [opts.policyGate]
   */
  constructor(opts = {}) {
    this.policyGate = opts.policyGate || new Ladder41SeamPolicyGate();
    this.trail = [];
    this.productionReady = FM_PORT_PRODUCTION_READY;
  }

  async observeSatellites() {
    const [fi, fj, fk, fl] = await Promise.all([
      softObserveFi(),
      softObserveFj(),
      softObserveFk(),
      softObserveFl()
    ]);
    return { fi, fj, fk, fl };
  }

  buildSeam(input, sats) {
    const override = input.observed && typeof input.observed === 'object' ? input.observed : null;
    const chain = {};
    for (const member of FM_CHAIN_ORDER) {
      chain[member.toLowerCase()] = resolveChainFlag(override, {
        member: member.toLowerCase(),
        present: sats[member.toLowerCase()]?.present === true
      });
    }
    const observedChainComplete = FM_CHAIN_ORDER.every((m) => chain[m.toLowerCase()] === true);
    return {
      chain,
      chainOrder: [...FM_CHAIN_ORDER],
      satelliteSpecs: [...FM_SATELLITE_SPECS],
      seamClass: input.seamClass || 'SEAM_PACK',
      desiredSeal: input.desiredSeal || (observedChainComplete ? 'SEAM_PACK' : 'HOLD'),
      observedChainComplete,
      humanGateHeld: input.humanGateHeld === true,
      closeoutClaimed: input.closeoutClaimed === true
    };
  }

  chainObserveBase(sats) {
    return {
      fiPresent: sats.fi.present === true,
      fjPresent: sats.fj.present === true,
      fkPresent: sats.fk.present === true,
      flPresent: sats.fl.present === true
    };
  }

  /**
   * Governed Ladder 41 seam-pack consolidation ritual.
   * @param {object} input
   * @param {object} [input.observed] optional opaque chain override {fi,fj,fk,fl}
   * @returns {Promise<{ ok:boolean, decision:string, code?:string, reason?:string, receipt:object, satellites:object }>}
   */
  async seam(input = {}) {
    const sats = await this.observeSatellites();
    const chainObserve = this.chainObserveBase(sats);
    const plan = {
      changeId: 'eos-ladder-41-mission-fm',
      ...input,
      seam: input.seam !== undefined ? input.seam : this.buildSeam(input, sats)
    };

    const gateRes = this.policyGate.evaluatePreconditions(plan);
    const prevReceiptHash =
      this.trail.length > 0 ? this.trail[this.trail.length - 1].receiptHash : '0'.repeat(64);

    if (!gateRes.ok) {
      const deniedReceipt = buildLadder41SeamReceipt({
        planId: input.planId || 'plan-denied',
        changeId: plan.changeId,
        decision: 'DENY',
        ritualMode: input.ritualMode || 'ACTIVE',
        seam: plan.seam && typeof plan.seam === 'object' ? plan.seam : null,
        seamDigest: sha256Canonical(JSON.stringify({ denied: true, code: gateRes.code })),
        prevReceiptHash
      });
      this.trail.push(deniedReceipt);
      return {
        ok: false,
        decision: 'DENY',
        code: gateRes.code,
        reason: gateRes.reason,
        receipt: deniedReceipt,
        satellites: chainObserve
      };
    }

    if (input.ritualMode === 'HOLD' || gateRes.decision === 'HOLD') {
      const holdReceipt = buildLadder41SeamReceipt({
        planId: input.planId,
        changeId: plan.changeId,
        decision: 'HOLD',
        ritualMode: 'HOLD',
        seam: plan.seam && typeof plan.seam === 'object' ? plan.seam : null,
        seamDigest: sha256Canonical(JSON.stringify({ mode: 'HOLD' })),
        prevReceiptHash
      });
      this.trail.push(holdReceipt);
      return {
        ok: true,
        decision: 'HOLD',
        code: FM_CODES.HOLD,
        reason: gateRes.reason,
        receipt: holdReceipt,
        satellites: chainObserve
      };
    }

    const sealedSeam = {
      ...plan.seam,
      sealed: true,
      failClosed: true,
      hermeticInMemoryOnly: true,
      governedSealOnly: true,
      noPayloadCopy: true,
      consumesFiCorrelationRegistry: true,
      consumesFjRoundTripIntegrity: true,
      consumesFkMismatchQuarantine: true,
      consumesFlHonestyAttestation: true,
      distinctFromFiCorrelationRegistry: true,
      distinctFromFjRoundTripIntegrity: true,
      distinctFromFkMismatchQuarantine: true,
      distinctFromFlHonestyAttestation: true,
      distinctFromFhLadder40SeamPack: true
    };

    const passReceipt = buildLadder41SeamReceipt({
      planId: input.planId,
      changeId: plan.changeId,
      decision: 'PASS',
      ritualMode: 'ACTIVE',
      seam: sealedSeam,
      seamDigest: computeSeamDigest(sealedSeam),
      prevReceiptHash
    });

    this.trail.push(passReceipt);

    return {
      ok: true,
      decision: 'PASS',
      code: FM_CODES.OK,
      reason:
        'Hermetic Ladder 41 seam-pack consolidation receipt sealed (≠ tip-refresh ≠ tip-seal ≠ Formal L41 CLOSED ≠ PRODUCTION_READY).',
      receipt: passReceipt,
      satellites: chainObserve,
      verify: verifyLadder41SeamReceipt(passReceipt)
    };
  }

  /** Alias of seam() — mirrors the sibling port vocabulary. */
  async govern(input = {}) {
    return this.seam(input);
  }

  /**
   * Verifies the cryptographic chain integrity of the port's receipt trail.
   * @returns {{ ok: boolean, verifiedCount: number, error?: string }}
   */
  verifyTrail() {
    let prevHash = '0'.repeat(64);
    for (let i = 0; i < this.trail.length; i += 1) {
      const receipt = this.trail[i];
      const validRes = verifyLadder41SeamReceipt(receipt);
      if (!validRes.ok) {
        return { ok: false, verifiedCount: i, error: `Invalid receipt at ${i}: ${validRes.reason}` };
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

export { verifyLadder41SeamReceipt, FM_CODES, FM_FREEZE_PIN_SHORT, computeSeamDigest, sha256Canonical };
void FM_PRODUCTION_READY;
