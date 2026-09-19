/**
 * @module evidence-trail-receipt
 * SPEC-0101 / Mission CR — Evidence Trail Ritual Binding Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, trailId,
 *     trailDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen, not hashed as seal body alone):
 *   trailMode (FIXTURE|LIVE), linkCount, verifyResult?,
 *   linksSummary?, reasons[], trailSealHash?, meta?
 *
 * NON-CLAIM:
 *   Evidence Trail Ritual Binding Port ≠ SIEM / ≠ production data lake /
 *   ≠ WORM SaaS / ≠ Sigstore / ≠ GHE enforcement /
 *   ≠ auto-close L26 / ≠ new schemas JSON /
 *   ≠ Fundacion writes (Δ=0) / ≠ PRODUCTION_READY=YES /
 *   ≠ L27 closeout.
 *   L17–L26 CLOSED never reopen (NEVER reopen L26);
 *   L27 OPEN (Audit MEASURED · CQ MEASURED · CR in progress · CS–CU pending);
 *   Axis: Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric;
 *   Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals;
 * never seal secrets. MODULE_DIR = src/core/evidence.
 *
 * PRODUCTION_READY: NO
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const CR_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const CR_RECEIPT_PRODUCTION_READY = 'NO';

/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const CR_RECEIPT_KIND = 'eos-evidence-trail-receipt';

export const CR_DECISIONS = Object.freeze(['PASS', 'DENY']);

export const CR_TRAIL_MODES = Object.freeze(['FIXTURE', 'LIVE']);

export const CR_TRAIL_KIND = 'eos-evidence-trail-cl-cm-cn';

export const CR_PORT_ORDER = Object.freeze(['CL', 'CM', 'CN']);

/**
 * Stable JSON stringify (sorted keys) for deterministic digests.
 * @param {unknown} value
 * @returns {string}
 */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeys(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(value).sort()) {
    out[k] = sortKeys(/** @type {Record<string, unknown>} */ (value)[k]);
  }
  return out;
}

/**
 * sha256 hex digest of canonical payload (node:crypto).
 * @param {unknown} payload
 * @returns {string}
 */
export function sha256Canonical(payload) {
  const s = typeof payload === 'string' ? payload : stableStringify(payload);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Alias used by injectable hash opts. */
export function defaultHash(payload) {
  return sha256Canonical(payload);
}

let _rcptSeq = 0;

/**
 * Reset in-process receipt sequence (tests only).
 */
export function _resetReceiptSeqForTests() {
  _rcptSeq = 0;
}

/**
 * Canonical seal body for a single trail link hop (used for prevLinkHash chain).
 * @param {object} link
 * @returns {object}
 */
export function canonicalLinkSealBody(link = {}) {
  return {
    seq: link.seq != null ? Number(link.seq) : null,
    port: link.port != null ? String(link.port) : null,
    receiptId: link.receiptId != null ? String(link.receiptId) : null,
    receiptHash:
      link.receiptHash != null && link.receiptHash !== ''
        ? String(link.receiptHash)
        : null,
    planId: link.planId != null ? String(link.planId) : null,
    decision: link.decision != null ? String(link.decision) : null,
    inputsDigest:
      link.inputsDigest != null && link.inputsDigest !== ''
        ? String(link.inputsDigest)
        : null,
    outputsDigest:
      link.outputsDigest != null && link.outputsDigest !== ''
        ? String(link.outputsDigest)
        : null,
    prevLinkHash:
      link.prevLinkHash != null && link.prevLinkHash !== ''
        ? String(link.prevLinkHash)
        : null
  };
}

/**
 * Hash a link seal body for chain linkage.
 * @param {object} link
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashLinkSeal(link, hashFn = sha256Canonical) {
  return hashFn(canonicalLinkSealBody(link));
}

/**
 * Canonical EvidenceTrail seal body (design §3.10) for trailSealHash.
 * @param {object} trail
 * @returns {object}
 */
export function canonicalTrailSealBody(trail = {}) {
  const links = Array.isArray(trail.links)
    ? trail.links.map((l) => ({
        seq: l?.seq != null ? Number(l.seq) : null,
        port: l?.port != null ? String(l.port) : null,
        receiptId: l?.receiptId != null ? String(l.receiptId) : null,
        receiptHash:
          l?.receiptHash != null && l.receiptHash !== ''
            ? String(l.receiptHash)
            : null,
        prevLinkHash:
          l?.prevLinkHash != null && l.prevLinkHash !== ''
            ? String(l.prevLinkHash)
            : null
      }))
    : [];

  return {
    trailId: trail.trailId != null ? String(trail.trailId) : null,
    decision: trail.decision != null ? String(trail.decision) : null,
    timestamp: trail.timestamp != null ? String(trail.timestamp) : null,
    operatorId:
      trail.operator?.id != null ? String(trail.operator.id) : null,
    operatorMachineId:
      trail.operator?.machineId != null
        ? String(trail.operator.machineId)
        : null,
    ladder:
      trail.portIdentity?.ladder != null
        ? Number(trail.portIdentity.ladder)
        : null,
    ladderStatus:
      trail.portIdentity?.ladderStatus != null
        ? String(trail.portIdentity.ladderStatus)
        : null,
    freezeMainTip:
      trail.revisionFreezeIdentity?.freezeMainTip != null
        ? String(trail.revisionFreezeIdentity.freezeMainTip)
        : null,
    tipSealSha:
      trail.revisionFreezeIdentity?.tipSealSha != null
        ? String(trail.revisionFreezeIdentity.tipSealSha)
        : null,
    headSha:
      trail.revisionFreezeIdentity?.headSha != null &&
      trail.revisionFreezeIdentity.headSha !== ''
        ? String(trail.revisionFreezeIdentity.headSha)
        : null,
    dirtyTree: trail.revisionFreezeIdentity?.dirtyTree === true,
    links,
    productionReady: 'NO',
    fundacionDelta: 0
  };
}

/**
 * @param {object} trail
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashTrailSeal(trail, hashFn = sha256Canonical) {
  return hashFn(canonicalTrailSealBody(trail));
}

/**
 * Build a well-formed CL→CM→CN trail with correct prevLinkHash chain.
 * Used by hermetic tests / fixtureMode plans. Does not mutate CL/CM/CN state.
 *
 * @param {object} [overrides]
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {object}
 */
export function buildChainedEvidenceTrail(overrides = {}, hashFn = sha256Canonical) {
  const digests = {
    clReceipt: hashFn('cr-fixture-cl-receipt'),
    clIn: hashFn('cr-fixture-cl-in'),
    clOut: hashFn('cr-fixture-cl-out'),
    cmReceipt: hashFn('cr-fixture-cm-receipt'),
    cmIn: hashFn('cr-fixture-cm-in'),
    cmOut: hashFn('cr-fixture-cm-out'),
    cnReceipt: hashFn('cr-fixture-cn-receipt'),
    cnIn: hashFn('cr-fixture-cn-in'),
    cnOut: hashFn('cr-fixture-cn-out')
  };

  const linkCL = {
    seq: 1,
    port: 'CL',
    receiptId: 'CL-RCPT-FIXTURE-0001',
    receiptHash: digests.clReceipt,
    planId: 'FIXTURE-CL-PLAN-SPEC-0095',
    decision: 'PASS',
    timestamp: '2026-09-19T00:40:00-05:00',
    inputsDigest: digests.clIn,
    outputsDigest: digests.clOut,
    prevLinkHash: null,
    crossPortRefs: {
      clLinkDigest: digests.clOut,
      cmClaimsDigest: null,
      priorReceiptHash: null
    },
    explicitNonClaims: [
      '≠ full LSP/IDE product',
      'PRODUCTION_READY=NO',
      'Fundacion Δ=0'
    ]
  };

  const prevCM = hashLinkSeal(linkCL, hashFn);
  const linkCM = {
    seq: 2,
    port: 'CM',
    receiptId: 'CM-RCPT-FIXTURE-0001',
    receiptHash: digests.cmReceipt,
    planId: 'FIXTURE-CM-PLAN-SPEC-0096',
    decision: 'PASS',
    timestamp: '2026-09-19T00:40:30-05:00',
    inputsDigest: digests.cmIn,
    outputsDigest: digests.cmOut,
    prevLinkHash: prevCM,
    crossPortRefs: {
      clLinkDigest: digests.clOut,
      cmClaimsDigest: digests.cmOut,
      priorReceiptHash: null
    },
    explicitNonClaims: [
      '≠ SIEM / data lake',
      'PRODUCTION_READY=NO',
      'Fundacion Δ=0'
    ]
  };

  const prevCN = hashLinkSeal(linkCM, hashFn);
  const linkCN = {
    seq: 3,
    port: 'CN',
    receiptId: 'CN-RCPT-FIXTURE-0001',
    receiptHash: digests.cnReceipt,
    planId: 'FIXTURE-CN-PLAN-SPEC-0097',
    decision: 'PASS',
    timestamp: '2026-09-19T00:41:00-05:00',
    inputsDigest: digests.cnIn,
    outputsDigest: digests.cnOut,
    prevLinkHash: prevCN,
    crossPortRefs: {
      clLinkDigest: digests.clOut,
      cmClaimsDigest: digests.cmOut,
      priorReceiptHash: null
    },
    explicitNonClaims: [
      '≠ Sigstore product',
      'PRODUCTION_READY=NO',
      'Fundacion Δ=0'
    ]
  };

  const base = {
    kind: CR_TRAIL_KIND,
    schemaVersion: '0.1.0',
    trailId: 'EVD-TRAIL-FIXTURE-2026-09-19-CL-CM-CN',
    decision: 'PASS',
    timestamp: '2026-09-19T00:41:30-05:00',
    sampleOnly: true,
    productionReady: 'NO',
    fundacionDelta: 0,
    operator: {
      id: 'valentin.florez',
      role: 'owner',
      machineId: '77c24295-69bc-4113-82ab-1d8f0359a5e7'
    },
    portIdentity: {
      ladder: 26,
      ladderStatus: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      ports: [
        {
          port: 'CL',
          specId: 'SPEC-0095',
          mission: 'CL',
          receiptKind: 'eos-spec-code-traceability-receipt',
          receiptPrefix: 'CL-RCPT-',
          l26Status: 'MEASURED',
          npmScript: 'test:mission-cl'
        },
        {
          port: 'CM',
          specId: 'SPEC-0096',
          mission: 'CM',
          receiptKind: 'eos-evidence-binding-receipt',
          receiptPrefix: 'CM-RCPT-',
          l26Status: 'MEASURED',
          npmScript: 'test:mission-cm'
        },
        {
          port: 'CN',
          specId: 'SPEC-0097',
          mission: 'CN',
          receiptKind: 'eos-artifact-attestation-receipt',
          receiptPrefix: 'CN-RCPT-',
          l26Status: 'MEASURED',
          npmScript: 'test:mission-cn'
        }
      ]
    },
    revisionFreezeIdentity: {
      freezeMainTip: '47cf1a790c95f78a79e34830c4d6515d16dc67d0',
      tipSealSha: 'b7b844787cf4703c389751e8c1e0fa063870f5ad',
      tipSealPr: 366,
      headSha: hashFn('fixture-head-aligned'),
      headFreezeLag: 'ALIGNED',
      dirtyTree: false,
      hostPath: 'C:\\Users\\valen\\Documents\\Eos system'
    },
    links: [linkCL, linkCM, linkCN],
    inputs: {
      clPlanRef: 'fixtures/FIXTURE-CL-PLAN-SPEC-0095',
      cmPlanRef: 'fixtures/FIXTURE-CM-PLAN-SPEC-0096',
      cnPlanRef: 'fixtures/FIXTURE-CN-PLAN-SPEC-0097',
      evidencePaths: [
        'fixtures/evidence-trail-cl-cm-cn.sample.json'
      ],
      fixtureMode: true
    },
    outputs: {
      trailPath: null,
      summary:
        'Hermetic CL→CM→CN append-only trail for Mission CR (SPEC-0101); not host-live custody.',
      linkCount: 3,
      verifyResult: { ok: true }
    },
    nonClaims: [
      'sampleOnly / fixtureMode — NOT host-live custody by default',
      'No CL/CM/CN port state changed',
      '≠ SIEM / ≠ production data lake / ≠ WORM / ≠ Sigstore / ≠ GHE',
      'PRODUCTION_READY=NO',
      'Fundacion Δ=0',
      'Law VI held',
      'L17–L26 never reopen; port green ≠ L27 closeout'
    ],
    appendOnly: {
      order: ['CL', 'CM', 'CN'],
      mutationPolicy: 'append-only',
      rewriteForbidden: true,
      chainRule:
        'links[i].prevLinkHash must equal hash(links[i-1] seal body); links[0].prevLinkHash=null'
    },
    security: {
      lawVI: 'HELD',
      hashAlg: 'sha256',
      network: 'none',
      replayProtection: {
        trailIdUnique: true,
        sealHashDuplicateAsNewId: 'DENY',
        inPlaceVerify: 'ALLOW',
        mutateSealedLinks: 'DENY'
      }
    },
    reasons: []
  };

  const merged = deepMergeTrail(base, overrides);
  merged.trailSealHash = hashTrailSeal(merged, hashFn);
  if (merged.outputs && typeof merged.outputs === 'object') {
    merged.outputs.linkCount = Array.isArray(merged.links)
      ? merged.links.length
      : 0;
  }
  return merged;
}

/**
 * Shallow-deep merge for trail overrides (links/revisionFreezeIdentity replace or merge).
 * @param {object} base
 * @param {object} overrides
 * @returns {object}
 */
function deepMergeTrail(base, overrides) {
  if (!overrides || typeof overrides !== 'object') {
    return structuredClone(base);
  }
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) continue;
    if (
      v != null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      out[k] != null &&
      typeof out[k] === 'object' &&
      !Array.isArray(out[k])
    ) {
      out[k] = { ...out[k], ...v };
    } else {
      out[k] = Array.isArray(v) ? v.map((x) => (typeof x === 'object' && x != null ? { ...x } : x)) : v;
    }
  }
  return out;
}

/**
 * Build canonical seal body (the nine fields hashed for custody).
 * @param {object} fields
 * @returns {object}
 */
export function canonicalEvidenceTrailSealBody(fields = {}) {
  return {
    receiptId: fields.receiptId != null ? String(fields.receiptId) : null,
    operation: fields.operation != null ? String(fields.operation) : null,
    planId: fields.planId != null ? String(fields.planId) : null,
    decision: fields.decision != null ? String(fields.decision) : null,
    trailId: fields.trailId != null ? String(fields.trailId) : null,
    trailDigest:
      fields.trailDigest != null && fields.trailDigest !== ''
        ? String(fields.trailDigest)
        : null,
    timestamp: fields.timestamp != null ? String(fields.timestamp) : null,
    fundacionDelta: 0,
    prevReceiptHash:
      fields.prevReceiptHash != null && fields.prevReceiptHash !== ''
        ? String(fields.prevReceiptHash)
        : null
  };
}

/**
 * Compute receiptHash over the canonical nine fields.
 * @param {object} fields
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {string}
 */
export function hashEvidenceTrailReceipt(fields, hashFn = sha256Canonical) {
  const body = canonicalEvidenceTrailSealBody(fields);
  return hashFn(body);
}

/**
 * Verify a sealed receipt's self-consistency and receiptHash.
 * @param {object} receipt
 * @param {(payload: unknown) => string} [hashFn]
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyEvidenceTrailReceipt(receipt, hashFn = sha256Canonical) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'receipt must be a non-null object' };
  }

  if (receipt.kind !== CR_RECEIPT_KIND) {
    return {
      ok: false,
      reason: `kind mismatch: expected ${CR_RECEIPT_KIND}, got ${receipt.kind}`
    };
  }

  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  if (receipt.fundacionDelta !== 0) {
    return {
      ok: false,
      reason: `fundacionDelta must be 0, got ${receipt.fundacionDelta}`
    };
  }

  if (!receipt.receiptId || !String(receipt.receiptId).startsWith('CR-RCPT-')) {
    return { ok: false, reason: 'receiptId must start with CR-RCPT-' };
  }

  if (!CR_DECISIONS.includes(String(receipt.decision))) {
    return {
      ok: false,
      reason: `decision must be one of ${CR_DECISIONS.join('|')}`
    };
  }

  const expectedHash = hashEvidenceTrailReceipt(receipt, hashFn);
  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}

/**
 * Build a sealed CR-RCPT-* receipt.
 * @param {object} fields
 * @param {object} [opts]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {() => string} [opts.now]
 * @returns {object} Sealed immutable receipt
 */
export function buildEvidenceTrailReceipt(fields = {}, opts = {}) {
  const hashFn = opts.hash || sha256Canonical;
  const nowFn = opts.now || (() => new Date().toISOString());

  _rcptSeq += 1;
  const ts = fields.timestamp || nowFn();
  const receiptId =
    fields.receiptId ||
    `CR-RCPT-${ts.slice(0, 10).replace(/-/g, '')}-${String(_rcptSeq).padStart(4, '0')}`;

  const reasons = Array.isArray(fields.reasons)
    ? fields.reasons.map((r) => String(r))
    : [];

  const trailMode =
    fields.trailMode != null &&
    CR_TRAIL_MODES.includes(String(fields.trailMode).toUpperCase())
      ? String(fields.trailMode).toUpperCase()
      : fields.trailMode != null
        ? String(fields.trailMode)
        : null;

  const trailDigest =
    fields.trailDigest != null && fields.trailDigest !== ''
      ? String(fields.trailDigest)
      : hashFn({
          trailId: fields.trailId || null,
          trailMode,
          linkCount: fields.linkCount ?? null,
          decision: fields.decision || null
        });

  const body = canonicalEvidenceTrailSealBody({
    receiptId,
    operation: fields.operation || 'VERIFY',
    planId: fields.planId || null,
    decision: fields.decision || 'DENY',
    trailId: fields.trailId || null,
    trailDigest,
    timestamp: ts,
    fundacionDelta: 0,
    prevReceiptHash: fields.prevReceiptHash || null
  });

  const receiptHash = hashFn(body);

  const verifyResult =
    fields.verifyResult && typeof fields.verifyResult === 'object'
      ? Object.freeze({ ...fields.verifyResult })
      : null;

  const linksSummary = Array.isArray(fields.linksSummary)
    ? Object.freeze(
        fields.linksSummary.map((l) =>
          Object.freeze({
            seq: l?.seq ?? null,
            port: l?.port != null ? String(l.port) : null,
            receiptId: l?.receiptId != null ? String(l.receiptId) : null,
            decision: l?.decision != null ? String(l.decision) : null
          })
        )
      )
    : Object.freeze([]);

  return Object.freeze({
    kind: CR_RECEIPT_KIND,
    productionReady: 'NO',
    ...body,
    trailMode,
    linkCount:
      fields.linkCount != null
        ? Number(fields.linkCount)
        : linksSummary.length,
    verifyResult,
    linksSummary,
    reasons: Object.freeze([...reasons]),
    trailSealHash:
      fields.trailSealHash != null && fields.trailSealHash !== ''
        ? String(fields.trailSealHash)
        : null,
    meta: Object.freeze({ ...(fields.meta || {}) }),
    receiptHash,
    nonClaims: Object.freeze({
      siem: false,
      productionDataLake: false,
      wormSaas: false,
      sigstore: false,
      gheEnforcement: false,
      autoCloseL26: false,
      newSchemasJson: false,
      fundacionTouch: false,
      productionReady: false,
      l27Closeout: false
    })
  });
}

export default {
  CR_PRODUCTION_READY,
  CR_RECEIPT_PRODUCTION_READY,
  PRODUCTION_READY,
  CR_RECEIPT_KIND,
  CR_DECISIONS,
  CR_TRAIL_MODES,
  CR_TRAIL_KIND,
  CR_PORT_ORDER,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalLinkSealBody,
  hashLinkSeal,
  canonicalTrailSealBody,
  hashTrailSeal,
  buildChainedEvidenceTrail,
  canonicalEvidenceTrailSealBody,
  hashEvidenceTrailReceipt,
  verifyEvidenceTrailReceipt,
  buildEvidenceTrailReceipt,
  _resetReceiptSeqForTests
};
