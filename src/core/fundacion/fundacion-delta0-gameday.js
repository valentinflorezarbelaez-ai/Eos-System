/**
 * @module fundacion-delta0-gameday
 * Post-L26 Workstream F — Fundacion Δ=0 game-day dry-run drill across L26
 * ports CL–CP. Fail-closed reconciler (NOT a Fundacion writer).
 *
 * Reads injected manifests + observations only. Simulates reconciliation.
 * NEVER performs real Fundacion path writes. Any detected write attempt
 * → FUNDACION_ALWAYS_DENY / fail closed.
 *
 * NON-CLAIM: Successful game-day ≠ L26 seal change ≠ PRODUCTION_READY flip.
 * PRODUCTION_READY: NO | Fundacion Δ=0 | FUNDACION_ALWAYS_DENY | Law VI
 * never reopen L17–L26 | no L27
 */

export const GAMEDAY_SCHEMA = 'eos.fundacion-delta0-gameday.v1';

/** @type {'NO'} */
export const GAMEDAY_PRODUCTION_READY = 'NO';

/** Canonical L26 port set for this drill. */
export const L26_PORTS = Object.freeze(['CL', 'CM', 'CN', 'CO', 'CP']);

/** Policy: Fundacion writes are always denied; delta must remain 0. */
export const FUNDACION_ALWAYS_DENY = true;
export const FUNDACION_DELTA_POLICY = 0;

/** Default freeze tip context (hermetic; host may override via input). */
export const DEFAULT_FREEZE_TIP = '47cf1a79';
export const DEFAULT_LADDER26_STATUS = 'CLOSED_FOR_LOCAL_GOVERNED_USE';

export const EXIT = Object.freeze({
  PASS: 0,
  FAIL: 1,
  MISMATCH: 2,
  MISSING_ARTIFACT: 3,
  DIRTY_INPUT: 4,
  PENDING_STATUS: 5,
  WRITE_ATTEMPT_DENIED: 6,
  POLICY_VIOLATION: 7,
  INVALID_INPUT: 8
});

export const REFUSE_CODES = Object.freeze({
  MISMATCH: 'MISMATCH',
  MISSING_ARTIFACT: 'MISSING_ARTIFACT',
  DIRTY_INPUT: 'DIRTY_INPUT',
  PENDING_STATUS: 'PENDING_STATUS',
  WRITE_ATTEMPT_DENIED: 'WRITE_ATTEMPT_DENIED',
  FUNDACION_ALWAYS_DENY: 'FUNDACION_ALWAYS_DENY',
  DELTA_NONZERO_DENY: 'DELTA_NONZERO_DENY',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  INVALID_INPUT: 'INVALID_INPUT',
  INDEPENDENT_CHECK_REQUIRED: 'INDEPENDENT_CHECK_REQUIRED',
  GREEN_BLOCKED: 'GREEN_BLOCKED'
});

export const PORT_META = Object.freeze({
  CL: Object.freeze({
    spec: 'SPEC-0095',
    surface: 'Spec↔Code Traceability Graph Port',
    receiptPrefix: 'CL-RCPT-',
    npmScript: 'test:mission-cl'
  }),
  CM: Object.freeze({
    spec: 'SPEC-0096',
    surface: 'Evidence Binding & Claim Custody Port',
    receiptPrefix: 'CM-RCPT-',
    npmScript: 'test:mission-cm'
  }),
  CN: Object.freeze({
    spec: 'SPEC-0097',
    surface: 'Governed Artifact / SBOM Attestation Port',
    receiptPrefix: 'CN-RCPT-',
    npmScript: 'test:mission-cn'
  }),
  CO: Object.freeze({
    spec: 'SPEC-0098',
    surface: 'Release Integrity & Progressive Honesty Governor',
    receiptPrefix: 'CO-RCPT-',
    npmScript: 'test:mission-co'
  }),
  CP: Object.freeze({
    spec: 'SPEC-0099',
    surface: 'Ladder 26 Seam-Pack Consolidation & Closeout',
    receiptPrefix: 'CP-SEAM-',
    npmScript: 'test:ladder26-seam'
  })
});

export const BASELINE_NON_CLAIMS = Object.freeze([
  'NON-CLAIM: Successful game-day ≠ L26 seal change ≠ PRODUCTION_READY flip',
  'NON-CLAIM: Δ=0 recorded only when independently checked',
  'NON-CLAIM: PRODUCTION_READY remains NO; FUNDACION_ALWAYS_DENY',
  'NON-CLAIM: never reopen L17–L26; no L27',
  'NON-CLAIM: Dry-run simulate only — no real Fundacion writes',
  'NON-CLAIM: CLOSED_FOR_LOCAL_GOVERNED_USE ≠ PRODUCTION_READY=YES'
]);

/** Allowed measured statuses for green conclusion. */
export const ALLOWED_MEASURED_STATUSES = Object.freeze([
  'MEASURED',
  'CLOSED_FOR_LOCAL_GOVERNED_USE'
]);

/** Statuses that block green (pending / open / unknown). */
export const PENDING_STATUSES = Object.freeze([
  'PENDING',
  'OPEN',
  'IN_PROGRESS',
  'UNKNOWN',
  'UNMEASURED',
  'DRAFT'
]);

// ─── Fundacion path / write detection ────────────────────────────────────────

/**
 * Detect Fundacion-targeted paths/labels (same spirit as Mission CL gate).
 * @param {unknown} target
 * @returns {boolean}
 */
export function isFundacionTarget(target) {
  if (target == null) return false;
  if (typeof target === 'object') {
    try {
      return isFundacionTarget(JSON.stringify(target));
    } catch {
      return false;
    }
  }
  const s = String(target).trim().toLowerCase().replace(/\\/g, '/');
  if (!s) return false;
  return (
    s.includes('documents/fundacion') ||
    s.includes('/fundacion/') ||
    s.includes('/fundacion') ||
    s.startsWith('fundacion/') ||
    s === 'fundacion' ||
    s.includes('fundacion\\') ||
    /(^|[_\-./])fundacion([_\-./]|$)/i.test(String(target))
  );
}

/**
 * Detect an attempted Fundacion write from observation / action records.
 * Simulation flags (`simulateWrite`, `writeAttempt`) count as attempts.
 *
 * @param {object} [obs]
 * @returns {{ attempted: boolean, paths: string[], detail: string|null }}
 */
export function detectWriteAttempt(obs = {}) {
  const paths = [];
  const flags = [];

  if (obs.writeAttempt === true || obs.attemptedWrite === true) {
    flags.push('writeAttempt=true');
  }
  if (obs.simulateWrite === true && obs.allowSimulate !== true) {
    // simulateWrite without allowSimulate still records as attempt for audit,
    // but allowSimulate=true means dry-run fixture marking (not a real attempt).
    flags.push('simulateWrite=true without allowSimulate');
  }
  if (obs.fundacionWrite === true || obs.performFundacionWrite === true) {
    flags.push('fundacionWrite=true');
  }
  if (Array.isArray(obs.writePaths)) {
    for (const p of obs.writePaths) {
      if (isFundacionTarget(p)) paths.push(String(p));
    }
  }
  if (obs.targetPath && isFundacionTarget(obs.targetPath)) {
    paths.push(String(obs.targetPath));
  }
  if (obs.path && isFundacionTarget(obs.path)) {
    paths.push(String(obs.path));
  }
  if (obs.action === 'write' || obs.op === 'write' || obs.method === 'write') {
    const t = obs.target || obs.path || obs.targetPath || obs.planId;
    if (isFundacionTarget(t) || obs.fundacion === true) {
      flags.push(`action=write target=${t}`);
      if (t) paths.push(String(t));
    }
  }

  const attempted = flags.length > 0 || paths.length > 0;
  return {
    attempted,
    paths: [...new Set(paths)],
    detail: attempted
      ? `WRITE_ATTEMPT: ${[...flags, ...paths.map((p) => `path=${p}`)].join('; ')}`
      : null
  };
}

/**
 * Assert Fundacion Δ=0 / ALWAYS_DENY policy on a record.
 * @param {object} [rec]
 * @returns {{ ok: boolean, code: string|null, diagnostic: string }}
 */
export function assertFundacionPolicy(rec = {}) {
  const issues = [];

  if (rec.fundacionDelta != null && Number(rec.fundacionDelta) !== 0) {
    issues.push(
      `DELTA_NONZERO_DENY: fundacionDelta=${rec.fundacionDelta} (policy Δ=0)`
    );
  }
  if (rec.fundacion_delta != null && Number(rec.fundacion_delta) !== 0) {
    issues.push(
      `DELTA_NONZERO_DENY: fundacion_delta=${rec.fundacion_delta} (policy Δ=0)`
    );
  }
  if (rec.allowFundacionWrite === true || rec.fundacionWriteAllowed === true) {
    issues.push('FUNDACION_ALWAYS_DENY: allowFundacionWrite must not be true');
  }
  if (
    rec.FUNDACION_ALWAYS_DENY === false ||
    rec.fundacionAlwaysDeny === false
  ) {
    issues.push('FUNDACION_ALWAYS_DENY: policy flag must remain true');
  }

  const write = detectWriteAttempt(rec);
  if (write.attempted && rec.allowSimulate !== true) {
    issues.push(write.detail || 'WRITE_ATTEMPT_DENIED');
  }
  // Even with allowSimulate, real writeAttempt without simulate-only still denies
  if (
    (rec.writeAttempt === true || rec.performFundacionWrite === true) &&
    rec.dryRunSimulateOnly !== true
  ) {
    if (!issues.some((i) => /WRITE_ATTEMPT/.test(i))) {
      issues.push(
        'WRITE_ATTEMPT_DENIED: real writeAttempt without dryRunSimulateOnly'
      );
    }
  }

  if (issues.length === 0) {
    return {
      ok: true,
      code: null,
      diagnostic: 'FUNDACION_ALWAYS_DENY held; Δ=0 policy ok'
    };
  }

  const code = issues.some((i) => /WRITE_ATTEMPT/.test(i))
    ? REFUSE_CODES.WRITE_ATTEMPT_DENIED
    : issues.some((i) => /DELTA_NONZERO/.test(i))
      ? REFUSE_CODES.DELTA_NONZERO_DENY
      : REFUSE_CODES.FUNDACION_ALWAYS_DENY;

  return {
    ok: false,
    code,
    diagnostic: issues.join('; '),
    issues
  };
}

// ─── Artifact reconciliation ─────────────────────────────────────────────────

/**
 * Normalize artifact id/path for comparison.
 * @param {string|object} a
 * @returns {string}
 */
export function artifactKey(a) {
  if (a == null) return '';
  if (typeof a === 'string') return a.trim().replace(/\\/g, '/');
  if (typeof a === 'object') {
    return String(
      a.id || a.artifactId || a.path || a.name || a.digest || ''
    )
      .trim()
      .replace(/\\/g, '/');
  }
  return String(a);
}

/**
 * Normalize digest for equality (case-insensitive hex / string).
 * @param {unknown} d
 * @returns {string|null}
 */
export function normalizeDigest(d) {
  if (d == null || d === '') return null;
  return String(d).trim().toLowerCase();
}

/**
 * Reconcile one port: expected vs observed artifacts + status + delta.
 *
 * @param {string} port
 * @param {object} expected
 * @param {object} observed
 * @returns {object}
 */
export function reconcilePort(port, expected = {}, observed = {}) {
  const portId = String(port || '').toUpperCase();
  const refuses = [];
  const mismatches = [];
  const missing = [];
  const extras = [];

  const expArtifacts = normalizeArtifactList(
    expected.artifacts || expected.expectedArtifacts || []
  );
  const obsArtifacts = normalizeArtifactList(
    observed.artifacts || observed.observedArtifacts || []
  );

  const obsByKey = new Map();
  for (const a of obsArtifacts) {
    obsByKey.set(a.key, a);
  }
  const seen = new Set();

  for (const exp of expArtifacts) {
    const obs = obsByKey.get(exp.key);
    if (!obs) {
      missing.push(exp.key);
      refuses.push({
        code: REFUSE_CODES.MISSING_ARTIFACT,
        port: portId,
        detail: `MISSING_ARTIFACT: port=${portId} expected=${exp.key}`,
        actionable: `Provide observed artifact '${exp.key}' for ${portId} or correct the manifest`
      });
      continue;
    }
    seen.add(exp.key);

    if (
      exp.digest &&
      obs.digest &&
      normalizeDigest(exp.digest) !== normalizeDigest(obs.digest)
    ) {
      mismatches.push({
        key: exp.key,
        field: 'digest',
        expected: exp.digest,
        observed: obs.digest
      });
      refuses.push({
        code: REFUSE_CODES.MISMATCH,
        port: portId,
        detail: `MISMATCH: port=${portId} artifact=${exp.key} digest expected=${short(exp.digest)} observed=${short(obs.digest)}`,
        actionable: 'Re-collect observation or refresh expected digest independently'
      });
    }

    if (
      exp.status &&
      obs.status &&
      String(exp.status).toUpperCase() !== String(obs.status).toUpperCase()
    ) {
      mismatches.push({
        key: exp.key,
        field: 'status',
        expected: exp.status,
        observed: obs.status
      });
      refuses.push({
        code: REFUSE_CODES.MISMATCH,
        port: portId,
        detail: `MISMATCH: port=${portId} artifact=${exp.key} status expected=${exp.status} observed=${obs.status}`,
        actionable: 'Resolve status drift before green conclusion'
      });
    }

    if (
      exp.revision &&
      obs.revision &&
      !shaPrefixMatch(exp.revision, obs.revision)
    ) {
      mismatches.push({
        key: exp.key,
        field: 'revision',
        expected: exp.revision,
        observed: obs.revision
      });
      refuses.push({
        code: REFUSE_CODES.MISMATCH,
        port: portId,
        detail: `MISMATCH: port=${portId} artifact=${exp.key} revision expected=${short(exp.revision)} observed=${short(obs.revision)}`,
        actionable: 'Align freeze/revision identity or mark gap in retrospective'
      });
    }
  }

  for (const obs of obsArtifacts) {
    if (!seen.has(obs.key) && expArtifacts.length > 0) {
      // Unexpected extra is advisory unless requireExact
      extras.push(obs.key);
    }
  }

  // Port-level status
  const expStatus = normalizeStatus(
    expected.status || expected.portStatus || null
  );
  const obsStatus = normalizeStatus(
    observed.status || observed.portStatus || null
  );

  if (obsStatus && PENDING_STATUSES.includes(obsStatus)) {
    refuses.push({
      code: REFUSE_CODES.PENDING_STATUS,
      port: portId,
      detail: `PENDING_STATUS: port=${portId} observed status=${obsStatus}`,
      actionable: 'Pending/open ports block green Δ=0 conclusion'
    });
  }

  if (
    expStatus &&
    obsStatus &&
    expStatus !== obsStatus &&
    !bothMeasuredCompatible(expStatus, obsStatus)
  ) {
    mismatches.push({
      key: portId,
      field: 'portStatus',
      expected: expStatus,
      observed: obsStatus
    });
    refuses.push({
      code: REFUSE_CODES.MISMATCH,
      port: portId,
      detail: `MISMATCH: port=${portId} status expected=${expStatus} observed=${obsStatus}`,
      actionable: 'Do not claim green while port status drifts'
    });
  }

  // Dirty input on port
  const dirty =
    observed.dirty === true ||
    expected.dirty === true ||
    (Array.isArray(observed.dirtyPaths) && observed.dirtyPaths.length > 0);
  if (dirty) {
    refuses.push({
      code: REFUSE_CODES.DIRTY_INPUT,
      port: portId,
      detail: `DIRTY_INPUT: port=${portId} dirtyPaths=${(observed.dirtyPaths || []).slice(0, 8).join(', ') || '(flagged)'}`,
      actionable: 'Clean or stash dirty inputs before game-day green'
    });
  }

  // Policy on expected + observed
  const polExp = assertFundacionPolicy(expected);
  const polObs = assertFundacionPolicy(observed);
  if (!polExp.ok) {
    refuses.push({
      code: polExp.code,
      port: portId,
      detail: `policy(expected): ${polExp.diagnostic}`,
      actionable: 'Remove Fundacion write / nonzero delta from expected manifest'
    });
  }
  if (!polObs.ok) {
    refuses.push({
      code: polObs.code,
      port: portId,
      detail: `policy(observed): ${polObs.diagnostic}`,
      actionable: 'Fail closed — no Fundacion writes; restore Δ=0'
    });
  }

  // Independent check requirement for recording Δ=0
  const independentChecked =
    observed.independentCheck === true ||
    observed.independentlyChecked === true ||
    expected.independentCheck === true;

  const ok = refuses.length === 0;
  const deltaRecordable = ok && independentChecked;

  return {
    port: portId,
    ok,
    refuses,
    mismatches,
    missing,
    extras,
    expected_status: expStatus,
    observed_status: obsStatus,
    dirty,
    independent_checked: independentChecked,
    delta_recordable: deltaRecordable,
    fundacion_delta: deltaRecordable ? 0 : null,
    meta: PORT_META[portId] || null,
    note: ok
      ? deltaRecordable
        ? `PORT_OK Δ=0 independently checked — ${portId}`
        : `PORT_OK but INDEPENDENT_CHECK_REQUIRED before recording Δ=0 — ${portId}`
      : `PORT_REFUSE — ${refuses[0]?.code} — ${portId}`
  };
}

function normalizeArtifactList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => {
      if (typeof a === 'string') {
        return { key: artifactKey(a), digest: null, status: null, revision: null };
      }
      const key = artifactKey(a);
      return {
        key,
        digest: a.digest || a.sha256 || a.hash || null,
        status: a.status || null,
        revision: a.revision || a.tip || a.sha || null,
        raw: a
      };
    })
    .filter((a) => a.key);
}

function normalizeStatus(s) {
  if (s == null || s === '') return null;
  return String(s).trim().toUpperCase().replace(/\s+/g, '_');
}

function bothMeasuredCompatible(a, b) {
  // MEASURED and CLOSED_FOR_LOCAL_GOVERNED_USE are both acceptable measured-family
  // only when comparing CP seal status vs MEASURED satellites — still mismatch if
  // explicitly different and neither is in allowed pair for same port.
  if (a === b) return true;
  return false;
}

function short(s, n = 12) {
  if (s == null) return 'n/a';
  const t = String(s);
  return t.length <= n ? t : t.slice(0, n);
}

export function shaPrefixMatch(a, b) {
  const x = String(a || '')
    .trim()
    .toLowerCase();
  const y = String(b || '')
    .trim()
    .toLowerCase();
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length);
  if (n < 7) return x === y;
  return x.slice(0, n) === y.slice(0, n);
}

// ─── Main game-day runner ────────────────────────────────────────────────────

/**
 * Run Fundacion Δ=0 game-day dry-run across CL–CP.
 *
 * @param {object} input
 * @param {object} [input.baseline] freeze tip / ladder status
 * @param {object} [input.observer] { name, role }
 * @param {object} [input.ports] map of port → { expected, observed }
 * @param {object[]} [input.manifests] alternate: [{ port, ...expected }]
 * @param {object[]} [input.observations] alternate: [{ port, ...observed }]
 * @param {boolean} [input.dirty] global dirty
 * @param {string[]} [input.dirtyPaths]
 * @param {string[]} [input.pendingPorts]
 * @param {boolean} [input.writeAttempt] global write attempt → deny
 * @param {object[]} [input.writeAttempts]
 * @param {boolean} [input.requireIndependentCheck] default true
 * @returns {object} gameday record
 */
export function runFundacionDelta0Gameday(input = {}) {
  const refuses = [];
  const portResults = [];

  // Global write attempt → immediate deny path (still evaluate ports for report)
  const globalWrite = detectWriteAttempt(input);
  if (globalWrite.attempted && input.dryRunSimulateOnly !== true) {
    refuses.push({
      code: REFUSE_CODES.WRITE_ATTEMPT_DENIED,
      detail: globalWrite.detail,
      actionable:
        'FUNDACION_ALWAYS_DENY — remove writeAttempt; simulate with dryRunSimulateOnly fixtures only'
    });
  }
  if (Array.isArray(input.writeAttempts)) {
    for (const wa of input.writeAttempts) {
      const d = detectWriteAttempt(wa);
      if (d.attempted) {
        refuses.push({
          code: REFUSE_CODES.WRITE_ATTEMPT_DENIED,
          detail: d.detail,
          actionable: 'No Fundacion writes ever in this package'
        });
      }
    }
  }

  const globalPolicy = assertFundacionPolicy(input);
  if (!globalPolicy.ok && globalPolicy.code !== REFUSE_CODES.WRITE_ATTEMPT_DENIED) {
    // Avoid duplicate write refuses
    if (
      !refuses.some((r) => r.code === globalPolicy.code) ||
      globalPolicy.code !== REFUSE_CODES.WRITE_ATTEMPT_DENIED
    ) {
      if (!refuses.some((r) => r.detail === globalPolicy.diagnostic)) {
        refuses.push({
          code: globalPolicy.code,
          detail: globalPolicy.diagnostic,
          actionable: 'Restore FUNDACION_ALWAYS_DENY / Δ=0'
        });
      }
    }
  } else if (
    !globalPolicy.ok &&
    globalPolicy.code === REFUSE_CODES.WRITE_ATTEMPT_DENIED &&
    !refuses.some((r) => r.code === REFUSE_CODES.WRITE_ATTEMPT_DENIED)
  ) {
    refuses.push({
      code: globalPolicy.code,
      detail: globalPolicy.diagnostic,
      actionable: 'No Fundacion writes'
    });
  }

  // Global dirty
  if (
    input.dirty === true ||
    (Array.isArray(input.dirtyPaths) && input.dirtyPaths.length > 0)
  ) {
    refuses.push({
      code: REFUSE_CODES.DIRTY_INPUT,
      detail: `DIRTY_INPUT: global dirtyPaths=${(input.dirtyPaths || []).slice(0, 8).join(', ') || '(flagged)'}`,
      actionable: 'Clean tree / inputs before green game-day conclusion'
    });
  }

  // Pending ports list
  const pendingPorts = Array.isArray(input.pendingPorts)
    ? input.pendingPorts.map((p) => String(p).toUpperCase())
    : [];
  for (const p of pendingPorts) {
    refuses.push({
      code: REFUSE_CODES.PENDING_STATUS,
      port: p,
      detail: `PENDING_STATUS: port=${p} listed in pendingPorts`,
      actionable: 'Pending ports block green Δ=0 conclusion'
    });
  }

  // Build port map from ports | manifests+observations
  const portMap = buildPortMap(input);
  const requireIndependent =
    input.requireIndependentCheck !== false; // default true

  for (const port of L26_PORTS) {
    const entry = portMap[port];
    if (!entry) {
      refuses.push({
        code: REFUSE_CODES.MISSING_ARTIFACT,
        port,
        detail: `MISSING_ARTIFACT: no manifest/observation for port=${port}`,
        actionable: `Supply expected+observed for ${port}`
      });
      portResults.push({
        port,
        ok: false,
        refuses: [
          {
            code: REFUSE_CODES.MISSING_ARTIFACT,
            port,
            detail: `missing port entry ${port}`
          }
        ],
        missing: [`port:${port}`],
        mismatches: [],
        extras: [],
        independent_checked: false,
        delta_recordable: false,
        fundacion_delta: null,
        note: `PORT_REFUSE — MISSING_ARTIFACT — ${port}`
      });
      continue;
    }

    const result = reconcilePort(port, entry.expected, entry.observed);
    portResults.push(result);

    for (const r of result.refuses) {
      refuses.push(r);
    }

    if (
      requireIndependent &&
      result.ok &&
      !result.independent_checked
    ) {
      refuses.push({
        code: REFUSE_CODES.INDEPENDENT_CHECK_REQUIRED,
        port,
        detail: `INDEPENDENT_CHECK_REQUIRED: port=${port} cannot record Δ=0 without independentCheck=true`,
        actionable:
          'Observer must independently verify artifacts and set independentCheck=true'
      });
      // Mark not recordable (already null)
      result.delta_recordable = false;
      result.fundacion_delta = null;
      result.note = `PORT_OK but INDEPENDENT_CHECK_REQUIRED before recording Δ=0 — ${port}`;
    }
  }

  // Exact artifact set when requireExactArtifacts
  if (input.requireExactArtifacts === true) {
    for (const pr of portResults) {
      if (pr.extras && pr.extras.length) {
        const r = {
          code: REFUSE_CODES.MISMATCH,
          port: pr.port,
          detail: `MISMATCH: unexpected artifacts on ${pr.port}: ${pr.extras.join(', ')}`,
          actionable: 'Remove extras or update expected manifest'
        };
        refuses.push(r);
        pr.ok = false;
        pr.refuses.push(r);
      }
    }
  }

  const ok = refuses.length === 0;
  const allDeltaRecordable =
    ok && portResults.every((p) => p.delta_recordable === true);

  const fundacion_delta = allDeltaRecordable ? 0 : null;
  const primary = ok ? null : refuses[0].code;
  const exitCode = ok
    ? EXIT.PASS
    : primary === REFUSE_CODES.MISMATCH
      ? EXIT.MISMATCH
      : primary === REFUSE_CODES.MISSING_ARTIFACT
        ? EXIT.MISSING_ARTIFACT
        : primary === REFUSE_CODES.DIRTY_INPUT
          ? EXIT.DIRTY_INPUT
          : primary === REFUSE_CODES.PENDING_STATUS
            ? EXIT.PENDING_STATUS
            : primary === REFUSE_CODES.WRITE_ATTEMPT_DENIED ||
                primary === REFUSE_CODES.FUNDACION_ALWAYS_DENY
              ? EXIT.WRITE_ATTEMPT_DENIED
              : primary === REFUSE_CODES.DELTA_NONZERO_DENY ||
                  primary === REFUSE_CODES.POLICY_VIOLATION
                ? EXIT.POLICY_VIOLATION
                : primary === REFUSE_CODES.INVALID_INPUT
                  ? EXIT.INVALID_INPUT
                  : primary === REFUSE_CODES.INDEPENDENT_CHECK_REQUIRED
                    ? EXIT.FAIL
                    : EXIT.FAIL;

  const baseline = {
    freeze_tip:
      input.baseline?.freezeTip ||
      input.baseline?.freeze_tip ||
      input.freezeTip ||
      DEFAULT_FREEZE_TIP,
    ladder26_status:
      input.baseline?.ladder26Status ||
      input.baseline?.ladder26_status ||
      DEFAULT_LADDER26_STATUS,
    production_ready: GAMEDAY_PRODUCTION_READY,
    tip_seal: input.baseline?.tipSeal || input.baseline?.tip_seal || '#366',
    host_machine_id:
      input.baseline?.machineId ||
      '77c24295-69bc-4113-82ab-1d8f0359a5e7'
  };

  const observer = {
    name: input.observer?.name || input.observerName || null,
    role: input.observer?.role || 'game-day-observer',
    signed_off: input.observer?.signedOff === true
  };

  const non_claims = [
    ...BASELINE_NON_CLAIMS,
    ...(Array.isArray(input.extraNonClaims) ? input.extraNonClaims : [])
  ];

  return {
    schema: GAMEDAY_SCHEMA,
    PRODUCTION_READY: GAMEDAY_PRODUCTION_READY,
    ok,
    green: ok && allDeltaRecordable,
    exit_code: exitCode,
    primary_refuse: primary,
    refuses,
    ports: portResults,
    ports_checked: L26_PORTS.slice(),
    baseline,
    observer,
    fundacion_delta,
    fundacion_delta_policy: FUNDACION_DELTA_POLICY,
    FUNDACION_ALWAYS_DENY,
    law_vi: true,
    write_attempt_detected:
      refuses.some((r) => r.code === REFUSE_CODES.WRITE_ATTEMPT_DENIED) ||
      globalWrite.attempted,
    independent_checks_complete: allDeltaRecordable,
    stop_conditions_hit: ok
      ? []
      : [...new Set(refuses.map((r) => r.code))],
    rollback_boundary: 'NO_FUNDACION_WRITES — dry-run only; no rollback of Fundacion state (untouched)',
    no_write_boundary: 'FUNDACION_ALWAYS_DENY — simulate manifests/observations only',
    non_claims,
    note: ok
      ? allDeltaRecordable
        ? 'GAMEDAY_PASS — Δ=0 independently checked across CL–CP; NOT a seal/readiness flip'
        : 'GAMEDAY_PASS_PARTIAL — ports ok but independent checks incomplete'
      : `GAMEDAY_REFUSE — ${primary} — green conclusion blocked`,
    auto_seal: false,
    auto_production_ready_flip: false,
    l17_l26_reopen: false,
    l27_start: false
  };
}

function buildPortMap(input) {
  const map = {};

  if (input.ports && typeof input.ports === 'object') {
    for (const port of L26_PORTS) {
      const raw = input.ports[port] || input.ports[port.toLowerCase()];
      if (!raw) continue;
      map[port] = {
        expected: raw.expected || raw.manifest || raw,
        observed: raw.observed || raw.observation || raw
      };
      // If single object used for both, split carefully
      if (!raw.expected && !raw.observed && !raw.manifest && !raw.observation) {
        // Treat as expected=observed when only one blob (tests may pass both sides)
        map[port] = { expected: raw, observed: raw };
      }
      if (raw.expected || raw.manifest) {
        map[port].expected = raw.expected || raw.manifest;
      }
      if (raw.observed || raw.observation) {
        map[port].observed = raw.observed || raw.observation;
      }
    }
  }

  if (Array.isArray(input.manifests)) {
    for (const m of input.manifests) {
      const port = String(m.port || m.portId || '').toUpperCase();
      if (!L26_PORTS.includes(port)) continue;
      map[port] = map[port] || { expected: {}, observed: {} };
      map[port].expected = { ...map[port].expected, ...m };
    }
  }

  if (Array.isArray(input.observations)) {
    for (const o of input.observations) {
      const port = String(o.port || o.portId || '').toUpperCase();
      if (!L26_PORTS.includes(port)) continue;
      map[port] = map[port] || { expected: {}, observed: {} };
      map[port].observed = { ...map[port].observed, ...o };
    }
  }

  return map;
}

/**
 * Map gameday → process exit code.
 */
export function exitCodeFromGameday(gameday) {
  if (!gameday || typeof gameday !== 'object') return EXIT.FAIL;
  if (typeof gameday.exit_code === 'number') return gameday.exit_code;
  return gameday.ok ? EXIT.PASS : EXIT.FAIL;
}

/**
 * CLI-friendly summary (no ANSI).
 */
export function formatGamedaySummary(g) {
  if (!g) return 'fundacion-delta0-gameday: no result';
  const lines = [
    `schema: ${g.schema}`,
    `ok: ${g.ok}`,
    `green: ${g.green}`,
    `exit_code: ${g.exit_code}`,
    `PRODUCTION_READY: ${g.PRODUCTION_READY}`,
    `fundacion_delta: ${g.fundacion_delta === null ? 'null (not recorded)' : g.fundacion_delta}`,
    `FUNDACION_ALWAYS_DENY: ${g.FUNDACION_ALWAYS_DENY}`,
    `primary_refuse: ${g.primary_refuse || 'none'}`,
    `write_attempt_detected: ${g.write_attempt_detected}`,
    `note: ${g.note}`
  ];
  for (const p of g.ports || []) {
    lines.push(
      `  port ${p.port}: ok=${p.ok} Δ=${p.fundacion_delta === null ? 'n/a' : p.fundacion_delta} independent=${p.independent_checked} — ${p.note}`
    );
  }
  for (const r of g.refuses || []) {
    lines.push(`  REFUSE ${r.code}: ${r.detail}`);
    if (r.actionable) lines.push(`    → ${r.actionable}`);
  }
  for (const nc of g.non_claims || []) {
    lines.push(`  ${nc}`);
  }
  return lines.join('\n');
}

/**
 * Build a default happy-path port set for fixtures/tests (CL–CP MEASURED).
 * @param {object} [opts]
 */
export function buildHappyPortSet(opts = {}) {
  const tip = opts.freezeTip || DEFAULT_FREEZE_TIP;
  const independent = opts.independentCheck !== false;
  const ports = {};
  for (const port of L26_PORTS) {
    const meta = PORT_META[port];
    const artifactId = `${port.toLowerCase()}-receipt-manifest`;
    const digest =
      opts.digests?.[port] ||
      `${port.toLowerCase()}${'0'.repeat(64)}`.slice(0, 64);
    const status =
      port === 'CP'
        ? 'CLOSED_FOR_LOCAL_GOVERNED_USE'
        : 'MEASURED';
    const blob = {
      status,
      fundacionDelta: 0,
      FUNDACION_ALWAYS_DENY: true,
      independentCheck: independent,
      artifacts: [
        {
          id: artifactId,
          digest,
          status,
          revision: tip
        },
        {
          id: `${port}-adr`,
          digest: `adr-${port.toLowerCase()}-digest`,
          status: 'PRESENT'
        }
      ]
    };
    ports[port] = {
      expected: { ...blob },
      observed: { ...blob, artifacts: blob.artifacts.map((a) => ({ ...a })) }
    };
  }
  return ports;
}

/** Machine-readable stop-condition ids (docs alignment). */
export const STOP_CONDITION_IDS = Object.freeze([
  'SC1_ARTIFACT_MISMATCH',
  'SC2_MISSING_ARTIFACT',
  'SC3_DIRTY_INPUT',
  'SC4_PENDING_PORT_STATUS',
  'SC5_FUNDACION_WRITE_ATTEMPT',
  'SC6_DELTA_NONZERO',
  'SC7_INDEPENDENT_CHECK_MISSING'
]);

/** Run-sheet phase ids. */
export const RUN_SHEET_PHASES = Object.freeze([
  'P0_BASELINE_LOCK',
  'P1_OBSERVER_BRIEF',
  'P2_INPUT_COLLECTION',
  'P3_RECONCILE_CL_CP',
  'P4_DELTA0_RECORD_OR_BLOCK',
  'P5_RETROSPECTIVE',
  'P6_NO_SEAL_NO_PROD_FLIP'
]);
