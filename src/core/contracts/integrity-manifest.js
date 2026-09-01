/**
 * @module IntegrityManifest
 * @description Shared writer for .missions/<id>/integrity-manifest.json.
 *
 * Every component that writes a mission file records that file's hash here. Keeping the
 * update next to the write is what makes `eos mission verify` meaningful: a manifest that
 * omits files written by another component reports a false clean bill of health.
 */

import fs from 'node:fs';
import path from 'node:path';

import { calculateSha256 } from '../sdd/epistemic-evidence-engine.js';

export const MANIFEST_FILE = 'integrity-manifest.json';

/**
 * Records the hash of one mission file in the mission's integrity manifest.
 * @param {string} missionDir absolute path to .missions/<mission-id>
 * @param {string} relPath mission-relative path of the written file
 * @param {string} contentStr exact bytes written
 */
export function updateManifestFile(missionDir, relPath, contentStr) {
  const manifestPath = path.join(missionDir, MANIFEST_FILE);
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { mission_id: path.basename(missionDir), files: {} };

  manifest.files = manifest.files || {};
  manifest.files[relPath] = calculateSha256(contentStr);
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}
