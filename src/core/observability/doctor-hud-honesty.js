/**
 * @module doctor-hud-honesty
 * Post-L26 Workstream B — Doctor + HUD honesty surfaces.
 *
 * Surfaces source/freeze revision, measurable lag, dirty-defer blocking,
 * NON-CLAIM chips, and pending-port visibility. Pure + fixture-friendly
 * (no live git required in tests).
 *
 * NON-CLAIM: Better display text does not close L26 or make PRODUCTION_READY true.
 * PRODUCTION_READY: NO
 * Fundacion Δ=0 · Law VI · never reopen L17–L26 · no L27
 */

export const HONESTY_SCHEMA = 'eos.doctor-hud-honesty.v1';

/** @type {'NO'} */
export const HONESTY_PRODUCTION_READY = 'NO';

export const FREEZE_GATE_REL = 'docs/releases/EOS_FREEZE_GATE_STATUS.md';

/** Accept short (7+) or full (40) hex SHAs. */
export const TIP_SHA_FLEX_RE = /^[0-9a-f]{7,40}$/i;

export const MAIN_TIP_LINE_RE = /^main_tip:\s*([0-9a-f]{7,40})\b/im;

/** Default display cap for pending-port lists (Token & Context Hygiene: summarize, full list stays in --json). */
export const PENDING_PORT_DISPLAY_LIMIT = 10;

/**
 * Summarize a pending-port list for human-readable display.
 * Data model keeps the full array; only display is truncated.
 * @param {string[]} ports
 * @param {number} [limit]
 * @returns {string}
 */
export function summarizePendingPorts(ports, limit = PENDING_PORT_DISPLAY_LIMIT) {
  const list = Array.isArray(ports) ? ports.map(String) : [];
  if (list.length === 0) return 'none';
  const n = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : PENDING_PORT_DISPLAY_LIMIT;
  if (list.length <= n) return list.join(', ');
  const shown = list.slice(0, n).join(', ');
  return `${list.length} ports (showing ${n}): ${shown} +${list.length - n} more — see --json for full list`;
}

/** Pending-port needles in freeze/matrix narratives (visibility only). */
export const PENDING_PORT_RE =
  /\b([A-Z]{1,3}(?:\s*[–—-]\s*[A-Z]{1,3})?)\s+pending\b/gi;

export const BASELINE_NON_CLAIMS = Object.freeze([
  'NON-CLAIM: honesty display ≠ L26 reopen or seal change',
  'NON-CLAIM: honesty display ≠ PRODUCTION_READY flip (remains NO)',
  'NON-CLAIM: honesty display ≠ evidence completeness / EVD custody seal',
  'NON-CLAIM: doctor/HUD honesty ≠ verify:strict pass',
  'NON-CLAIM: Fundacion Δ=0 retained; no Fundacion mutation authorized'
]);

export function normalizeSha(sha) {
  if (sha == null || sha === '') return null;
  const s = String(sha).trim().toLowerCase();
  if (!TIP_SHA_FLEX_RE.test(s)) return null;
  return s;
}

export function shortSha(sha, n = 7) {
  const s = normalizeSha(sha);
  return s ? s.slice(0, n) : null;
}

export function revsMatch(a, b) {
  const x = normalizeSha(a);
  const y = normalizeSha(b);
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length, 40);
  if (n < 7) return false;
  return x.slice(0, n) === y.slice(0, n);
}

export function parseFreezeMainTip(text) {
  if (text == null || typeof text !== 'string') return null;
  const m = text.match(MAIN_TIP_LINE_RE);
  return m ? normalizeSha(m[1]) : null;
}

export function extractPendingPorts(text) {
  if (text == null || typeof text !== 'string') return [];
  const found = new Set();
  PENDING_PORT_RE.lastIndex = 0;
  let m;
  while ((m = PENDING_PORT_RE.exec(text)) !== null) {
    const label = String(m[1]).replace(/\s+/g, '').replace(/[—]/g, '–');
    if (label) found.add(`${label} pending`);
  }
  return [...found];
}

/**
 * Measurable freeze-vs-source revision lag.
 * lagCommits signed: >0 source ahead of freeze; <0 source behind.
 */
export function measureRevisionLag(input = {}) {
  const freezeRevision =
    normalizeSha(input.freezeRevision) || parseFreezeMainTip(input.freezeText);
  const sourceRevision = normalizeSha(input.sourceRevision);
  const lagProvided =
    input.lagCommits !== undefined && input.lagCommits !== null;
  const lagCommits = lagProvided ? Number(input.lagCommits) : null;

  if (!freezeRevision || !sourceRevision) {
    return {
      epistemic: 'NOT_VERIFIED',
      freeze_revision: freezeRevision,
      freeze_revision_short: shortSha(freezeRevision),
      source_revision: sourceRevision,
      source_revision_short: shortSha(sourceRevision),
      match: false,
      lag_commits: lagCommits,
      lag_measurable: lagProvided && Number.isFinite(lagCommits),
      lag_label: 'UNKNOWN — missing freeze or source revision',
      note: 'Informational only; no PRODUCTION_READY claim'
    };
  }

  const match = revsMatch(freezeRevision, sourceRevision);
  let lag_label;
  let lag_measurable = false;

  if (match) {
    lag_label = 'MATCH — source revision equals freeze revision';
    lag_measurable = true;
  } else if (lagProvided && Number.isFinite(lagCommits)) {
    lag_measurable = true;
    if (lagCommits > 0) {
      lag_label = `HEAD_AHEAD — source is ${lagCommits} commit(s) ahead of freeze`;
    } else if (lagCommits < 0) {
      lag_label = `HEAD_BEHIND — source is ${Math.abs(lagCommits)} commit(s) behind freeze`;
    } else {
      lag_label = 'DIVERGE — revisions differ but lag_commits=0 (topology unknown)';
    }
  } else {
    lag_label =
      'DIVERGE — freeze ≠ source; lag_commits not measured (provide lagCommits for measurable lag)';
  }

  return {
    epistemic: 'OBSERVED',
    freeze_revision: freezeRevision,
    freeze_revision_short: shortSha(freezeRevision),
    source_revision: sourceRevision,
    source_revision_short: shortSha(sourceRevision),
    match,
    lag_commits: match ? 0 : lagCommits,
    lag_measurable: match ? true : lag_measurable,
    lag_label,
    note: match
      ? 'OBSERVED match (informational; PRODUCTION_READY unchanged)'
      : 'OBSERVED lag/diverge (informational / fail-closed; no PRODUCTION_READY claim)'
  };
}

/**
 * Dirty state defers or blocks optimistic results.
 */
export function evaluateDirtyState(input = {}) {
  const dirty = input.dirty === true;
  const dirtyPaths = Array.isArray(input.dirtyPaths)
    ? input.dirtyPaths.map(String)
    : [];
  const summary =
    input.dirtySummary ||
    (dirtyPaths.length
      ? `dirty paths: ${dirtyPaths.slice(0, 8).join(', ')}${dirtyPaths.length > 8 ? '…' : ''}`
      : dirty
        ? 'working tree dirty (paths not enumerated)'
        : 'working tree clean');

  if (!dirty) {
    return {
      dirty: false,
      deferred: false,
      blocked: false,
      optimistic_allowed: true,
      reason: null,
      summary,
      dirty_paths: dirtyPaths
    };
  }

  const allow = input.allowOptimisticWhenDirty === true || input.allowOptimisticWhenDirty === true;
  return {
    dirty: true,
    deferred: true,
    blocked: !allow,
    optimistic_allowed: allow,
    reason: allow
      ? `DIRTY_DEFER: tree dirty but optimistic override enabled — ${summary}`
      : `DIRTY_BLOCK: optimistic result deferred/blocked — ${summary}`,
    summary,
    dirty_paths: dirtyPaths
  };
}

/**
 * NON-CLAIM chips where closure / readiness / evidence completeness is not established.
 */
export function collectNonClaimChips(input = {}) {
  const chips = [...BASELINE_NON_CLAIMS];

  if (input.productionReadyEstablished !== true) {
    chips.push('NON-CLAIM chip: PRODUCTION_READY not established (display remains NO)');
  }
  if (input.closureEstablished !== true) {
    chips.push('NON-CLAIM chip: ladder/mission closure not established by this surface');
  }
  if (input.evidenceComplete !== true) {
    chips.push('NON-CLAIM chip: evidence completeness not established');
  }
  if (input.dirty === true) {
    chips.push('NON-CLAIM chip: dirty tree — optimistic seal/readiness claims blocked');
  }
  if (input.revisionMatch === false) {
    chips.push('NON-CLAIM chip: freeze≠HEAD lag — tip honesty not auto-restored by display');
  }
  const ports = Array.isArray(input.pendingPorts) ? input.pendingPorts : [];
  if (ports.length > 0) {
    const limit = input.pendingPortDisplayLimit ?? PENDING_PORT_DISPLAY_LIMIT;
    chips.push(
      `NON-CLAIM chip: pending-port visible (${summarizePendingPorts(ports, limit)}) — not closed by honesty surface`
    );
  }
  if (Array.isArray(input.extraChips)) {
    for (const c of input.extraChips) {
      if (c && !chips.includes(c)) chips.push(String(c));
    }
  }
  return chips;
}

/**
 * Unified honesty surface for Doctor + HUD.
 */
export function buildHonestySurface(input = {}) {
  const revision = measureRevisionLag({
    freezeRevision: input.freezeRevision,
    sourceRevision: input.sourceRevision,
    lagCommits: input.lagCommits,
    freezeText: input.freezeText
  });

  const dirty = evaluateDirtyState({
    dirty: input.dirty,
    dirtyPaths: input.dirtyPaths,
    dirtySummary: input.dirtySummary,
    allowOptimisticWhenDirty: input.allowOptimisticWhenDirty
  });

  const pendingFromText = extractPendingPorts(input.freezeText);
  const pendingPorts = [
    ...new Set([
      ...(Array.isArray(input.pendingPorts) ? input.pendingPorts.map(String) : []),
      ...pendingFromText
    ])
  ];

  const frozen =
    input.frozen === true ||
    (revision.match === true && dirty.dirty !== true);

  const chips = collectNonClaimChips({
    closureEstablished: input.closureEstablished === true,
    productionReadyEstablished: input.productionReadyEstablished === true,
    evidenceComplete: input.evidenceComplete === true,
    dirty: dirty.dirty,
    revisionMatch: revision.match,
    pendingPorts,
    pendingPortDisplayLimit: input.pendingPortDisplayLimit,
    extraChips: input.extraChips
  });

  const optimistic_ok =
    dirty.optimistic_allowed &&
    revision.match === true &&
    pendingPorts.length === 0 &&
    !dirty.blocked;

  const optimistic = {
    allowed: optimistic_ok,
    deferred: dirty.deferred || !revision.match || pendingPorts.length > 0,
    result: null,
    reason: null
  };

  if (!optimistic_ok) {
    const reasons = [];
    if (dirty.dirty) reasons.push(dirty.reason || 'dirty');
    if (!revision.match) reasons.push(revision.lag_label);
    if (pendingPorts.length) {
      const limit = input.pendingPortDisplayLimit ?? PENDING_PORT_DISPLAY_LIMIT;
      reasons.push(`pending-port: ${summarizePendingPorts(pendingPorts, limit)}`);
    }
    optimistic.result = 'DEFERRED';
    optimistic.reason = reasons.filter(Boolean).join(' | ') || 'honesty gate deferred';
  } else {
    optimistic.result = 'ALLOW_OBSERVED_ONLY';
    optimistic.reason =
      'clean+matched — OBSERVED only; still NON-CLAIM on closure/PRODUCTION_READY/evidence';
  }

  return {
    schema: HONESTY_SCHEMA,
    surface: input.surface || 'fixture',
    PRODUCTION_READY: HONESTY_PRODUCTION_READY,
    revision,
    dirty,
    frozen,
    pending_ports: pendingPorts,
    pending_port_display_limit: input.pendingPortDisplayLimit ?? PENDING_PORT_DISPLAY_LIMIT,
    pending_port_total: pendingPorts.length,
    optimistic,
    non_claim_chips: chips,
    generated_note:
      'Post-L26 Workstream B honesty surface — display only; L17–L26 CLOSED retained; no L27'
  };
}

export function formatNonClaimChips(chips = []) {
  if (!chips.length) {
    return 'NON-CLAIM chips: (none — unexpected; baseline should always appear)';
  }
  return ['NON-CLAIM chips:', ...chips.map((c) => `  [chip] ${c}`)].join('\n');
}

export function formatHonestyBlock(surface, options = {}) {
  const rev = surface.revision || {};
  const dirty = surface.dirty || {};
  const opt = surface.optimistic || {};
  const limit = options.pendingPortDisplayLimit ?? surface.pending_port_display_limit ?? PENDING_PORT_DISPLAY_LIMIT;
  const ports = Array.isArray(surface.pending_ports) ? surface.pending_ports : [];
  const lines = [
    '------------------------------------------------------------',
    'HONESTY     post-L26 Workstream B',
    `             freeze=${rev.freeze_revision_short || 'UNKNOWN'}  source=${rev.source_revision_short || 'UNKNOWN'}  match=${rev.match === true ? 'YES' : rev.match === false ? 'NO' : '?'}`,
    `             lag=${rev.lag_measurable ? String(rev.lag_commits) : 'UNMEASURED'}  label=${rev.lag_label || 'n/a'}`,
    `             dirty=${dirty.dirty ? 'YES' : 'NO'}  deferred=${dirty.deferred ? 'YES' : 'NO'}  blocked=${dirty.blocked ? 'YES' : 'NO'}`,
    dirty.reason ? `             dirty_reason: ${dirty.reason}` : null,
    `             frozen_observed=${surface.frozen ? 'YES' : 'NO'}`,
    `             pending_ports=${summarizePendingPorts(ports, limit)}${ports.length > limit ? ` (total ${ports.length}; full list in --json)` : ''}`,
    `             optimistic=${opt.result || 'n/a'}  ${opt.reason || ''}`,
    `             PRODUCTION_READY=${surface.PRODUCTION_READY || 'NO'} (never flipped by honesty)`,
    formatNonClaimChips(surface.non_claim_chips || []),
    '------------------------------------------------------------'
  ].filter((x) => x != null);
  return lines.join('\n');
}

export function attachHonestyToDoctorReport(report = {}, honestyInput = {}) {
  const honesty = buildHonestySurface({
    ...honestyInput,
    surface: 'doctor'
  });
  const checks = Array.isArray(report.checks) ? [...report.checks] : [];
  checks.push({
    id: 'HONESTY_REVISION',
    ok: honesty.revision.epistemic !== 'NOT_VERIFIED',
    detail: `${honesty.revision.lag_label} (freeze=${honesty.revision.freeze_revision_short} source=${honesty.revision.source_revision_short})`
  });
  checks.push({
    id: 'HONESTY_DIRTY',
    ok: !honesty.dirty.dirty,
    detail: honesty.dirty.dirty
      ? honesty.dirty.reason
      : 'working tree clean (honesty)'
  });
  checks.push({
    id: 'HONESTY_PENDING_PORT',
    ok: honesty.pending_ports.length === 0,
    detail:
      honesty.pending_ports.length === 0
        ? 'no pending ports visible'
        : `pending: ${summarizePendingPorts(honesty.pending_ports, honesty.pending_port_display_limit ?? PENDING_PORT_DISPLAY_LIMIT)}`
  });

  return {
    ...report,
    checks,
    honesty,
    nonClaims: [
      ...(Array.isArray(report.nonClaims) ? report.nonClaims : []),
      ...honesty.non_claim_chips
    ]
  };
}

export function attachHonestyToHudSnapshot(snapshot = {}, honestyInput = {}) {
  const fromFreeze = snapshot.freeze_tip || {};
  const honesty = buildHonestySurface({
    freezeRevision:
      honestyInput.freezeRevision || fromFreeze.freeze_main_tip || null,
    sourceRevision:
      honestyInput.sourceRevision ||
      fromFreeze.live_head ||
      snapshot.git?.head_full ||
      snapshot.git?.head_short ||
      null,
    lagCommits: honestyInput.lagCommits,
    freezeText: honestyInput.freezeText,
    dirty: honestyInput.dirty,
    dirtyPaths: honestyInput.dirtyPaths,
    dirtySummary: honestyInput.dirtySummary,
    frozen: honestyInput.frozen,
    pendingPorts: honestyInput.pendingPorts,
    pendingPortDisplayLimit: honestyInput.pendingPortDisplayLimit,
    closureEstablished: honestyInput.closureEstablished,
    productionReadyEstablished: honestyInput.productionReadyEstablished,
    evidenceComplete: honestyInput.evidenceComplete,
    allowOptimisticWhenDirty: honestyInput.allowOptimisticWhenDirty,
    surface: 'hud'
  });
  return {
    ...snapshot,
    honesty
  };
}

export default {
  HONESTY_SCHEMA,
  HONESTY_PRODUCTION_READY,
  PENDING_PORT_DISPLAY_LIMIT,
  summarizePendingPorts,
  buildHonestySurface,
  measureRevisionLag,
  evaluateDirtyState,
  collectNonClaimChips,
  formatHonestyBlock,
  attachHonestyToDoctorReport,
  attachHonestyToHudSnapshot,
  parseFreezeMainTip,
  extractPendingPorts
};
