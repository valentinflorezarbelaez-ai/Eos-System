/**
 * @module EvdSealPath
 * @description G7 — SSOT for canonical docs/evidence/EVD-*.json writes.
 * Fail-closed: every non-dryRun write MUST advance EvidenceCustody (ROI4 / ADR-0015).
 * No parallel ledger. Reuses EvidenceCustody.sealEvdRecord.
 *
 * Mission-local evidence dirs (e.g. .missions/<id>/evidence) are out of scope;
 * they use mission ledgers, not the control-plane docs/evidence custody chain.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  EvidenceCustody,
  EvidenceCustodyError
} from './evidence-custody.js';
import { isFundacionPath } from '../write-barrier/paths.js';

/** Only this module may writeFileSync canonical docs/evidence EVD JSON. */
export const CANONICAL_EVD_SEAL_MODULE = 'src/core/sdd/evd-seal-path.js';

export const CANONICAL_EVD_SEAL_MODULES = Object.freeze([CANONICAL_EVD_SEAL_MODULE]);

/**
 * Explicit DENY for untracked / bypass EVD writes that skip custody.
 * @param {object} [details]
 */
export function denyEvdBypass(details = {}) {
  throw new EvidenceCustodyError(
    `EVD_BYPASS_DENY: untracked docs/evidence write skipped custody (${details.reason || 'raw write'})`,
    'EVD_BYPASS_DENY',
    details
  );
}

/**
 * Write one canonical EVD record under docs/evidence and chain EvidenceCustody.
 * Fail-closed when custody is missing/disabled on a real write.
 *
 * @param {object} options
 * @param {object} options.record - EVD JSON body (must include id)
 * @param {string} [options.controlPlaneRoot]
 * @param {string} [options.evidenceDir]
 * @param {EvidenceCustody|null} [options.custody]
 * @param {boolean} [options.custodyEnabled=true]
 * @param {string} [options.custodyBaseDir]
 * @param {boolean} [options.dryRun=false]
 * @returns {{ evidence_id: string, path: string, record: object, custody_event: object|null, dry_run: boolean }}
 */
export function sealEvd(options = {}) {
  const {
    controlPlaneRoot = process.cwd(),
    evidenceDir,
    record,
    custody = null,
    custodyEnabled = true,
    dryRun = false,
    custodyBaseDir
  } = options;

  if (!record || typeof record !== 'object') {
    throw new EvidenceCustodyError(
      'EVD_SEAL_INVALID: record object required',
      'EVD_SEAL_INVALID'
    );
  }

  const evdId = record.id || record.evidence_id;
  if (!evdId || typeof evdId !== 'string') {
    throw new EvidenceCustodyError(
      'EVD_SEAL_INVALID: record.id required',
      'EVD_SEAL_INVALID'
    );
  }

  const dir = evidenceDir || path.join(controlPlaneRoot, 'docs', 'evidence');
  if (isFundacionPath(dir)) {
    throw new EvidenceCustodyError(
      `EVD_FUNDACION_DENY: refusing EVD write under Fundacion (${dir})`,
      'EVD_FUNDACION_DENY'
    );
  }

  const targetFilePath = path.join(dir, `${evdId}.json`);

  let custodyInstance = null;
  if (custodyEnabled !== false) {
    custodyInstance =
      custody instanceof EvidenceCustody
        ? custody
        : new EvidenceCustody({
            controlPlaneRoot,
            baseDir: custodyBaseDir,
            enabled: true
          });
  }

  if (!dryRun && !custodyInstance) {
    throw new EvidenceCustodyError(
      'EVD_CUSTODY_REQUIRED: canonical EVD write denied without EvidenceCustody (G7 fail-closed)',
      'EVD_CUSTODY_REQUIRED'
    );
  }

  let custody_event = null;
  if (!dryRun) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetFilePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    custody_event = custodyInstance.sealEvdRecord({
      evidence_id: evdId,
      seal_hash:
        record.sha256 ||
        record.digest ||
        record.seal_hash ||
        record.sha256_hash ||
        null,
      related_spec: record.related_spec || null,
      related_project: record.related_project || null,
      status: record.status || null,
      dry_run: false
    });
  }

  return {
    evidence_id: evdId,
    path: targetFilePath,
    record,
    custody_event,
    dry_run: dryRun === true
  };
}

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walkJsFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * True when source appears to write canonical docs/evidence EVD JSON.
 * Mission-local missionDir/evidence writers are excluded.
 * @param {string} text
 */
export function sourceWritesCanonicalEvd(text) {
  if (!text || typeof text !== 'string') return false;
  if (!/writeFileSync\s*\(/.test(text)) return false;

  // Strong: constructs docs/evidence and writes an EVD/evidenceId JSON file.
  const joinsDocsEvidence =
    /path\.join\([^;]*['"]docs['"]\s*,\s*['"]evidence['"]/.test(text) ||
    (/\bEVIDENCE_DIR\b/.test(text) && /docs[\\/]+evidence|['"]docs['"]\s*,\s*['"]evidence['"]/.test(text));

  const writesEvdJson =
    (/writeFileSync\s*\(\s*(?:file|filePath|targetFilePath|archivoDestino)\b/.test(text) &&
      (/\bevidenceId\b/.test(text) || /\bevdId\b/.test(text) || /\bEVD-/.test(text) || /\bidEvidencia\b/.test(text))) ||
    (/writeFileSync\s*\(\s*path\.join\([^)]*evidenceDir/.test(text));

  // SSOT module itself
  if (/CANONICAL_EVD_SEAL_MODULE/.test(text) && /writeFileSync\s*\(\s*targetFilePath/.test(text)) {
    return true;
  }

  return joinsDocsEvidence && writesEvdJson;
}

export function auditCanonicalEvdWritePaths(controlPlaneRoot) {
  const root = path.resolve(controlPlaneRoot || process.cwd());
  const srcRoot = path.join(root, 'src');
  const files = walkJsFiles(srcRoot);
  const sanctioned = [];
  const violations = [];

  for (const abs of files) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const text = fs.readFileSync(abs, 'utf8');
    if (!sourceWritesCanonicalEvd(text)) continue;

    if (CANONICAL_EVD_SEAL_MODULES.includes(rel)) {
      sanctioned.push(rel);
    } else {
      violations.push({ path: rel, code: 'EVD_BYPASS_WRITE' });
    }
  }

  const ssotAbs = path.join(root, CANONICAL_EVD_SEAL_MODULE);
  if (!fs.existsSync(ssotAbs)) {
    violations.push({ path: CANONICAL_EVD_SEAL_MODULE, code: 'EVD_SEAL_SSOT_MISSING' });
  }

  return {
    ok: violations.length === 0,
    ssot: CANONICAL_EVD_SEAL_MODULE,
    sanctioned,
    violations,
    scanned: files.length
  };
}

/**
 * Inventory helpers for release reports / operators.
 */
export function inventoryCanonicalEvdWriters(controlPlaneRoot) {
  const audit = auditCanonicalEvdWritePaths(controlPlaneRoot);
  return {
    ...audit,
    note:
      'Canonical docs/evidence EVD writers must go through sealEvd (G7). ' +
      'Mission-local evidence dirs are out of scope.'
  };
}