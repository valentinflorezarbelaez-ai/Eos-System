/**
 * @module agent-identity-attestation-port
 * SPEC-0070 / Mission BM — Agent Identity Attestation & Action Provenance Port.
 *
 * Facade: createAgentIdentityAttestationPort({ now, hash })
 *   .registerAgent({ agentId, hmacSecret|secret, allowedTools, sessionId? })
 *   .signSession({ agentId, sessionId })  — hermetic HMAC session signature
 *   .attestAction({ agentId, sessionSignature, prompt, actionPayload,
 *                   toolScope, expectedPromptHash?, prevReceiptHash? })
 *   .verifyProvenanceTrail(receipts)
 *
 * Hermetic HMAC-SHA256 via node:crypto only. Secrets injected at
 * registerAgent — NEVER hardcoded sk-/tokens in source.
 *
 * Fail-closed: Fundacion ALWAYS_DENY; unregistered / unsigned / forged /
 * prompt mismatch / impersonation / tool scope → DENY + sealed BM-RCPT-*.
 * Zero external runtime deps except native node:crypto.
 * NO CloudAgent / NO network / NO real fs writes to Fundacion or Documents.
 *
 * NON-CLAIM:
 *   attestation port ≠ OAuth/OIDC/IAM /
 *   ≠ SAML IdP /
 *   ≠ PRODUCTION_READY=YES identity product
 *   L17 CLOSED never reopen; L18 CLOSED never reopen; L19 CLOSED never reopen;
 *   L20 CLOSED never reopen; L21 OPEN (BM in progress; BN–BQ pending);
 *   Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric.
 *   DO NOT rewrite src/core/consensus — BM lives in NEW src/core/attestation/.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/attestation — BM owns agent-* only.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BM_CEILING
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  BM_PRODUCTION_READY as BM_RECEIPT_PR,
  BM_RECEIPT_KIND,
  BM_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalActionSealBody,
  hashActionReceipt,
  verifyActionReceipt,
  buildActionReceipt,
  _resetReceiptSeqForTests
} from './agent-action-receipt.js';

import {
  BM_POLICY_GATE_KIND,
  BM_POLICY_GATE_PRODUCTION_READY,
  BM_POLICY_CODES,
  DEFAULT_ALLOWED_TOOLS,
  deny,
  denyMalformed,
  denyFundacion,
  denyUnsigned,
  denyUnregistered,
  denyForged,
  denyPromptMismatch,
  denyImpersonation,
  denyToolScope,
  denyPolicy,
  isFundacionTarget,
  normalizeTools,
  checkToolScope,
  gateRegisterAgent,
  gateAttestAction,
  createAgentIdentityPolicyGate
} from './agent-identity-policy-gate.js';

/** @type {'NO'} */
export const BM_PRODUCTION_READY = 'NO';

export const BM_KIND = 'eos-agent-identity-attestation-port';

export const BM_CODES = Object.freeze({
  ...BM_POLICY_CODES,
  REGISTER_OK: 'REGISTER_OK',
  ATTEST_OK: 'ATTEST_OK',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

export {
  BM_POLICY_CODES,
  BM_POLICY_GATE_KIND,
  BM_POLICY_GATE_PRODUCTION_READY,
  BM_RECEIPT_KIND,
  BM_RECEIPT_PRODUCTION_READY,
  BM_RECEIPT_PR,
  DEFAULT_ALLOWED_TOOLS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalActionSealBody,
  hashActionReceipt,
  verifyActionReceipt,
  buildActionReceipt,
  deny,
  denyMalformed,
  denyFundacion,
  denyUnsigned,
  denyUnregistered,
  denyForged,
  denyPromptMismatch,
  denyImpersonation,
  denyToolScope,
  denyPolicy,
  isFundacionTarget,
  normalizeTools,
  checkToolScope,
  gateRegisterAgent,
  gateAttestAction,
  createAgentIdentityPolicyGate,
  _resetReceiptSeqForTests
};

/**
 * Timing-safe hex compare.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqualHex(a, b) {
  try {
    const ba = Buffer.from(String(a), 'utf8');
    const bb = Buffer.from(String(b), 'utf8');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * HMAC-SHA256 hex over canonical payload with injected secret.
 * @param {string|Buffer} secret
 * @param {unknown} payload
 * @returns {string}
 */
export function hmacSha256(secret, payload) {
  const body =
    typeof payload === 'string' ? payload : stableStringify(payload);
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

/**
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {boolean} [opts.throwOnDeny]
 * @returns {object}
 */
export function createAgentIdentityAttestationPort(opts = {}) {
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const throwOnDeny = opts.throwOnDeny === true;

  /** @type {Map<string, { agentId: string, hmacSecret: string|Buffer, allowedTools: string[], registeredAt: string }>} */
  const registry = new Map();
  /** @type {object[]} sealed attest receipts */
  const history = [];
  /** @type {string|null} */
  let lastReceiptHash = null;

  let registerCount = 0;
  let attestCount = 0;
  let okCount = 0;
  let denyCount = 0;

  const gate = createAgentIdentityPolicyGate();

  /**
   * @param {object} decision
   * @param {object} fields
   * @returns {object}
   */
  function sealDeny(decision, fields) {
    denyCount += 1;
    const receipt = buildActionReceipt(
      {
        ok: false,
        deny: true,
        denied: true,
        code: decision.code,
        status: 'DENY',
        agentId: fields.agentId || null,
        sessionSignature: fields.sessionSignature || null,
        promptHash: fields.promptHash || null,
        actionPayloadHash: fields.actionPayloadHash || null,
        toolScope: fields.toolScope || [],
        prevReceiptHash: fields.prevReceiptHash ?? lastReceiptHash,
        reason: decision.reason,
        sessionId: fields.sessionId || null
      },
      { now: nowFn, hash: hashFn }
    );

    history.push(receipt);
    lastReceiptHash = receipt.receiptHash;

    const result = {
      ok: false,
      allow: false,
      deny: true,
      denied: true,
      code: decision.code,
      reason: decision.reason,
      receipt,
      PRODUCTION_READY: BM_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BM_KIND
    };

    if (throwOnDeny) {
      throw new AgentIdentityAttestationError(
        decision.reason || decision.code,
        result
      );
    }
    return result;
  }

  /**
   * Register an agent with an injected HMAC secret (tests/host inject only).
   * @param {object} req
   * @returns {object}
   */
  function registerAgent(req = {}) {
    registerCount += 1;
    const decision = gateRegisterAgent(req);
    if (!decision.ok) {
      return {
        ok: false,
        allow: false,
        deny: true,
        denied: true,
        code: decision.code,
        reason: decision.reason,
        PRODUCTION_READY: BM_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true,
        kind: BM_KIND,
        registered: false
      };
    }

    const agentId = String(req.agentId);
    const secret = req.hmacSecret ?? req.secret ?? req.signingKey;
    const allowedTools = normalizeTools(
      req.allowedTools != null ? req.allowedTools : DEFAULT_ALLOWED_TOOLS
    );
    const registeredAt = String(nowFn());

    registry.set(agentId, {
      agentId,
      hmacSecret: secret,
      allowedTools,
      registeredAt
    });

    // Public surface NEVER returns the secret
    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BM_CODES.REGISTER_OK,
      reason: null,
      agentId,
      allowedTools: allowedTools.slice(),
      registeredAt,
      registered: true,
      PRODUCTION_READY: BM_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BM_KIND,
      // NON-CLAIM
      oauthOidcIam: false,
      samlIdp: false,
      productionReadyYes: false,
      cloudAgent: false
    };
  }

  /**
   * Produce a hermetic session signature for an agent (HMAC over session binding).
   * @param {object} req
   * @returns {object}
   */
  function signSession(req = {}) {
    if (req == null || typeof req !== 'object') {
      return denyMalformed('signSession() requires an object');
    }
    const agentId = req.agentId != null ? String(req.agentId) : null;
    if (!agentId) {
      return denyMalformed('agentId is required for signSession');
    }
    const record = registry.get(agentId);
    if (!record) {
      return denyUnregistered(`agent not registered: ${agentId}`);
    }
    const sessionId =
      req.sessionId != null
        ? String(req.sessionId)
        : `sess-${hashFn({ agentId, at: String(nowFn()) }).slice(0, 12)}`;
    const sessionSignature = hmacSha256(record.hmacSecret, {
      agentId,
      sessionId,
      purpose: 'eos-bm-session'
    });
    return {
      ok: true,
      agentId,
      sessionId,
      sessionSignature,
      PRODUCTION_READY: BM_PRODUCTION_READY,
      hermetic: true,
      kind: BM_KIND
    };
  }

  /**
   * Attest a governed agent action; seal BM-RCPT-* provenance receipt.
   * @param {object} req
   * @returns {object}
   */
  function attestAction(req = {}) {
    attestCount += 1;

    let prevReceiptHash =
      req.prevReceiptHash != null && String(req.prevReceiptHash).length > 0
        ? String(req.prevReceiptHash)
        : lastReceiptHash;

    const decision = gateAttestAction(req, { registry });
    const agentId = req.agentId != null ? String(req.agentId) : null;

    const promptHash =
      req.promptHash != null
        ? String(req.promptHash)
        : req.prompt != null
          ? hashFn(req.prompt)
          : null;
    const actionPayloadHash =
      req.actionPayloadHash != null
        ? String(req.actionPayloadHash)
        : req.actionPayload != null
          ? hashFn(req.actionPayload)
          : null;
    const toolScope = normalizeTools(req.toolScope);
    const sessionSignature =
      req.sessionSignature != null ? String(req.sessionSignature) : null;

    if (!decision.ok) {
      return sealDeny(decision, {
        agentId,
        sessionSignature,
        promptHash,
        actionPayloadHash,
        toolScope,
        prevReceiptHash,
        sessionId: req.sessionId || null
      });
    }

    const record = registry.get(/** @type {string} */ (agentId));
    if (!record) {
      return sealDeny(denyUnregistered(`agent not registered: ${agentId}`), {
        agentId,
        sessionSignature,
        promptHash,
        actionPayloadHash,
        toolScope,
        prevReceiptHash
      });
    }

    // Verify session signature (HMAC) — forged/unsigned already gated; re-check crypto
    const sessionId =
      req.sessionId != null ? String(req.sessionId) : null;
    let expectedSig = null;
    if (sessionId) {
      expectedSig = hmacSha256(record.hmacSecret, {
        agentId,
        sessionId,
        purpose: 'eos-bm-session'
      });
    } else {
      // Allow pre-bound signature verification via provided binding fields
      expectedSig = hmacSha256(record.hmacSecret, {
        agentId,
        sessionId: req.boundSessionId != null ? String(req.boundSessionId) : '',
        purpose: 'eos-bm-session'
      });
    }

    // If caller supplied sessionId, require exact match; else accept signature
    // that equals HMAC(agentId + empty session) OR require sessionId (prefer)
    if (sessionId) {
      if (!safeEqualHex(sessionSignature || '', expectedSig)) {
        return sealDeny(
          denyForged('session signature HMAC mismatch (forged)'),
          {
            agentId,
            sessionSignature,
            promptHash,
            actionPayloadHash,
            toolScope,
            prevReceiptHash,
            sessionId
          }
        );
      }
    } else {
      // Without sessionId we cannot recompute — treat as unsigned unless
      // expectedSessionSignature provided for compare
      if (req.expectedSessionSignature != null) {
        if (
          !safeEqualHex(
            sessionSignature || '',
            String(req.expectedSessionSignature)
          )
        ) {
          return sealDeny(denyForged('session signature mismatch'), {
            agentId,
            sessionSignature,
            promptHash,
            actionPayloadHash,
            toolScope,
            prevReceiptHash
          });
        }
      } else {
        // Require sessionId for honest HMAC verification
        return sealDeny(
          denyUnsigned('sessionId required to verify session signature'),
          {
            agentId,
            sessionSignature,
            promptHash,
            actionPayloadHash,
            toolScope,
            prevReceiptHash
          }
        );
      }
    }

    // Prompt mismatch: if expectedPromptHash provided, must match computed
    if (req.expectedPromptHash != null) {
      if (
        promptHash == null ||
        !safeEqualHex(promptHash, String(req.expectedPromptHash))
      ) {
        return sealDeny(denyPromptMismatch(), {
          agentId,
          sessionSignature,
          promptHash,
          actionPayloadHash,
          toolScope,
          prevReceiptHash,
          sessionId
        });
      }
    }
    // Also DENY if promptTampered flag or provided promptHash contradicts prompt
    if (
      req.prompt != null &&
      req.promptHash != null &&
      hashFn(req.prompt) !== String(req.promptHash)
    ) {
      return sealDeny(denyPromptMismatch('prompt vs promptHash mismatch'), {
        agentId,
        sessionSignature,
        promptHash,
        actionPayloadHash,
        toolScope,
        prevReceiptHash,
        sessionId
      });
    }
    if (
      req.actionPayload != null &&
      req.actionPayloadHash != null &&
      hashFn(req.actionPayload) !== String(req.actionPayloadHash)
    ) {
      return sealDeny(
        denyPromptMismatch('actionPayload vs actionPayloadHash mismatch'),
        {
          agentId,
          sessionSignature,
          promptHash,
          actionPayloadHash,
          toolScope,
          prevReceiptHash,
          sessionId
        }
      );
    }

    const timestamp = String(nowFn());
    okCount += 1;
    const receipt = buildActionReceipt(
      {
        ok: true,
        deny: false,
        denied: false,
        code: BM_CODES.ATTEST_OK,
        status: 'OK',
        agentId,
        sessionSignature,
        promptHash,
        actionPayloadHash,
        toolScope,
        timestamp,
        prevReceiptHash,
        reason: null,
        sessionId
      },
      { now: () => timestamp, hash: hashFn }
    );

    history.push(receipt);
    lastReceiptHash = receipt.receiptHash;

    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BM_CODES.ATTEST_OK,
      reason: null,
      receipt,
      PRODUCTION_READY: BM_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BM_KIND,
      sealed: true,
      agentId,
      promptHash,
      actionPayloadHash,
      toolScope,
      // NON-CLAIM
      oauthOidcIam: false,
      samlIdp: false,
      productionReadyYes: false,
      cloudAgent: false,
      identityProduct: false
    };
  }

  /**
   * Verify a provenance trail of sealed BM receipts (hash + chain).
   * @param {object[]} receipts
   * @returns {object}
   */
  function verifyProvenanceTrail(receipts) {
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return {
        ok: false,
        code: BM_CODES.TRAIL_BREAK,
        reason: 'empty or malformed trail',
        breaks: [{ index: 0, reason: 'empty trail' }],
        PRODUCTION_READY: BM_PRODUCTION_READY,
        hermetic: true,
        kind: BM_KIND
      };
    }

    /** @type {object[]} */
    const breaks = [];
    let prev = null;
    for (let i = 0; i < receipts.length; i++) {
      const r = receipts[i];
      const v = verifyActionReceipt(r, hashFn);
      if (!v.ok) {
        breaks.push({
          index: i,
          reason: v.reason || 'receipt verify failed',
          receiptId: r && r.receiptId
        });
        continue;
      }
      if (i === 0) {
        // first may have null prev
      } else if (
        r.prevReceiptHash == null ||
        (prev && r.prevReceiptHash !== prev.receiptHash)
      ) {
        breaks.push({
          index: i,
          reason: 'prevReceiptHash chain break',
          receiptId: r.receiptId,
          expected: prev ? prev.receiptHash : null,
          actual: r.prevReceiptHash
        });
      }
      prev = r;
    }

    if (breaks.length > 0) {
      return {
        ok: false,
        code: BM_CODES.TRAIL_BREAK,
        reason: `trail breaks: ${breaks.length}`,
        breaks,
        count: receipts.length,
        PRODUCTION_READY: BM_PRODUCTION_READY,
        hermetic: true,
        kind: BM_KIND
      };
    }

    return {
      ok: true,
      code: BM_CODES.TRAIL_OK,
      reason: null,
      breaks: [],
      count: receipts.length,
      tipHash: receipts[receipts.length - 1].receiptHash,
      PRODUCTION_READY: BM_PRODUCTION_READY,
      hermetic: true,
      kind: BM_KIND
    };
  }

  function getHistory() {
    return history.slice();
  }

  function getLastReceiptHash() {
    return lastReceiptHash;
  }

  function isRegistered(agentId) {
    return registry.has(String(agentId));
  }

  function health() {
    return {
      kind: BM_KIND,
      PRODUCTION_READY: BM_PRODUCTION_READY,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      oauthOidcIam: false,
      samlIdp: false,
      productionReadyYes: false,
      cloudAgent: false,
      usesCloudAgent: false,
      identityProduct: false,
      ladder17: 'CLOSED',
      ladder18: 'CLOSED',
      ladder19: 'CLOSED',
      ladder20: 'CLOSED',
      ladder21: 'OPEN',
      l17NeverReopen: true,
      l18NeverReopen: true,
      l19NeverReopen: true,
      l20NeverReopen: true,
      l17Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      l18Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      l19Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      l20Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      axis: 'Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric',
      hermetic: true,
      bmInProgress: true,
      bnPending: true,
      notBn: true,
      notConsensusRewrite: true,
      l20ClosedAcknowledged: true
    };
  }

  function getState() {
    return {
      kind: BM_KIND,
      PRODUCTION_READY: BM_PRODUCTION_READY,
      registerCount,
      attestCount,
      okCount,
      denyCount,
      historyCount: history.length,
      lastReceiptHash,
      registeredAgents: registry.size
    };
  }

  return {
    kind: BM_KIND,
    PRODUCTION_READY: BM_PRODUCTION_READY,
    codes: BM_CODES,
    registerAgent,
    signSession,
    attestAction,
    verifyProvenanceTrail,
    getHistory,
    getLastReceiptHash,
    isRegistered,
    health,
    getState,
    gate,
    hmacSha256,
    // NON-CLAIM surface
    oauthOidcIam: false,
    samlIdp: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    identityProduct: false,
    fundacionDelta: 0
  };
}

export class AgentIdentityAttestationError extends Error {
  /**
   * @param {string} message
   * @param {object} [result]
   */
  constructor(message, result = {}) {
    super(message);
    this.name = 'AgentIdentityAttestationError';
    this.result = result;
    this.code = result.code || BM_CODES.DENY;
  }
}

export default {
  BM_KIND,
  BM_PRODUCTION_READY,
  BM_CODES,
  AgentIdentityAttestationError,
  createAgentIdentityAttestationPort,
  hmacSha256,
  stableStringify,
  sha256Canonical,
  buildActionReceipt,
  verifyActionReceipt,
  gateAttestAction,
  gateRegisterAgent
};
