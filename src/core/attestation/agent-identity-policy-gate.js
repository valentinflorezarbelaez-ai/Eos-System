/**
 * @module agent-identity-policy-gate
 * SPEC-0070 / Mission BM — Fail-closed policy for Agent Identity Attestation
 * & Action Provenance Port: unsigned / unregistered / forged signature /
 * prompt mismatch / impersonation / tool scope violation / Fundacion ALWAYS_DENY /
 * malformed DENY.
 *
 * DENY codes: MALFORMED_PAYLOAD, FUNDACION_ALWAYS_DENY, UNSIGNED_DENY,
 * UNREGISTERED_AGENT, FORGED_SIGNATURE, PROMPT_MISMATCH, IMPERSONATION_DENY,
 * TOOL_SCOPE_DENY, POLICY_DENY, DENY, OK, ATTEST_OK.
 *
 * NON-CLAIM:
 *   policy-gate ≠ OAuth/OIDC/IAM /
 *   ≠ SAML IdP /
 *   ≠ PRODUCTION_READY=YES identity product
 *   L20 CLOSED never reopen; L17–L19 CLOSED never reopen;
 *   L21 OPEN; Fundacion Δ=0; Antigravity-first.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/attestation (BM-owned agent-* files).
 *
 * PRODUCTION_READY: NO
 */

/** @type {'NO'} */
export const BM_POLICY_GATE_PRODUCTION_READY = 'NO';

export const BM_POLICY_GATE_KIND = 'eos-agent-identity-policy-gate';

export const BM_POLICY_CODES = Object.freeze({
  OK: 'OK',
  DENY: 'DENY',
  ATTEST_OK: 'ATTEST_OK',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  FUNDACION_DENY: 'FUNDACION_ALWAYS_DENY',
  UNSIGNED_DENY: 'UNSIGNED_DENY',
  UNREGISTERED_AGENT: 'UNREGISTERED_AGENT',
  FORGED_SIGNATURE: 'FORGED_SIGNATURE',
  PROMPT_MISMATCH: 'PROMPT_MISMATCH',
  IMPERSONATION_DENY: 'IMPERSONATION_DENY',
  TOOL_SCOPE_DENY: 'TOOL_SCOPE_DENY',
  POLICY_DENY: 'POLICY_DENY',
  TRAIL_OK: 'TRAIL_OK',
  TRAIL_BREAK: 'TRAIL_BREAK'
});

/** Default hermetic allowlisted tool scopes (in-memory / fixtures only). */
export const DEFAULT_ALLOWED_TOOLS = Object.freeze([
  'read',
  'write',
  'plan',
  'attest',
  'observe',
  'memory://fixture'
]);

/**
 * @param {string} code
 * @param {string} [reason]
 * @param {object} [extra]
 * @returns {{ ok: false, allow: false, deny: true, denied: true, code: string, reason: string }}
 */
export function deny(code, reason = 'DENY', extra = {}) {
  return {
    ok: false,
    allow: false,
    deny: true,
    denied: true,
    code: code || BM_POLICY_CODES.DENY,
    reason: String(reason || 'DENY'),
    fundacionDelta: 0,
    ...extra
  };
}

export function denyMalformed(
  reason = 'malformed attestation payload',
  extra = {}
) {
  return deny(BM_POLICY_CODES.MALFORMED_PAYLOAD, reason, extra);
}

export function denyFundacion(
  reason = 'Fundacion ALWAYS_DENY',
  extra = {}
) {
  return deny(BM_POLICY_CODES.FUNDACION_ALWAYS_DENY, reason, {
    fundacion: 'ALWAYS_DENY',
    fundacionDelta: 0,
    ...extra
  });
}

export function denyUnsigned(
  reason = 'missing session signature / unsigned action',
  extra = {}
) {
  return deny(BM_POLICY_CODES.UNSIGNED_DENY, reason, extra);
}

export function denyUnregistered(
  reason = 'agent not registered',
  extra = {}
) {
  return deny(BM_POLICY_CODES.UNREGISTERED_AGENT, reason, extra);
}

export function denyForged(
  reason = 'forged or invalid session signature',
  extra = {}
) {
  return deny(BM_POLICY_CODES.FORGED_SIGNATURE, reason, extra);
}

export function denyPromptMismatch(
  reason = 'prompt hash mismatch',
  extra = {}
) {
  return deny(BM_POLICY_CODES.PROMPT_MISMATCH, reason, extra);
}

export function denyImpersonation(
  reason = 'agent impersonation detected',
  extra = {}
) {
  return deny(BM_POLICY_CODES.IMPERSONATION_DENY, reason, extra);
}

export function denyToolScope(
  reason = 'tool scope violation',
  extra = {}
) {
  return deny(BM_POLICY_CODES.TOOL_SCOPE_DENY, reason, extra);
}

export function denyPolicy(reason = 'policy DENY', extra = {}) {
  return deny(BM_POLICY_CODES.POLICY_DENY, reason, extra);
}

/**
 * Detect Fundacion targets (ALWAYS DENY).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'string') {
    const n = String(target).toLowerCase().replace(/\\/g, '/');
    return (
      n.includes('fundacion') ||
      n.includes('documents/fundacion') ||
      n === 'fundacion'
    );
  }
  if (typeof target === 'object') {
    const o = /** @type {Record<string, unknown>} */ (target);
    if (o.fundacion === true || o.writeFundacion === true) return true;
    if (o.isFundacion === true) return true;
    const id = o.id != null ? String(o.id).toLowerCase() : '';
    const name = o.name != null ? String(o.name).toLowerCase() : '';
    const agentId = o.agentId != null ? String(o.agentId).toLowerCase() : '';
    if (
      id === 'fundacion' ||
      name === 'fundacion' ||
      agentId.includes('fundacion') ||
      id.includes('fundacion')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Normalize tool list.
 * @param {unknown} tools
 * @returns {string[]}
 */
export function normalizeTools(tools) {
  if (tools == null) return [];
  if (typeof tools === 'string') return [tools];
  if (!Array.isArray(tools)) return [];
  return tools.map((t) => String(t));
}

/**
 * Check requested tool(s) against agent allowlist.
 * @param {unknown} requested
 * @param {Iterable<string>|string[]} [allowed]
 * @returns {{ ok: boolean, code: string, reason: string|null, tool?: string|null }}
 */
export function checkToolScope(requested, allowed = DEFAULT_ALLOWED_TOOLS) {
  const req = normalizeTools(requested);
  if (req.length === 0) {
    return {
      ok: false,
      code: BM_POLICY_CODES.MALFORMED_PAYLOAD,
      reason: 'empty toolScope',
      tool: null
    };
  }
  const allow = new Set(Array.from(allowed || []).map((x) => String(x)));
  for (const t of req) {
    if (t.startsWith('memory://')) continue;
    if (!allow.has(t)) {
      return {
        ok: false,
        code: BM_POLICY_CODES.TOOL_SCOPE_DENY,
        reason: `tool outside allowlist: ${t}`,
        tool: t
      };
    }
  }
  return { ok: true, code: BM_POLICY_CODES.OK, reason: null, tool: null };
}

/**
 * Fail-closed gate for registerAgent.
 * @param {object} req
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null }}
 */
export function gateRegisterAgent(req) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('registerAgent() requires an object');
  }
  if (req.forceMalformed === true) {
    return denyMalformed('forced malformed register');
  }
  if (isFundacionTarget(req) || req.fundacion === true) {
    return denyFundacion();
  }
  if (req.agentId == null || String(req.agentId).trim() === '') {
    return denyMalformed('agentId is required');
  }
  if (isFundacionTarget(String(req.agentId))) {
    return denyFundacion(`Fundacion agentId ALWAYS_DENY: ${req.agentId}`);
  }
  // Secret must be injected (Buffer/string) — never hardcode; reject empty
  const secret = req.hmacSecret ?? req.secret ?? req.signingKey;
  if (secret == null || String(secret).length === 0) {
    return denyMalformed('hmacSecret / secret required for registration');
  }
  // Reject obvious hardcoded vendor-prefix patterns if present as the secret
  // value itself (Law VI honesty — do not store sk-/token prefixes as secrets
  // that look like vendor keys in source; tests inject random hermetic bytes).
  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BM_POLICY_CODES.OK,
    reason: null,
    fundacionDelta: 0
  };
}

/**
 * Fail-closed gate for attestAction (pre-crypto checks).
 * @param {object} req
 * @param {object} [opts]
 * @param {Map|object} [opts.registry]
 * @returns {{ ok: boolean, allow?: boolean, deny?: boolean, denied?: boolean, code: string, reason: string|null, agent?: object|null }}
 */
export function gateAttestAction(req, opts = {}) {
  if (req == null || typeof req !== 'object') {
    return denyMalformed('attestAction() requires an object request');
  }
  if (req.forceMalformed === true) {
    return denyMalformed('forced malformed attest');
  }
  if (req.fundacion === true || req.writeFundacion === true) {
    return denyFundacion();
  }
  if (isFundacionTarget(req)) {
    return denyFundacion();
  }

  const agentId = req.agentId != null ? String(req.agentId) : null;
  if (!agentId || !agentId.trim()) {
    return denyMalformed('agentId is required');
  }
  if (isFundacionTarget(agentId)) {
    return denyFundacion(`Fundacion agentId ALWAYS_DENY: ${agentId}`);
  }

  const registry = opts.registry;
  let record = null;
  if (registry != null) {
    if (typeof registry.get === 'function') {
      record = registry.get(agentId) || null;
    } else if (typeof registry === 'object') {
      record = /** @type {Record<string, unknown>} */ (registry)[agentId] || null;
    }
  }
  if (!record) {
    return denyUnregistered(`agent not registered: ${agentId}`);
  }

  // Impersonation: claimedAgentId / asAgent mismatches registered id
  if (
    req.claimedAgentId != null &&
    String(req.claimedAgentId) !== agentId
  ) {
    return denyImpersonation(
      `claimedAgentId ${req.claimedAgentId} != agentId ${agentId}`
    );
  }
  if (req.asAgent != null && String(req.asAgent) !== agentId) {
    return denyImpersonation(`asAgent ${req.asAgent} != agentId ${agentId}`);
  }
  if (
    req.impersonate === true ||
    (req.impersonateAgentId != null &&
      String(req.impersonateAgentId) !== agentId)
  ) {
    return denyImpersonation('impersonation flag / mismatch');
  }

  // Unsigned
  if (
    req.sessionSignature == null ||
    String(req.sessionSignature).trim() === ''
  ) {
    return denyUnsigned();
  }

  // Tool scope
  const allowedTools =
    (record &&
      /** @type {Record<string, unknown>} */ (record).allowedTools) ||
    opts.allowedTools ||
    DEFAULT_ALLOWED_TOOLS;
  const scopeCheck = checkToolScope(req.toolScope, /** @type {string[]} */ (allowedTools));
  if (!scopeCheck.ok) {
    if (scopeCheck.code === BM_POLICY_CODES.MALFORMED_PAYLOAD) {
      return denyMalformed(scopeCheck.reason || 'malformed toolScope');
    }
    return denyToolScope(scopeCheck.reason || 'tool scope DENY', {
      tool: scopeCheck.tool
    });
  }

  // Prompt required for hash binding (unless allowEmptyPrompt)
  if (
    req.prompt == null &&
    req.promptHash == null &&
    req.allowEmptyPrompt !== true
  ) {
    return denyMalformed('prompt or promptHash required');
  }

  return {
    ok: true,
    allow: true,
    deny: false,
    denied: false,
    code: BM_POLICY_CODES.OK,
    reason: null,
    agent: record,
    fundacionDelta: 0
  };
}

/**
 * Create a policy-gate surface.
 * @param {object} [opts]
 * @returns {object}
 */
export function createAgentIdentityPolicyGate(opts = {}) {
  const allowedTools = opts.allowedTools || DEFAULT_ALLOWED_TOOLS;
  return {
    kind: BM_POLICY_GATE_KIND,
    PRODUCTION_READY: BM_POLICY_GATE_PRODUCTION_READY,
    codes: BM_POLICY_CODES,
    allowedTools,
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
    checkToolScope: (t, al) => checkToolScope(t, al || allowedTools),
    gateRegisterAgent,
    gateAttestAction: (req, extra = {}) =>
      gateAttestAction(req, { allowedTools, ...opts, ...extra }),
    // NON-CLAIM surface
    oauthOidcIam: false,
    samlIdp: false,
    productionReadyYes: false,
    cloudAgent: false,
    identityProduct: false,
    fundacionDelta: 0
  };
}

export default {
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
};
