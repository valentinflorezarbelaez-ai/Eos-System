/**
 * @module specboot-friction-gate
 * Post-L26 Workstream E — SpecBoot harness friction reduction with fail-closed
 * behavior. Gate-only helper (NOT a full SpecBoot CLI rewrite).
 *
 * Checks prerequisites / dirty tree / stale inputs / ambiguous ownership before
 * a LIDR step proceeds. Returns structured refuse reasons. FS + git are
 * injectable for hermetic fixtures.
 *
 * Preferred LIDR (Valentin): /enrich_us → /propose → /apply →
 * /verify+/code_review → /archive+/commit → publish (HITL).
 *
 * NON-CLAIM: Fewer manual steps do NOT authorize automatic closure or a
 * PRODUCTION_READY flip. Seal + readiness claims remain explicit human gates.
 * PRODUCTION_READY: NO | Fundacion Δ=0 | Law VI | never reopen L17–L26 | no L27
 */

import fs from 'node:fs';
import path from 'node:path';

export const FRICTION_GATE_SCHEMA = 'eos.specboot-friction-gate.v1';

/** @type {'NO'} */
export const FRICTION_GATE_PRODUCTION_READY = 'NO';

/** Canonical LIDR steps (operator-preferred SpecBoot flow). */
export const LIDR_STEPS = Object.freeze([
  'enrich_us',
  'propose',
  'apply',
  'verify',
  'code_review',
  'archive',
  'commit',
  'publish'
]);

/** Steps that ALWAYS require an explicit human gate (never auto-pass). */
export const HUMAN_GATE_STEPS = Object.freeze([
  'publish',
  'seal',
  'production_ready_flip'
]);

export const EXIT = Object.freeze({
  PASS: 0,
  FAIL: 1,
  MISSING_PREREQUISITES: 2,
  DIRTY_STATE: 3,
  STALE_INPUTS: 4,
  AMBIGUOUS_OWNERSHIP: 5,
  HUMAN_GATE_REQUIRED: 6,
  INVALID_STEP: 7
});

export const REFUSE_CODES = Object.freeze({
  MISSING_PREREQUISITES: 'MISSING_PREREQUISITES',
  DIRTY_STATE: 'DIRTY_STATE',
  STALE_INPUTS: 'STALE_INPUTS',
  AMBIGUOUS_OWNERSHIP: 'AMBIGUOUS_OWNERSHIP',
  HUMAN_GATE_REQUIRED: 'HUMAN_GATE_REQUIRED',
  INVALID_STEP: 'INVALID_STEP',
  AUTO_SEAL_REFUSED: 'AUTO_SEAL_REFUSED',
  AUTO_PRODUCTION_FLIP_REFUSED: 'AUTO_PRODUCTION_FLIP_REFUSED'
});

export const BASELINE_NON_CLAIMS = Object.freeze([
  'NON-CLAIM: Fewer manual steps do not authorize automatic closure or a production flip',
  'NON-CLAIM: Gate PASS ≠ L26 seal ≠ PRODUCTION_READY=YES',
  'NON-CLAIM: Gate PASS ≠ automatic /archive or /commit or publish',
  'NON-CLAIM: PRODUCTION_READY remains NO; Fundacion Δ=0',
  'NON-CLAIM: never reopen L17–L26; no L27',
  'NON-CLAIM: Not a full SpecBoot CLI rewrite — friction gate + inventory only'
]);

/** Default relative prerequisites by LIDR step (actionable diagnostics). */
export const DEFAULT_STEP_PREREQS = Object.freeze({
  enrich_us: ['docs/harness/SPECBOOT_CYCLE.md'],
  propose: [
    'docs/harness/SPECBOOT_CYCLE.md',
    'openspec/changes'
  ],
  apply: [
    'openspec/changes',
    'proposal.md',
    'tasks.md'
  ],
  verify: [
    'openspec/changes',
    'proposal.md',
    'tasks.md'
  ],
  code_review: [
    'openspec/changes',
    'proposal.md'
  ],
  archive: [
    'openspec/changes',
    'proposal.md',
    'tasks.md',
    'verify_evidence'
  ],
  commit: [
    'openspec/changes',
    'proposal.md',
    'human_commit_ack'
  ],
  publish: [
    'openspec/changes',
    'human_publish_ack'
  ]
});

// ─── Injectable defaults ─────────────────────────────────────────────────────

/**
 * Default FS adapter — thin wrapper over node:fs for injectability.
 */
export function createDefaultFs(root = process.cwd()) {
  return {
    root,
    exists(relOrAbs) {
      const p = path.isAbsolute(relOrAbs)
        ? relOrAbs
        : path.join(root, relOrAbs);
      return fs.existsSync(p);
    },
    readText(relOrAbs) {
      const p = path.isAbsolute(relOrAbs)
        ? relOrAbs
        : path.join(root, relOrAbs);
      return fs.readFileSync(p, 'utf8');
    },
    join(...parts) {
      return path.join(...parts);
    }
  };
}

/**
 * Default git adapter — fail-closed stub when not injected.
 * Live host must inject { status, revParseHead, ... }.
 */
export function createDefaultGit() {
  return {
    available: false,
    status() {
      return {
        dirty: null,
        dirtyPaths: [],
        summary: 'git adapter not injected — refuse to invent clean tree',
        missing: true
      };
    },
    revParseHead() {
      return null;
    },
    branch() {
      return null;
    }
  };
}

/**
 * Fixture/memory FS: map of relative path → string content | null (missing).
 */
export function createMemoryFs(fileMap = {}, root = '/fixture') {
  const map = { ...fileMap };
  return {
    root,
    exists(relOrAbs) {
      const rel = normalizeRel(relOrAbs, root);
      if (Object.prototype.hasOwnProperty.call(map, rel)) {
        return map[rel] != null;
      }
      // Directory-ish: any key with prefix counts as present
      const prefix = rel.endsWith('/') ? rel : `${rel}/`;
      return Object.keys(map).some(
        (k) => k === rel || k.startsWith(prefix)
      );
    },
    readText(relOrAbs) {
      const rel = normalizeRel(relOrAbs, root);
      if (!Object.prototype.hasOwnProperty.call(map, rel) || map[rel] == null) {
        throw new Error(`memory fs missing: ${rel}`);
      }
      return String(map[rel]);
    },
    join(...parts) {
      return path.posix.join(...parts.map(String));
    },
    _map: map
  };
}

function normalizeRel(relOrAbs, root) {
  let s = String(relOrAbs).replace(/\\/g, '/');
  const r = String(root).replace(/\\/g, '/').replace(/\/$/, '');
  if (s.startsWith(r + '/')) s = s.slice(r.length + 1);
  if (s.startsWith('/')) s = s.replace(/^\/+/, '');
  return s;
}

/**
 * Fixture git adapter.
 */
export function createMemoryGit(state = {}) {
  return {
    available: true,
    status() {
      const dirty = state.dirty === true;
      const dirtyPaths = Array.isArray(state.dirtyPaths)
        ? state.dirtyPaths.map(String)
        : [];
      return {
        dirty,
        dirtyPaths,
        summary: dirty
          ? `dirty: ${dirtyPaths.slice(0, 8).join(', ') || '(paths not enumerated)'}`
          : 'working tree clean',
        missing: false
      };
    },
    revParseHead() {
      return state.head != null ? String(state.head) : null;
    },
    branch() {
      return state.branch != null ? String(state.branch) : null;
    }
  };
}

// ─── Ownership ───────────────────────────────────────────────────────────────

/**
 * Resolve ownership. Ambiguous when missing, multi-claim without primary,
 * or claimed owners disagree with expectedOperator.
 *
 * @param {object} input
 * @param {string|string[]|null} [input.owners]
 * @param {string|null} [input.primaryOwner]
 * @param {string|null} [input.expectedOperator]
 * @param {string|null} [input.changeOwner]
 * @returns {{ ok: boolean, ambiguous: boolean, owners: string[], primary: string|null, reason: string|null, diagnostic: string }}
 */
export function evaluateOwnership(input = {}) {
  const raw = input.owners;
  let owners = [];
  if (Array.isArray(raw)) {
    owners = raw.map((o) => String(o).trim()).filter(Boolean);
  } else if (typeof raw === 'string' && raw.trim()) {
    owners = raw
      .split(/[,;/|]/)
      .map((o) => o.trim())
      .filter(Boolean);
  }

  if (input.changeOwner && String(input.changeOwner).trim()) {
    const co = String(input.changeOwner).trim();
    if (!owners.includes(co)) owners.push(co);
  }

  const primary =
    input.primaryOwner != null && String(input.primaryOwner).trim()
      ? String(input.primaryOwner).trim()
      : owners.length === 1
        ? owners[0]
        : null;

  const expected =
    input.expectedOperator != null && String(input.expectedOperator).trim()
      ? String(input.expectedOperator).trim()
      : null;

  if (owners.length === 0 && !primary) {
    return {
      ok: false,
      ambiguous: true,
      owners: [],
      primary: null,
      reason: REFUSE_CODES.AMBIGUOUS_OWNERSHIP,
      diagnostic:
        'AMBIGUOUS_OWNERSHIP: no owner declared for change/step — set primaryOwner or owners[]'
    };
  }

  if (owners.length > 1 && !primary) {
    return {
      ok: false,
      ambiguous: true,
      owners,
      primary: null,
      reason: REFUSE_CODES.AMBIGUOUS_OWNERSHIP,
      diagnostic: `AMBIGUOUS_OWNERSHIP: multiple owners [${owners.join(', ')}] without primaryOwner`
    };
  }

  if (expected && primary && expected !== primary && !owners.includes(expected)) {
    return {
      ok: false,
      ambiguous: true,
      owners,
      primary,
      reason: REFUSE_CODES.AMBIGUOUS_OWNERSHIP,
      diagnostic: `AMBIGUOUS_OWNERSHIP: expectedOperator=${expected} not in owners and ≠ primary=${primary}`
    };
  }

  if (expected && !primary && owners.length === 0) {
    return {
      ok: false,
      ambiguous: true,
      owners,
      primary: null,
      reason: REFUSE_CODES.AMBIGUOUS_OWNERSHIP,
      diagnostic: `AMBIGUOUS_OWNERSHIP: expectedOperator=${expected} but no declared owner`
    };
  }

  return {
    ok: true,
    ambiguous: false,
    owners: primary && !owners.includes(primary) ? [primary, ...owners] : owners,
    primary: primary || owners[0] || null,
    reason: null,
    diagnostic: `owner ok: primary=${primary || owners[0]}`
  };
}

// ─── Dirty state ─────────────────────────────────────────────────────────────

/**
 * Evaluate dirty working tree. Missing git adapter → fail-closed (do not invent clean).
 */
export function evaluateDirtyState(input = {}, git = null) {
  if (input.dirty === true || input.dirty === false) {
    const dirty = input.dirty === true;
    const dirtyPaths = Array.isArray(input.dirtyPaths)
      ? input.dirtyPaths.map(String)
      : [];
    if (!dirty) {
      return {
        dirty: false,
        blocked: false,
        reason: null,
        dirty_paths: dirtyPaths,
        summary: input.dirtySummary || 'working tree clean (injected)',
        source: 'injected'
      };
    }
    return {
      dirty: true,
      blocked: true,
      reason: REFUSE_CODES.DIRTY_STATE,
      dirty_paths: dirtyPaths,
      summary:
        input.dirtySummary ||
        `DIRTY_STATE: ${dirtyPaths.slice(0, 8).join(', ') || 'paths not enumerated'}`,
      diagnostic: `DIRTY_STATE: clean tree required before step — dirty paths: ${
        dirtyPaths.slice(0, 8).join(', ') || '(unenumerated)'
      }`,
      source: 'injected'
    };
  }

  const g = git || createDefaultGit();
  const st = g.status();
  if (st.missing || st.dirty == null) {
    return {
      dirty: null,
      blocked: true,
      reason: REFUSE_CODES.MISSING_PREREQUISITES,
      dirty_paths: [],
      summary: st.summary || 'git status unavailable',
      diagnostic:
        'MISSING_PREREQUISITES: git status not injectable/available — refuse to invent clean tree',
      source: 'missing_git'
    };
  }

  if (st.dirty === true) {
    return {
      dirty: true,
      blocked: true,
      reason: REFUSE_CODES.DIRTY_STATE,
      dirty_paths: st.dirtyPaths || [],
      summary: st.summary,
      diagnostic: `DIRTY_STATE: ${st.summary}`,
      source: 'git'
    };
  }

  return {
    dirty: false,
    blocked: false,
    reason: null,
    dirty_paths: [],
    summary: st.summary || 'working tree clean',
    source: 'git'
  };
}

// ─── Stale inputs ────────────────────────────────────────────────────────────

/**
 * Detect stale inputs: change tip vs HEAD, proposal mtime lag, expected tip drift.
 *
 * @param {object} input
 * @param {string|null} [input.changeTip] tip SHA recorded on change artifacts
 * @param {string|null} [input.headSha] current HEAD
 * @param {string|null} [input.expectedTip] expected freeze/base tip
 * @param {number|null} [input.inputAgeMs] age of primary input
 * @param {number|null} [input.maxAgeMs] max allowed age
 * @param {boolean} [input.stale] explicit stale flag
 * @param {string|null} [input.staleReason]
 */
export function evaluateStaleInputs(input = {}) {
  const issues = [];

  if (input.stale === true) {
    issues.push(
      input.staleReason ||
        'STALE_INPUTS: explicit stale=true (caller-marked)'
    );
  }

  const changeTip = normalizeSha(input.changeTip);
  const headSha = normalizeSha(input.headSha);
  const expectedTip = normalizeSha(input.expectedTip);

  if (changeTip && headSha && !shaPrefixMatch(changeTip, headSha)) {
    // Change tip behind/diverged from HEAD without acknowledgeAhead is stale
    if (input.allowHeadAhead === true && input.lagCommits != null && Number(input.lagCommits) > 0) {
      // HEAD ahead of change tip with measured lag — not automatically stale for apply,
      // but verify/archive may still want refresh. Mark advisory unless forceStaleOnAhead.
      if (input.forceStaleOnAhead === true) {
        issues.push(
          `STALE_INPUTS: changeTip=${shortSha(changeTip)} behind HEAD=${shortSha(headSha)} (lag=${input.lagCommits}); forceStaleOnAhead`
        );
      }
    } else if (input.lagCommits != null && Number(input.lagCommits) < 0) {
      issues.push(
        `STALE_INPUTS: HEAD=${shortSha(headSha)} behind changeTip=${shortSha(changeTip)} (lag=${input.lagCommits})`
      );
    } else if (!input.allowHeadAhead) {
      issues.push(
        `STALE_INPUTS: changeTip=${shortSha(changeTip)} ≠ HEAD=${shortSha(headSha)} (provide allowHeadAhead+lagCommits or refresh change)`
      );
    }
  }

  if (expectedTip && changeTip && !shaPrefixMatch(expectedTip, changeTip)) {
    issues.push(
      `STALE_INPUTS: changeTip=${shortSha(changeTip)} ≠ expectedTip=${shortSha(expectedTip)}`
    );
  }

  if (
    input.maxAgeMs != null &&
    Number.isFinite(Number(input.maxAgeMs)) &&
    input.inputAgeMs != null &&
    Number.isFinite(Number(input.inputAgeMs))
  ) {
    if (Number(input.inputAgeMs) > Number(input.maxAgeMs)) {
      issues.push(
        `STALE_INPUTS: inputAgeMs=${input.inputAgeMs} > maxAgeMs=${input.maxAgeMs}`
      );
    }
  }

  if (input.requireHead === true && !headSha) {
    issues.push('STALE_INPUTS: headSha required but missing (cannot verify freshness)');
  }

  const stale = issues.length > 0;
  return {
    stale,
    blocked: stale,
    reason: stale ? REFUSE_CODES.STALE_INPUTS : null,
    issues,
    diagnostic: stale ? issues.join('; ') : 'inputs fresh',
    change_tip: changeTip,
    head_sha: headSha,
    expected_tip: expectedTip
  };
}

export function normalizeSha(sha) {
  if (sha == null || sha === '') return null;
  const s = String(sha).trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(s)) return null;
  return s;
}

export function shortSha(sha, n = 7) {
  const s = normalizeSha(sha);
  return s ? s.slice(0, n) : null;
}

export function shaPrefixMatch(a, b) {
  const x = normalizeSha(a);
  const y = normalizeSha(b);
  if (!x || !y) return false;
  const n = Math.min(x.length, y.length, 40);
  if (n < 7) return false;
  return x.slice(0, n) === y.slice(0, n);
}

// ─── Prerequisites ───────────────────────────────────────────────────────────

/**
 * Check step prerequisites against injectable FS + explicit flags.
 */
export function checkPrerequisites(input = {}, fsAdapter = null) {
  const step = normalizeStep(input.step);
  const missing = [];
  const notes = [];
  const fsA = fsAdapter || createDefaultFs(input.root || process.cwd());

  if (!step) {
    return {
      ok: false,
      step: null,
      missing: ['valid_lidr_step'],
      notes: [],
      diagnostic: 'MISSING_PREREQUISITES: step missing or not a known LIDR step'
    };
  }

  const prereqList =
    Array.isArray(input.prerequisites) && input.prerequisites.length
      ? input.prerequisites.map(String)
      : [...(DEFAULT_STEP_PREREQS[step] || [])];

  const changeId = input.changeId != null ? String(input.changeId) : null;
  const changeDir = input.changeDir
    ? String(input.changeDir)
    : changeId
      ? path.posix.join('openspec/changes', changeId)
      : null;

  for (const item of prereqList) {
    if (item === 'proposal.md' || item === 'tasks.md') {
      if (!changeDir) {
        missing.push(`${item} (changeDir/changeId required)`);
        continue;
      }
      const rel = path.posix.join(changeDir, item);
      if (input.fileFlags && Object.prototype.hasOwnProperty.call(input.fileFlags, rel)) {
        if (!input.fileFlags[rel]) missing.push(rel);
        else notes.push(`${rel}=present`);
        continue;
      }
      if (!fsA.exists(rel)) missing.push(rel);
      else notes.push(`${rel}=present`);
      continue;
    }

    if (item === 'openspec/changes') {
      const dir = changeDir || 'openspec/changes';
      if (input.fileFlags && Object.prototype.hasOwnProperty.call(input.fileFlags, dir)) {
        if (!input.fileFlags[dir]) missing.push(dir);
        else notes.push(`${dir}=present`);
        continue;
      }
      if (!fsA.exists(dir) && !fsA.exists('openspec/changes')) {
        missing.push(dir);
      } else {
        notes.push('openspec/changes=present');
      }
      continue;
    }

    if (item === 'verify_evidence') {
      const has =
        input.verifyEvidence === true ||
        (input.verifyEvidence && typeof input.verifyEvidence === 'object') ||
        (input.fileFlags && input.fileFlags.verify_evidence === true);
      if (!has) missing.push('verify_evidence');
      else notes.push('verify_evidence=present');
      continue;
    }

    if (item === 'human_commit_ack' || item === 'human_publish_ack') {
      const flag =
        item === 'human_commit_ack'
          ? input.humanCommitAck === true
          : input.humanPublishAck === true;
      if (!flag) missing.push(item);
      else notes.push(`${item}=acked`);
      continue;
    }

    // Generic path
    if (input.fileFlags && Object.prototype.hasOwnProperty.call(input.fileFlags, item)) {
      if (!input.fileFlags[item]) missing.push(item);
      else notes.push(`${item}=present`);
      continue;
    }
    if (!fsA.exists(item)) missing.push(item);
    else notes.push(`${item}=present`);
  }

  if (Array.isArray(input.extraRequired)) {
    for (const e of input.extraRequired) {
      if (!e.ok) missing.push(String(e.name || 'extra'));
      else notes.push(`${e.name}=ok`);
    }
  }

  return {
    ok: missing.length === 0,
    step,
    missing,
    notes,
    prerequisites_checked: prereqList,
    diagnostic:
      missing.length === 0
        ? `prerequisites ok for step=${step}`
        : `MISSING_PREREQUISITES: ${missing.join(', ')}`
  };
}

export function normalizeStep(step) {
  if (step == null || step === '') return null;
  const s = String(step)
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/-/g, '_');
  // aliases
  const aliases = {
    enrichus: 'enrich_us',
    enrich: 'enrich_us',
    ff: 'propose',
    opsx_propose: 'propose',
    opsx_apply: 'apply',
    adversarial_review: 'code_review',
    code_review: 'code_review',
    adversarialreview: 'code_review',
    seal: 'seal',
    production_ready_flip: 'production_ready_flip',
    production_flip: 'production_ready_flip'
  };
  const mapped = aliases[s] || s;
  if (LIDR_STEPS.includes(mapped) || HUMAN_GATE_STEPS.includes(mapped)) {
    return mapped;
  }
  return null;
}

// ─── Human gates / auto-seal refusal ─────────────────────────────────────────

/**
 * Seal and readiness claims always require explicit human acknowledgement.
 * Automation must NEVER auto-pass these.
 */
export function evaluateHumanGate(input = {}) {
  const step = normalizeStep(input.step);
  const claim = input.claim != null ? String(input.claim).toLowerCase() : null;

  const wantsSeal =
    step === 'seal' ||
    claim === 'seal' ||
    claim === 'l26_seal' ||
    input.autoSeal === true;

  const wantsProdFlip =
    step === 'production_ready_flip' ||
    claim === 'production_ready' ||
    claim === 'production_ready_flip' ||
    input.autoProductionReady === true ||
    input.flipProductionReady === true;

  const wantsPublish = step === 'publish';

  if (wantsSeal) {
    if (input.humanSealAck === true) {
      return {
        required: true,
        acked: true,
        blocked: false,
        reason: null,
        diagnostic: 'human seal ack present — gate does not perform seal; caller may proceed under HITL'
      };
    }
    return {
      required: true,
      acked: false,
      blocked: true,
      reason: REFUSE_CODES.AUTO_SEAL_REFUSED,
      diagnostic:
        'AUTO_SEAL_REFUSED: seal requires explicit humanSealAck=true — automation must not seal L26 or reopen ladders'
    };
  }

  if (wantsProdFlip) {
    if (input.humanProductionReadyAck === true) {
      return {
        required: true,
        acked: true,
        blocked: false,
        reason: null,
        diagnostic:
          'human PRODUCTION_READY ack present — gate still emits PRODUCTION_READY=NO; flip is out-of-band HITL only'
      };
    }
    return {
      required: true,
      acked: false,
      blocked: true,
      reason: REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED,
      diagnostic:
        'AUTO_PRODUCTION_FLIP_REFUSED: PRODUCTION_READY flip requires explicit humanProductionReadyAck — gate never flips'
    };
  }

  if (wantsPublish) {
    if (input.humanPublishAck === true) {
      return {
        required: true,
        acked: true,
        blocked: false,
        reason: null,
        diagnostic: 'human publish ack present — publish remains HITL'
      };
    }
    return {
      required: true,
      acked: false,
      blocked: true,
      reason: REFUSE_CODES.HUMAN_GATE_REQUIRED,
      diagnostic:
        'HUMAN_GATE_REQUIRED: publish/merge requires humanPublishAck=true — no autonomous main merge'
    };
  }

  // Commit also needs ack when step=commit (also covered in prereqs)
  if (step === 'commit' && input.humanCommitAck !== true) {
    return {
      required: true,
      acked: false,
      blocked: true,
      reason: REFUSE_CODES.HUMAN_GATE_REQUIRED,
      diagnostic:
        'HUMAN_GATE_REQUIRED: commit requires humanCommitAck=true'
    };
  }

  return {
    required: false,
    acked: null,
    blocked: false,
    reason: null,
    diagnostic: 'no seal/readiness/publish human-gate triggered'
  };
}

// ─── Main gate ───────────────────────────────────────────────────────────────

/**
 * Run SpecBoot friction gate (fail-closed).
 *
 * @param {object} input
 * @param {string} input.step LIDR step
 * @param {string} [input.changeId]
 * @param {string} [input.changeDir]
 * @param {object} [input.fs] injectable FS
 * @param {object} [input.git] injectable git
 * @param {boolean} [input.dirty]
 * @param {string[]} [input.dirtyPaths]
 * @param {string|string[]} [input.owners]
 * @param {string} [input.primaryOwner]
 * @param {string} [input.expectedOperator]
 * @param {string} [input.changeTip]
 * @param {string} [input.headSha]
 * @param {string} [input.expectedTip]
 * @param {boolean} [input.skipDirtyCheck]
 * @param {boolean} [input.skipStaleCheck]
 * @param {boolean} [input.skipOwnershipCheck]
 * @returns {object} gate record with structured refuse reasons
 */
export function runSpecbootFrictionGate(input = {}) {
  const refuses = [];
  const step = normalizeStep(input.step);

  if (!step) {
    refuses.push({
      code: REFUSE_CODES.INVALID_STEP,
      detail: `INVALID_STEP: '${input.step}' is not a known LIDR/human-gate step`,
      actionable: `Use one of: ${[...LIDR_STEPS, ...HUMAN_GATE_STEPS].join(', ')}`
    });
    return finalizeGate({
      ok: false,
      step: input.step ?? null,
      refuses,
      primary: REFUSE_CODES.INVALID_STEP,
      exitCode: EXIT.INVALID_STEP,
      input
    });
  }

  const fsAdapter =
    input.fs ||
    (input.fileMap
      ? createMemoryFs(input.fileMap, input.root || '/fixture')
      : createDefaultFs(input.root || process.cwd()));
  const gitAdapter =
    input.git ||
    (input.gitState ? createMemoryGit(input.gitState) : createDefaultGit());

  // 1) Human gates first (seal / prod flip / publish) — never auto-pass
  const human = evaluateHumanGate({ ...input, step });
  if (human.blocked) {
    refuses.push({
      code: human.reason,
      detail: human.diagnostic,
      actionable:
        human.reason === REFUSE_CODES.AUTO_SEAL_REFUSED
          ? 'Provide humanSealAck=true only after explicit operator decision; do not auto-seal'
          : human.reason === REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED
            ? 'PRODUCTION_READY flip is HITL-only; gate will not flip'
            : 'Set the matching human*Ack flag after explicit operator decision'
    });
  }

  // 2) Prerequisites
  const prereq = checkPrerequisites({ ...input, step }, fsAdapter);
  if (!prereq.ok) {
    refuses.push({
      code: REFUSE_CODES.MISSING_PREREQUISITES,
      detail: prereq.diagnostic,
      missing: prereq.missing,
      actionable: `Create/provide missing: ${prereq.missing.join(', ')}`
    });
  }

  // 3) Dirty state
  let dirty = {
    dirty: false,
    blocked: false,
    reason: null,
    skipped: true
  };
  if (input.skipDirtyCheck !== true) {
    dirty = evaluateDirtyState(input, gitAdapter);
    if (dirty.blocked) {
      refuses.push({
        code: dirty.reason || REFUSE_CODES.DIRTY_STATE,
        detail: dirty.diagnostic || dirty.summary,
        dirty_paths: dirty.dirty_paths,
        actionable:
          dirty.reason === REFUSE_CODES.MISSING_PREREQUISITES
            ? 'Inject git adapter or dirty=false|true explicitly'
            : 'Commit/stash dirty paths or re-run on clean tree'
      });
    }
  }

  // 4) Stale inputs
  let stale = { stale: false, blocked: false, reason: null, skipped: true };
  if (input.skipStaleCheck !== true) {
    stale = evaluateStaleInputs(input);
    if (stale.blocked) {
      refuses.push({
        code: REFUSE_CODES.STALE_INPUTS,
        detail: stale.diagnostic,
        issues: stale.issues,
        actionable:
          'Refresh change artifacts to HEAD, or pass allowHeadAhead+lagCommits, or clear stale flag'
      });
    }
  }

  // 5) Ownership
  let ownership = {
    ok: true,
    ambiguous: false,
    skipped: true
  };
  if (input.skipOwnershipCheck !== true) {
    ownership = evaluateOwnership(input);
    if (!ownership.ok) {
      refuses.push({
        code: REFUSE_CODES.AMBIGUOUS_OWNERSHIP,
        detail: ownership.diagnostic,
        owners: ownership.owners,
        actionable:
          'Set primaryOwner to a single operator (e.g. Valentin Florez) or owners=[one]'
      });
    }
  }

  const ok = refuses.length === 0;
  const primary = ok ? null : refuses[0].code;
  const exitCode = ok
    ? EXIT.PASS
    : primary === REFUSE_CODES.MISSING_PREREQUISITES
      ? EXIT.MISSING_PREREQUISITES
      : primary === REFUSE_CODES.DIRTY_STATE
        ? EXIT.DIRTY_STATE
        : primary === REFUSE_CODES.STALE_INPUTS
          ? EXIT.STALE_INPUTS
          : primary === REFUSE_CODES.AMBIGUOUS_OWNERSHIP
            ? EXIT.AMBIGUOUS_OWNERSHIP
            : primary === REFUSE_CODES.HUMAN_GATE_REQUIRED ||
                primary === REFUSE_CODES.AUTO_SEAL_REFUSED ||
                primary === REFUSE_CODES.AUTO_PRODUCTION_FLIP_REFUSED
              ? EXIT.HUMAN_GATE_REQUIRED
              : primary === REFUSE_CODES.INVALID_STEP
                ? EXIT.INVALID_STEP
                : EXIT.FAIL;

  return finalizeGate({
    ok,
    step,
    refuses,
    primary,
    exitCode,
    input,
    prereq,
    dirty,
    stale,
    ownership,
    human
  });
}

function finalizeGate(ctx) {
  const non_claims = [
    ...BASELINE_NON_CLAIMS,
    ...(Array.isArray(ctx.input?.extraNonClaims) ? ctx.input.extraNonClaims : [])
  ];

  return {
    schema: FRICTION_GATE_SCHEMA,
    PRODUCTION_READY: FRICTION_GATE_PRODUCTION_READY,
    ok: ctx.ok,
    exit_code: ctx.exitCode,
    step: ctx.step,
    change_id: ctx.input?.changeId ?? null,
    primary_refuse: ctx.primary,
    refuses: ctx.refuses,
    prerequisites: ctx.prereq || null,
    dirty: ctx.dirty || null,
    stale: ctx.stale || null,
    ownership: ctx.ownership || null,
    human_gate: ctx.human || null,
    non_claims,
    note: ctx.ok
      ? `FRICTION_GATE_PASS — step=${ctx.step}; human gates for seal/readiness still required at those claims`
      : `FRICTION_GATE_REFUSE — ${ctx.primary}`,
    fundacion_delta: 0,
    law_vi: true,
    auto_seal: false,
    auto_production_ready_flip: false
  };
}

/**
 * Map gate → process exit code.
 */
export function exitCodeFromGate(gate) {
  if (!gate || typeof gate !== 'object') return EXIT.FAIL;
  if (typeof gate.exit_code === 'number') return gate.exit_code;
  return gate.ok ? EXIT.PASS : EXIT.FAIL;
}

/**
 * CLI-friendly summary (no ANSI).
 */
export function formatGateSummary(gate) {
  if (!gate) return 'specboot-friction-gate: no gate result';
  const lines = [
    `schema: ${gate.schema}`,
    `ok: ${gate.ok}`,
    `exit_code: ${gate.exit_code}`,
    `step: ${gate.step}`,
    `change_id: ${gate.change_id || 'n/a'}`,
    `PRODUCTION_READY: ${gate.PRODUCTION_READY}`,
    `primary_refuse: ${gate.primary_refuse || 'none'}`,
    `auto_seal: ${gate.auto_seal}`,
    `auto_production_ready_flip: ${gate.auto_production_ready_flip}`,
    `note: ${gate.note}`
  ];
  for (const r of gate.refuses || []) {
    lines.push(`  REFUSE ${r.code}: ${r.detail}`);
    if (r.actionable) lines.push(`    → ${r.actionable}`);
  }
  for (const nc of gate.non_claims || []) {
    lines.push(`  ${nc}`);
  }
  return lines.join('\n');
}

/**
 * Friction inventory constants (machine-readable subset of the docs inventory).
 * Used by tests to assert inventory coverage without parsing markdown.
 */
export const FRICTION_INVENTORY_IDS = Object.freeze([
  'F1_MANUAL_CHANGE_ID_COPY',
  'F2_REPEATED_DIRTY_CHECK',
  'F3_REPEATED_HEAD_FREEZE_CHECK',
  'F4_AMBIGUOUS_OWNER_AT_ARCHIVE',
  'F5_MANUAL_PREREQ_SCAN',
  'F6_STALE_PROPOSAL_VS_HEAD',
  'F7_VERIFY_EVIDENCE_PATH_PASTE',
  'F8_SEAL_READINESS_AMBIGUITY'
]);

export const SAFE_AUTOMATION_IDS = Object.freeze([
  'A1_PREREQ_PROBE',
  'A2_DIRTY_PROBE',
  'A3_STALE_PROBE',
  'A4_OWNERSHIP_PROBE',
  'A5_STRUCTURED_REFUSE',
  'A6_PRESERVE_HUMAN_SEAL_GATE',
  'A7_PRESERVE_HUMAN_PROD_GATE'
]);
