/**
 * @module evidence-trail-port
 * SPEC-0101 / Mission CR — Evidence Trail Ritual Binding Port.
 * Pure Layer-0 Node.js built-ins (node:crypto). Never seal secrets.
 *
 * Hermetic evidence-trail port:
 *   - Validates verify plan via policy gate
 *   - Append-only CL→CM→CN linkage validation (fail-closed)
 *   - Decision: PASS | DENY
 *   - Seals CR-RCPT-* receipts
 *   - Uses sample/fixture trails; does NOT mutate CL/CM/CN state
 *   - No network / no GH API / no new docs/schemas/*.json
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

import {
  CR_PRODUCTION_READY,
  CR_RECEIPT_KIND,
  CR_PORT_ORDER,
  CR_TRAIL_KIND,
  sha256Canonical,
  hashLinkSeal,
  hashTrailSeal,
  buildEvidenceTrailReceipt,
  verifyEvidenceTrailReceipt
} from './evidence-trail-receipt.js';

import {
  EvidenceTrailPolicyGate,
  CR_CODES
} from './evidence-trail-policy-gate.js';

/** @type {'NO'} */
export const CR_PORT_PRODUCTION_READY = 'NO';

export const CR_PORT_KIND = 'eos-evidence-trail-port';

const RECEIPT_PREFIX = Object.freeze({
  CL: 'CL-RCPT-',
  CM: 'CM-RCPT-',
  CN: 'CN-RCPT-'
});

const LIVE_FORBIDDEN_LAG = Object.freeze([
  'BEHIND',
  'DIVERGED',
  'UNMEASURED'
]);

/**
 * Validate append-only CL→CM→CN trail document (fail-closed).
 * Does not mutate the trail or any CL/CM/CN port state.
 *
 * @param {object} trail
 * @param {string} trailMode FIXTURE|LIVE
 * @param {(payload: unknown) => string} hashFn
 * @param {Set<string>} [seenSealHashes] replay registry
 * @returns {{ ok: boolean, code: string, reason?: string, failedAt?: string, verifyResult: object, trailSealHash?: string, linksSummary: object[] }}
 */
export function validateEvidenceTrail(
  trail,
  trailMode,
  hashFn = sha256Canonical,
  seenSealHashes = null
) {
  const linksSummary = [];

  if (!trail || typeof trail !== 'object') {
    return denyResult(CR_CODES.UNVERIFIABLE_DENY, 'UNVERIFIABLE', 'trail unverifiable');
  }

  if (String(trail.kind || '') !== CR_TRAIL_KIND) {
    return denyResult(
      CR_CODES.SCHEMA_KIND_DENY,
      'SCHEMA',
      `kind must be ${CR_TRAIL_KIND}`
    );
  }

  if (trail.productionReady != null && String(trail.productionReady) !== 'NO') {
    return denyResult(
      CR_CODES.NON_CLAIM_VIOLATION_DENY,
      'SCHEMA',
      'productionReady must be NO'
    );
  }

  if (trail.fundacionDelta != null && Number(trail.fundacionDelta) !== 0) {
    return denyResult(
      CR_CODES.NON_CLAIM_VIOLATION_DENY,
      'SCHEMA',
      'fundacionDelta must be 0'
    );
  }

  if (!Array.isArray(trail.links) || trail.links.length !== 3) {
    return denyResult(
      CR_CODES.MISSING_LINKS_DENY,
      'CL',
      `links.length must be 3 (CL→CM→CN); got ${trail.links?.length ?? 0}`
    );
  }

  // Order + seq + receipt prefix
  for (let i = 0; i < 3; i++) {
    const link = trail.links[i];
    const expectedPort = CR_PORT_ORDER[i];
    if (!link || typeof link !== 'object') {
      return denyResult(
        CR_CODES.MISSING_LINKS_DENY,
        expectedPort,
        `missing link at seq ${i + 1}`
      );
    }
    if (Number(link.seq) !== i + 1 || String(link.port) !== expectedPort) {
      return denyResult(
        CR_CODES.ORDER_VIOLATION_DENY,
        expectedPort,
        `order violation: expected seq=${i + 1} port=${expectedPort}, got seq=${link.seq} port=${link.port}`
      );
    }
    const prefix = RECEIPT_PREFIX[expectedPort];
    if (
      !link.receiptId ||
      !String(link.receiptId).startsWith(prefix)
    ) {
      return denyResult(
        CR_CODES.UNVERIFIABLE_DENY,
        expectedPort,
        `receiptId must start with ${prefix}`
      );
    }
    if (!link.receiptHash || String(link.receiptHash).length !== 64) {
      return denyResult(
        CR_CODES.MISMATCHED_HASH_DENY,
        expectedPort,
        'receiptHash missing or not sha256 hex length'
      );
    }
    if (String(link.decision) !== 'PASS') {
      return denyResult(
        CR_CODES.PORT_DECISION_DENY,
        expectedPort,
        `hop ${expectedPort} decision is ${link.decision} (trail PASS requires all PASS)`
      );
    }
    linksSummary.push({
      seq: Number(link.seq),
      port: String(link.port),
      receiptId: String(link.receiptId),
      decision: String(link.decision)
    });
  }

  // Append-only prevLinkHash chain
  if (trail.links[0].prevLinkHash != null && trail.links[0].prevLinkHash !== '') {
    return denyResult(
      CR_CODES.CHAIN_BREAK_DENY,
      'CHAIN',
      'CL (seq=1) prevLinkHash must be null'
    );
  }

  for (let i = 1; i < 3; i++) {
    const prev = trail.links[i - 1];
    const cur = trail.links[i];
    const expected = hashLinkSeal(prev, hashFn);
    const got =
      cur.prevLinkHash != null && cur.prevLinkHash !== ''
        ? String(cur.prevLinkHash)
        : null;
    if (got !== expected) {
      return denyResult(
        CR_CODES.CHAIN_BREAK_DENY,
        'CHAIN',
        `prevLinkHash mismatch at ${CR_PORT_ORDER[i]}: expected ${expected}, got ${got}`
      );
    }
  }

  // Cross-port refs
  const cl = trail.links[0];
  const cm = trail.links[1];
  const cn = trail.links[2];
  const clOut = cl.outputsDigest != null ? String(cl.outputsDigest) : null;
  const cmOut = cm.outputsDigest != null ? String(cm.outputsDigest) : null;

  if (
    cm.crossPortRefs?.clLinkDigest != null &&
    String(cm.crossPortRefs.clLinkDigest) !== clOut
  ) {
    return denyResult(
      CR_CODES.CROSS_PORT_MISMATCH_DENY,
      'CM',
      'CM crossPortRefs.clLinkDigest does not match CL outputsDigest'
    );
  }
  if (
    cn.crossPortRefs?.cmClaimsDigest != null &&
    String(cn.crossPortRefs.cmClaimsDigest) !== cmOut
  ) {
    return denyResult(
      CR_CODES.CROSS_PORT_MISMATCH_DENY,
      'CN',
      'CN crossPortRefs.cmClaimsDigest does not match CM outputsDigest'
    );
  }
  if (
    cn.crossPortRefs?.clLinkDigest != null &&
    clOut != null &&
    String(cn.crossPortRefs.clLinkDigest) !== clOut
  ) {
    return denyResult(
      CR_CODES.CROSS_PORT_MISMATCH_DENY,
      'CN',
      'CN crossPortRefs.clLinkDigest does not match CL outputsDigest'
    );
  }

  // LIVE mode fail-closed gates
  const freeze = trail.revisionFreezeIdentity || {};
  if (trailMode === 'LIVE') {
    if (trail.sampleOnly === true) {
      return denyResult(
        CR_CODES.SAMPLE_AS_LIVE_DENY,
        'SCHEMA',
        'sampleOnly=true presented as LIVE trail (fail-closed)'
      );
    }
    if (freeze.dirtyTree === true) {
      return denyResult(
        CR_CODES.DIRTY_TREE_DENY,
        'DIRTY',
        'dirtyTree=true on LIVE trail (fail-closed)'
      );
    }
    const lag =
      freeze.headFreezeLag != null
        ? String(freeze.headFreezeLag).toUpperCase()
        : 'UNMEASURED';
    if (LIVE_FORBIDDEN_LAG.includes(lag) || freeze.headSha == null) {
      return denyResult(
        CR_CODES.FREEZE_LAG_DENY,
        'FREEZE',
        `LIVE trail refuses headFreezeLag=${lag} / null headSha`
      );
    }
  }

  // Optional recorded trailSealHash integrity
  const computedSeal = hashTrailSeal(trail, hashFn);
  if (
    trail.trailSealHash != null &&
    String(trail.trailSealHash).trim() !== '' &&
    String(trail.trailSealHash) !== computedSeal
  ) {
    return denyResult(
      CR_CODES.MISMATCHED_HASH_DENY,
      'CHAIN',
      `trailSealHash mismatch: expected ${computedSeal}, got ${trail.trailSealHash}`
    );
  }

  // Replay: same seal body under registry as already seen with different trailId
  if (seenSealHashes && seenSealHashes instanceof Set) {
    if (seenSealHashes.has(computedSeal)) {
      return denyResult(
        CR_CODES.REPLAY_DENY,
        'REPLAY',
        'trailSealHash replay / duplicate seal body refused'
      );
    }
  }

  // appendOnly order honesty when present
  if (trail.appendOnly?.order) {
    const order = trail.appendOnly.order;
    if (
      !Array.isArray(order) ||
      order.length !== 3 ||
      order[0] !== 'CL' ||
      order[1] !== 'CM' ||
      order[2] !== 'CN'
    ) {
      return denyResult(
        CR_CODES.ORDER_VIOLATION_DENY,
        'CHAIN',
        'appendOnly.order must be ["CL","CM","CN"]'
      );
    }
  }

  return {
    ok: true,
    code: CR_CODES.VERIFY_PASS,
    verifyResult: { ok: true },
    trailSealHash: computedSeal,
    linksSummary
  };
}

/**
 * @param {string} code
 * @param {string} failedAt
 * @param {string} reason
 */
function denyResult(code, failedAt, reason) {
  return {
    ok: false,
    code,
    reason,
    failedAt,
    verifyResult: { ok: false, failedAt, reason },
    linksSummary: []
  };
}

/**
 * Evidence Trail Ritual Binding Port — hermetic CL→CM→CN linkage.
 */
export class EvidenceTrailPort {
  /**
   * @param {object} [options]
   * @param {(payload: unknown) => string} [options.hashFn]
   * @param {number} [options.maxReasons]
   */
  constructor(options = {}) {
    this.hashFn = options.hashFn || sha256Canonical;
    this.gate = new EvidenceTrailPolicyGate({
      maxReasons: options.maxReasons,
      hashFn: this.hashFn
    });

    /** @type {Map<string, object>} */
    this.decisions = new Map();

    /** @type {Array<object>} */
    this.receipts = [];

    /** @type {string|null} */
    this._lastReceiptHash = null;

    /** @type {number} */
    this._governSeq = 0;

    /** @type {Set<string>} */
    this._seenSealHashes = new Set();

    /** @type {Map<string, string>} trailId → sealHash */
    this._trailRegistry = new Map();
  }

  /**
   * @private
   */
  _sealReceipt(fields) {
    const receipt = buildEvidenceTrailReceipt(
      {
        ...fields,
        prevReceiptHash: this._lastReceiptHash
      },
      { hash: this.hashFn }
    );
    this._lastReceiptHash = receipt.receiptHash;
    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * @private
   */
  _deny(plan, evaluation, extra = {}) {
    const reasons = [evaluation.reason, ...(extra.reasons || [])].filter(
      Boolean
    );
    const trail = plan?.trail && typeof plan.trail === 'object' ? plan.trail : null;
    const receipt = this._sealReceipt({
      operation: 'VERIFY',
      planId: plan?.planId != null ? String(plan.planId) : null,
      decision: 'DENY',
      trailId:
        trail?.trailId != null
          ? String(trail.trailId)
          : plan?.trailId != null
            ? String(plan.trailId)
            : null,
      trailMode:
        plan?.trailMode != null ? String(plan.trailMode).toUpperCase() : null,
      trailDigest:
        extra.trailDigest ||
        this.hashFn({
          deny: true,
          planId: plan?.planId || null,
          code: evaluation.code
        }),
      linkCount: Array.isArray(trail?.links) ? trail.links.length : 0,
      verifyResult: extra.verifyResult || {
        ok: false,
        failedAt: extra.failedAt || null,
        reason: evaluation.reason
      },
      linksSummary: extra.linksSummary || [],
      reasons,
      trailSealHash: extra.trailSealHash || null,
      meta: {
        code: evaluation.code,
        reason: evaluation.reason,
        reasons,
        failedAt: extra.failedAt || null
      }
    });
    return {
      ok: false,
      code: evaluation.code,
      decision: 'DENY',
      planId: plan?.planId != null ? String(plan.planId) : undefined,
      trailId: receipt.trailId,
      trailMode: receipt.trailMode,
      reasons,
      verifyResult: receipt.verifyResult,
      failedAt: extra.failedAt || null,
      receipt
    };
  }

  /**
   * Verify / govern an evidence-trail plan → PASS | DENY + sealed CR receipt.
   * Hermetic: no network, no GH API; does not mutate CL/CM/CN state.
   *
   * @param {object} plan
   * @returns {object}
   */
  govern(plan) {
    const evaluation = this.gate.evaluatePlan(plan);

    if (!evaluation.valid) {
      return this._deny(plan, evaluation);
    }

    this._governSeq += 1;
    const { planId, trailMode, trail, reasons: planReasons } = evaluation;

    // Snapshot trail (read-only) — never mutate caller's object / CL/CM/CN
    const trailSnapshot = structuredClone(trail);

    const validation = validateEvidenceTrail(
      trailSnapshot,
      trailMode,
      this.hashFn,
      null // replay checked separately below with trailId awareness
    );

    if (!validation.ok) {
      return this._deny(
        plan,
        { code: validation.code, reason: validation.reason },
        {
          failedAt: validation.failedAt,
          verifyResult: validation.verifyResult,
          linksSummary: validation.linksSummary,
          reasons: planReasons
        }
      );
    }

    const sealHash = validation.trailSealHash;

    // Replay: identical seal under a different trailId → DENY
    for (const [priorId, priorSeal] of this._trailRegistry.entries()) {
      if (priorSeal === sealHash && priorId !== trailSnapshot.trailId) {
        return this._deny(
          plan,
          {
            code: CR_CODES.REPLAY_DENY,
            reason:
              'Identical trailSealHash re-submitted under a new trailId (REPLAY)'
          },
          {
            failedAt: 'REPLAY',
            verifyResult: {
              ok: false,
              failedAt: 'REPLAY',
              reason: 'seal replay'
            },
            trailSealHash: sealHash,
            reasons: planReasons
          }
        );
      }
    }

    // Same trailId re-verify in place is ALLOW (do not DENY)
    const priorForId = this._trailRegistry.get(String(trailSnapshot.trailId));
    if (priorForId && priorForId !== sealHash) {
      return this._deny(
        plan,
        {
          code: CR_CODES.REPLAY_DENY,
          reason:
            'trailId already registered with a different trailSealHash (mutation/replay)'
        },
        {
          failedAt: 'REPLAY',
          verifyResult: {
            ok: false,
            failedAt: 'REPLAY',
            reason: 'trailId seal mutation'
          },
          trailSealHash: sealHash,
          reasons: planReasons
        }
      );
    }

    this._trailRegistry.set(String(trailSnapshot.trailId), sealHash);
    this._seenSealHashes.add(sealHash);

    const reasons = [
      ...(planReasons || []),
      `evidence-trail verify PASS: trailId=${trailSnapshot.trailId} mode=${trailMode} links=CL→CM→CN planId=${planId}`,
      'NON-CLAIM: ≠ SIEM / ≠ production data lake / ≠ auto-close L26 / ≠ L27 closeout'
    ];

    const trailDigest = this.hashFn({
      trailId: trailSnapshot.trailId,
      trailMode,
      sealHash,
      links: validation.linksSummary,
      decision: 'PASS'
    });

    const record = Object.freeze({
      planId,
      trailId: String(trailSnapshot.trailId),
      trailMode,
      decision: 'PASS',
      trailDigest,
      trailSealHash: sealHash,
      linksSummary: Object.freeze(
        validation.linksSummary.map((l) => Object.freeze({ ...l }))
      ),
      reasons: Object.freeze([...reasons]),
      governedAt: new Date().toISOString()
    });

    this.decisions.set(planId, record);

    const receipt = this._sealReceipt({
      operation: 'VERIFY',
      planId,
      decision: 'PASS',
      trailId: String(trailSnapshot.trailId),
      trailMode,
      trailDigest,
      linkCount: 3,
      verifyResult: { ok: true },
      linksSummary: validation.linksSummary,
      reasons,
      trailSealHash: sealHash,
      meta: {
        code: CR_CODES.GOVERN_PASS,
        reasons,
        trailMode,
        failedAt: null
      }
    });

    return {
      ok: true,
      code: CR_CODES.GOVERN_PASS,
      decision: 'PASS',
      planId,
      trailId: String(trailSnapshot.trailId),
      trailMode,
      trailDigest,
      trailSealHash: sealHash,
      linksSummary: validation.linksSummary,
      verifyResult: { ok: true },
      reasons,
      receipt
      // Explicit: no mutation of CL/CM/CN — trailSnapshot discarded
    };
  }

  /**
   * Alias for govern() — evaluate(plan) → PASS|DENY.
   * @param {object} plan
   * @returns {object}
   */
  evaluate(plan) {
    return this.govern(plan);
  }

  /**
   * Alias for govern() — verify(plan) → PASS|DENY.
   * @param {object} plan
   * @returns {object}
   */
  verify(plan) {
    return this.govern(plan);
  }

  /**
   * Retrieve a stored govern record by planId.
   * @param {string} planId
   * @returns {object|null}
   */
  getDecision(planId) {
    const record = this.decisions.get(planId);
    return record ? record : null;
  }

  /**
   * Verify cryptographic custody and sequential hash chaining of all emitted CR receipts.
   * @returns {{ valid: boolean, code: string, receiptCount: number, headHash: string|null, reason?: string, breakIndex?: number }}
   */
  verifyTrail() {
    let prevHash = null;

    for (let i = 0; i < this.receipts.length; i++) {
      const receipt = this.receipts[i];
      const verifyRes = verifyEvidenceTrailReceipt(receipt, this.hashFn);
      if (!verifyRes.ok) {
        return {
          valid: false,
          code: CR_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} failed self-verification: ${verifyRes.reason}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      if (receipt.prevReceiptHash !== prevHash) {
        return {
          valid: false,
          code: CR_CODES.TRAIL_BREAK,
          breakIndex: i,
          reason: `Receipt at index ${i} broke hash chain: expected prevReceiptHash ${prevHash}, got ${receipt.prevReceiptHash}`,
          receiptCount: this.receipts.length,
          headHash: this._lastReceiptHash
        };
      }

      prevHash = receipt.receiptHash;
    }

    return {
      valid: true,
      code: CR_CODES.TRAIL_OK,
      receiptCount: this.receipts.length,
      headHash: this._lastReceiptHash
    };
  }
}

export default {
  CR_PORT_PRODUCTION_READY,
  CR_PORT_KIND,
  CR_PRODUCTION_READY,
  CR_RECEIPT_KIND,
  CR_CODES,
  validateEvidenceTrail,
  EvidenceTrailPort
};
