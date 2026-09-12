/**
 * @module plane-stubs
 * SPEC-0050 / Mission AS — Thin hermetic AN/AO/AP/AQ plane stubs.
 *
 * Compose-don't-rewrite: injectable fakes of AN federation, AO failover,
 * AP authority, AQ export ports. Do NOT vendor full AN–AQ implementations.
 *
 * NON-CLAIM: stubs ≠ E2E product suite / ≠ PRODUCTION_READY / ≠ CloudAgent.
 * PRODUCTION_READY: NO | Fundacion Δ=0 | Law VI
 */

/** @type {'NO'} */
export const AS_STUB_PRODUCTION_READY = 'NO';

/**
 * AN-like federation / custody plane stub.
 * @param {object} [options]
 * @param {string} [options.custodyTip]
 * @param {boolean} [options.consistent]
 * @param {string} [options.sessionId]
 * @param {string} [options.code]
 * @param {(req?: object) => object} [options.observe]
 * @param {(req?: object) => object} [options.exportCustody]
 */
export function createAnPlaneStub(options = {}) {
  let custodyTip =
    options.custodyTip != null
      ? String(options.custodyTip)
      : 'an-custody-tip-hermetic-0001';
  let consistent = options.consistent !== false;
  const sessionId =
    options.sessionId != null ? String(options.sessionId) : 'sess-an-1';

  return {
    plane: 'AN',
    kind: 'eos-as-an-plane-stub',
    PRODUCTION_READY: AS_STUB_PRODUCTION_READY,
    observe(req = {}) {
      if (typeof options.observe === 'function') {
        return options.observe(req);
      }
      return {
        ok: consistent,
        plane: 'AN',
        consistent,
        custodyTip,
        sessionId,
        code: options.code || (consistent ? 'OK' : 'CUSTODY_INCONSISTENT'),
        fundacionDelta: 0,
        cloudAgent: false
      };
    },
    exportCustody(req = {}) {
      if (typeof options.exportCustody === 'function') {
        return options.exportCustody(req);
      }
      return {
        ok: consistent,
        plane: 'AN',
        custodyTip,
        sessionId,
        envelope: {
          kind: 'eos-federation-custody-envelope',
          tip: custodyTip,
          sessionId,
          PRODUCTION_READY: 'NO'
        },
        code: consistent ? 'EXPORTED' : 'CUSTODY_INCONSISTENT'
      };
    },
    setConsistent(v) {
      consistent = v === true;
    },
    setCustodyTip(t) {
      custodyTip = String(t);
    },
    getCustodyTip() {
      return custodyTip;
    }
  };
}

/**
 * AO-like provider failover / budget plane stub.
 * @param {object} [options]
 */
export function createAoPlaneStub(options = {}) {
  let consistent = options.consistent !== false;
  let budgetOk = options.budgetOk !== false;
  let providerHealthy = options.providerHealthy !== false;
  const activeProvider =
    options.activeProvider != null
      ? String(options.activeProvider)
      : 'fake-primary';

  return {
    plane: 'AO',
    kind: 'eos-as-ao-plane-stub',
    PRODUCTION_READY: AS_STUB_PRODUCTION_READY,
    observe(req = {}) {
      if (typeof options.observe === 'function') {
        return options.observe(req);
      }
      const ok = consistent && budgetOk;
      return {
        ok,
        plane: 'AO',
        consistent,
        budgetOk,
        providerHealthy,
        activeProvider,
        code: options.code || (ok ? 'OK' : 'BUDGET_INCONSISTENT'),
        fundacionDelta: 0,
        cloudAgent: false,
        secretsInReceipt: false
      };
    },
    route(req = {}) {
      if (typeof options.route === 'function') {
        return options.route(req);
      }
      if (!budgetOk || !consistent) {
        return {
          ok: false,
          plane: 'AO',
          code: 'FAILOVER_DENIED',
          budgetOk,
          consistent
        };
      }
      return {
        ok: true,
        plane: 'AO',
        code: 'ROUTE_OK',
        activeProvider,
        providerHealthy
      };
    },
    setConsistent(v) {
      consistent = v === true;
    },
    setBudgetOk(v) {
      budgetOk = v === true;
    },
    setProviderHealthy(v) {
      providerHealthy = v === true;
    }
  };
}

/**
 * AP-like HITL / PO authority plane stub.
 * @param {object} [options]
 */
export function createApPlaneStub(options = {}) {
  let consistent = options.consistent !== false;
  let authorityOpen = options.authorityOpen === true;
  let authorityGranted = options.authorityGranted === true;
  let hitlRequired = options.hitlRequired === true;

  return {
    plane: 'AP',
    kind: 'eos-as-ap-plane-stub',
    PRODUCTION_READY: AS_STUB_PRODUCTION_READY,
    observe(req = {}) {
      if (typeof options.observe === 'function') {
        return options.observe(req);
      }
      const ok = consistent && !authorityOpen;
      return {
        ok,
        plane: 'AP',
        consistent,
        authorityOpen,
        authorityGranted,
        hitlRequired: hitlRequired || authorityOpen,
        code:
          options.code ||
          (authorityOpen
            ? 'HITL_REQUIRED'
            : consistent
              ? authorityGranted
                ? 'AUTHORITY_APPROVED'
                : 'OK'
              : 'AUTHORITY_INCONSISTENT'),
        fundacionDelta: 0,
        cloudAgent: false
      };
    },
    openRequest(req = {}) {
      if (typeof options.openRequest === 'function') {
        return options.openRequest(req);
      }
      authorityOpen = true;
      hitlRequired = true;
      return {
        ok: true,
        allow: false,
        plane: 'AP',
        code: 'HITL_REQUIRED',
        authorityOpen: true,
        hitlRequired: true,
        requestId: req.requestId || 'AP-REQ-stub'
      };
    },
    decide(decision = {}) {
      if (typeof options.decide === 'function') {
        return options.decide(decision);
      }
      const verb =
        typeof decision === 'string'
          ? decision
          : decision.decision || (decision.approve ? 'approve' : 'deny');
      authorityOpen = false;
      if (String(verb).toLowerCase() === 'approve') {
        authorityGranted = true;
        return {
          ok: true,
          allow: true,
          plane: 'AP',
          code: 'AUTHORITY_APPROVED',
          decision: 'approve'
        };
      }
      authorityGranted = false;
      return {
        ok: false,
        allow: false,
        plane: 'AP',
        code: 'AUTHORITY_DENIED',
        decision: 'deny'
      };
    },
    setConsistent(v) {
      consistent = v === true;
    },
    setAuthorityOpen(v) {
      authorityOpen = v === true;
      if (authorityOpen) hitlRequired = true;
    },
    setAuthorityGranted(v) {
      authorityGranted = v === true;
    },
    isOpen() {
      return authorityOpen;
    }
  };
}

/**
 * AQ-like evidence export / notarization plane stub.
 * @param {object} [options]
 */
export function createAqPlaneStub(options = {}) {
  let consistent = options.consistent !== false;
  let exportSealed = options.exportSealed !== false;
  let chainTip =
    options.chainTip != null
      ? String(options.chainTip)
      : 'aq-chain-tip-hermetic-0001';
  /** @type {object[]} */
  const packs = [];

  return {
    plane: 'AQ',
    kind: 'eos-as-aq-plane-stub',
    PRODUCTION_READY: AS_STUB_PRODUCTION_READY,
    observe(req = {}) {
      if (typeof options.observe === 'function') {
        return options.observe(req);
      }
      const ok = consistent && exportSealed;
      return {
        ok,
        plane: 'AQ',
        consistent,
        exportSealed,
        chainTip,
        packCount: packs.length,
        code: options.code || (ok ? 'OK' : 'EXPORT_INCONSISTENT'),
        fundacionDelta: 0,
        cloudAgent: false,
        complianceClaim: false
      };
    },
    exportRange(req = {}) {
      if (typeof options.exportRange === 'function') {
        return options.exportRange(req);
      }
      if (!consistent || !exportSealed) {
        return {
          ok: false,
          plane: 'AQ',
          code: 'EXPORT_INCONSISTENT',
          chainTip
        };
      }
      const pack = {
        packId: `AQ-PACK-stub-${packs.length + 1}`,
        sealed: true,
        chainTip,
        packDigest: `digest-${packs.length + 1}`,
        PRODUCTION_READY: 'NO',
        sharedEvdLink: req.sharedEvdLink || null
      };
      packs.push(pack);
      return {
        ok: true,
        plane: 'AQ',
        code: 'EXPORT_OK',
        pack,
        chainTip
      };
    },
    setConsistent(v) {
      consistent = v === true;
    },
    setExportSealed(v) {
      exportSealed = v === true;
    },
    setChainTip(t) {
      chainTip = String(t);
    },
    getChainTip() {
      return chainTip;
    },
    getPacks() {
      return packs.slice();
    }
  };
}

export default {
  AS_STUB_PRODUCTION_READY,
  createAnPlaneStub,
  createAoPlaneStub,
  createApPlaneStub,
  createAqPlaneStub
};
