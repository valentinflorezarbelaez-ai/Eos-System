/**
 * @module governed-external-write-orchestrator
 * SPEC-0068 / Mission BK — Governed External Write Orchestrator.
 *
 * Facade: createGovernedExternalWriteOrchestrator({ now, hash, ports })
 *   .validatePreconditions(targetProject, context)
 *   .executeGovernedWrite({ targetProject, diffPayload, context,
 *                           prevReceiptHash, ports })
 *   .rollbackWrite({ targetProject, transactionId, prevReceiptHash, ports })
 *
 * Six hermetic preconditions (Registry, Intake, Spec, Audit, Owner Approval,
 * Level 2 Auth) encoded as preconditionMask object + bitmask.
 *
 * Injectable ports stubs (compose T-gate / write-barrier / BC / BD —
 * DO NOT rewrite siblings):
 *   ports.tGate, ports.bcApply, ports.bdDelivery, ports.writeBarrier (optional)
 *
 * Fail-closed: Fundacion ALWAYS_DENY; missing precondition DENY; unauthorized
 * path DENY; partial write → automatic rollback + sealed rollback receipt.
 * Zero external runtime deps except native node:crypto (via receipt module).
 * NO CloudAgent / NO network / NO real fs writes to Fundacion or Documents.
 * Hermetic: in-memory only; simulate apply/delivery via ports.
 *
 * NON-CLAIM:
 *   orchestrator ≠ unsupervised fleet deploy /
 *   ≠ K8s/ArgoCD CD /
 *   ≠ PRODUCTION_READY=YES
 *   BH+BI+BJ MEASURED acknowledged; not BL; Fundacion Δ=0; Antigravity-first.
 *   L17 CLOSED never reopen; L18 CLOSED never reopen; L19 CLOSED never reopen;
 *   L20 OPEN (BH+BI+BJ MEASURED; BK in progress; BL pending closeout);
 *   Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI: never embed static vendor-key prefix contiguous literals.
 * MODULE_DIR = src/core/orchestration — BK owns governed-external-write-* only;
 * pre-existing orchestration siblings may coexist.
 *
 * PRODUCTION_READY: NO | Fundacion Δ=0 | BK_CEILING
 */

import {
  BK_PRODUCTION_READY as BK_RECEIPT_PR,
  BK_RECEIPT_KIND,
  BK_RECEIPT_PRODUCTION_READY,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalWriteSealBody,
  hashWriteReceipt,
  verifyWriteReceipt,
  buildWriteReceipt,
  _resetReceiptSeqForTests
} from './governed-external-write-receipt.js';

import {
  BK_POLICY_GATE_KIND,
  BK_POLICY_GATE_PRODUCTION_READY,
  BK_PRECONDITIONS,
  BK_PRECONDITION_BITS,
  BK_PRECONDITION_ALL_MASK,
  BK_POLICY_CODES,
  DEFAULT_ALLOWLISTED_PATHS,
  deny,
  denyMalformed,
  denyFundacion,
  denyAllowlist,
  denyPathContainment,
  denyLevel2Auth,
  denyPrecondition,
  denyUnauthorizedPath,
  denyPolicy,
  normalizePath,
  isFundacionTarget,
  checkPathAllowlisted,
  checkPathContainment,
  buildPreconditionMask,
  validatePreconditions as gateValidatePreconditions,
  gateExecuteWrite,
  gateRollback,
  createGovernedExternalWritePolicyGate
} from './governed-external-write-policy-gate.js';

/** @type {'NO'} */
export const BK_PRODUCTION_READY = 'NO';

export const BK_KIND = 'eos-governed-external-write-orchestrator';

export const BK_CODES = Object.freeze({
  ...BK_POLICY_CODES,
  WRITE_OK: 'WRITE_OK',
  ROLLBACK_OK: 'ROLLBACK_OK',
  PARTIAL_FAILURE: 'PARTIAL_FAILURE'
});

export {
  BK_PRECONDITIONS,
  BK_PRECONDITION_BITS,
  BK_PRECONDITION_ALL_MASK,
  BK_POLICY_CODES,
  BK_POLICY_GATE_KIND,
  BK_POLICY_GATE_PRODUCTION_READY,
  BK_RECEIPT_KIND,
  BK_RECEIPT_PRODUCTION_READY,
  BK_RECEIPT_PR,
  DEFAULT_ALLOWLISTED_PATHS,
  stableStringify,
  sha256Canonical,
  defaultHash,
  canonicalWriteSealBody,
  hashWriteReceipt,
  verifyWriteReceipt,
  buildWriteReceipt,
  deny,
  denyMalformed,
  denyFundacion,
  denyAllowlist,
  denyPathContainment,
  denyLevel2Auth,
  denyPrecondition,
  denyUnauthorizedPath,
  denyPolicy,
  normalizePath,
  isFundacionTarget,
  checkPathAllowlisted,
  checkPathContainment,
  buildPreconditionMask,
  gateExecuteWrite,
  gateRollback,
  createGovernedExternalWritePolicyGate,
  _resetReceiptSeqForTests
};

/**
 * @param {object} [opts]
 * @param {() => string|number} [opts.now]
 * @param {(payload: unknown) => string} [opts.hash]
 * @param {object} [opts.ports]
 * @param {boolean} [opts.throwOnDeny]
 * @param {string[]} [opts.allowlist]
 * @returns {object}
 */
export function createGovernedExternalWriteOrchestrator(opts = {}) {
  const nowFn =
    typeof opts.now === 'function'
      ? opts.now
      : () => new Date().toISOString();
  const hashFn =
    typeof opts.hash === 'function' ? opts.hash : sha256Canonical;
  const throwOnDeny = opts.throwOnDeny === true;
  const defaultPorts =
    opts.ports != null && typeof opts.ports === 'object' ? opts.ports : {};
  const allowlist = opts.allowlist || DEFAULT_ALLOWLISTED_PATHS;

  /** @type {object[]} sealed write/rollback receipts */
  const history = [];
  /** @type {string|null} */
  let lastReceiptHash = null;
  /** @type {Map<string, object>} transactionId → write meta (hermetic) */
  const transactions = new Map();

  let writeCount = 0;
  let okCount = 0;
  let denyCount = 0;
  let rollbackCount = 0;
  let partialFailCount = 0;

  const gate = createGovernedExternalWritePolicyGate({ allowlist });

  /**
   * Call optional injectable port if present (happy-path composition).
   * @param {object} ports
   * @param {string} name
   * @param {unknown} arg
   * @returns {unknown}
   */
  function callPort(ports, name, arg) {
    const p = ports && ports[name];
    if (typeof p === 'function') {
      try {
        return p(arg);
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          thrown: true
        };
      }
    }
    if (p != null && typeof p === 'object') {
      const method =
        typeof p.invoke === 'function'
          ? p.invoke
          : typeof p.apply === 'function'
            ? p.apply
            : typeof p.deliver === 'function'
              ? p.deliver
              : typeof p.call === 'function'
                ? p.call
                : typeof p.rollback === 'function' && name.includes('roll')
                  ? p.rollback
                  : typeof p.notify === 'function'
                    ? p.notify
                    : null;
      if (method) {
        try {
          return method.call(p, arg);
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            thrown: true
          };
        }
      }
    }
    return undefined;
  }

  /**
   * @param {object} decision
   * @param {object} fields
   * @returns {object}
   */
  function sealDeny(decision, fields) {
    denyCount += 1;
    const receipt = buildWriteReceipt(
      {
        ok: false,
        deny: true,
        denied: true,
        code: decision.code,
        status: 'DENY',
        targetProjectId: fields.targetProjectId || null,
        targetPaths: fields.targetPaths || [],
        preconditionMask: fields.preconditionMask || decision.preconditionMask || null,
        rollbackExecuted: false,
        prevReceiptHash: fields.prevReceiptHash ?? lastReceiptHash,
        reason: decision.reason,
        transactionId: fields.transactionId || null
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
      PRODUCTION_READY: BK_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BK_KIND,
      missing: decision.missing || null,
      preconditionMask: decision.preconditionMask || fields.preconditionMask || null
    };

    if (throwOnDeny) {
      throw new GovernedExternalWriteError(
        decision.reason || decision.code,
        result
      );
    }
    return result;
  }

  /**
   * Validate six hermetic preconditions for a target project.
   * @param {object} targetProject
   * @param {object} [context]
   * @returns {object}
   */
  function validatePreconditions(targetProject, context = {}) {
    return gateValidatePreconditions(targetProject, context);
  }

  /**
   * Execute a governed external write (hermetic; ports simulate apply/delivery).
   * @param {object} req
   * @returns {object}
   */
  function executeGovernedWrite(req = {}) {
    writeCount += 1;
    const ports = {
      ...defaultPorts,
      ...(req.ports != null && typeof req.ports === 'object' ? req.ports : {})
    };

    let prevReceiptHash =
      req.prevReceiptHash != null && String(req.prevReceiptHash).length > 0
        ? String(req.prevReceiptHash)
        : lastReceiptHash;

    const decision = gateExecuteWrite(req, { allowlist });
    const targetProject =
      req.targetProject != null && typeof req.targetProject === 'object'
        ? req.targetProject
        : {};
    const targetProjectId =
      targetProject.id != null
        ? String(targetProject.id)
        : targetProject.name != null
          ? String(targetProject.name)
          : null;

    if (!decision.ok) {
      return sealDeny(decision, {
        targetProjectId,
        targetPaths: decision.targetPaths || [],
        preconditionMask: decision.preconditionMask || null,
        prevReceiptHash
      });
    }

    const targetPaths = decision.targetPaths || [];
    const preconditionMask = decision.preconditionMask;
    const timestamp = String(nowFn());

    // Optional port call-throughs for composition (T-gate / write-barrier / BC / BD)
    callPort(ports, 'tGate', {
      op: 'preWrite',
      targetProjectId,
      targetPaths,
      at: timestamp
    });
    callPort(ports, 'writeBarrier', {
      op: 'preWrite',
      targetProjectId,
      targetPaths,
      at: timestamp
    });

    const txSeed = hashFn({
      targetProjectId,
      targetPaths,
      timestamp,
      seq: writeCount
    });
    const transactionId = `BK-TX-${String(txSeed).slice(0, 12)}`;

    // Simulate BC apply via port (hermetic)
    const bcResult = callPort(ports, 'bcApply', {
      op: 'apply',
      targetProjectId,
      targetPaths,
      diffPayload: req.diffPayload,
      transactionId,
      at: timestamp
    });

    // Detect partial / failure from port stub
    const bcFailed =
      bcResult != null &&
      typeof bcResult === 'object' &&
      (/** @type {Record<string, unknown>} */ (bcResult).ok === false ||
        /** @type {Record<string, unknown>} */ (bcResult).partial === true ||
        /** @type {Record<string, unknown>} */ (bcResult).thrown === true ||
        /** @type {Record<string, unknown>} */ (bcResult).fail === true);

    if (bcFailed) {
      partialFailCount += 1;
      // Automatic rollback on partial/failure
      const rbPort = callPort(ports, 'bcApply', {
        op: 'rollback',
        targetProjectId,
        transactionId,
        at: timestamp
      });
      callPort(ports, 'writeBarrier', {
        op: 'rollback',
        targetProjectId,
        transactionId,
        at: timestamp
      });
      callPort(ports, 'bdDelivery', {
        op: 'abort',
        targetProjectId,
        transactionId,
        at: timestamp
      });

      rollbackCount += 1;
      const receipt = buildWriteReceipt(
        {
          ok: false,
          deny: false,
          denied: false,
          code: BK_CODES.PARTIAL_FAILURE,
          status: 'ROLLBACK',
          targetProjectId,
          targetPaths,
          preconditionMask,
          rollbackExecuted: true,
          timestamp,
          prevReceiptHash,
          reason:
            (bcResult &&
              /** @type {Record<string, unknown>} */ (bcResult).error) ||
            (bcResult &&
              /** @type {Record<string, unknown>} */ (bcResult).reason) ||
            'partial write failure — automatic rollback',
          transactionId
        },
        { now: () => timestamp, hash: hashFn }
      );

      history.push(receipt);
      lastReceiptHash = receipt.receiptHash;
      transactions.set(transactionId, {
        status: 'ROLLED_BACK',
        targetProjectId,
        targetPaths,
        receiptHash: receipt.receiptHash
      });

      return {
        ok: false,
        allow: false,
        deny: false,
        denied: false,
        code: BK_CODES.PARTIAL_FAILURE,
        reason: receipt.reason,
        receipt,
        transactionId,
        rollbackExecuted: true,
        bcResult: bcResult || null,
        rbResult: rbPort || null,
        PRODUCTION_READY: BK_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true,
        kind: BK_KIND,
        sealed: true,
        preconditionMask
      };
    }

    // Simulate BD delivery via port
    const bdResult = callPort(ports, 'bdDelivery', {
      op: 'deliver',
      targetProjectId,
      targetPaths,
      transactionId,
      at: timestamp
    });

    const bdFailed =
      bdResult != null &&
      typeof bdResult === 'object' &&
      (/** @type {Record<string, unknown>} */ (bdResult).ok === false ||
        /** @type {Record<string, unknown>} */ (bdResult).partial === true ||
        /** @type {Record<string, unknown>} */ (bdResult).thrown === true ||
        /** @type {Record<string, unknown>} */ (bdResult).fail === true);

    if (bdFailed) {
      partialFailCount += 1;
      callPort(ports, 'bcApply', {
        op: 'rollback',
        targetProjectId,
        transactionId,
        at: timestamp
      });
      callPort(ports, 'writeBarrier', {
        op: 'rollback',
        targetProjectId,
        transactionId,
        at: timestamp
      });
      rollbackCount += 1;

      const receipt = buildWriteReceipt(
        {
          ok: false,
          deny: false,
          denied: false,
          code: BK_CODES.PARTIAL_FAILURE,
          status: 'ROLLBACK',
          targetProjectId,
          targetPaths,
          preconditionMask,
          rollbackExecuted: true,
          timestamp,
          prevReceiptHash,
          reason:
            (bdResult &&
              /** @type {Record<string, unknown>} */ (bdResult).error) ||
            (bdResult &&
              /** @type {Record<string, unknown>} */ (bdResult).reason) ||
            'delivery partial failure — automatic rollback',
          transactionId
        },
        { now: () => timestamp, hash: hashFn }
      );

      history.push(receipt);
      lastReceiptHash = receipt.receiptHash;
      transactions.set(transactionId, {
        status: 'ROLLED_BACK',
        targetProjectId,
        targetPaths,
        receiptHash: receipt.receiptHash
      });

      return {
        ok: false,
        allow: false,
        deny: false,
        denied: false,
        code: BK_CODES.PARTIAL_FAILURE,
        reason: receipt.reason,
        receipt,
        transactionId,
        rollbackExecuted: true,
        bcResult: bcResult || null,
        bdResult: bdResult || null,
        PRODUCTION_READY: BK_PRODUCTION_READY,
        fundacionDelta: 0,
        hermetic: true,
        kind: BK_KIND,
        sealed: true,
        preconditionMask
      };
    }

    okCount += 1;
    const receipt = buildWriteReceipt(
      {
        ok: true,
        deny: false,
        denied: false,
        code: BK_CODES.WRITE_OK,
        status: 'OK',
        targetProjectId,
        targetPaths,
        preconditionMask,
        rollbackExecuted: false,
        timestamp,
        prevReceiptHash,
        reason: null,
        transactionId
      },
      { now: () => timestamp, hash: hashFn }
    );

    history.push(receipt);
    lastReceiptHash = receipt.receiptHash;
    transactions.set(transactionId, {
      status: 'APPLIED',
      targetProjectId,
      targetPaths,
      receiptHash: receipt.receiptHash
    });

    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BK_CODES.WRITE_OK,
      reason: null,
      receipt,
      transactionId,
      rollbackExecuted: false,
      bcResult: bcResult || null,
      bdResult: bdResult || null,
      PRODUCTION_READY: BK_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BK_KIND,
      sealed: true,
      preconditionMask,
      targetPaths
    };
  }

  /**
   * Explicit rollback for a prior transaction.
   * @param {object} req
   * @returns {object}
   */
  function rollbackWrite(req = {}) {
    const ports = {
      ...defaultPorts,
      ...(req.ports != null && typeof req.ports === 'object' ? req.ports : {})
    };

    let prevReceiptHash =
      req.prevReceiptHash != null && String(req.prevReceiptHash).length > 0
        ? String(req.prevReceiptHash)
        : lastReceiptHash;

    const decision = gateRollback(req);
    const targetProject =
      req.targetProject != null && typeof req.targetProject === 'object'
        ? req.targetProject
        : {};
    const targetProjectId =
      targetProject.id != null
        ? String(targetProject.id)
        : targetProject.name != null
          ? String(targetProject.name)
          : null;

    if (!decision.ok) {
      return sealDeny(decision, {
        targetProjectId,
        targetPaths: [],
        prevReceiptHash,
        transactionId: req.transactionId || null
      });
    }

    const transactionId = String(req.transactionId);
    const timestamp = String(nowFn());
    const prior = transactions.get(transactionId);
    const targetPaths = prior && prior.targetPaths ? prior.targetPaths : [];

    callPort(ports, 'bcApply', {
      op: 'rollback',
      targetProjectId,
      transactionId,
      at: timestamp
    });
    callPort(ports, 'writeBarrier', {
      op: 'rollback',
      targetProjectId,
      transactionId,
      at: timestamp
    });
    callPort(ports, 'bdDelivery', {
      op: 'abort',
      targetProjectId,
      transactionId,
      at: timestamp
    });
    callPort(ports, 'tGate', {
      op: 'rollback',
      targetProjectId,
      transactionId,
      at: timestamp
    });

    rollbackCount += 1;
    const receipt = buildWriteReceipt(
      {
        ok: true,
        deny: false,
        denied: false,
        code: BK_CODES.ROLLBACK_OK,
        status: 'ROLLBACK',
        targetProjectId,
        targetPaths,
        preconditionMask: null,
        rollbackExecuted: true,
        timestamp,
        prevReceiptHash,
        reason: null,
        transactionId
      },
      { now: () => timestamp, hash: hashFn }
    );

    history.push(receipt);
    lastReceiptHash = receipt.receiptHash;
    if (prior) {
      prior.status = 'ROLLED_BACK';
      prior.receiptHash = receipt.receiptHash;
    } else {
      transactions.set(transactionId, {
        status: 'ROLLED_BACK',
        targetProjectId,
        targetPaths,
        receiptHash: receipt.receiptHash
      });
    }

    return {
      ok: true,
      allow: true,
      deny: false,
      denied: false,
      code: BK_CODES.ROLLBACK_OK,
      reason: null,
      receipt,
      transactionId,
      rollbackExecuted: true,
      PRODUCTION_READY: BK_PRODUCTION_READY,
      fundacionDelta: 0,
      hermetic: true,
      kind: BK_KIND,
      sealed: true
    };
  }

  function getHistory() {
    return history.slice();
  }

  function getLastReceiptHash() {
    return lastReceiptHash;
  }

  function health() {
    return {
      kind: BK_KIND,
      PRODUCTION_READY: BK_PRODUCTION_READY,
      fundacionDelta: 0,
      fundacion: 'ALWAYS_DENY',
      unsupervisedFleetDeploy: false,
      k8sArgoCd: false,
      productionReadyYes: false,
      cloudAgent: false,
      usesCloudAgent: false,
      notBl: true,
      bhMeasured: true,
      biMeasured: true,
      bjMeasured: true,
      bhAcknowledged: true,
      biAcknowledged: true,
      bjAcknowledged: true,
      bkInProgress: true,
      blPending: true,
      ladder17: 'CLOSED',
      ladder18: 'CLOSED',
      ladder19: 'CLOSED',
      ladder20: 'OPEN',
      l17NeverReopen: true,
      l18NeverReopen: true,
      l19NeverReopen: true,
      l17Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      l18Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      l19Status: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
      axis: 'Sovereign Mission Continuity & Operator Fabric',
      hermetic: true
    };
  }

  function getState() {
    return {
      kind: BK_KIND,
      PRODUCTION_READY: BK_PRODUCTION_READY,
      writeCount,
      okCount,
      denyCount,
      rollbackCount,
      partialFailCount,
      historyCount: history.length,
      lastReceiptHash,
      transactionCount: transactions.size,
      preconditions: { ...BK_PRECONDITIONS },
      allMask: BK_PRECONDITION_ALL_MASK
    };
  }

  return {
    kind: BK_KIND,
    PRODUCTION_READY: BK_PRODUCTION_READY,
    codes: BK_CODES,
    preconditions: BK_PRECONDITIONS,
    bits: BK_PRECONDITION_BITS,
    allMask: BK_PRECONDITION_ALL_MASK,
    validatePreconditions,
    executeGovernedWrite,
    rollbackWrite,
    getHistory,
    getLastReceiptHash,
    health,
    getState,
    gate,
    // NON-CLAIM surface
    unsupervisedFleetDeploy: false,
    k8sArgoCd: false,
    productionReadyYes: false,
    cloudAgent: false,
    usesCloudAgent: false,
    fundacionDelta: 0
  };
}

export class GovernedExternalWriteError extends Error {
  /**
   * @param {string} message
   * @param {object} [result]
   */
  constructor(message, result = {}) {
    super(message);
    this.name = 'GovernedExternalWriteError';
    this.result = result;
    this.code = result.code || BK_CODES.DENY;
  }
}

// Re-export validatePreconditions at module level for convenience
export { gateValidatePreconditions as validatePreconditions };

export default {
  BK_KIND,
  BK_PRODUCTION_READY,
  BK_CODES,
  BK_PRECONDITIONS,
  BK_PRECONDITION_BITS,
  BK_PRECONDITION_ALL_MASK,
  GovernedExternalWriteError,
  createGovernedExternalWriteOrchestrator,
  stableStringify,
  sha256Canonical,
  buildWriteReceipt,
  verifyWriteReceipt,
  gateExecuteWrite,
  gateRollback
};
